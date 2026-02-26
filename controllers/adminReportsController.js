const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw');
const Level = require('../models/Level');
const User = require('../models/User');

// returns summary numbers
exports.getRevenueStats = async (req, res) => {
  try {
    const totalLevelRevenue = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    const totalCryptoDeposits = await Deposit.countDocuments();
    const totalApprovedDeposits = await Deposit.countDocuments({ status: 'approved' });
    const pendingApprovals = await Deposit.countDocuments({ status: 'pending' });
    const totalWithdrawals = await Withdraw.countDocuments({ status: 'approved' });
    const suspiciousUsers = await User.countDocuments({ is_suspicious: true });

    res.status(200).json({
      success: true,
      totalLevelRevenue: totalLevelRevenue[0]?.sum || 0,
      totalCryptoDeposits,
      totalApprovedDeposits,
      pendingApprovals,
      totalWithdrawals,
      suspiciousUsers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// revenue by level
exports.getRevenueByLevel = async (req, res) => {
  try {
    const data = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$level_target', sum: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// revenue by network
exports.getRevenueByNetwork = async (req, res) => {
  try {
    const data = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$network', sum: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
