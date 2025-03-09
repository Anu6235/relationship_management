const express = require('express');
const router = express.Router();
const { Ledger, LedgerType, Member, User } = require('../models');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

//Get all ledgers
router.get('/', protect, async (req, res) => {
    try {
        const ledgers = await Ledger.findAll({
            include: [
                { model: LedgerType, as: 'ledgerType' },
                { model: Member, as: 'member' }
            ]
        });
        
        // Recalculate fines for pending/overdue ledgers
        const updatedLedgers = await Promise.all(
            ledgers.map(async ledger => {
                if (ledger.invoice_status === 1 || ledger.invoice_status === 3) {
                    return await ledger.recalculateFine(Ledger.sequelize.models);
                }
                return ledger;
            })
        );
        
        res.status(200).json({
            success: true,
            data: updatedLedgers
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
        let ledger = await Ledger.findByPk(id, {
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
        
        // Recalculate fine if the ledger is pending or overdue
        if (ledger.invoice_status === 1 || ledger.invoice_status === 3) {
            ledger = await ledger.recalculateFine(Ledger.sequelize.models);
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
    const { 
      ledger_type_id, 
      member_id, 
      due_date, 
      amount, 
      invoice_status = 1 
    } = req.body;
    
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
    
    // Generate ledger name with ledger type name
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
    const year = now.getFullYear();
    const ledger_name = `${ledgerType.name.toLowerCase()}-${month}-${year}`;
    
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
      fine: 0.00,
      fine_last_calculated_at: null,
      total_amount: parseFloat(amount),
      invoice_status,
      paid_at: null
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
      
      // If marking as paid, recalculate fine first and set paid_at
      if (invoice_status === 2) {
        await ledger.recalculateFine(Ledger.sequelize.models);
        await ledger.update({ 
          invoice_status,
          paid_at: new Date()
        });
      } else {
        await ledger.update({ invoice_status });
      }
      
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
      
      let ledgers = await Ledger.findAll({
        where: { member_id: memberId },
        include: [{ model: LedgerType, as: 'ledgerType' }]
      });
      
      // Recalculate fines for pending/overdue ledgers
      ledgers = await Promise.all(
        ledgers.map(async ledger => {
          if (ledger.invoice_status === 1 || ledger.invoice_status === 3) {
            return await ledger.recalculateFine(Ledger.sequelize.models);
          }
          return ledger;
        })
      );
      
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

// Recalculate fines for all pending/overdue ledgers
router.post('/recalculate-fines', protect, adminOnly, async (req, res) => {
  try {
    // Get all pending or overdue ledgers
    const pendingLedgers = await Ledger.findAll({
      where: {
        invoice_status: {
          [Op.in]: [1, 3] // Pending or Overdue
        }
      },
      include: [{ model: LedgerType, as: 'ledgerType' }]
    });
    
    if (pendingLedgers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending or overdue ledgers found to recalculate'
      });
    }
    
    // Recalculate fines for each ledger
    const updatedLedgers = await Promise.all(
      pendingLedgers.map(async ledger => {
        return await ledger.recalculateFine(Ledger.sequelize.models);
      })
    );
    
    const updatedCount = updatedLedgers.filter(
      ledger => parseFloat(ledger.fine) > 0
    ).length;
    
    res.status(200).json({
      success: true,
      message: `Recalculated fines for ${pendingLedgers.length} ledgers. ${updatedCount} have fines.`,
      updatedCount
    });
  } catch (error) {
    console.error('Error recalculating fines:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Pay a ledger
router.post('/:id/pay', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const ledger = await Ledger.findByPk(id);
    
    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: 'Ledger not found'
      });
    }
    
    if (ledger.invoice_status === 2) {
      return res.status(400).json({
        success: false,
        message: 'Ledger has already been paid'
      });
    }
    
    if (ledger.invoice_status === 4) {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay a cancelled ledger'
      });
    }
    
    // Recalculate fine before marking as paid
    await ledger.recalculateFine(Ledger.sequelize.models);
    
    // Update the ledger status to paid
    await ledger.update({
      invoice_status: 2, // Paid
      paid_at: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Ledger paid successfully',
      data: ledger
    });
  } catch (error) {
    console.error('Error paying ledger:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get overdue ledgers
router.get('/overdue', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    
    // Find ledgers that are past their due date but not paid
    const overdueLegers = await Ledger.findAll({
      where: {
        due_date: {
          [Op.lt]: now // Due date is less than current date
        },
        invoice_status: {
          [Op.in]: [1, 3] // Pending or Already marked as Overdue
        }
      },
      include: [
        { model: LedgerType, as: 'ledgerType' },
        { model: Member, as: 'member' }
      ]
    });
    
    // Recalculate fines for all overdue ledgers
    const updatedLedgers = await Promise.all(
      overdueLegers.map(async ledger => {
        return await ledger.recalculateFine(Ledger.sequelize.models);
      })
    );
    
    res.status(200).json({
      success: true,
      count: updatedLedgers.length,
      data: updatedLedgers
    });
  } catch (error) {
    console.error('Error fetching overdue ledgers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;