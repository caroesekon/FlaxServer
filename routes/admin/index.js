const router = require('express').Router();

router.use('/auth', require('./adminAuthRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/legals', require('./legalRoutes'));
router.use('/financial', require('./financialRoutes'));
router.use('/backups', require('./backupRoutes'));
router.use('/system', require('./systemRoutes'));

module.exports = router;