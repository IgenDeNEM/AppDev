const { pool } = require('../config/database');
const emailService = require('./emailService');

class SecurityService {
    constructor() {
        this.maxFailedAttempts = 5;
        this.lockoutDuration = 30; // minutes
        this.rateLimitWindow = 15; // minutes
        this.rateLimitMaxAttempts = 10;
    }

    // Check if account is locked
    async isAccountLocked(userId) {
        try {
            const [settings] = await pool.execute(
                'SELECT account_locked_until FROM user_security_settings WHERE user_id = ?',
                [userId]
            );

            if (settings.length === 0) {
                return false;
            }

            const lockedUntil = settings[0].account_locked_until;
            if (!lockedUntil) {
                return false;
            }

            return new Date(lockedUntil) > new Date();
        } catch (error) {
            console.error('Error checking account lock status:', error);
            return false;
        }
    }

    // Lock account
    async lockAccount(userId, reason = 'Multiple failed login attempts') {
        try {
            const lockUntil = new Date(Date.now() + this.lockoutDuration * 60 * 1000);

            await pool.execute(
                `INSERT INTO user_security_settings (user_id, failed_login_attempts, last_failed_login, account_locked_until) 
                 VALUES (?, ?, NOW(), ?) 
                 ON DUPLICATE KEY UPDATE 
                 failed_login_attempts = ?, 
                 last_failed_login = NOW(), 
                 account_locked_until = ?`,
                [userId, this.maxFailedAttempts, lockUntil, this.maxFailedAttempts, lockUntil]
            );

            // Get user email for security alert
            const [users] = await pool.execute(
                'SELECT email FROM users WHERE id = ?',
                [userId]
            );

            if (users.length > 0) {
                await emailService.sendSecurityAlert(
                    userId,
                    users[0].email,
                    'multiple_failed_logins',
                    {
                        attempts: this.maxFailedAttempts,
                        reason: reason
                    }
                );
            }

            console.log(`Account locked for user ${userId} until ${lockUntil}`);
        } catch (error) {
            console.error('Error locking account:', error);
            throw error;
        }
    }

    // Unlock account
    async unlockAccount(userId) {
        try {
            await pool.execute(
                'UPDATE user_security_settings SET account_locked_until = NULL, failed_login_attempts = 0 WHERE user_id = ?',
                [userId]
            );

            console.log(`Account unlocked for user ${userId}`);
        } catch (error) {
            console.error('Error unlocking account:', error);
            throw error;
        }
    }

    // Record failed login attempt
    async recordFailedLogin(userId, ipAddress) {
        try {
            const [settings] = await pool.execute(
                'SELECT failed_login_attempts FROM user_security_settings WHERE user_id = ?',
                [userId]
            );

            let failedAttempts = 1;
            if (settings.length > 0) {
                failedAttempts = settings[0].failed_login_attempts + 1;
            }

            await pool.execute(
                `INSERT INTO user_security_settings (user_id, failed_login_attempts, last_failed_login) 
                 VALUES (?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE 
                 failed_login_attempts = ?, 
                 last_failed_login = NOW()`,
                [userId, failedAttempts, failedAttempts]
            );

            // Check if account should be locked
            if (failedAttempts >= this.maxFailedAttempts) {
                await this.lockAccount(userId);
            }

            return failedAttempts;
        } catch (error) {
            console.error('Error recording failed login:', error);
            throw error;
        }
    }

    // Reset failed login attempts
    async resetFailedLogins(userId) {
        try {
            await pool.execute(
                'UPDATE user_security_settings SET failed_login_attempts = 0, last_failed_login = NULL WHERE user_id = ?',
                [userId]
            );
        } catch (error) {
            console.error('Error resetting failed logins:', error);
            throw error;
        }
    }

    // Check rate limiting for email actions
    async checkEmailRateLimit(email, action) {
        try {
            const windowStart = new Date(Date.now() - this.rateLimitWindow * 60 * 1000);

            const [logs] = await pool.execute(
                'SELECT COUNT(*) as count FROM email_logs WHERE email = ? AND type = ? AND sent_at > ?',
                [email, action, windowStart]
            );

            const count = logs[0].count;
            return {
                allowed: count < this.rateLimitMaxAttempts,
                remaining: Math.max(0, this.rateLimitMaxAttempts - count),
                resetTime: new Date(Date.now() + this.rateLimitWindow * 60 * 1000)
            };
        } catch (error) {
            console.error('Error checking email rate limit:', error);
            return { allowed: true, remaining: this.rateLimitMaxAttempts, resetTime: new Date() };
        }
    }

