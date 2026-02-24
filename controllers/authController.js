const User = require('../models/User');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Generate Referral Code
const generateReferralCode = () => {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
};

//  Register User
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    // Get dynamic settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      phone,
      referral: {
        referralCode: generateReferralCode(),
      },
    });

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ 'referral.referralCode': referralCode });
      if (referrer) {
        user.referral.referredBy = referrer._id;
        referrer.referral.referralCount += 1;
        const signupBonus = settings.referralBonus.signupBonusPerReferral;
        referrer.wallet.referralIncome += signupBonus;
        referrer.wallet.totalIncome += signupBonus;
        await referrer.save();
      }
    }

    await user.save();

    // Get user device info
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Update login history
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress,
      deviceInfo,
    });
    user.lastLogin = {
      timestamp: new Date(),
      ipAddress,
    };
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        wallet: user.wallet,
        referral: user.referral,
        withdrawalMethod: user.withdrawalMethod || '',
        withdrawalPhoneNumber: user.withdrawalPhoneNumber || '',
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

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked',
        blockReason: user.blockReason,
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Anti-fraud: Check for concurrent login from different IPs
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Update login history
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress,
      deviceInfo,
    });

    // Keep only last 10 login records
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(-10);
    }

    user.lastLogin = {
      timestamp: new Date(),
      ipAddress,
    };

    await user.save();

    // Create token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        wallet: user.wallet,
        referral: user.referral,
        withdrawalMethod: user.withdrawalMethod || '',
        withdrawalPhoneNumber: user.withdrawalPhoneNumber || '',
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

// Verify Token
exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        wallet: user.wallet,
        referral: user.referral,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Logout
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
