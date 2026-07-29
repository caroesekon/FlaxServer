const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  pin: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastTransaction: {
    type: Date,
    default: null,
  },
  accountType: {
    type: String,
    enum: ['basic', 'premium', 'merchant'],
    default: 'basic',
  },
}, {
  timestamps: true,
});

// Index for faster queries
userSchema.index({ phoneNumber: 1 });

// Instance method to check if PIN is set
userSchema.methods.hasPin = function() {
  return !!this.pin;
};

// Instance method to check balance
userSchema.methods.canAfford = function(amount) {
  return this.balance >= amount;
};

module.exports = mongoose.model('User', userSchema);