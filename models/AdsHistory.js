const mongoose = require('mongoose');

const adsHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adType: {
      type: String,
      enum: ['video', 'banner', 'poster'],
      required: true,
    },
    adProvider: {
      type: String,
      default: 'AdCash',
    },
    amountEarned: {
      type: Number,
      required: true,
    },
    adProviderId: String,
    status: {
      type: String,
      enum: ['started', 'completed', 'failed'],
      default: 'started',
    },
    completionTime: Date,
    ipAddress: String,
    deviceInfo: String,
    adTitle: String,
    adDescription: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdsHistory', adsHistorySchema);
