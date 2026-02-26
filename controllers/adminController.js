const User = require('../models/User');
const AdsHistory = require('../models/AdsHistory');
const Withdraw = require('../models/Withdraw');
const Settings = require('../models/Settings');

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });

    const allUsersData = await User.find({ role: 'user' }).select('wallet');
    const totalIncome = allUsersData.reduce((sum, user) => sum + user.wallet.totalIncome, 0);

    const pendingWithdrawals = await Withdraw.countDocuments({ status: 'pending' });
    const totalWithdrawals = await Withdraw.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const adsCompleted = await AdsHistory.countDocuments({ status: 'completed' });

    const stats = {
      totalUsers,
      totalIncome: totalIncome.toFixed(2),
      pendingWithdrawals,
      totalWithdrawalAmount: totalWithdrawals[0]?.total || 0,
      totalAdsCompleted: adsCompleted,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users with stats
exports.getAllUsersStats = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let query = { role: 'user' };

    if (search) {
      query = {
        ...query,
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;

    let query = {};

    if (userId) {
      query.userId = userId;
    }

    const skip = (page - 1) * limit;

    const logs = await AdsHistory.find(query)
      .populate('userId', 'username email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AdsHistory.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email, role: 'admin' }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials',
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials',
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Manage wallet addresses
exports.getWalletAddresses = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.status(200).json({
      success: true,
      wallets: settings?.cryptoWallets || { trc20: '', erc20: '' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateWalletAddresses = async (req, res) => {
  try {
    const { trc20, erc20 } = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    settings.cryptoWallets = { trc20, erc20 };
    await settings.save();
    res.status(200).json({ success: true, wallets: settings.cryptoWallets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all referral codes
exports.getAllReferralCodes = async (req, res) => {
  try {
    const { search, status = 'all', page = 1, limit = 10 } = req.query;

    let query = {};
    
    if (search) {
      query = {
        $or: [
          { 'referral.referralCode': new RegExp(search, 'i') },
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      };
    }

    if (status === 'active') {
      query = { ...query, 'referral.isDisabled': false };
    } else if (status === 'disabled') {
      query = { ...query, 'referral.isDisabled': true };
    }

    const skip = (page - 1) * limit;

    const referralCodes = await User.find({ ...query, 'referral.referralCode': { $exists: true } })
      .select('username email referral.referralCode referral.referralCount referral.isDisabled wallet.referralIncome createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ ...query, 'referral.referralCode': { $exists: true } });

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      referralCodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Disable referral code
exports.disableReferralCode = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.referral.referralCode) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a referral code',
      });
    }

    user.referral.isDisabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Referral code disabled successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        referralCode: user.referral.referralCode,
        isDisabled: user.referral.isDisabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Enable referral code
exports.enableReferralCode = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.referral.referralCode) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a referral code',
      });
    }

    user.referral.isDisabled = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Referral code enabled successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        referralCode: user.referral.referralCode,
        isDisabled: user.referral.isDisabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get referral code statistics
exports.getReferralStats = async (req, res) => {
  try {
    const totalCodes = await User.countDocuments({ 'referral.referralCode': { $exists: true } });
    const activeCodes = await User.countDocuments({
      'referral.referralCode': { $exists: true },
      'referral.isDisabled': false,
    });
    const disabledCodes = totalCodes - activeCodes;

    const totalReferralBonus = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$wallet.referralIncome' } } },
    ]);

    const stats = {
      totalCodes,
      activeCodes,
      disabledCodes,
      totalReferralBonus: totalReferralBonus[0]?.total || 0,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // Create default settings if not found
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Referral Bonus Settings
exports.updateReferralSettings = async (req, res) => {
  try {
    const { userBonus, ownerBonusPercentage } = req.body;

    if (userBonus === undefined || ownerBonusPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userBonus and ownerBonusPercentage',
      });
    }

    if (userBonus < 0) {
      return res.status(400).json({
        success: false,
        message: 'User bonus cannot be negative',
      });
    }

    if (ownerBonusPercentage < 0 || ownerBonusPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Owner bonus percentage must be between 0 and 100',
      });
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    settings.referralBonus.userBonus = userBonus;
    settings.referralBonus.ownerBonusPercentage = ownerBonusPercentage;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Referral settings updated successfully',
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Signup Referral Bonus
exports.updateSignupBonusSettings = async (req, res) => {
  try {
    const { signupBonusPerReferral } = req.body;

    if (signupBonusPerReferral === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide signupBonusPerReferral',
      });
    }

    if (signupBonusPerReferral < 0) {
      return res.status(400).json({
        success: false,
        message: 'Signup bonus cannot be negative',
      });
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    settings.referralBonus.signupBonusPerReferral = signupBonusPerReferral;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Signup bonus settings updated successfully',
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Clear suspicious flag from user (admin only)
exports.clearSuspiciousFlag = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.is_suspicious) {
      return res.status(400).json({
        success: false,
        message: 'User is not flagged as suspicious',
      });
    }

    user.is_suspicious = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Suspicious flag cleared successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        is_suspicious: user.is_suspicious,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
