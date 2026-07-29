const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer_sent', 'transfer_received', 'airtime', 'bill_payment'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  recipient: {
    type: String,
    default: null,
  },
  recipientPhone: {
    type: String,
    default: null,
  },
  reference: {
    type: String,
    unique: true,
    default: function() {
      return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    },
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  },
  description: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  sessionId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ status: 1 });

// Get transaction summary
transactionSchema.statics.getUserTransactions = async function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Transaction', transactionSchema);