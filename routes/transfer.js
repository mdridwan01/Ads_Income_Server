const express = require('express');
const router = express.Router();
const { transferBalance, getTransferHistory } = require('../controllers/transferController');
const { protect } = require('../middleware/auth');

// Transfer balance (P2P)
router.post('/transfer', protect, transferBalance);

// Get transfer history
router.get('/history', protect, getTransferHistory);

module.exports = router;