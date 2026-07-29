const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const ussdRoutes = require('./routes/ussd');
const logger = require('./utils/logger');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/ussd', ussdRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Flax Mobile Money API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      ussd: '/ussd',
      health: '/ussd/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Flax Server running on port ${PORT}`);
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Flax Mobile Money USSD Service     ║
  ║   Running on port: ${PORT}              ║
  ║   USSD endpoint: /ussd               ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;