const router = require('express').Router();

router.use(require('./brandingRoutes'));
router.use(require('./legalRoutes'));
router.use(require('./contactRoutes'));

module.exports = router;