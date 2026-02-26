const express = require('express');
const router = express.Router();
const {
  createDeposit,
  getMyDeposits,
  getAllDeposits,
  getPublicDeposits,
  approveDeposit,
  rejectDeposit,
} = require('../controllers/depositController');
const { protect, adminOnly } = require('../middleware/auth');

// user routes
router.post('/', protect, createDeposit);
router.get('/my', protect, getMyDeposits);

// public routes
router.get('/public/all', getPublicDeposits);

// admin routes
router.get('/', protect, adminOnly, getAllDeposits);
router.put('/:depositId/approve', protect, adminOnly, approveDeposit);
router.put('/:depositId/reject', protect, adminOnly, rejectDeposit);

module.exports = router;