const env = require('./env');

/**
 * HDM Bridge — Configuration only
 * Returns connection config. Sending logic lives in services/emailService.js
 */
const hdmConfig = {
    apiKey: env.HDM_API_KEY,
    apiUrl: env.HDM_API_URL,
    fromEmail: env.HDM_FROM_EMAIL,
    fromName: env.HDM_FROM_NAME,
    isConfigured: !!(env.HDM_API_KEY && env.HDM_API_URL && env.HDM_FROM_EMAIL),

    /**
     * Returns axios-compatible request config for HDM Bridge
     */
    getSendConfig({ to, subject, htmlBody, textBody }) {
        return {
            url: `${this.apiUrl}/emails/send`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            data: {
                from: this.fromEmail,
                fromName: this.fromName,
                to,
                subject,
                htmlBody,
                textBody
            }
        };
    }
};

module.exports = hdmConfig;