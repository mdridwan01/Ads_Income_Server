const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Minimum transfer amount is 1 USDT'],
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
    transactionId: {
      type: String,
      unique: true,
    },
    processedDetails: {
      ipAddress: String,
      deviceInfo: String,
      processedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transfer', transferSchema);