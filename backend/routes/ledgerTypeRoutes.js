const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ledgerTypeController = require('../controllers/ledgerTypeController');

// Get all ledger types
router.get('/', protect, ledgerTypeController.getAllLedgerTypes);

// Get ledger type by ID
router.get('/:id', protect, ledgerTypeController.getLedgerTypeById);

// Create a new ledger type
router.post('/', protect, ledgerTypeController.createLedgerType);

// Update a ledger type
router.put('/:id', protect, ledgerTypeController.updateLedgerType);

// Toggle ledger type activation
router.put('/:id/toggle-activation', protect, ledgerTypeController.toggleLedgerTypeActivation);

// Delete a ledger type
router.delete('/:id', protect, ledgerTypeController.deleteLedgerType);

// Check which members would qualify for a specific ledger type
router.get('/:id/eligible-members', protect, ledgerTypeController.getEligibleMembers);

module.exports = router;