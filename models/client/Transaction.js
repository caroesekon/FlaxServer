const mongoose = require('mongoose');
const { generateTransactionId } = require('../../utils/helpers');
const { TRANSACTION_TYPES, TRANSACTION_STATUSES } = require('../../utils/constants');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    senderPhone: {
        type: String,
        required: true
    },
    recipientPhone: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    fee: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: TRANSACTION_TYPES,
        default: 'p2p_send'
    },
    status: {
        type: String,
        enum: TRANSACTION_STATUSES,
        default: 'pending'
    },
    senderBalanceBefore: {
        type: Number,
        required: true
    },
    senderBalanceAfter: {
        type: Number,
        required: true
    },
    recipientBalanceBefore: {
        type: Number,
        required: true
    },
    recipientBalanceAfter: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    failureReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes only (transactionId already indexed by unique: true)
transactionSchema.index({ senderPhone: 1, createdAt: -1 });
transactionSchema.index({ recipientPhone: 1, createdAt: -1 });

transactionSchema.statics.generateId = function () {
    return generateTransactionId();
};

module.exports = mongoose.model('Transaction', transactionSchema);