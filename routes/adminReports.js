const express = require('express');
const router = express.Router();
const {
  getRevenueStats,
  getRevenueByLevel,
  getRevenueByNetwork,
} = require('../controllers/adminReportsController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats', protect, adminOnly, getRevenueStats);
router.get('/revenue/level', protect, adminOnly, getRevenueByLevel);
router.get('/revenue/network', protect, adminOnly, getRevenueByNetwork);

module.exports = router;