const crypto = require('crypto');

/**
 * Normalize phone number to 2547XXXXXXXX format
 * Accepts: 0712345678, +254712345678, 254712345678
 */
const normalizePhone = (rawPhone) => {
    if (!rawPhone) return null;

    let phone = rawPhone.replace(/[\s\-\(\)\.]/g, '');

    // Strip leading +
    if (phone.startsWith('+')) {
        phone = phone.substring(1);
    }

    // Kenya-specific: 07xx → 2547xx
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1);
    }

    // Validate: must be 254 followed by 9 digits
    if (/^254[17]\d{8}$/.test(phone)) {
        return phone;
    }

    return null;
};

/**
 * Generate transaction ID: FLX-{timestamp}-{6 hex chars}
 */
const generateTransactionId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `FLX-${timestamp}-${random}`;
};

/**
 * Format amount as KES currency string
 */
const formatCurrency = (amount) => {
    return `KES ${amount.toLocaleString('en-KE')}`;
};

/**
 * Mask phone number for display: 254712345678 → 2547****5678
 */
const maskPhone = (phone) => {
    if (!phone || phone.length < 8) return phone;
    return phone.substring(0, 4) + '****' + phone.substring(phone.length - 4);
};

/**
 * Parse amount input from USSD string
 * Returns number or null
 */
const parseAmount = (input) => {
    if (!input) return null;
    const cleaned = input.replace(/[^\d]/g, '');
    const amount = parseInt(cleaned, 10);
    if (isNaN(amount) || amount <= 0) return null;
    return amount;
};

/**
 * Validate 4-digit PIN
 */
const isValidPin = (pin) => {
    if (!pin || pin.length !== 4) return false;
    if (!/^\d{4}$/.test(pin)) return false;
    // Reject common weak PINs
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234'];
    return !weakPins.includes(pin);
};

/**
 * Generate random token
 */
const generateToken = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

module.exports = {
    normalizePhone,
    generateTransactionId,
    formatCurrency,
    maskPhone,
    parseAmount,
    isValidPin,
    generateToken
};