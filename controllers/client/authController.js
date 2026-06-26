const User = require('../../models/client/User');
const { normalizePhone, isValidPin } = require('../../utils/helpers');

// @desc    Register a new Flax user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
    try {
        const { phoneNumber, firstName, lastName, nationalId, pin } = req.body;

        if (!phoneNumber || !firstName || !lastName || !nationalId || !pin) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }

        if (!isValidPin(pin)) {
            return res.status(400).json({ success: false, message: 'PIN must be 4 digits and not a common pattern.' });
        }

        const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Phone number already registered.' });
        }

        const existingId = await User.findOne({ nationalId });
        if (existingId) {
            return res.status(409).json({ success: false, message: 'National ID already registered.' });
        }

        const user = await User.create({ phoneNumber: normalizedPhone, firstName, lastName, nationalId, pin });

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: { userId: user._id, phoneNumber: user.phoneNumber }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify user PIN
// @route   POST /api/auth/verify-pin
// @access  Public
const verifyPin = async (req, res, next) => {
    try {
        const { phoneNumber, pin } = req.body;

        if (!phoneNumber || !pin) {
            return res.status(400).json({ success: false, message: 'Phone number and PIN are required.' });
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }

        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is locked.' });
        }

        const isValid = await user.comparePin(pin);
        if (!isValid) {
            await user.incrementPinAttempts();
            return res.status(401).json({ success: false, message: 'Invalid PIN.' });
        }

        await user.resetPinAttempts();

        res.json({ success: true, message: 'PIN verified.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, verifyPin };