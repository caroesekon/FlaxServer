const axios = require('axios');
const env = require('../config/env');
const hdmConfig = require('../config/hdmBridge');
const brevoConfig = require('../config/brevo');

class EmailService {
    constructor() {
        this.provider = env.EMAIL_PROVIDER === 'hdm' ? hdmConfig : brevoConfig;
    }

    /**
     * Send a single email
     */
    async send({ to, subject, htmlBody, textBody }) {
        if (!this.provider.isConfigured) {
            console.warn(`⚠️  ${env.EMAIL_PROVIDER} not configured. Email skipped.`);
            console.log(`   To: ${to} | Subject: ${subject}`);
            return { success: false, reason: 'not_configured' };
        }

        try {
            const config = this.provider.getSendConfig({
                to,
                subject,
                htmlBody,
                textBody: textBody || subject
            });

            const response = await axios(config);
            console.log(`📧 Email sent via ${env.EMAIL_PROVIDER}: ${to} — ${subject}`);
            return { success: true, messageId: response.data?.messageId };
        } catch (error) {
            console.error(`❌ ${env.EMAIL_PROVIDER} send failed:`, error.response?.data || error.message);
            return { success: false, reason: error.message };
        }
    }

    // ─── TEMPLATES ────────────────────────────────────

    /**
     * Admin welcome email
     */
    async sendAdminWelcome({ to, name, tempPassword }) {
        const loginUrl = env.ADMIN_PANEL_URL;
        return this.send({
            to,
            subject: `Welcome to ${env.APP_NAME} Admin Panel, ${name}`,
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2>Welcome to ${env.APP_NAME} Admin Panel</h2>
                    <p>Hi ${name},</p>
                    <p>Your admin account has been created.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <strong>Email:</strong> ${to}<br>
                        <strong>Temporary Password:</strong> ${tempPassword}<br>
                        <strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a>
                    </div>
                    <p>Change your password on first login.</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">${env.APP_NAME} — Automated message</p>
                </div>
            `,
            textBody: `Welcome to ${env.APP_NAME} Admin Panel, ${name}.\n\nEmail: ${to}\nPassword: ${tempPassword}\nLogin: ${loginUrl}\n\nChange your password on first login.`
        });
    }

    /**
     * Password reset email
     */
    async sendPasswordReset({ to, name, resetLink }) {
        return this.send({
            to,
            subject: `${env.APP_NAME} Admin — Password Reset`,
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2>Password Reset</h2>
                    <p>Hi ${name},</p>
                    <p>You requested a password reset.</p>
                    <div style="margin: 20px 0;">
                        <a href="${resetLink}" 
                           style="background: #4CAF50; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px;">
                            Reset Password
                        </a>
                    </div>
                    <p>Link expires in 1 hour. Ignore if you didn't request this.</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">${env.APP_NAME} — Automated message</p>
                </div>
            `,
            textBody: `Hi ${name},\n\nReset your password: ${resetLink}\n\nLink expires in 1 hour.`
        });
    }

    /**
     * Backup notification
     */
    async sendBackupNotification({ to, filename, size, status, timestamp }) {
        const emoji = status === 'completed' ? '✅' : '❌';
        const sizeMB = (size / 1048576).toFixed(2);
        return this.send({
            to,
            subject: `${env.APP_NAME} Backup ${emoji}`,
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2>Backup ${status}</h2>
                    <table style="width: 100%;">
                        <tr><td><strong>File:</strong></td><td>${filename}</td></tr>
                        <tr><td><strong>Size:</strong></td><td>${sizeMB} MB</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${status.toUpperCase()}</td></tr>
                        <tr><td><strong>Time:</strong></td><td>${timestamp}</td></tr>
                    </table>
                    <hr>
                    <p style="color: #888; font-size: 12px;">${env.APP_NAME} — Automated message</p>
                </div>
            `,
            textBody: `Backup ${status}\n\nFile: ${filename}\nSize: ${sizeMB} MB\nTime: ${timestamp}`
        });
    }

    /**
     * System alert
     */
    async sendSystemAlert({ to, subject, message, severity = 'warning' }) {
        const colors = { critical: '#f44336', warning: '#ff9800', info: '#2196F3' };
        const color = colors[severity] || colors.info;
        return this.send({
            to,
            subject: `[${severity.toUpperCase()}] ${subject}`,
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <div style="background: ${color}; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
                        <h2 style="margin: 0;">🚨 ${subject}</h2>
                    </div>
                    <div style="padding: 15px; border: 1px solid #ddd; border-top: none;">
                        <p>${message}</p>
                    </div>
                    <p style="color: #888; font-size: 12px;">${env.APP_NAME} System Monitor — ${new Date().toISOString()}</p>
                </div>
            `,
            textBody: `[${severity.toUpperCase()}] ${subject}\n\n${message}\n\n${env.APP_NAME} System Monitor`
        });
    }
}

// Singleton
module.exports = new EmailService();