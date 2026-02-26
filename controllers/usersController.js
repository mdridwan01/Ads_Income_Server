const User = require('../models/User');
const Level = require('../models/Level');
const Deposit = require('../models/Deposit');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    // fetch current and next level info
    const currentLevel = await Level.findOne({ id: user.level });
    const nextLevel = await Level.findOne({ id: user.level + 1 });

    // compute withdrawal cooldown remaining (ms)
    let cooldownRemaining = 0;
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    if (user.last_withdraw_at) {
      const nextAllowed = new Date(user.last_withdraw_at.getTime() + COOLDOWN_MS);
      const now = new Date();
      if (nextAllowed > now) cooldownRemaining = nextAllowed - now;
    }

    const withdrawalAllowed = user.level >= 5 && !user.is_suspicious && cooldownRemaining === 0;

    // total approved deposits amount
    // prefer wallet.depositBalance if available
    let totalDeposits = user.wallet.depositBalance || 0;
    if (!totalDeposits) {
      const agg = await Deposit.aggregate([
        { $match: { userId: user._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      totalDeposits = agg.length ? agg[0].total : 0;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
        referral: user.referral,
        withdrawalMethod: user.withdrawalMethod,
        withdrawalPhoneNumber: user.withdrawalPhoneNumber,
        isBlocked: user.isBlocked,
        level: user.level,
        level_name: currentLevel ? currentLevel.name : null,
        level_badge: currentLevel
          ? { name: currentLevel.badge_name || currentLevel.name, color: currentLevel.badge_color }
          : null,
        next_level_price: nextLevel ? nextLevel.price : null,
        withdrawal_allowed: withdrawalAllowed,
        cooldown_remaining: cooldownRemaining,
        total_deposits: totalDeposits,
        is_suspicious: user.is_suspicious,
        last_withdraw_at: user.last_withdraw_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { phone, withdrawalMethod, withdrawalPhoneNumber, adTypes } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(phone && { phone }),
        ...(withdrawalMethod && { withdrawalMethod }),
        ...(withdrawalPhoneNumber && { withdrawalPhoneNumber }),
        ...(adTypes && { adTypes }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        withdrawalMethod: user.withdrawalMethod,
        withdrawalPhoneNumber: user.withdrawalPhoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get wallet
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      wallet: user.wallet,
      level: user.level,
      last_withdraw_at: user.last_withdraw_at,
      is_suspicious: user.is_suspicious,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update wallet (for internal use)
exports.updateWallet = async (req, res) => {
  try {
    const { userId, amount, type } = req.body; // type: ads or referral

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.wallet.totalIncome += amount;
    if (type === 'ads') {
      user.wallet.adsIncome += amount;
    } else if (type === 'referral') {
      user.wallet.referralIncome += amount;
    }
    user.wallet.availableBalance += amount;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Wallet updated',
      wallet: user.wallet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, isBlocked } = req.query;

    let query = {};

    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      };
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
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

// Block/Unblock user
exports.blockUnblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBlocked,
        ...(isBlocked && reason && { blockReason: reason }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: isBlocked ? 'User blocked' : 'User unblocked',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user profile (for user settings)
exports.updateUserProfile = async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
        referral: user.referral,
        withdrawalMethod: user.withdrawalMethod,
        withdrawalPhoneNumber: user.withdrawalPhoneNumber,
        isBlocked: user.isBlocked,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update withdrawal settings
exports.updateWithdrawalSettings = async (req, res) => {
  try {
    const { withdrawalMethod, withdrawalPhoneNumber } = req.body;
    const userId = req.user.id;

    if (!withdrawalMethod || !withdrawalPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both withdrawal method and phone number',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { withdrawalMethod, withdrawalPhoneNumber },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal settings updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
        withdrawalMethod: user.withdrawalMethod,
        withdrawalPhoneNumber: user.withdrawalPhoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin: Update user details
exports.adminUpdateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, phone, level, is_suspicious } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update allowed fields
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (level !== undefined) user.level = parseInt(level);
    if (is_suspicious !== undefined) user.is_suspicious = Boolean(is_suspicious);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        level: user.level,
        is_suspicious: user.is_suspicious,
        wallet: user.wallet,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
