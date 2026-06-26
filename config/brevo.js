const env = require('./env');

/**
 * Brevo — Configuration only
 * Returns connection config. Sending logic lives in services/emailService.js
 */
const brevoConfig = {
    apiKey: env.BREVO_API_KEY,
    senderEmail: env.BREVO_SENDER_EMAIL,
    senderName: env.BREVO_SENDER_NAME,
    isConfigured: !!(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL),

    /**
     * Returns axios-compatible request config for Brevo
     */
    getSendConfig({ to, subject, htmlBody, textBody }) {
        return {
            url: 'https://api.brevo.com/v3/smtp/email',
            method: 'POST',
            headers: {
                'api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            data: {
                sender: {
                    email: this.senderEmail,
                    name: this.senderName
                },
                to: [{ email: to }],
                subject,
                htmlContent: htmlBody,
                textContent: textBody
            }
        };
    }
};

module.exports = brevoConfig;