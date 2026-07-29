const express = require('express');
const router = express.Router();
const USSDController = require('../controllers/ussdController');

// USSD main endpoint
router.post('/', USSDController.handleUSSD);

// USSD callback endpoint
router.post('/callback', USSDController.ussdCallback);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Flax USSD',
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;