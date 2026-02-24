const express = require('express');
const {
  requestWithdraw,
  getWithdrawHistory,
  getAllWithdrawals,
  approveWithdraw,
  rejectWithdraw,
  completeWithdraw,
} = require('../controllers/withdrawController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/request', protect, requestWithdraw);
router.get('/history', protect, getWithdrawHistory);

// Admin routes
router.get('/all', protect, adminOnly, getAllWithdrawals);
router.put('/:withdrawId/approve', protect, adminOnly, approveWithdraw);
router.put('/:withdrawId/reject', protect, adminOnly, rejectWithdraw);
router.put('/:withdrawId/complete', protect, adminOnly, completeWithdraw);

module.exports = router;
