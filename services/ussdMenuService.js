const User = require('../models/client/User');
const { normalizePhone, parseAmount } = require('../utils/helpers');
const { USSD, LIMITS } = require('../utils/constants');
const { sendMoney } = require('./transactionService');
const { getSession, setSession, clearSession } = require('./ussdSessionService');

/**
 * Main USSD menu handler
 * @param {string} text - Menu path from Africa's Talking (e.g., "1*0712345678*500*1234")
 * @param {string} phoneNumber - User's phone number
 * @param {string} sessionId - Unique session ID
 * @returns {string} USSD response string ("CON ..." or "END ...")
 */
const handleUssd = async (text, phoneNumber, sessionId) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    const input = text.trim();
    const parts = input ? input.split('*') : [''];

    // ─── MAIN MENU ──────────────────────────────────
    if (!input || parts[0] === '') {
        return USSD.WELCOME;
    }

    const menu = parts[0];

    // ─── SEND MONEY (Option 1) ──────────────────────
    if (menu === '1') {
        return handleSendMoney(parts, normalizedPhone, sessionId);
    }

    // ─── MY ACCOUNT (Option 2) ──────────────────────
    if (menu === '2') {
        return handleMyAccount(parts, normalizedPhone, sessionId);
    }

    return USSD.SYSTEM_ERROR;
};

/**
 * Send Money flow: 1*recipient*amount*pin
 */
const handleSendMoney = async (parts, senderPhone, sessionId) => {
    // Step 1: Ask for recipient
    if (parts.length === 1) {
        return USSD.ENTER_RECIPIENT;
    }

    const rawRecipient = parts[1];
    const recipientPhone = normalizePhone(rawRecipient);

    if (!recipientPhone) {
        return 'END Invalid phone number format.';
    }

    // Step 2: Ask for amount
    if (parts.length === 2) {
        setSession(sessionId, { recipient: recipientPhone, step: 'amount' });
        return USSD.ENTER_AMOUNT;
    }

    const amount = parseAmount(parts[2]);
    if (!amount) {
        return USSD.INVALID_AMOUNT;
    }

    // Step 3: Ask for PIN
    if (parts.length === 3) {
        setSession(sessionId, { recipient: recipientPhone, amount, step: 'pin' });
        return USSD.ENTER_PIN;
    }

    const pin = parts[3];

    // Step 4: Execute transaction
    try {
        const result = await sendMoney(senderPhone, recipientPhone, amount, pin);
        clearSession(sessionId);
        return USSD.SEND_SUCCESS(amount, rawRecipient, result.senderBalance);
    } catch (error) {
        if (error.message.includes('Invalid PIN')) {
            return USSD.WRONG_PIN;
        }
        if (error.message.includes('Insufficient balance')) {
            return USSD.INSUFFICIENT_BALANCE(error.message.split('KES ')[1] || 0);
        }
        if (error.message.includes('recipient')) {
            return USSD.RECIPIENT_NOT_FOUND;
        }
        if (error.message.includes('yourself')) {
            return USSD.SELF_SEND;
        }
        return `END ${error.message}`;
    }
};

/**
 * My Account flow: 2*submenu
 */
const handleMyAccount = async (parts, phoneNumber, sessionId) => {
    // Show My Account menu
    if (parts.length === 1) {
        return USSD.MY_ACCOUNT;
    }

    const subMenu = parts[1];

    // ─── CHECK BALANCE (2*1) ───────────────────────
    if (subMenu === '1') {
        try {
            const user = await User.findByPhone(phoneNumber);
            if (!user) return USSD.USER_NOT_FOUND;
            return USSD.BALANCE(user.balance);
        } catch (error) {
            return USSD.SYSTEM_ERROR;
        }
    }

    // ─── CHANGE PIN (2*2) ──────────────────────────
    if (subMenu === '2') {
        return handleChangePin(parts, phoneNumber, sessionId);
    }

    return USSD.SYSTEM_ERROR;
};

/**
 * Change PIN flow: 2*2*currentPin*newPin
 */
const handleChangePin = async (parts, phoneNumber, sessionId) => {
    // Step 1: Ask for current PIN
    if (parts.length === 2) {
        return USSD.ENTER_CURRENT_PIN;
    }

    const currentPin = parts[2];

    // Step 2: Ask for new PIN
    if (parts.length === 3) {
        // Verify current PIN first
        try {
            const user = await User.findByPhone(phoneNumber);
            if (!user) return USSD.USER_NOT_FOUND;

            const isValid = await user.comparePin(currentPin);
            if (!isValid) {
                return USSD.WRONG_PIN;
            }

            setSession(sessionId, { step: 'newPin', currentPinVerified: true });
            return USSD.ENTER_NEW_PIN;
        } catch (error) {
            return USSD.SYSTEM_ERROR;
        }
    }

    // Step 3: Set new PIN
    const newPin = parts[3];

    // Validate new PIN
    if (!/^\d{4}$/.test(newPin)) {
        return USSD.INVALID_PIN_FORMAT;
    }

    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234'];
    if (weakPins.includes(newPin)) {
        return USSD.WEAK_PIN;
    }

    try {
        const user = await User.findByPhone(phoneNumber);
        if (!user) return USSD.USER_NOT_FOUND;

        user.pin = newPin;  // pre-save hook will hash it
        await user.save();

        clearSession(sessionId);
        return USSD.PIN_CHANGED;
    } catch (error) {
        return USSD.SYSTEM_ERROR;
    }
};

module.exports = { handleUssd };