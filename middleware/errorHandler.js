const env = require('../config/env');
const SystemLog = require('../models/admin/SystemLog');

const errorHandler = async (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log critical errors to database
    if (statusCode >= 500) {
        try {
            await SystemLog.create({
                level: 'error',
                source: req.path.includes('/ussd') ? 'ussd' : req.path.includes('/admin') ? 'admin' : 'api',
                message,
                details: {
                    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
                    path: req.originalUrl,
                    method: req.method
                }
            });
        } catch (logError) {
            console.error('Failed to log error:', logError.message);
        }
    }

    // Console log in development
    if (env.NODE_ENV === 'development') {
        console.error('❌ Error:', err);
    }

    // USSD responses must be plain text
    if (req.path.includes('/ussd')) {
        return res.status(statusCode).send(`END ${statusCode >= 500 ? 'System error. Please try again later.' : message}`);
    }

    // API responses as JSON
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;