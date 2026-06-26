const Settings = require('../../models/admin/Settings');
const SystemLog = require('../../models/admin/SystemLog');
const { uploadImage, destroy } = require('../../services/cloudinaryService');

// @desc    Get all system settings
// @route   GET /api/admin/settings
// @access  Private
const getSettings = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        res.json({ success: true, data: { settings } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update branding settings
// @route   PUT /api/admin/settings/branding
// @access  Private (super_admin)
const updateBranding = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { appName, tagline } = req.body;

        if (appName) settings.branding.appName = appName;
        if (tagline) settings.branding.tagline = tagline;

        // Logo upload
        if (req.files?.logo) {
            if (settings.branding.logoPublicId) {
                await destroy(settings.branding.logoPublicId, 'image');
            }
            const result = await uploadImage(req.files.logo.path, 'flax/branding');
            if (result.success) {
                settings.branding.logo = result.url;
                settings.branding.logoPublicId = result.publicId;
            }
        }

        // Favicon upload
        if (req.files?.favicon) {
            if (settings.branding.faviconPublicId) {
                await destroy(settings.branding.faviconPublicId, 'image');
            }
            const result = await uploadImage(req.files.favicon.path, 'flax/branding');
            if (result.success) {
                settings.branding.favicon = result.url;
                settings.branding.faviconPublicId = result.publicId;
            }
        }

        settings.updatedBy = req.admin._id;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Branding updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Branding updated.', data: { settings } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contact settings
// @route   PUT /api/admin/settings/contact
// @access  Private (super_admin)
const updateContact = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { supportEmail, supportPhone, whatsappNumber, physicalAddress } = req.body;

        if (supportEmail !== undefined) settings.contact.supportEmail = supportEmail;
        if (supportPhone !== undefined) settings.contact.supportPhone = supportPhone;
        if (whatsappNumber !== undefined) settings.contact.whatsappNumber = whatsappNumber;
        if (physicalAddress !== undefined) settings.contact.physicalAddress = physicalAddress;
        settings.updatedBy = req.admin._id;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Contact updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Contact updated.', data: { settings } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update security settings
// @route   PUT /api/admin/settings/security
// @access  Private (super_admin)
const updateSecurity = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { pinLength, maxPinAttempts, sessionTimeoutMinutes, rateLimitPerMinute } = req.body;

        if (pinLength) settings.security.pinLength = pinLength;
        if (maxPinAttempts) settings.security.maxPinAttempts = maxPinAttempts;
        if (sessionTimeoutMinutes) settings.security.sessionTimeoutMinutes = sessionTimeoutMinutes;
        if (rateLimitPerMinute) settings.security.rateLimitPerMinute = rateLimitPerMinute;
        settings.updatedBy = req.admin._id;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Security settings updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Security settings updated.', data: { settings } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update USSD settings
// @route   PUT /api/admin/settings/ussd
// @access  Private (super_admin)
const updateUssd = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { shortCode, gatewayProvider, apiKey, callbackUrl } = req.body;

        if (shortCode) settings.ussd.shortCode = shortCode;
        if (gatewayProvider) settings.ussd.gatewayProvider = gatewayProvider;
        if (apiKey) settings.ussd.apiKey = apiKey;
        if (callbackUrl) settings.ussd.callbackUrl = callbackUrl;
        settings.updatedBy = req.admin._id;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `USSD settings updated by ${req.admin.email}` });

        res.json({ success: true, message: 'USSD settings updated.', data: { settings } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update notification settings
// @route   PUT /api/admin/settings/notifications
// @access  Private (super_admin)
const updateNotifications = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        const { smsProvider, smsSenderId, transactionReceipts, alertEmail } = req.body;

        if (smsProvider) settings.notifications.smsProvider = smsProvider;
        if (smsSenderId) settings.notifications.smsSenderId = smsSenderId;
        if (typeof transactionReceipts === 'boolean') settings.notifications.transactionReceipts = transactionReceipts;
        if (alertEmail) settings.notifications.alertEmail = alertEmail;
        settings.updatedBy = req.admin._id;
        await settings.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Notification settings updated by ${req.admin.email}` });

        res.json({ success: true, message: 'Notification settings updated.', data: { settings } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getSettings, updateBranding, updateContact, updateSecurity, updateUssd, updateNotifications };