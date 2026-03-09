const Deposit = require('../models/Deposit');
const Level = require('../models/Level');
const User = require('../models/User');
const Settings = require('../models/Settings');

// user creates a deposit request
exports.createDeposit = async (req, res) => {
  try {
    const { deposit_type, level_target, network, wallet_address, amount, tx_hash } = req.body;
    console.log('Deposit request received:', { deposit_type, level_target, network, amount, tx_hash: tx_hash ? 'present' : 'missing' });
    
    // Validate deposit_type is provided
    if (!deposit_type) {
      return res.status(400).json({ success: false, message: 'deposit_type is required' });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;

    // basic validation
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Get platform wallet if not provided
    let finalWalletAddress = wallet_address;
    if (!finalWalletAddress) {
      const settings = await Settings.findOne();
      if (!settings) {
        return res.status(400).json({ success: false, message: 'Platform wallet not configured' });
      }
      
      if (network === 'TRC20') {
        finalWalletAddress = settings.cryptoWallets.trc20;
      } else if (network === 'ERC20') {
        finalWalletAddress = settings.cryptoWallets.erc20;
      }
      
      if (!finalWalletAddress) {
        return res.status(400).json({ success: false, message: `${network} wallet not configured` });
      }
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

  // Handle level_upgrade type
    if (deposit_type === 'level_upgrade') {
      console.log('Processing level upgrade with level_target:', level_target);
      if (!level_target) {
        return res.status(400).json({ success: false, message: 'Level target required for level upgrade' });
      }

      const lvl = await Level.findOne({ id: level_target, is_active: true });
      if (!lvl) {
        console.log('Level not found for id:', level_target);
        return res.status(400).json({ success: false, message: 'Invalid level target' });
      }

      // ensure user is eligible (level_target = user.level+1)
      if (level_target !== user.level + 1) {
        return res.status(400).json({ success: false, message: 'Cannot skip or repeat levels' });
      }

      // ensure amount meets next level price
      if (amount < lvl.price) {
        return res.status(400).json({ success: false, message: 'Amount is less than required level price' });
      }
    }
    // Handle quick_deposit type - no level restrictions
    else if (deposit_type === 'quick_deposit') {
      console.log('Processing quick deposit');
      // tx_hash is required for quick deposits
      if (!tx_hash || tx_hash === 'auto-generated') {
        return res.status(400).json({ success: false, message: 'Transaction hash is required' });
      }

      // Minimum deposit amount for quick deposits (e.g., 1 USDT)
      const MIN_QUICK_DEPOSIT = 1;
      if (amount < MIN_QUICK_DEPOSIT) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is ${MIN_QUICK_DEPOSIT} USDT` });
      }

      // No restrictions on multiple pending quick deposits
    }
    // If deposit_type is neither, return error
    else {
      return res.status(400).json({ success: false, message: 'Invalid deposit type' });
    }

    // ensure tx_hash not already used (primary uniqueness check) - for quick deposits only
    if (tx_hash && tx_hash !== 'auto-generated') {
      const txUsed = await Deposit.findOne({ tx_hash });
      if (txUsed) {
        return res.status(400).json({ success: false, message: 'Transaction hash already used' });
      }
    }

    // Generate unique tx_hash for level upgrades
    let finalTxHash = tx_hash;
    if (deposit_type === 'level_upgrade' || !finalTxHash || finalTxHash === 'auto-generated') {
      // Generate unique hash format: LEVEL_<userId>_<timestamp>_<random>
      finalTxHash = `LEVEL_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // create deposit expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const deposit = new Deposit({
      userId,
      deposit_type,
      level_target: deposit_type === 'level_upgrade' ? level_target : null, // Ensure level_target is null for quick deposits
      network,
      wallet_address: finalWalletAddress,
      amount,
      tx_hash: finalTxHash,
      ip_address: ipAddress,
      expires_at: expiresAt,
    });

    await deposit.save();
    res.status(201).json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// get user's deposits
exports.getMyDeposits = async (req, res) => {
  try {
    const userId = req.user.id;
    // expire pending deposits that have passed
    await Deposit.updateMany(
      { userId, status: 'pending', expires_at: { $lt: new Date() } },
      { status: 'expired' }
    );

    const deposits = await Deposit.find({ userId }).sort({ created_at: -1 });
    res.status(200).json({ success: true, deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: list deposits with filters
exports.getAllDeposits = async (req, res) => {
  try {
    const { status, network, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (network) query.network = network;

    const skip = (page - 1) * limit;
    const deposits = await Deposit.find(query)
      .populate('userId', 'username email level')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });
    const total = await Deposit.countDocuments(query);
    res.status(200).json({ success: true, total, pages: Math.ceil(total / limit), deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: approve deposit
exports.approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    if (deposit.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Deposit is not pending' });
    }

    if (deposit.expires_at && deposit.expires_at < new Date()) {
      deposit.status = 'expired';
      await deposit.save();
      return res.status(400).json({ success: false, message: 'Deposit has expired' });
    }

    const user = await User.findById(deposit.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // ensure tx_hash hasn't been approved elsewhere (double-spend)
    const approvedTx = await Deposit.findOne({ tx_hash: deposit.tx_hash, status: 'approved', _id: { $ne: deposit._id } });
    if (approvedTx) {
      return res.status(400).json({ success: false, message: 'Transaction already approved for another deposit' });
    }

    // Handle level_upgrade deposits
    if (deposit.deposit_type === 'level_upgrade') {
      // ensure amount sufficient
      const lvl = await Level.findOne({ id: deposit.level_target });
      if (!lvl) return res.status(400).json({ success: false, message: 'Invalid level' });
      if (deposit.amount < lvl.price) {
        return res.status(400).json({ success: false, message: 'Amount less than required price' });
      }

      // Check user level matches
      if (user.level + 1 !== deposit.level_target) {
        return res.status(400).json({ success: false, message: 'User level mismatch' });
      }

      // Upgrade user level
      user.level = deposit.level_target;
    }

    // Add deposit amount to wallet balances (for both types)
    user.wallet.depositBalance = (user.wallet.depositBalance || 0) + deposit.amount;
    user.wallet.availableBalance += deposit.amount;
    user.wallet.totalIncome += deposit.amount; // treat deposit as income

    await user.save();

    deposit.status = 'approved';
    deposit.approved_at = new Date();
    await deposit.save();

    // return updated user info as well
    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({ success: true, deposit, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: reject deposit
exports.rejectDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    if (deposit.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Deposit is not pending' });
    }

    deposit.status = 'rejected';
    deposit.rejection_reason = reason;
    await deposit.save();
    res.status(200).json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// public: get all approved deposits (live feed with masked user info)
exports.getPublicDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const deposits = await Deposit.find({ status: 'approved' })
      .populate('userId', 'username phone email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });

    // Mask user information
    const maskedDeposits = deposits.map((dep) => ({
      _id: dep._id,
      amount: dep.amount,
      level_target: dep.level_target,
      network: dep.network,
      created_at: dep.created_at,
      username: maskUsername(dep.userId?.username || 'User'),
      phone: maskPhone(dep.userId?.phone || 'N/A'),
    }));

    const total = await Deposit.countDocuments({ status: 'approved' });
    res.status(200).json({
      success: true,
      deposits: maskedDeposits,
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
