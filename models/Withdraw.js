const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [200, 'Minimum withdrawal amount is 200 TK'],
    },
    withdrawalMethod: {
      type: String,
      enum: ['bkash', 'nagad'],
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    adminApprovalBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    rejectionReason: String,
    transactionId: String,
    processedDetails: {
      ipAddress: String,
      deviceInfo: String,
      processedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Withdraw', withdrawSchema);
