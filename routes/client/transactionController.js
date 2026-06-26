const Transaction = require('../../models/client/Transaction');
const { normalizePhone } = require('../../utils/helpers');

// @desc    Get user transaction history
// @route   GET /api/transactions/:phoneNumber
// @access  Public
const getHistory = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) return res.status(400).json({ success: false, message: 'Invalid phone number format.' });

        const query = { $or: [{ senderPhone: normalizedPhone }, { recipientPhone: normalizedPhone }] };
        const total = await Transaction.countDocuments(query);
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-__v');

        res.json({
            success: true,
            data: { transactions, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/detail/:transactionId
// @access  Public
const getOne = async (req, res, next) => {
    try {
        const transaction = await Transaction.findOne({ transactionId: req.params.transactionId }).select('-__v');
        if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found.' });

        res.json({ success: true, data: { transaction } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getHistory, getOne };