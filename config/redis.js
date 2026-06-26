const env = require('./env');

let redisClient = null;
let isConnected = false;

const getClient = () => redisClient;

const connectRedis = async () => {
    if (!env.REDIS_ENABLED) return;

    try {
        const Redis = require('ioredis');
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) return null;
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true
        });

        redisClient.on('connect', () => {
            isConnected = true;
            console.log('✅ Redis connected');
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            console.error('❌ Redis error:', err.message);
        });

        redisClient.on('close', () => {
            isConnected = false;
            console.warn('⚠️  Redis connection closed');
        });

        await redisClient.connect();
    } catch (error) {
        console.warn('⚠️  Redis not available — continuing without cache');
        redisClient = null;
        isConnected = false;
    }
};

const disconnectRedis = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('🔌 Redis disconnected');
        } catch (error) {
            // ignore
        }
        redisClient = null;
        isConnected = false;
    }
};

const isRedisConnected = () => isConnected;

module.exports = {
    getClient,
    connectRedis,
    disconnectRedis,
    isRedisConnected
};