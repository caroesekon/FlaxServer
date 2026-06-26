const { getCloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// ─── IMAGES ─────────────────────────────────────────

const uploadImage = async (filePath, folder = 'flax/images') => {
    if (!isCloudinaryConfigured()) {
        console.warn('⚠️  Cloudinary not configured. Upload skipped.');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const cloudinary = getCloudinary();
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            size: result.bytes
        };
    } catch (error) {
        console.error('❌ Image upload failed:', error.message);
        return { success: false, reason: error.message };
    }
};

// ─── DOCUMENTS ──────────────────────────────────────

const uploadDocument = async (filePath, folder = 'flax/documents') => {
    if (!isCloudinaryConfigured()) {
        console.warn('⚠️  Cloudinary not configured. Upload skipped.');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const cloudinary = getCloudinary();
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: 'raw',
            use_filename: true,
            unique_filename: true
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes
        };
    } catch (error) {
        console.error('❌ Document upload failed:', error.message);
        return { success: false, reason: error.message };
    }
};

// ─── BACKUPS ────────────────────────────────────────

const uploadBackup = async (filePath, filename) => {
    if (!isCloudinaryConfigured()) {
        console.warn('⚠️  Cloudinary not configured. Backup not stored offsite.');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const cloudinary = getCloudinary();
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'flax/backups',
            resource_type: 'raw',
            public_id: filename.replace(/\.gz$/, ''),
            use_filename: true,
            unique_filename: false
        });

        await cleanupOldBackups(7);

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes
        };
    } catch (error) {
        console.error('❌ Backup upload failed:', error.message);
        return { success: false, reason: error.message };
    }
};

const listBackups = async () => {
    if (!isCloudinaryConfigured()) return { success: false, reason: 'not_configured', backups: [] };

    try {
        const cloudinary = getCloudinary();
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'flax/backups/',
            resource_type: 'raw',
            max_results: 30
        });

        return {
            success: true,
            backups: result.resources.map(r => ({
                publicId: r.public_id,
                filename: r.public_id + '.' + r.format,
                size: r.bytes,
                createdAt: r.created_at,
                url: r.secure_url
            }))
        };
    } catch (error) {
        console.error('❌ List backups failed:', error.message);
        return { success: false, reason: error.message, backups: [] };
    }
};

const downloadBackup = async (publicId) => {
    if (!isCloudinaryConfigured()) return { success: false, reason: 'not_configured' };

    try {
        const cloudinary = getCloudinary();
        const url = cloudinary.url(publicId, { resource_type: 'raw', secure: true });
        return { success: true, url };
    } catch (error) {
        console.error('❌ Download backup failed:', error.message);
        return { success: false, reason: error.message };
    }
};

const cleanupOldBackups = async (keep = 7) => {
    try {
        const { backups } = await listBackups();
        if (backups.length <= keep) return;

        const cloudinary = getCloudinary();
        const toDelete = backups.slice(keep);
        for (const backup of toDelete) {
            await cloudinary.uploader.destroy(backup.publicId, { resource_type: 'raw' });
            console.log(`  🗑️  Deleted old backup: ${backup.filename}`);
        }
    } catch (error) {
        console.error('❌ Backup cleanup failed:', error.message);
    }
};

// ─── DELETE ─────────────────────────────────────────

const destroy = async (publicId, resourceType = 'image') => {
    if (!isCloudinaryConfigured()) return { success: false, reason: 'not_configured' };

    try {
        const cloudinary = getCloudinary();
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return { success: result.result === 'ok' };
    } catch (error) {
        console.error('❌ Delete failed:', error.message);
        return { success: false, reason: error.message };
    }
};

module.exports = { uploadImage, uploadDocument, uploadBackup, listBackups, downloadBackup, destroy };