const router = require('express').Router();
const { authenticate } = require('../../middleware/admin/adminAuth');
const { getHealth, getLogs, getStats, getOverview } = require('../../controllers/admin/systemController');

router.get('/health', authenticate, getHealth);
router.get('/logs', authenticate, getLogs);
router.get('/stats', authenticate, getStats);
router.get('/overview', authenticate, getOverview);

module.exports = router;