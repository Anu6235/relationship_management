const { LedgerType, Member } = require('../models');

// Get all ledger types
exports.getAllLedgerTypes = async (req, res) => {
    try {
        const ledgerTypes = await LedgerType.findAll();
        res.status(200).json({
            success: true,
            data: ledgerTypes
        });
    } catch (error) {
        console.error('Error fetching ledger types:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get ledger type by ID
exports.getLedgerTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        const ledgerType = await LedgerType.findByPk(id);
        
        if (!ledgerType) {
            return res.status(404).json({
                success: false,
                message: 'Ledger type not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: ledgerType
        });
    } catch (error) {
        console.error('Error fetching ledger type:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create a new ledger type
exports.createLedgerType = async (req, res) => {
    try {
        const { 
            name, 
            description, 
            amount, 
            is_active, 
            start_date,
            duration_value, 
            duration_unit, 
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config 
        } = req.body;
        
        const newLedgerType = await LedgerType.create({
            name,
            description,
            amount,
            is_active,
            start_date: start_date || new Date(),
            duration_value,
            duration_unit,
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config
        });
        
        res.status(201).json({
            success: true,
            data: newLedgerType
        });
    } catch (error) {
        console.error('Error creating ledger type:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update a ledger type
exports.updateLedgerType = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            amount, 
            is_active, 
            start_date,
            duration_value, 
            duration_unit, 
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config 
        } = req.body;
        
        const ledgerType = await LedgerType.findByPk(id);
        
        if (!ledgerType) {
            return res.status(404).json({
                success: false,
                message: 'Ledger type not found'
            });
        }
        
        // Ensure start_date is properly converted
        const processedStartDate = start_date 
            ? new Date(start_date) 
            : new Date(); // Default to current date if not provided
        
        await ledgerType.update({
            name,
            description,
            amount,
            is_active,
            start_date: processedStartDate, // Use processed date
            duration_value,
            duration_unit,
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config
        });
        
        res.status(200).json({
            success: true,
            data: ledgerType
        });
        console.log('Received start_date:', start_date);

    } catch (error) {
        console.error('Error updating ledger type:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle ledger type activation
exports.toggleLedgerTypeActivation = async (req, res) => {
    try {
        const { id } = req.params;
        
        const ledgerType = await LedgerType.findByPk(id);
        
        if (!ledgerType) {
            return res.status(404).json({
                success: false,
                message: 'Ledger type not found'
            });
        }
        
        await ledgerType.update({
            is_active: !ledgerType.is_active
        });
        
        res.status(200).json({
            success: true,
            data: ledgerType
        });
    } catch (error) {
        console.error('Error toggling ledger type activation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete a ledger type
exports.deleteLedgerType = async (req, res) => {
    try {
        const { id } = req.params;
        
        const ledgerType = await LedgerType.findByPk(id);
        
        if (!ledgerType) {
            return res.status(404).json({
                success: false,
                message: 'Ledger type not found'
            });
        }
        
        await ledgerType.destroy();
        
        res.status(200).json({
            success: true,
            message: 'Ledger type deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ledger type:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check which members would qualify for a specific ledger type
exports.getEligibleMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const ledgerType = await LedgerType.findByPk(id);
        
        if (!ledgerType) {
            return res.status(404).json({
                success: false,
                message: 'Ledger type not found'
            });
        }
        
        // Get all members and filter based on the ledger type's applicability method
        const members = await Member.findAll({
            attributes: ['id', 'first_name', 'last_name', 'email', 'status', 'gender', 'marital_status', 'deceased']
        });
        
        // Filter members using the ledger type's isApplicableToMember method
        const eligibleMembers = members.filter(member => 
            ledgerType.isApplicableToMember(member)
        );
        
        res.status(200).json({
            success: true,
            count: eligibleMembers.length,
            data: eligibleMembers
        });
    } catch (error) {
        console.error('Error finding eligible members:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
