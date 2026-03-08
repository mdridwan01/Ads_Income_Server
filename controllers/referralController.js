const User = require('../models/User');
const Settings = require('../models/Settings');

// Get referral info
exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('referral.referredBy', 'username email');
    
    // Get settings to include signup bonus
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      referralInfo: {
        referralCode: user.referral.referralCode,
        referredBy: user.referral.referredBy,
        referralCount: user.referral.referralCount,
        referralIncome: user.wallet.referralIncome,
        signupBonusPerReferral: settings.referralBonus.signupBonusPerReferral,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get referrals list
exports.getReferralsList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const referrals = await User.find({ 'referral.referredBy': userId })
      .select('username email phone referral wallet.referralIncome createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ 'referral.referredBy': userId });

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      referrals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Share referral link
exports.shareReferralLink = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referral.referralCode}`;

    res.status(200).json({
      success: true,
      referralLink,
      referralCode: user.referral.referralCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Apply Referral Code (After Registration)
exports.applyReferralCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a referral code',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a referrer (already applied a referral code)
    if (user.referral.referredBy) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied a referral code',
      });
    }

    // Check if the referral code is the user's own code
    if (user.referral.referralCode === referralCode) {
      return res.status(400).json({
        success: false,
        message: 'You cannot use your own referral code',
      });
    }

    // Find the referrer
    const referrer = await User.findOne({ 'referral.referralCode': referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    // Check if referral is disabled
    if (referrer.referral.isDisabled) {
      return res.status(400).json({
        success: false,
        message: 'This referral code is no longer active',
      });
    }

    // Get dynamic settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    const REFERRAL_BONUS = settings.referralBonus.userBonus;
    const OWNER_BONUS_PERCENTAGE = settings.referralBonus.ownerBonusPercentage / 100;
    const ownerBonus = REFERRAL_BONUS * OWNER_BONUS_PERCENTAGE;

    // Update current user
    user.referral.referredBy = referrer._id;
    user.wallet.referralIncome += REFERRAL_BONUS;
    user.wallet.totalIncome += REFERRAL_BONUS;
    user.wallet.availableBalance += REFERRAL_BONUS;
    await user.save();

    // Update referrer with owner bonus
    referrer.referral.referralCount += 1;
    referrer.wallet.referralIncome += ownerBonus;
    referrer.wallet.totalIncome += ownerBonus;
    referrer.wallet.availableBalance += ownerBonus;
    await referrer.save();

    res.status(200).json({
      success: true,
      message: `Referral code applied successfully! You got ${REFERRAL_BONUS} USDT bonus`,
      wallet: user.wallet,
      referralInfo: {
        referralCode: user.referral.referralCode,
        referredBy: user.referral.referredBy,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
