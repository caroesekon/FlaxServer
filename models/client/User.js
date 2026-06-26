const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { normalizePhone } = require('../../utils/helpers');
const env = require('../../config/env');

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: 50
    },
    nationalId: {
        type: String,
        required: [true, 'National ID is required'],
        trim: true
    },
    pin: {
        type: String,
        required: [true, 'PIN is required']
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    pinAttempts: {
        type: Number,
        default: 0
    },
    lastPinAttempt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Only add index for nationalId (phoneNumber already indexed by unique: true)
userSchema.index({ nationalId: 1 });

userSchema.pre('save', function (next) {
    if (this.isModified('phoneNumber')) {
        const normalized = normalizePhone(this.phoneNumber);
        if (!normalized) return next(new Error('Invalid phone number format'));
        this.phoneNumber = normalized;
    }

    if (this.isModified('pin')) {
        const saltRounds = env.BCRYPT_SALT_ROUNDS;
        this.pin = bcrypt.hashSync(this.pin, saltRounds);
    }

    next();
});

userSchema.methods.comparePin = async function (candidatePin) {
    return bcrypt.compare(candidatePin, this.pin);
};

userSchema.methods.incrementPinAttempts = async function () {
    this.pinAttempts += 1;
    this.lastPinAttempt = new Date();
    if (this.pinAttempts >= 3) this.isActive = false;
    await this.save();
    return this.pinAttempts;
};

userSchema.methods.resetPinAttempts = async function () {
    this.pinAttempts = 0;
    this.lastPinAttempt = null;
    await this.save();
};

userSchema.statics.findByPhone = async function (rawPhone) {
    const normalized = normalizePhone(rawPhone);
    if (!normalized) return null;
    return this.findOne({ phoneNumber: normalized });
};

module.exports = mongoose.model('User', userSchema);