const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/admin/adminAuth');
const {
    login,
    getProfile,
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    getActivityLog
} = require('../../controllers/admin/adminAuthController');

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/admins', authenticate, authorize('super_admin'), getAdmins);
router.post('/admins', authenticate, authorize('super_admin'), createAdmin);
router.put('/admins/:id', authenticate, authorize('super_admin'), updateAdmin);
router.delete('/admins/:id', authenticate, authorize('super_admin'), deleteAdmin);
router.get('/activity-log', authenticate, getActivityLog);

module.exports = router;