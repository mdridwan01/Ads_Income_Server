const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      required: true,
    },
    wallet: {
      totalIncome: {
        type: Number,
        default: 0,
      },
      adsIncome: {
        type: Number,
        default: 0,
      },
      referralIncome: {
        type: Number,
        default: 0,
      },
      depositBalance: {
        type: Number,
        default: 0,
      },
      availableBalance: {
        type: Number,
        default: 0,
      },
    },
    referral: {
      referralCode: {
        type: String,
        unique: true,
        sparse: true,
      },
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      referralCount: {
        type: Number,
        default: 0,
      },
      isDisabled: {
        type: Boolean,
        default: false,
      },
    },
    loginHistory: [
      {
        timestamp: Date,
        ipAddress: String,
        deviceInfo: String,
      },
    ],
    lastLogin: {
      timestamp: Date,
      ipAddress: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: String,
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    withdrawalMethod: {
      type: String,
      enum: ['bkash', 'nagad'],
    },
    withdrawalPhoneNumber: String,
    adTypes: [
      {
        type: String,
        enum: ['video', 'banner', 'poster'],
      },
    ],
    level: {
      type: Number,
      default: 0,
    },
    last_withdraw_at: {
      type: Date,
      default: null,
    },
    ip_address: String,
    is_suspicious: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
