const Withdraw = require('../models/Withdraw');
const User = require('../models/User');

// Request withdraw
exports.requestWithdraw = async (req, res) => {
  try {
    const { amount, withdrawalMethod, phoneNumber, walletAddress, fundPassword } = req.body;
    const userId = req.user.id;

    // Validate fund password
    if (!fundPassword) {
      return res.status(400).json({
        success: false,
        message: 'Fund password is required',
      });
    }

    const user = await User.findById(userId).select('+fundPassword');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify fund password
    const isPasswordValid = await user.matchFundPassword(fundPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid fund password' });
    }

    // only level 5 users allowed
    if (user.level < 5) {
      return res.status(403).json({
        success: false,
        message: 'Complete higher levels to unlock withdrawals',
      });
    }
    // cooldown 24h
    if (user.last_withdraw_at && new Date() - new Date(user.last_withdraw_at) < 24 * 60 * 60 * 1000) {
      const next = new Date(user.last_withdraw_at.getTime() + 24 * 60 * 60 * 1000);
      return res.status(400).json({
        success: false,
        message: `Withdrawal cooldown active until ${next.toLocaleString()}`,
      });
    }
    if (user.is_suspicious) {
      return res.status(403).json({
        success: false,
        message: 'Account flagged for suspicious activity, withdrawal blocked',
      });
    }
    if (amount < 200) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is 200 USDT',
      });
    }

    if (user.wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // method-specific address validation
    if (withdrawalMethod === 'TRC20' || withdrawalMethod === 'ERC20') {
      if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'Wallet address is required for crypto withdrawals' });
      }
    } else {
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
    }

    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const withdraw = new Withdraw({
      userId,
      amount,
      withdrawalMethod,
      walletAddress,
      phoneNumber,
      processedDetails: {
        ipAddress,
        deviceInfo,
      },
    });

    await withdraw.save();

    // Deduct from available balance (held for pending)
    user.wallet.availableBalance -= amount;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      withdraw,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get withdraw history
exports.getWithdrawHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = { userId };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const withdrawals = await Withdraw.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Withdraw.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      withdrawals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all withdrawals (admin only)
exports.getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const withdrawals = await Withdraw.find(query)
      .populate('userId', 'username email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Withdraw.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      withdrawals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Approve withdraw (admin only)
exports.approveWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.params;
    const { transactionId } = req.body;

    const withdraw = await Withdraw.findById(withdrawId);
    if (!withdraw) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdraw.status = 'approved';
    withdraw.adminApprovalBy = req.user.id;
    withdraw.approvalDate = new Date();
    withdraw.transactionId = transactionId;
    await withdraw.save();

    // update user last_withdraw_at
    const user = await User.findById(withdraw.userId);
    if (user) {
      user.last_withdraw_at = new Date();
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal approved',
      withdraw,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject withdraw (admin only)
exports.rejectWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.params;
    const { reason } = req.body;

    const withdraw = await Withdraw.findById(withdrawId);

    if (!withdraw) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    // Refund to user wallet
    const user = await User.findById(withdraw.userId);
    user.wallet.availableBalance += withdraw.amount;
    await user.save();

    withdraw.status = 'rejected';
    withdraw.rejectionReason = reason;
    await withdraw.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal rejected and amount refunded',
      withdraw,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark withdraw as completed (admin only)
exports.completeWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.params;

    const withdraw = await Withdraw.findByIdAndUpdate(
      withdrawId,
      {
        status: 'completed',
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Withdrawal marked as completed',
      withdraw,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// public: get all completed withdrawals (live feed with masked user info)
exports.getPublicWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const withdrawals = await Withdraw.find({ status: 'completed' })
      .populate('userId', 'username phone email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Mask user information
    const maskedWithdrawals = withdrawals.map((wd) => {
      // choose contact info - prefer walletAddress or phoneNumber on withdraw object,
      // fall back to user's registered phone if neither present
      const rawContact = wd.walletAddress || wd.phoneNumber || wd.userId?.phone || 'N/A';
      return {
        _id: wd._id,
        amount: wd.amount,
        withdrawalMethod: wd.withdrawalMethod,
        createdAt: wd.createdAt,
        username: maskUsername(wd.userId?.username || 'User'),
        contact: maskPhone(rawContact),
      };
    });

    const total = await Withdraw.countDocuments({ status: 'completed' });
    res.status(200).json({
      success: true,
      withdrawals: maskedWithdrawals,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper function to mask username (show first 2 chars + *)
function maskUsername(username) {
  if (!username || username.length <= 2) return '****';
  return username.substring(0, 2) + '*'.repeat(username.length - 2);
}

// Helper function to mask phone (show first 3 digits + *)
function maskPhone(phone) {
  if (!phone || phone.length <= 3) return '****';
  return phone.substring(0, 3) + '*'.repeat(phone.length - 3);
}
