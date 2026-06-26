const Financial = require('../../models/admin/Financial');
const SystemLog = require('../../models/admin/SystemLog');
const User = require('../../models/client/User');
const Transaction = require('../../models/client/Transaction');

// @desc    Get financial settings
// @route   GET /api/admin/financial
// @access  Private
const getFinancial = async (req, res, next) => {
    try {
        const financial = await Financial.getFinancial();
        res.json({ success: true, data: { financial } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update fees
// @route   PUT /api/admin/financial/fees
// @access  Private (super_admin, finance)
const updateFees = async (req, res, next) => {
    try {
        const financial = await Financial.getFinancial();
        const { sendMoneyFlatFee, sendMoneyPercentageFee, withdrawalFlatFee, withdrawalPercentageFee } = req.body;

        if (sendMoneyFlatFee !== undefined) financial.sendMoneyFlatFee = sendMoneyFlatFee;
        if (sendMoneyPercentageFee !== undefined) financial.sendMoneyPercentageFee = sendMoneyPercentageFee;
        if (withdrawalFlatFee !== undefined) financial.withdrawalFlatFee = withdrawalFlatFee;
        if (withdrawalPercentageFee !== undefined) financial.withdrawalPercentageFee = withdrawalPercentageFee;
        financial.updatedBy = req.admin._id;
        await financial.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Fees updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Fees updated.', data: { financial } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update transaction limits
// @route   PUT /api/admin/financial/limits
// @access  Private (super_admin, finance)
const updateLimits = async (req, res, next) => {
    try {
        const financial = await Financial.getFinancial();
        const { minSendAmount, maxSendAmount, maxDailySend, maxPerTransaction } = req.body;

        if (minSendAmount) financial.minSendAmount = minSendAmount;
        if (maxSendAmount) financial.maxSendAmount = maxSendAmount;
        if (maxDailySend) financial.maxDailySend = maxDailySend;
        if (maxPerTransaction) financial.maxPerTransaction = maxPerTransaction;
        financial.updatedBy = req.admin._id;
        await financial.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Limits updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Limits updated.', data: { financial } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update base currency
// @route   PUT /api/admin/financial/currency
// @access  Private (super_admin)
const updateCurrency = async (req, res, next) => {
    try {
        const financial = await Financial.getFinancial();
        const { currency } = req.body;

        if (!currency) return res.status(400).json({ success: false, message: 'Currency is required.' });

        financial.currency = currency;
        financial.updatedBy = req.admin._id;
        await financial.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Currency changed to ${currency} by ${req.admin.email}` });

        res.json({ success: true, message: 'Currency updated.', data: { financial } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get financial statistics
// @route   GET /api/admin/financial/stats
// @access  Private (super_admin, finance)
const getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        const volume = await Transaction.aggregate([
            { $match: { status: 'success', type: 'p2p_send' } },
            { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$fee' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalTransactions,
                totalVolume: volume[0]?.total || 0,
                totalFees: volume[0]?.fees || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getFinancial, updateFees, updateLimits, updateCurrency, getStats };