const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: 3,
    },
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: 3,
      match: [/^[^\s]+$/, 'Username cannot contain spaces'],
    },
    uid: {
      type: String,
      unique: true,
      index: true,
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
    fundPassword: {
      type: String,
      required: [true, 'Please provide a fund password'],
      minlength: 4,
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
    // unique user id for P2P transfers
    uid: {
      type: String,
      unique: true,
      index: true,
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
  if (!this.isModified('password') && !this.isModified('fundPassword')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified('fundPassword')) {
    this.fundPassword = await bcrypt.hash(this.fundPassword, salt);
  }

  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to compare fund password
userSchema.methods.matchFundPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.fundPassword);
};


// before saving, ensure uid exists
userSchema.pre('save', function(next) {
  if (!this.uid) {
    // generate a short unique identifier, 8 chars hex
    this.uid = crypto.randomBytes(4).toString('hex');
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
