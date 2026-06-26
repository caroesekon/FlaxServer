// ─── USSD MENU STRINGS ────────────────────────────

const USSD = {
    WELCOME: 'CON Welcome to Flax\n1. Send Money\n2. My Account',

    ENTER_RECIPIENT: 'CON Enter recipient number:',
    ENTER_AMOUNT: 'CON Enter amount in KES:',
    ENTER_PIN: 'CON Enter your 4-digit PIN:',

    MY_ACCOUNT: 'CON My Account\n1. Check Balance\n2. Change PIN',
    ENTER_CURRENT_PIN: 'CON Enter current PIN:',
    ENTER_NEW_PIN: 'CON Enter new 4-digit PIN:',

    // Success
    BALANCE: (balance) => `END Your balance is KES ${balance.toLocaleString()}`,
    SEND_SUCCESS: (amount, recipient, balance) =>
        `END You sent KES ${amount.toLocaleString()} to ${recipient}. New balance: KES ${balance.toLocaleString()}`,
    PIN_CHANGED: 'END PIN changed successfully.',

    // Errors
    USER_NOT_FOUND: 'END This number is not registered on Flax.',
    RECIPIENT_NOT_FOUND: 'END The recipient is not registered on Flax.',
    SELF_SEND: 'END You cannot send money to yourself.',
    INSUFFICIENT_BALANCE: (balance) =>
        `END Insufficient balance. You have KES ${balance.toLocaleString()}.`,
    INVALID_AMOUNT: 'CON Invalid amount. Enter amount in KES:',
    MIN_AMOUNT: (min) => `END Minimum amount is KES ${min}.`,
    MAX_AMOUNT: (max) => `END Maximum amount is KES ${max.toLocaleString()}.`,
    WRONG_PIN: 'CON Wrong PIN. Try again:',
    PIN_LOCKED: 'END Too many incorrect attempts. Try again later.',
    INVALID_PIN_FORMAT: 'END PIN must be 4 digits.',
    WEAK_PIN: 'END PIN is too weak. Choose a different one.',
    SESSION_EXPIRED: 'END Session expired. Please dial again.',
    SYSTEM_ERROR: 'END System error. Please try again later.'
};

// ─── LIMITS ────────────────────────────────────────

const LIMITS = {
    MIN_SEND_AMOUNT: 10,
    MAX_SEND_AMOUNT: 70000,
    MAX_PIN_ATTEMPTS: 3,
    SESSION_TIMEOUT_MINUTES: 5
};

// ─── TRANSACTION TYPES ─────────────────────────────

const TRANSACTION_TYPES = [
    'p2p_send',
    'p2p_receive',
    'cash_in',
    'cash_out',
    'bill_payment',
    'airtime_purchase',
    'fee',
    'reversal',
    'adjustment'
];

// ─── TRANSACTION STATUSES ──────────────────────────

const TRANSACTION_STATUSES = ['pending', 'success', 'failed', 'reversed'];

// ─── ADMIN ROLES ───────────────────────────────────

const ADMIN_ROLES = ['super_admin', 'agent', 'support', 'finance', 'viewer'];

module.exports = {
    USSD,
    LIMITS,
    TRANSACTION_TYPES,
    TRANSACTION_STATUSES,
    ADMIN_ROLES
};