    // Check verification code rate limiting
    async checkCodeRateLimit(email, type) {
        try {
            const windowStart = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

            const [codes] = await pool.execute(
                'SELECT COUNT(*) as count FROM email_verification_codes WHERE email = ? AND type = ? AND created_at > ?',
                [email, type, windowStart]
            );

            const count = codes[0].count;
            const maxCodesPerWindow = 3;

            return {
                allowed: count < maxCodesPerWindow,
                remaining: Math.max(0, maxCodesPerWindow - count),
                resetTime: new Date(Date.now() + 5 * 60 * 1000)
            };
        } catch (error) {
            console.error('Error checking code rate limit:', error);
            return { allowed: true, remaining: 3, resetTime: new Date() };
        }
    }

    // Get security settings for user
    async getUserSecuritySettings(userId) {
        try {
            const [settings] = await pool.execute(
                'SELECT * FROM user_security_settings WHERE user_id = ?',
                [userId]
            );

            if (settings.length === 0) {
                // Create default security settings
                await pool.execute(
                    'INSERT INTO user_security_settings (user_id) VALUES (?)',
                    [userId]
                );

                return {
                    user_id: userId,
                    two_factor_enabled: false,
                    email_notifications: true,
                    security_alerts: true,
                    failed_login_attempts: 0,
                    last_failed_login: null,
                    account_locked_until: null
                };
            }

            return settings[0];
        } catch (error) {
            console.error('Error getting user security settings:', error);
            throw error;
        }
    }

    // Update security settings
    async updateSecuritySettings(userId, settings) {
        try {
            const allowedFields = [
                'two_factor_enabled',
                'email_notifications',
                'security_alerts'
            ];

            const updateFields = [];
            const updateValues = [];

            for (const [key, value] of Object.entries(settings)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            updateValues.push(userId);

            await pool.execute(
                `UPDATE user_security_settings SET ${updateFields.join(', ')} WHERE user_id = ?`,
                updateValues
            );

            return true;
        } catch (error) {
            console.error('Error updating security settings:', error);
            throw error;
        }
    }

    // Check if user has 2FA enabled
    async isTwoFactorEnabled(userId) {
        try {
            const settings = await this.getUserSecuritySettings(userId);
            return settings.two_factor_enabled;
        } catch (error) {
            console.error('Error checking 2FA status:', error);
            return false;
        }
    }

    // Enable/disable 2FA
    async setTwoFactor(userId, enabled) {
        try {
            await this.updateSecuritySettings(userId, {
                two_factor_enabled: enabled
            });

            return true;
        } catch (error) {
            console.error('Error setting 2FA:', error);
            throw error;
        }
    }

    // Log security event
    async logSecurityEvent(userId, event, details, ipAddress) {
        try {
            await pool.execute(
                'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
                [userId, `security_${event}`, JSON.stringify(details), ipAddress]
            );
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    }

    // Get security statistics
    async getSecurityStats() {
        try {
            const [lockedAccounts] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_security_settings WHERE account_locked_until > NOW()'
            );

            const [failedLogins] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_security_settings WHERE failed_login_attempts > 0'
            );

            const [twoFactorUsers] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_security_settings WHERE two_factor_enabled = TRUE'
            );

            const [recentSecurityEvents] = await pool.execute(`
                SELECT COUNT(*) as count 
                FROM activity_logs 
                WHERE action LIKE 'security_%' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            return {
                lockedAccounts: lockedAccounts[0].count,
                failedLogins: failedLogins[0].count,
                twoFactorUsers: twoFactorUsers[0].count,
                recentSecurityEvents: recentSecurityEvents[0].count
            };
        } catch (error) {
            console.error('Error getting security stats:', error);
            throw error;
        }
    }

    // Clean up old security data
    async cleanupSecurityData() {
        try {
            // Remove old failed login records (older than 30 days)
            const [result1] = await pool.execute(
                'UPDATE user_security_settings SET failed_login_attempts = 0, last_failed_login = NULL WHERE last_failed_login < DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );

            // Remove old security logs (older than 90 days)
            const [result2] = await pool.execute(
                'DELETE FROM activity_logs WHERE action LIKE "security_%" AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
            );

            console.log(`Security cleanup: ${result1.affectedRows} failed login records reset, ${result2.affectedRows} old security logs removed`);
            return { failedLoginsReset: result1.affectedRows, securityLogsRemoved: result2.affectedRows };
        } catch (error) {
            console.error('Error cleaning up security data:', error);
            throw error;
        }
    }
}

module.exports = new SecurityService();