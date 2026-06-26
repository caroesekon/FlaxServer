const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    _id: { type: String, default: 'global' },

    branding: {
        appName: { type: String, default: 'Flax' },
        tagline: { type: String, default: 'Strong. Simple. Send.' },
        logo: { type: String, default: null },
        logoPublicId: { type: String, default: null },
        favicon: { type: String, default: null },
        faviconPublicId: { type: String, default: null }
    },

    contact: {
        supportEmail: { type: String, default: '' },
        supportPhone: { type: String, default: '' },
        whatsappNumber: { type: String, default: '' },
        physicalAddress: { type: String, default: '' }
    },

    security: {
        pinLength: { type: Number, default: 4, enum: [4, 6] },
        maxPinAttempts: { type: Number, default: 3 },
        sessionTimeoutMinutes: { type: Number, default: 5 },
        rateLimitPerMinute: { type: Number, default: 10 }
    },

    ussd: {
        shortCode: { type: String, default: '*384#' },
        gatewayProvider: { type: String, default: 'africastalking' },
        apiKey: { type: String, default: '' },
        callbackUrl: { type: String, default: '' }
    },

    notifications: {
        smsProvider: { type: String, default: 'africastalking' },
        smsSenderId: { type: String, default: 'Flax' },
        transactionReceipts: { type: Boolean, default: false },
        alertEmail: { type: String, default: '' }
    },

    backup: {
        frequency: { type: String, enum: ['daily', 'weekly', 'manual'], default: 'daily' },
        autoBackup: { type: Boolean, default: false },
        autoSendEmail: { type: Boolean, default: false },
        retentionDays: { type: Number, default: 30 },
        lastBackup: { type: Date, default: null },
        nextBackup: { type: Date, default: null }
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

settingsSchema.statics.getSettings = async function () {
    let settings = await this.findById('global');
    if (!settings) settings = await this.create({ _id: 'global' });
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);