const { LedgerType, Member } = require('../models');
const { generateLedgersForType } = require('../utils/ledgerScheduler');
const { shouldGenerateLedger } = require('../utils/ledgerScheduler');

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

        let processedStartDate;
        if (start_date) {
            console.log('Processing start_date:', start_date);
            processedStartDate = new Date(start_date);
            
            if (isNaN(processedStartDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid start date format'
                });
            }
        } else {
            processedStartDate = new Date();
        }
        
        console.log('Processed start_date:', processedStartDate);
        
        const newLedgerType = await LedgerType.create({
            name,
            description,
            amount,
            is_active,
            start_date: processedStartDate,
            duration_value,
            duration_unit,
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config
        });
        
        // If ledger type is active, immediately generate ledgers
        if (newLedgerType.is_active) {
            try {
                const generatedCount = await generateLedgersForType(newLedgerType);
                
                return res.status(201).json({
                    success: true,
                    data: newLedgerType,
                    message: `Ledger type created and ${generatedCount || 0} ledgers generated`
                });
            } catch (genError) {
                console.error('Error generating initial ledgers:', genError);
                // Still return success for the create operation
                return res.status(201).json({
                    success: true,
                    data: newLedgerType,
                    message: 'Ledger type created but failed to generate initial ledgers'
                });
            }
        }
        
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
        
        // Save previous active state to check if it changed
        const wasActive = ledgerType.is_active;
        
        let processedStartDate;
        if (start_date) {
            console.log('Processing start_date:', start_date);
            processedStartDate = new Date(start_date);
            
            if (isNaN(processedStartDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid start date format'
                });
            }
        } else if (ledgerType.start_date) {
            processedStartDate = ledgerType.start_date;
        } else {
            processedStartDate = new Date();
        }
        
        console.log('Processed start_date:', processedStartDate);
        
        await ledgerType.update({
            name,
            description,
            amount,
            is_active,
            start_date: processedStartDate, 
            duration_value,
            duration_unit,
            fine_amount,
            fine_interval_value,
            fine_interval_unit,
            condition_config
        });
        
        // If ledger type was inactive and is now active, generate ledgers immediately
        if (!wasActive && ledgerType.is_active) {
            try {
                const generatedCount = await generateLedgersForType(ledgerType);
                
                return res.status(200).json({
                    success: true,
                    data: ledgerType,
                    message: `Ledger type updated and activated. ${generatedCount || 0} ledgers generated.`
                });
            } catch (genError) {
                console.error('Error generating ledgers after activation:', genError);
                return res.status(200).json({
                    success: true,
                    data: ledgerType,
                    message: 'Ledger type updated and activated but failed to generate ledgers immediately'
                });
            }
        }
        
        res.status(200).json({
            success: true,
            data: ledgerType
        });
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
        
        // Toggle the active status
        const newActiveStatus = !ledgerType.is_active;
        await ledgerType.update({
            is_active: newActiveStatus
        });
        
// If we're activating the ledger type, immediately generate ledgers
if (newActiveStatus) {
    try {
        // Generate ledgers immediately
        const generatedCount = await generateLedgersForType(ledgerType);
        
        return res.status(200).json({
            success: true,
            data: ledgerType,
            message: `Ledger type activated and ${generatedCount || 0} ledgers generated`
        });
    } catch (genError) {
        console.error('Error generating ledgers after activation:', genError);
        // Still return success for the toggle operation
        return res.status(200).json({
            success: true,
            data: ledgerType,
            message: 'Ledger type activated but failed to generate ledgers immediately'
        });
    }
} else {
    // If we're deactivating, simply return success
    return res.status(200).json({
        success: true,
        data: ledgerType,
        message: 'Ledger type deactivated successfully'
    });
}
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

// Build conditions from condition_config
const conditions = ledgerType.condition_config || {};
const whereClause = {};

// Map the conditions from the config to the database fields
Object.keys(conditions).forEach(key => {
    // Handle special case for 'deceased'
    if (key === 'deceased') {
        const boolValue = conditions[key].toLowerCase() === 'no' ? false : true;
        whereClause[key] = boolValue;
    } else {
        whereClause[key] = conditions[key];
    }
});

// Find members that match the conditions
const members = await Member.findAll({ 
    where: whereClause,
    attributes: ['id', 'first_name', 'last_name', 'email', 'status', 'gender', 'marital_status', 'deceased']
});

res.status(200).json({
    success: true,
    count: members.length,
    data: members
});
} catch (error) {
console.error('Error finding eligible members:', error);
res.status(500).json({
    success: false,
    message: error.message
});
}
};

// Generate ledgers manually for a specific ledger type
exports.generateLedgersManually = async (req, res) => {
try {
const { id } = req.params;
const ledgerType = await LedgerType.findByPk(id);

if (!ledgerType) {
    return res.status(404).json({
        success: false,
        message: 'Ledger type not found'
    });
}

// Even if ledger type is inactive, allow manual generation
const generatedCount = await generateLedgersForType(ledgerType);

res.status(200).json({
    success: true,
    message: `Successfully generated ${generatedCount || 0} ledgers`,
    data: {
        ledgerTypeId: ledgerType.id,
        ledgerTypeName: ledgerType.name,
        generatedCount: generatedCount || 0
    }
});
} catch (error) {
console.error('Error manually generating ledgers:', error);
res.status(500).json({
    success: false,
    message: error.message
});
}
};