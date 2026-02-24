const mongoose = require('mongoose');

const adsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    adType: {
      type: String,
      enum: ['video', 'banner', 'poster'],
      required: true,
    },
    mediaUrl: {
      type: String,
      // For direct video files (mp4, etc.). May be omitted if using a VAST tag.
    },
    vastUrl: {
      type: String,
      // Optional VAST tag URL when integrating with an ad exchange or third-party network
    },
    redirectUrl: String,
    rewardAmount: {
      type: Number,
      required: true,
    },
    dailyLimit: Number,
    viewCount: {
      type: Number,
      default: 0,
    },
    completionCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    provider: String,
    providerAdId: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ads', adsSchema);
