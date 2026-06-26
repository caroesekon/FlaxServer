const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGODB_URI, {
            autoIndex: env.NODE_ENV === 'development'
        });

        console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;