const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = {
    // Server
    PORT: parseInt(process.env.PORT) || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    APP_NAME: process.env.APP_NAME || 'Flax',
    APP_VERSION: process.env.APP_VERSION || '1.0',

    // Database
    MONGODB_URI: process.env.MONGODB_URI,

    // Redis
    REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // Cloudinary
    CLOUDINARY_ENABLED: process.env.CLOUDINARY_ENABLED === 'true',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

    // URLs
    BASE_URL: process.env.BASE_URL || '',
    FLAX_APP_URL: process.env.FLAX_APP_URL || 'http://localhost:3000',
    ADMIN_PANEL_URL: process.env.ADMIN_PANEL_URL || 'http://localhost:3001',

    // CORS
    CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',

    // Security
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH: process.env.JWT_REFRESH || '',
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,

    // Africa's Talking
    AFRICA_TALKING_USERNAME: process.env.AFRICA_TALKING_USERNAME || 'sandbox',
    AFRICA_TALKING_API_KEY: process.env.AFRICA_TALKING_API_KEY || '',

    // Email
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'brevo',

    // Brevo
    BREVO_API_KEY: process.env.BREVO_API_KEY || '',
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '',
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Flax',

    // HDM Bridge
    HDM_API_KEY: process.env.HDM_API_KEY || '',
    HDM_API_URL: process.env.HDM_API_URL || '',
    HDM_FROM_EMAIL: process.env.HDM_FROM_EMAIL || '',
    HDM_FROM_NAME: process.env.HDM_FROM_NAME || 'Flax'
};

// Validate required
const required = ['MONGODB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = required.filter(key => !env[key]);

if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

// Warnings
if (!env.AFRICA_TALKING_API_KEY) {
    console.warn('⚠️  AFRICA_TALKING_API_KEY not set — USSD gateway disabled');
}

if (env.EMAIL_PROVIDER === 'brevo' && !env.BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY not set — email sending disabled');
}

if (env.EMAIL_PROVIDER === 'hdm' && !env.HDM_API_KEY) {
    console.warn('⚠️  HDM_API_KEY not set — email sending disabled');
}

module.exports = env;