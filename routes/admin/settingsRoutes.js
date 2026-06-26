const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/admin/adminAuth');
const {
    getSettings,
    updateBranding,
    updateContact,
    updateSecurity,
    updateUssd,
    updateNotifications
} = require('../../controllers/admin/settingsController');

router.get('/', authenticate, getSettings);
router.put('/branding', authenticate, authorize('super_admin'), updateBranding);
router.put('/contact', authenticate, authorize('super_admin'), updateContact);
router.put('/security', authenticate, authorize('super_admin'), updateSecurity);
router.put('/ussd', authenticate, authorize('super_admin'), updateUssd);
router.put('/notifications', authenticate, authorize('super_admin'), updateNotifications);

module.exports = router;