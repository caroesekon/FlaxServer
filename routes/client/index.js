const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/ussd', require('./ussdRoutes'));

module.exports = router;