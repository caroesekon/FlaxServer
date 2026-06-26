const mongoose = require('mongoose');
const User = require('../models/client/User');
const Transaction = require('../models/client/Transaction');
const Financial = require('../models/admin/Financial');
const AppError = require('../utils/AppError');
const { LIMITS } = require('../utils/constants');

/**
 * Execute a send money transaction
 * @param {string} senderPhone - Normalized sender phone
 * @param {string} recipientPhone - Normalized recipient phone
 * @param {number} amount - Amount to send
 * @param {string} pin - Plain text PIN for verification
 * @returns {Object} { transaction, senderBalance }
 */
const sendMoney = async (senderPhone, recipientPhone, amount, pin) => {
    // Validate amount
    if (!amount || amount < LIMITS.MIN_SEND_AMOUNT) {
        throw new AppError(`Minimum amount is KES ${LIMITS.MIN_SEND_AMOUNT}`, 400);
    }

    // Get financial settings
    const financial = await Financial.getFinancial();
    if (amount > financial.maxSendAmount) {
        throw new AppError(`Maximum amount is KES ${financial.maxSendAmount}`, 400);
    }

    // Cannot send to self
    if (senderPhone === recipientPhone) {
        throw new AppError('Cannot send money to yourself', 400);
    }

    // Find sender
    const sender = await User.findOne({ phoneNumber: senderPhone });
    if (!sender) {
        throw new AppError('Sender not found', 404);
    }

    if (!sender.isActive) {
        throw new AppError('Account is locked', 403);
    }

    // Verify PIN
    const isPinValid = await sender.comparePin(pin);
    if (!isPinValid) {
        await sender.incrementPinAttempts();
        throw new AppError('Invalid PIN', 401);
    }

    // Reset PIN attempts on success
    await sender.resetPinAttempts();

    // Check balance
    const fee = financial.sendMoneyFlatFee + (amount * financial.sendMoneyPercentageFee / 100);
    const totalDeduct = amount + Math.round(fee);

    if (sender.balance < totalDeduct) {
        throw new AppError(`Insufficient balance. You have KES ${sender.balance}`, 400);
    }

    // Find recipient
    const recipient = await User.findOne({ phoneNumber: recipientPhone });
    if (!recipient) {
        throw new AppError('Recipient not found', 404);
    }

    if (!recipient.isActive) {
        throw new AppError('Recipient account is inactive', 400);
    }

    // Snapshot balances
    const senderBefore = sender.balance;
    const recipientBefore = recipient.balance;

    // Calculate new balances
    const senderAfter = sender.balance - totalDeduct;
    const recipientAfter = recipient.balance + amount;

    // Generate transaction ID
    const transactionId = Transaction.generateId();

    // Create transaction record
    const transaction = await Transaction.create({
        transactionId,
        senderPhone,
        recipientPhone,
        amount,
        fee: Math.round(fee),
        type: 'p2p_send',
        status: 'success',
        senderBalanceBefore: senderBefore,
        senderBalanceAfter: senderAfter,
        recipientBalanceBefore: recipientBefore,
        recipientBalanceAfter: recipientAfter,
        description: `Send KES ${amount} to ${recipientPhone}`
    });

    // Atomic balance update
    sender.balance = senderAfter;
    recipient.balance = recipientAfter;

    await sender.save();
    await recipient.save();

    return {
        transaction,
        senderBalance: senderAfter,
        recipient: recipientPhone
    };
};

module.exports = { sendMoney };