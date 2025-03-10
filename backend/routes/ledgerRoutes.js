const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const ledgerController = require('../controllers/ledgerController');

// Get all ledgers
router.get('/', protect, ledgerController.getAllLedgers);

// Get ledger by ID
router.get('/:id', protect, ledgerController.getLedgerById);

// Create a new ledger
router.post('/', protect, adminOnly, ledgerController.createLedger);

// Update ledger status
router.put('/:id/status', protect, adminOnly, ledgerController.updateLedgerStatus);

// Get ledgers for a specific member
router.get('/member/:memberId', protect, ledgerController.getLedgersByMemberId);

// Recalculate fines for all pending/overdue ledgers
router.post('/recalculate-fines', protect, adminOnly, ledgerController.recalculateAllFines);

// Pay a ledger
router.post('/:id/pay', protect, ledgerController.payLedger);

// Get overdue ledgers
router.get('/overdue', protect, adminOnly, ledgerController.getOverdueLedgers);

module.exports = router;