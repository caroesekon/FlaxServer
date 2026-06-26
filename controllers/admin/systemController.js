const os = require('os');
const mongoose = require('mongoose');
const SystemLog = require('../../models/admin/SystemLog');
const User = require('../../models/client/User');
const Transaction = require('../../models/client/Transaction');

// @desc    Get system health status
// @route   GET /api/admin/system/health
// @access  Private
const getHealth = async (req, res, next) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

        res.json({
            success: true,
            data: {
                server: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpuUsage: os.loadavg()
                },
                database: {
                    status: dbStates[dbState],
                    host: mongoose.connection.host || 'N/A'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get system error logs
// @route   GET /api/admin/system/logs
// @access  Private
const getLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, level } = req.query;
        const query = level ? { level } : {};

        const total = await SystemLog.countDocuments(query);
        const logs = await SystemLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        res.json({ success: true, data: { logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/system/stats
// @access  Private
const getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalTransactions = await Transaction.countDocuments();
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayTransactions = await Transaction.countDocuments({ createdAt: { $gte: todayStart } });
        const volume = await Transaction.aggregate([
            { $match: { status: 'success', type: 'p2p_send' } },
            { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$fee' } } }
        ]);

        res.json({
            success: true,
            data: {
                users: { total: totalUsers, active: activeUsers },
                transactions: { total: totalTransactions, today: todayTransactions },
                volume: { total: volume[0]?.total || 0, fees: volume[0]?.fees || 0 }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get quick overview for dashboard
// @route   GET /api/admin/system/overview
// @access  Private
const getOverview = async (req, res, next) => {
    try {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const totalUsers = await User.countDocuments();
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });
        const newUsersYesterday = await User.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } });
        const transactionsToday = await Transaction.countDocuments({ createdAt: { $gte: todayStart } });
        const volumeToday = await Transaction.aggregate([
            { $match: { status: 'success', type: 'p2p_send', createdAt: { $gte: todayStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                newUsersToday,
                newUsersYesterday,
                transactionsToday,
                volumeToday: volumeToday[0]?.total || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getHealth, getLogs, getStats, getOverview };