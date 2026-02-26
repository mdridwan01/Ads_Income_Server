const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    referralBonus: {
      userBonus: {
        type: Number,
        default: 50,
        min: 0,
        description: 'Bonus amount for user who applies the code',
      },
      ownerBonusPercentage: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
        description: 'Percentage of bonus for the referral code owner',
      },
      signupBonusPerReferral: {
        type: Number,
        default: 100,
        min: 0,
        description: 'Bonus amount for referral code owner per signup',
      },
    },
    adsSettings: {
      bonusPerAd: {
        type: Number,
        default: 10,
        min: 0,
      },
    },
    cryptoWallets: {
      trc20: { type: String, default: '' },
      erc20: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
