const Backup = require('../../models/admin/Backup');
const SystemLog = require('../../models/admin/SystemLog');
const emailService = require('../../services/emailService');
const Settings = require('../../models/admin/Settings');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// @desc    List all backups
// @route   GET /api/admin/backups
// @access  Private (super_admin)
const getBackups = async (req, res, next) => {
    try {
        const backups = await Backup.find().sort({ createdAt: -1 });
        res.json({ success: true, data: { backups } });
    } catch (error) {
        next(error);
    }
};

// @desc    Trigger manual backup
// @route   POST /api/admin/backups/now
// @access  Private (super_admin)
const createBackup = async (req, res, next) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `flax_backup_${timestamp}.gz`;
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const uri = process.env.MONGODB_URI;
        const cmd = `mongodump --uri="${uri}" --gzip --archive="${filepath}"`;

        const backup = await Backup.create({ filename, size: 0, type: 'manual', status: 'in_progress', createdBy: req.admin._id });

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                backup.status = 'failed';
                await backup.save();

                await SystemLog.create({ level: 'error', source: 'system', message: `Backup failed: ${filename}` });

                const settings = await Settings.getSettings();
                if (settings.notifications.alertEmail) {
                    await emailService.sendBackupNotification({
                        to: settings.notifications.alertEmail,
                        filename, size: 0, status: 'failed', timestamp: new Date().toISOString()
                    });
                }
                return;
            }

            const stats = fs.statSync(filepath);
            backup.size = stats.size;
            backup.status = 'completed';
            backup.path = filepath;
            await backup.save();

            await SystemLog.create({ level: 'info', source: 'system', message: `Backup completed: ${filename}` });

            const settings = await Settings.getSettings();
            if (settings.notifications.alertEmail) {
                await emailService.sendBackupNotification({
                    to: settings.notifications.alertEmail,
                    filename, size: stats.size, status: 'completed', timestamp: new Date().toISOString()
                });
            }
        });

        res.status(202).json({ success: true, message: 'Backup started.', data: { backup } });
    } catch (error) {
        next(error);
    }
};

// @desc    Download a backup file
// @route   GET /api/admin/backups/:id/download
// @access  Private (super_admin)
const downloadBackup = async (req, res, next) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ success: false, message: 'Backup not found.' });
        if (!backup.path || !fs.existsSync(backup.path)) return res.status(404).json({ success: false, message: 'Backup file not found on disk.' });

        res.download(backup.path, backup.filename);
    } catch (error) {
        next(error);
    }
};

// @desc    Restore from a backup
// @route   POST /api/admin/backups/:id/restore
// @access  Private (super_admin)
const restoreBackup = async (req, res, next) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ success: false, message: 'Backup not found.' });
        if (!backup.path || !fs.existsSync(backup.path)) return res.status(404).json({ success: false, message: 'Backup file not found.' });

        const uri = process.env.MONGODB_URI;
        const cmd = `mongorestore --uri="${uri}" --gzip --archive="${backup.path}" --drop`;

        exec(cmd, async (error) => {
            if (error) {
                await SystemLog.create({ level: 'error', source: 'system', message: `Restore failed: ${backup.filename}` });
                return;
            }
            await SystemLog.create({ level: 'warning', source: 'system', message: `Database restored from: ${backup.filename} by ${req.admin.email}` });
        });

        res.json({ success: true, message: 'Restore started.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update backup schedule
// @route   PUT /api/admin/backups/schedule
// @access  Private (super_admin)
const updateSchedule = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { schedule, retentionDays } = req.body;

        if (schedule) settings.backup.schedule = schedule;
        if (retentionDays) settings.backup.retentionDays = retentionDays;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Backup schedule updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Backup schedule updated.', data: { backup: settings.backup } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get backup status
// @route   GET /api/admin/backups/status
// @access  Private
const getStatus = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const lastBackup = await Backup.findOne().sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { schedule: settings.backup, lastBackup }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getBackups, createBackup, downloadBackup, restoreBackup, updateSchedule, getStatus };