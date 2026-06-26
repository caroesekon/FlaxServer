const mongoose = require('mongoose');

const legalSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['terms', 'privacy', 'refund', 'kyc'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    attachmentUrl: {
        type: String,
        default: null
    },
    attachmentPublicId: {
        type: String,
        default: null
    },
    version: {
        type: String,
        default: '1.0'
    },
    publishedAt: {
        type: Date,
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
});

// Compound unique index — one version per type
legalSchema.index({ type: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('Legal', legalSchema);