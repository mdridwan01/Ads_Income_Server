const express = require('express');
const {
  getDashboardStats,
  getAllUsersStats,
  getActivityLogs,
  adminLogin,
  getAllReferralCodes,
  disableReferralCode,
  enableReferralCode,
  getReferralStats,
  getSettings,
  updateReferralSettings,
  updateSignupBonusSettings,
  clearSuspiciousFlag,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/stats', protect, adminOnly, getDashboardStats);
router.get('/users', protect, adminOnly, getAllUsersStats);
router.get('/logs', protect, adminOnly, getActivityLogs);
router.get('/referrals', protect, adminOnly, getAllReferralCodes);
router.get('/referral-stats', protect, adminOnly, getReferralStats);
router.put('/referral/:userId/disable', protect, adminOnly, disableReferralCode);
router.put('/referral/:userId/enable', protect, adminOnly, enableReferralCode);
router.get('/settings', protect, adminOnly, getSettings);
router.put('/settings/referral', protect, adminOnly, updateReferralSettings);
router.put('/settings/signup-bonus', protect, adminOnly, updateSignupBonusSettings);
router.put('/users/:userId/clear-suspicious', protect, adminOnly, clearSuspiciousFlag);

// crypto wallet addresses
router.get('/wallets', protect, adminOnly, require('../controllers/adminController').getWalletAddresses);
router.put('/wallets', protect, adminOnly, require('../controllers/adminController').updateWalletAddresses);

module.exports = router;
