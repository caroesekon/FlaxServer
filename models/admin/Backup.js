const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, enum: ['manual', 'scheduled'], default: 'manual' },
    status: { type: String, enum: ['in_progress', 'completed', 'failed'], default: 'in_progress' },
    path: { type: String, default: null },
    cloudUrl: { type: String, default: null },
    cloudPublicId: { type: String, default: null },
    emailedTo: { type: String, default: null },
    emailedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Backup', backupSchema);