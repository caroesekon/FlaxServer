const logger = require('./logger');

class USSDHelper {
  /**
   * Format USSD response
   * @param {string} text - Response text
   * @param {boolean} shouldClose - End session or continue
   * @returns {string} Formatted response
   */
  static formatResponse(text, shouldClose = false) {
    return shouldClose ? `END ${text}` : `CON ${text}`;
  }

  /**
   * Parse USSD input
   * @param {string} text - USSD input text
   * @returns {Array} Parsed input array
   */
  static parseInput(text) {
    if (!text) return [''];
    return text.split('*').map(item => item.trim());
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  static validatePhone(phone) {
    const phoneRegex = /^\+?254\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  /**
   * Log USSD session
   * @param {Object} sessionData - Session information
   */
  static logSession(sessionData) {
    logger.info('USSD Session', {
      sessionId: sessionData.sessionId,
      phoneNumber: sessionData.phoneNumber,
      text: sessionData.text,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = USSDHelper;