require('./scripts/dnsSet');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const env = require('./config/env');
const { connectRedis, disconnectRedis, isRedisConnected } = require('./config/redis');
const { connectCloudinary, isCloudinaryConfigured } = require('./config/cloudinary');
const errorHandler = require('./middleware/errorHandler');
const { apiRateLimiter } = require('./middleware/client/rateLimiter');
const routes = require('./routes/index');

const app = express();

// ─── Base URL ───────────────────────────────────────
const BASE_URL = env.BASE_URL || `http://localhost:${env.PORT}`;

// ─── Middleware ──────────────────────────────────────
app.use(morgan('dev'));
app.use(cors({ origin: env.CORS_ORIGINS.split(','), credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRateLimiter);

// ─── API Routes ─────────────────────────────────────
app.use('/api', routes);

// ─── Root ───────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        success: true,
        app: env.APP_NAME,
        version: env.APP_VERSION,
        environment: env.NODE_ENV,
        message: 'Flax Mobile Money Platform API'
    });
});

// ─── API Info ───────────────────────────────────────
app.get('/api', (req, res) => {
    res.json({
        success: true,
        app: env.APP_NAME,
        version: env.APP_VERSION,
        environment: env.NODE_ENV,
        baseUrl: BASE_URL,
        redis: env.REDIS_ENABLED ? (isRedisConnected() ? 'connected' : 'disconnected') : 'disabled',
        cloudinary: env.CLOUDINARY_ENABLED ? (isCloudinaryConfigured() ? 'configured' : 'unavailable') : 'disabled',
        endpoints: {
            public: `${BASE_URL}/api/public`,
            auth: `${BASE_URL}/api/auth`,
            users: `${BASE_URL}/api/users`,
            transactions: `${BASE_URL}/api/transactions`,
            ussd: `${BASE_URL}/api/ussd`,
            admin: `${BASE_URL}/api/admin`
        }
    });
});

// ─── Health Check ───────────────────────────────────
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    res.json({
        success: true,
        app: env.APP_NAME,
        version: env.APP_VERSION,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        services: {
            database: dbStates[dbState],
            redis: env.REDIS_ENABLED ? (isRedisConnected() ? 'connected' : 'disconnected') : 'disabled',
            cloudinary: env.CLOUDINARY_ENABLED ? (isCloudinaryConfigured() ? 'configured' : 'unavailable') : 'disabled'
        }
    });
});

// ─── 404 Handler ────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ─── Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────
const startServer = async () => {
    try {
        await connectDB();

        if (env.REDIS_ENABLED) await connectRedis();
        if (env.CLOUDINARY_ENABLED) connectCloudinary();

        const server = app.listen(env.PORT, () => {
            console.log('');
            console.log('══════════════════════════════════════════');
            console.log(`  🚀 ${env.APP_NAME} Server`);
            console.log('══════════════════════════════════════════');
            console.log(`  Version    : ${env.APP_VERSION}`);
            console.log(`  Mode       : ${env.NODE_ENV}`);
            console.log(`  Port       : ${env.PORT}`);
            console.log(`  Base URL   : ${BASE_URL}`);
            console.log(`  Flax App   : ${env.FLAX_APP_URL}`);
            console.log(`  Admin      : ${env.ADMIN_PANEL_URL}`);
            console.log(`  Email      : ${env.EMAIL_PROVIDER}`);
            console.log(`  Redis      : ${env.REDIS_ENABLED ? (isRedisConnected() ? 'Connected' : 'Unavailable') : 'Disabled'}`);
            console.log(`  Cloudinary : ${env.CLOUDINARY_ENABLED ? (isCloudinaryConfigured() ? 'Configured' : 'Unavailable') : 'Disabled'}`);
            console.log(`  USSD       : ${env.AFRICA_TALKING_API_KEY ? 'Configured' : 'Not configured'}`);
            console.log('══════════════════════════════════════════');
            console.log('');
        });

        // ─── Graceful Shutdown ───────────────────────
        const shutdown = async (signal) => {
            console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.log('🔒 HTTP server closed.');

                try {
                    await mongoose.connection.close();
                    console.log('🔌 MongoDB connection closed.');
                } catch (err) {
                    console.error('❌ Error closing MongoDB:', err.message);
                }

                if (env.REDIS_ENABLED) await disconnectRedis();

                console.log('👋 Goodbye!\n');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('❌ Forced shutdown after timeout.');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;