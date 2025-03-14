const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ledgerController = require('../controllers/ledgerController');

// Get all ledgers
router.get('/', protect, ledgerController.getAllLedgers);

// Get overdue ledgers 
router.get('/overdue', protect, ledgerController.getOverdueLedgers);

// Get ledgers for a specific member
router.get('/member/:memberId', protect, ledgerController.getLedgersByMemberId);

// Get ledger by ID 
router.get('/:id', protect, ledgerController.getLedgerById);

// Create a new ledger
router.post('/', protect, ledgerController.createLedger);

// Update ledger status
router.put('/:id/status', protect, ledgerController.updateLedgerStatus);

// Recalculate fines for all pending/overdue ledgers
router.post('/recalculate-fines', protect, ledgerController.recalculateAllFines);

// Pay a ledger
router.post('/:id/pay', protect, ledgerController.payLedger);

// // Generate ledgers for a ledger type
// router.post('/generate/:ledgerTypeId', protect, ledgerController.generateLedgers);

// // Generate ledgers for a ledger type
// router.post('/generate/all', protect, ledgerController.generateLedgers);

// Delete a ledger
router.delete('/:id', ledgerController.deleteLedger);

// Add this to your routes file (e.g., routes/ledgerRoutes.js)
router.post('/scheduler/trigger', async (req, res) => {
    try {
      const { ledgerTypeId } = req.body;
      
      // If specific ledger type provided, only process that one
      if (ledgerTypeId) {
        const ledgerType = await LedgerType.findByPk(ledgerTypeId);
        if (!ledgerType) {
          return res.status(404).json({
            success: false,
            message: 'Ledger type not found'
          });
        }
        
        const { generateLedgersForType } = require('../utils/ledgerScheduler');
        const generatedCount = await generateLedgersForType(ledgerType);
        
        return res.status(200).json({
          success: true,
          message: `Manually triggered ledger generation for ${ledgerType.name}`,
          generatedCount
        });
      }
      
      // Otherwise, process all active ledger types
      const { startScheduler, stopScheduler } = require('../utils/ledgerScheduler');
      
      // Force a scheduler run
      stopScheduler();
      const success = startScheduler('* * * * *'); // Run immediately
      
      return res.status(200).json({
        success: true,
        message: 'Manually triggered ledger scheduler run',
        schedulerStarted: success
      });
    } catch (error) {
      console.error('Error triggering scheduler:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

module.exports = router;