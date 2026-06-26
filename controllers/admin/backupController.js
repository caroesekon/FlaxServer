const Backup = require('../../models/admin/Backup');
const SystemLog = require('../../models/admin/SystemLog');
const emailService = require('../../services/emailService');
const Settings = require('../../models/admin/Settings');
const { uploadBackup, listBackups, downloadBackup, destroy } = require('../../services/cloudinaryService');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// @desc    List all backups
// @route   GET /api/admin/backups
// @access  Private (super_admin)
const getBackups = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const total = await Backup.countDocuments();
        const localBackups = await Backup.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName email');

        const { backups: cloudBackups } = await listBackups();

        res.json({
            success: true,
            data: {
                local: localBackups,
                cloud: cloudBackups,
                pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
            }
        });
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
        const filename = `flax_backup_${timestamp}.json`;
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // Collect all collections
        const collections = await db.listCollections().toArray();
        const backupData = {
            app: 'Flax',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            collections: {}
        };

        for (const col of collections) {
            const name = col.name;
            const documents = await db.collection(name).find({}).toArray();
            backupData.collections[name] = documents;
        }

        // Write pretty JSON
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

        const stats = fs.statSync(filepath);

        const backup = await Backup.create({
            filename,
            size: stats.size,
            type: 'manual',
            status: 'completed',
            path: filepath,
            createdBy: req.admin._id
        });

        // Upload to Cloudinary
        const cloudResult = await uploadBackup(filepath, filename);
        if (cloudResult.success) {
            backup.cloudUrl = cloudResult.url;
            backup.cloudPublicId = cloudResult.publicId;
        }

        await backup.save();

        // Update settings
        const settings = await Settings.getSettings();
        settings.backup.lastBackup = new Date();
        await settings.save();

        // Auto-send email if enabled
        if (settings.backup.autoSendEmail && settings.notifications.alertEmail) {
            const emailResult = await emailService.sendBackupNotification({
                to: settings.notifications.alertEmail,
                filename,
                size: stats.size,
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            if (emailResult.success) {
                backup.emailedTo = settings.notifications.alertEmail;
                backup.emailedAt = new Date();
                await backup.save();
            }
        }

        await SystemLog.create({ level: 'info', source: 'system', message: `Backup completed: ${filename}` });

        res.status(201).json({ success: true, message: 'Backup completed.', data: { backup } });
    } catch (error) {
        next(error);
    }
};

// @desc    Download a backup file
// @route   GET /api/admin/backups/:id/download
// @access  Private (super_admin)
const downloadBackupFile = async (req, res, next) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ success: false, message: 'Backup not found.' });

        if (backup.path && fs.existsSync(backup.path)) {
            return res.download(backup.path, backup.filename);
        }

        if (backup.cloudPublicId) {
            const result = await downloadBackup(backup.cloudPublicId);
            if (result.success) return res.redirect(result.url);
        }

        return res.status(404).json({ success: false, message: 'Backup file not found.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Send backup to email
// @route   POST /api/admin/backups/:id/send-email
// @access  Private (super_admin)
const sendBackupEmail = async (req, res, next) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ success: false, message: 'Backup not found.' });

        const settings = await Settings.getSettings();
        const recipient = req.body.email || settings.notifications.alertEmail;

        if (!recipient) {
            return res.status(400).json({ success: false, message: 'No email provided and no alert email configured.' });
        }

        const result = await emailService.sendBackupNotification({
            to: recipient,
            filename: backup.filename,
            size: backup.size,
            status: backup.status,
            timestamp: backup.createdAt.toISOString()
        });

        if (result.success) {
            backup.emailedTo = recipient;
            backup.emailedAt = new Date();
            await backup.save();

            await SystemLog.create({
                level: 'info',
                source: 'admin',
                message: `Backup ${backup.filename} sent to ${recipient} by ${req.admin.email}`
            });
        }

        res.json({
            success: result.success,
            message: result.success ? 'Backup sent to email.' : 'Failed to send email.',
            data: { emailedTo: recipient }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a backup
// @route   DELETE /api/admin/backups/:id
// @access  Private (super_admin)
const deleteBackup = async (req, res, next) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ success: false, message: 'Backup not found.' });

        if (backup.path && fs.existsSync(backup.path)) {
            fs.unlinkSync(backup.path);
        }

        if (backup.cloudPublicId) {
            await destroy(backup.cloudPublicId, 'raw');
        }

        await Backup.findByIdAndDelete(req.params.id);

        await SystemLog.create({
            level: 'warning',
            source: 'admin',
            message: `Backup deleted: ${backup.filename} by ${req.admin.email}`
        });

        res.json({ success: true, message: 'Backup deleted.' });
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

        let filepath = backup.path;

        if (!filepath || !fs.existsSync(filepath)) {
            if (backup.cloudPublicId) {
                const result = await downloadBackup(backup.cloudPublicId);
                if (!result.success) {
                    return res.status(404).json({ success: false, message: 'Backup file not available.' });
                }

                const axios = require('axios');
                const backupDir = path.join(__dirname, '..', '..', 'backups');
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                filepath = path.join(backupDir, backup.filename);

                const response = await axios({ url: result.url, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(filepath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            } else {
                return res.status(404).json({ success: false, message: 'Backup file not found.' });
            }
        }

        // Read JSON backup
        const rawData = fs.readFileSync(filepath, 'utf-8');
        const backupData = JSON.parse(rawData);

        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // Drop existing collections and restore
        for (const [collectionName, documents] of Object.entries(backupData.collections)) {
            if (documents.length > 0) {
                await db.collection(collectionName).deleteMany({});
                await db.collection(collectionName).insertMany(documents);
            }
        }

        await SystemLog.create({
            level: 'warning',
            source: 'system',
            message: `Database restored from: ${backup.filename} by ${req.admin.email}`
        });

        res.json({ success: true, message: 'Database restored successfully.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update backup settings
// @route   PUT /api/admin/backups/settings
// @access  Private (super_admin)
const updateSettings = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { frequency, autoBackup, autoSendEmail, retentionDays } = req.body;

        if (frequency) settings.backup.frequency = frequency;
        if (typeof autoBackup === 'boolean') settings.backup.autoBackup = autoBackup;
        if (typeof autoSendEmail === 'boolean') settings.backup.autoSendEmail = autoSendEmail;
        if (retentionDays) settings.backup.retentionDays = retentionDays;

        await settings.save();

        await SystemLog.create({
            level: 'info',
            source: 'admin',
            message: `Backup settings updated by ${req.admin.email}`
        });

        res.json({ success: true, message: 'Backup settings updated.', data: { backup: settings.backup } });
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
            data: {
                settings: settings.backup,
                lastBackup
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getBackups, createBackup, downloadBackupFile, sendBackupEmail, deleteBackup, restoreBackup, updateSettings, getStatus };