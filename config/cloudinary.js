const env = require('./env');

let cloudinary = null;
let isConfigured = false;

const connectCloudinary = () => {
    if (!env.CLOUDINARY_ENABLED) return;

    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        console.warn('⚠️  Cloudinary enabled but missing credentials — skipping');
        return;
    }

    try {
        cloudinary = require('cloudinary').v2;

        cloudinary.config({
            cloud_name: env.CLOUDINARY_CLOUD_NAME,
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET,
            secure: true
        });

        isConfigured = true;
        console.log('✅ Cloudinary configured');
    } catch (error) {
        console.warn('⚠️  Cloudinary not available — install with: npm install cloudinary');
        cloudinary = null;
        isConfigured = false;
    }
};

const getCloudinary = () => cloudinary;
const isCloudinaryConfigured = () => isConfigured;

module.exports = { connectCloudinary, getCloudinary, isCloudinaryConfigured };