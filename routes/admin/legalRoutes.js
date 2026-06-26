const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/admin/adminAuth');
const { getLegals, getLegal, upsertLegal } = require('../../controllers/admin/legalController');

router.get('/', authenticate, getLegals);
router.get('/:type', authenticate, getLegal);
router.put('/:type', authenticate, authorize('super_admin'), upsertLegal);

module.exports = router;