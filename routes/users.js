const express = require('express');
const {
  getProfile,
  updateProfile,
  getWallet,
  updateWallet,
  getAllUsers,
  blockUnblockUser,
  updateUserProfile,
  updateWithdrawalSettings,
  changePassword,
} = require('../controllers/usersController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/withdrawal-settings', protect, updateWithdrawalSettings);
router.put('/change-password', protect, changePassword);
router.get('/wallet', protect, getWallet);
router.put('/wallet', protect, updateWallet);

// Admin routes
router.get('/all', protect, adminOnly, getAllUsers);
router.put('/:userId/block', protect, adminOnly, blockUnblockUser);

module.exports = router;
