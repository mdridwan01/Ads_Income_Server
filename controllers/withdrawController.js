const Withdraw = require('../models/Withdraw');
const User = require('../models/User');

// Request withdraw
exports.requestWithdraw = async (req, res) => {
  try {
    const { amount, withdrawalMethod, phoneNumber } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (amount < 200) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is 200 TK',
      });
    }

    if (user.wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const withdraw = new Withdraw({
      userId,
      amount,
      withdrawalMethod,
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

    const withdraw = await Withdraw.findByIdAndUpdate(
      withdrawId,
      {
        status: 'approved',
        adminApprovalBy: req.user.id,
        approvalDate: new Date(),
        transactionId,
      },
      { new: true }
    );

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
