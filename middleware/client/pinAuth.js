const User = require('../../models/client/User');
const { normalizePhone } = require('../../utils/helpers');

/**
 * Verify user PIN for sensitive operations
 * Expects: phoneNumber and pin in request body
 */
const verifyPin = async (req, res, next) => {
    try {
        const { phoneNumber, pin } = req.body;

        if (!phoneNumber || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and PIN are required.'
            });
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format.'
            });
        }

        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is locked due to too many PIN attempts.'
            });
        }

        const isValid = await user.comparePin(pin);
        if (!isValid) {
            await user.incrementPinAttempts();
            return res.status(401).json({
                success: false,
                message: 'Invalid PIN.',
                attempts: user.pinAttempts
            });
        }

        // Reset attempts on success
        await user.resetPinAttempts();

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Find user by phone and attach to request
 * Does NOT verify PIN — used for read operations
 */
const attachUser = async (req, res, next) => {
    try {
        const { phoneNumber } = req.params || req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required.'
            });
        }

        const normalizedPhone = normalizePhone(phoneNumber);
        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format.'
            });
        }

        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { verifyPin, attachUser };