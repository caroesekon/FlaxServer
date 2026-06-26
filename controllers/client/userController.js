const User = require('../../models/client/User');
const { normalizePhone, isValidPin } = require('../../utils/helpers');

// @desc    Get user balance
// @route   GET /api/users/:phoneNumber/balance
// @access  Public
const getBalance = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params;
        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) return res.status(400).json({ success: false, message: 'Invalid phone number format.' });

        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.json({ success: true, data: { balance: user.balance, phoneNumber: user.phoneNumber } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user profile
// @route   GET /api/users/:phoneNumber/profile
// @access  Public
const getProfile = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params;
        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) return res.status(400).json({ success: false, message: 'Invalid phone number format.' });

        const user = await User.findOne({ phoneNumber: normalizedPhone }).select('-pin');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.json({
            success: true,
            data: {
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                balance: user.balance,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change user PIN
// @route   PUT /api/users/:phoneNumber/pin
// @access  Private
const changePin = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params;
        const { currentPin, newPin } = req.body;

        if (!currentPin || !newPin) {
            return res.status(400).json({ success: false, message: 'Current PIN and new PIN are required.' });
        }

        if (!isValidPin(newPin)) {
            return res.status(400).json({ success: false, message: 'New PIN must be 4 digits and not a common pattern.' });
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) return res.status(400).json({ success: false, message: 'Invalid phone number format.' });

        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const isCurrentPinValid = await user.comparePin(currentPin);
        if (!isCurrentPinValid) return res.status(401).json({ success: false, message: 'Current PIN is incorrect.' });

        user.pin = newPin;
        await user.save();

        res.json({ success: true, message: 'PIN changed successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getBalance, getProfile, changePin };