const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  level_target: {
    type: Number,
    required: true,
  },
  network: {
    type: String,
    enum: ['TRC20', 'ERC20'],
    required: true,
  },
  wallet_address: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  tx_hash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },
  ip_address: String,
  expires_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Mark deposits expired automatically if past expires_at
depositSchema.methods.checkExpire = function () {
  if (this.status === 'pending' && this.expires_at && this.expires_at < new Date()) {
    this.status = 'expired';
  }
};

module.exports = mongoose.model('Deposit', depositSchema);
