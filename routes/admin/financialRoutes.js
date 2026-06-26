const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/admin/adminAuth');
const {
    getFinancial,
    updateFees,
    updateLimits,
    updateCurrency,
    getStats
} = require('../../controllers/admin/financialController');

router.get('/', authenticate, getFinancial);
router.put('/fees', authenticate, authorize('super_admin', 'finance'), updateFees);
router.put('/limits', authenticate, authorize('super_admin', 'finance'), updateLimits);
router.put('/currency', authenticate, authorize('super_admin'), updateCurrency);
router.get('/stats', authenticate, authorize('super_admin', 'finance'), getStats);

module.exports = router;