const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/admin/adminAuth');
const {
    getBackups,
    createBackup,
    downloadBackupFile,
    sendBackupEmail,
    deleteBackup,
    restoreBackup,
    updateSettings,
    getStatus
} = require('../../controllers/admin/backupController');

router.get('/', authenticate, authorize('super_admin'), getBackups);
router.post('/now', authenticate, authorize('super_admin'), createBackup);
router.get('/:id/download', authenticate, authorize('super_admin'), downloadBackupFile);
router.post('/:id/send-email', authenticate, authorize('super_admin'), sendBackupEmail);
router.delete('/:id', authenticate, authorize('super_admin'), deleteBackup);
router.post('/:id/restore', authenticate, authorize('super_admin'), restoreBackup);
router.put('/settings', authenticate, authorize('super_admin'), updateSettings);
router.get('/status', authenticate, getStatus);

module.exports = router;