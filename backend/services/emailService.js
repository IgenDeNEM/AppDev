const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool } = require('../config/database');

class EmailService {
    constructor() {
        this.transporter = null;
        this.smtpConfig = null;
    }

    // Initialize SMTP transporter
    async initializeTransporter() {
        try {
            // Get SMTP configuration from database
            const [configs] = await pool.execute(
                'SELECT * FROM smtp_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
            );

            if (configs.length === 0) {
                throw new Error('No active SMTP configuration found');
            }

            this.smtpConfig = configs[0];

            this.transporter = nodemailer.createTransporter({
                host: this.smtpConfig.host,
                port: this.smtpConfig.port,
                secure: this.smtpConfig.secure,
                auth: {
                    user: this.smtpConfig.username,
                    pass: this.smtpConfig.password
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ SMTP connection verified successfully');
        } catch (error) {
            console.error('❌ SMTP initialization failed:', error.message);
            throw error;
        }
    }

    // Generate 8-digit verification code
    generateVerificationCode() {
        return crypto.randomInt(10000000, 99999999).toString();
    }

    // Create email verification code
    async createVerificationCode(userId, email, type, expiresInMinutes = 10) {
        try {
            // Clean up expired codes for this email and type
            await pool.execute(
                'DELETE FROM email_verification_codes WHERE email = ? AND type = ? AND (expires_at < NOW() OR is_used = TRUE)',
                [email, type]
            );

            const code = this.generateVerificationCode();
            const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

            const [result] = await pool.execute(
                'INSERT INTO email_verification_codes (user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)',
                [userId, email, code, type, expiresAt]
            );

            return {
                id: result.insertId,
                code,
                expiresAt
            };
        } catch (error) {
            console.error('Error creating verification code:', error);
            throw error;
        }
    }

    // Verify code
    async verifyCode(email, code, type) {
        try {
            const [codes] = await pool.execute(
                'SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW()',
                [email, code, type]
            );

            if (codes.length === 0) {
                // Increment attempts for failed verification
                await pool.execute(
                    'UPDATE email_verification_codes SET attempts = attempts + 1 WHERE email = ? AND type = ? AND expires_at > NOW()',
                    [email, type]
                );
                return { valid: false, error: 'Invalid or expired code' };
            }

            const verificationCode = codes[0];

            // Check if max attempts exceeded
            if (verificationCode.attempts >= verificationCode.max_attempts) {
                await pool.execute(
                    'UPDATE email_verification_codes SET is_used = TRUE WHERE id = ?',
                    [verificationCode.id]
                );
                return { valid: false, error: 'Maximum attempts exceeded' };
            }

            // Mark code as used
            await pool.execute(
                'UPDATE email_verification_codes SET is_used = TRUE, used_at = NOW() WHERE id = ?',
                [verificationCode.id]
            );

            return { valid: true, userId: verificationCode.user_id };
        } catch (error) {
            console.error('Error verifying code:', error);
            throw error;
        }
    }

    // Send email
    async sendEmail(to, subject, html, type = 'system_notification', userId = null) {
        try {
            if (!this.transporter) {
                await this.initializeTransporter();
            }

            const mailOptions = {
                from: `"${this.smtpConfig.from_name}" <${this.smtpConfig.from_email}>`,
                to,
                subject,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Log email
            await this.logEmail(userId, to, type, subject, 'sent');

            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            
            // Log failed email
            await this.logEmail(userId, to, type, subject, 'failed', error.message);
            
            throw error;
        }
    }

    // Log email activity
    async logEmail(userId, email, type, subject, status, errorMessage = null) {
        try {
            await pool.execute(
                'INSERT INTO email_logs (user_id, email, type, subject, status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, email, type, subject, status, errorMessage]
            );
        } catch (error) {
            console.error('Error logging email:', error);
        }
    }

    // Send verification code email
    async sendVerificationCode(userId, email, type, code, expiresInMinutes = 10) {
        const templates = {
            registration: {
                subject: 'Complete Your Registration - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Welcome to Tweak Application!</h2>
                        <p>Thank you for registering. To complete your registration, please use the verification code below:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            login_2fa: {
                subject: 'Two-Factor Authentication Code - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Two-Factor Authentication</h2>
                        <p>Someone is trying to log into your account. If this was you, use the verification code below:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't request this login, please secure your account immediately.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            password_reset: {
                subject: 'Password Reset Code - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>You requested to reset your password. Use the verification code below to proceed:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't request a password reset, please ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            password_change: {
                subject: 'Password Change Confirmation - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Change Request</h2>
                        <p>You requested to change your password. Use the verification code below to proceed:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't request a password change, please secure your account immediately.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            admin_creation: {
                subject: 'Admin Account Created - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Admin Account Created</h2>
                        <p>An admin account has been created for you. Use the verification code below to complete setup:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>Please complete the setup process as soon as possible.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            role_change: {
                subject: 'Account Role Changed - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Account Role Changed</h2>
                        <p>Your account role has been changed. Use the verification code below to confirm the change:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't request this change, please contact support immediately.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            },
            security_alert: {
                subject: 'Security Alert - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #d32f2f;">Security Alert</h2>
                        <p>We detected suspicious activity on your account. Use the verification code below to secure your account:</p>
                        <div style="background: #ffebee; padding: 20px; text-align: center; margin: 20px 0; border-left: 4px solid #d32f2f;">
                            <h1 style="color: #d32f2f; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                        </div>
                        <p>This code will expire in ${expiresInMinutes} minutes.</p>
                        <p>If you didn't perform this action, please change your password immediately.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated message from Tweak Application.</p>
                    </div>
                `
            }
        };

        const template = templates[type];
        if (!template) {
            throw new Error(`No email template found for type: ${type}`);
        }

        return await this.sendEmail(email, template.subject, template.html, 'verification_code', userId);
    }

    // Send security alert
    async sendSecurityAlert(userId, email, alertType, details) {
        const templates = {
            multiple_failed_logins: {
                subject: 'Multiple Failed Login Attempts - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #d32f2f;">Security Alert</h2>
                        <p>We detected multiple failed login attempts on your account:</p>
                        <ul>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>IP Address: ${details.ipAddress || 'Unknown'}</li>
                            <li>Attempts: ${details.attempts || 'Multiple'}</li>
                        </ul>
                        <p>If this was not you, please secure your account immediately by changing your password.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated security alert from Tweak Application.</p>
                    </div>
                `
            },
            suspicious_activity: {
                subject: 'Suspicious Activity Detected - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #d32f2f;">Security Alert</h2>
                        <p>We detected suspicious activity on your account:</p>
                        <ul>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>Activity: ${details.activity || 'Unknown'}</li>
                            <li>Location: ${details.location || 'Unknown'}</li>
                        </ul>
                        <p>If this was not you, please secure your account immediately.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated security alert from Tweak Application.</p>
                    </div>
                `
            }
        };

        const template = templates[alertType];
        if (!template) {
            throw new Error(`No security alert template found for type: ${alertType}`);
        }

        return await this.sendEmail(email, template.subject, template.html, 'security_alert', userId);
    }

    // Send system notification
    async sendSystemNotification(userId, email, notificationType, details) {
        const templates = {
            key_generated: {
                subject: 'New Registration Key Generated - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Registration Key Generated</h2>
                        <p>A new registration key has been generated:</p>
                        <ul>
                            <li>Generated by: ${details.generatedBy || 'Admin'}</li>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>Expires: ${details.expiresAt ? new Date(details.expiresAt).toLocaleString() : 'Never'}</li>
                        </ul>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated notification from Tweak Application.</p>
                    </div>
                `
            },
            user_blocked: {
                subject: 'User Account Blocked - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #d32f2f;">Account Blocked</h2>
                        <p>Your account has been blocked due to security concerns:</p>
                        <ul>
                            <li>Reason: ${details.reason || 'Security violation'}</li>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>Blocked by: ${details.blockedBy || 'System'}</li>
                        </ul>
                        <p>Please contact support for assistance.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated notification from Tweak Application.</p>
                    </div>
                `
            },
            user_unblocked: {
                subject: 'User Account Unblocked - Tweak Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2e7d32;">Account Unblocked</h2>
                        <p>Your account has been unblocked and you can now access the system:</p>
                        <ul>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>Unblocked by: ${details.unblockedBy || 'Admin'}</li>
                        </ul>
                        <p>You can now log in normally.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">This is an automated notification from Tweak Application.</p>
                    </div>
                `
            }
        };

        const template = templates[notificationType];
        if (!template) {
            throw new Error(`No system notification template found for type: ${notificationType}`);
        }

        return await this.sendEmail(email, template.subject, template.html, 'system_notification', userId);
    }

    // Get email statistics
    async getEmailStats() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    type,
                    status,
                    COUNT(*) as count,
                    DATE(sent_at) as date
                FROM email_logs 
                WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY type, status, DATE(sent_at)
                ORDER BY date DESC, type, status
            `);

            const [verificationStats] = await pool.execute(`
                SELECT 
                    type,
                    COUNT(*) as total_codes,
                    SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used_codes,
                    SUM(CASE WHEN expires_at < NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as expired_codes
                FROM email_verification_codes 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY type
            `);

            return {
                emailStats: stats,
                verificationStats
            };
        } catch (error) {
            console.error('Error getting email stats:', error);
            throw error;
        }
    }

    // Clean up expired codes
    async cleanupExpiredCodes() {
        try {
            const [result] = await pool.execute(
                'DELETE FROM email_verification_codes WHERE expires_at < NOW()'
            );
            console.log(`Cleaned up ${result.affectedRows} expired verification codes`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired codes:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();