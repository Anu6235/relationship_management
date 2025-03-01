const express = require('express');
const router = express.Router();
const { Ledger, LedgerType, Member, User } = require('../models');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Op, where } = require('sequelize');
const { post } = require('./memberRoutes');
const ledger = require('../models/ledger');

//Get all ledgers
router.get('/', protect, async (req, res) => {
    try {
        const ledgers = await Ledger.findAll({
            include: [
                { model: LedgerType, as: 'ledgerType' },
                { model: Member, as: 'member' }
            ]
        });
        res.status(200).json({
            success: true,
            data: ledgers
        });
    } catch (error) {
        console.error('Error fetching ledgers:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

//Get ledger by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const ledger = await Ledger.findByPk(id, {
            include: [
                { model: LedgerType, as: 'ledgerType' },
                { model: Member, as: 'member' }
            ]
        });

        if (!ledger) {
            return res.status(404).json({
                success: false,
                message: 'Ledger not found'
            });
        }

        res.status(200).json({
            success: true,
            data: ledger
        });
    } catch (error) {
        console.error('Error fetching ledger:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

//Create a new ledger
router.post('/', protect, adminOnly, async (req, res) => {
    try {
      const { ledger_type_id, member_id, due_date, amount, fee, invoice_status } = req.body;
      
      // Fetch ledger type
      const ledgerType = await LedgerType.findByPk(ledger_type_id);
      if (!ledgerType) {
        return res.status(404).json({
          success: false,
          message: 'Ledger type not found'
        });
      }
      
      // Fetch member
      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      
      // Generate ledger name
      const now = new Date();
      const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
      const year = now.getFullYear();
      const ledger_name = `${month}-${year}-${amount}`;
      
      const total_amount = parseFloat(amount) + parseFloat(fee);
      
      // Calculate due date if not provided
      const invoice_date = new Date();
      const calculated_due_date = due_date || ledgerType.calculateDueDate(invoice_date);
      
      const newLedger = await Ledger.create({
        ledger_type_id,
        ledger_name,
        member_id,
        invoice_created_at: invoice_date,
        due_date: calculated_due_date,
        amount,
        fee,
        total_amount,
        invoice_status: invoice_status || 1
      });
      
      res.status(201).json({
        success: true,
        data: newLedger
      });
    } catch (error) {
      console.error('Error creating ledger:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

//Update ledger status
router.put('/:id/status', protect, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { invoice_status } = req.body;
      
      const ledger = await Ledger.findByPk(id);
      
      if (!ledger) {
        return res.status(404).json({
          success: false,
          message: 'Ledger not found'
        });
      }
      
      await ledger.update({ invoice_status });
      
      res.status(200).json({
        success: true,
        data: ledger
      });
    } catch (error) {
      console.error('Error updating ledger status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

//Get ledgers for a specific member
router.get('/member/:memberId', protect, async (req, res) => {
    try {
      const { memberId } = req.params;
      
      const ledgers = await Ledger.findAll({
        where: { member_id: memberId },
        include: [{ model: LedgerType, as: 'ledgerType' }]
      });
      
      res.status(200).json({
        success: true,
        data: ledgers
      });
    } catch (error) {
      console.error('Error fetching member ledgers:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

//Generate ledgers based on ledger type configuration
router.post('/generate/:ledgerTypeId', protect, adminOnly, async (req, res) => {
  try {
    const { ledgerTypeId } = req.params;
    
    const ledgerType = await LedgerType.findByPk(ledgerTypeId);
    if (!ledgerType || !ledgerType.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Ledger type not found or not active'
      });
    }
    
    // Parse condition_config (it might be stored as a JSON string)
    const conditions = typeof ledgerType.condition_config === 'string' 
      ? JSON.parse(ledgerType.condition_config) 
      : ledgerType.condition_config || {};
    
    const whereClause = {};
    
    // Handle special case for deceased which is boolean
    if ('deceased' in conditions) {
      whereClause.deceased = conditions.deceased.toLowerCase() === 'no' ? false : true;
      delete conditions.deceased;
    }
    
    // Map the remaining conditions from the config to the database fields
    Object.keys(conditions).forEach(key => {
      whereClause[key] = conditions[key];
    });
    
    // Find members that match the conditions
    const members = await Member.findAll({ where: whereClause });
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No eligible members found'
      });
    }
    
    // Generate ledgers for each eligible member
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
    const year = now.getFullYear();
    const ledger_name = `${month}-${year}-${ledgerType.amount}`;
    
    // Calculate due date based on new duration system
    const due_date = ledgerType.calculateDueDate(now);
    
    const ledgerPromises = members.map(member => {
      return Ledger.create({
        ledger_type_id: ledgerType.id,
        ledger_name,
        member_id: member.id,
        invoice_created_at: now,
        due_date,
        amount: ledgerType.amount,
        fee: 0, // Initial fee is 0
        total_amount: ledgerType.amount,
        invoice_status: 1 // Pending
      });
    });
    
    const createdLedgers = await Promise.all(ledgerPromises);
    
    res.status(201).json({
      success: true,
      message: `Created ${createdLedgers.length} ledgers for eligible members`,
      count: createdLedgers.length
    });
  } catch (error) {
    console.error('Error generating ledgers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;