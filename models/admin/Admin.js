const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../../config/env');
const { ADMIN_ROLES } = require('../../utils/constants');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ADMIN_ROLES,
        default: 'support'
    },
    // Agent-specific
    agentCode: { type: String, default: null },
    floatBalance: { type: Number, default: null },
    region: { type: String, default: null },
    // Status
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
});

// Hash password before save
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const saltRounds = env.BCRYPT_SALT_ROUNDS;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
});

// Compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Hide password from JSON
adminSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Admin', adminSchema);