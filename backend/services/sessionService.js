const crypto = require('crypto');
const { pool } = require('../config/database');

class SessionService {
    constructor() {
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.maxSessionsPerUser = 5; // Maximum concurrent sessions per user
    }

    // Create a new session
    async createSession(userId, ipAddress, userAgent) {
        try {
            // Check if user has too many active sessions
            const activeSessions = await this.getActiveSessions(userId);
            if (activeSessions.length >= this.maxSessionsPerUser) {
                // Remove oldest session
                await this.terminateOldestSession(userId);
            }

            const sessionToken = this.generateSessionToken();
            const expiresAt = new Date(Date.now() + this.sessionTimeout);

            await pool.execute(
                'INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
                [userId, sessionToken, ipAddress, userAgent, expiresAt]
            );

            return sessionToken;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    // Validate session token
    async validateSession(sessionToken) {
        try {
            const [sessions] = await pool.execute(
                'SELECT * FROM user_sessions WHERE session_token = ? AND is_active = TRUE AND expires_at > NOW()',
                [sessionToken]
            );

            if (sessions.length === 0) {
                return null;
            }

            const session = sessions[0];

            // Update last activity
            await pool.execute(
                'UPDATE user_sessions SET last_activity = NOW() WHERE id = ?',
                [session.id]
            );

            return session;
        } catch (error) {
            console.error('Error validating session:', error);
            return null;
        }
    }

    // Terminate a specific session
    async terminateSession(sessionToken) {
        try {
            await pool.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE session_token = ?',
                [sessionToken]
            );
            return true;
        } catch (error) {
            console.error('Error terminating session:', error);
            return false;
        }
    }

    // Terminate all sessions for a user
    async terminateAllUserSessions(userId) {
        try {
            await pool.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Error terminating all user sessions:', error);
            return false;
        }
    }

    // Terminate sessions by admin
    async terminateSessionByAdmin(sessionId, adminId) {
        try {
            const [result] = await pool.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE id = ?',
                [sessionId]
            );

            if (result.affectedRows > 0) {
                // Log the admin action
                await pool.execute(
                    'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
                    [adminId, 'session_terminated', `Terminated session ID: ${sessionId}`]
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error terminating session by admin:', error);
            return false;
        }
    }

    // Get active sessions for a user
    async getActiveSessions(userId) {
        try {
            const [sessions] = await pool.execute(
                `SELECT 
                    id, session_token, ip_address, user_agent, 
                    last_activity, created_at, expires_at
                FROM user_sessions 
                WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW()
                ORDER BY last_activity DESC`,
                [userId]
            );

            return sessions;
        } catch (error) {
            console.error('Error getting active sessions:', error);
            return [];
        }
    }

    // Get all sessions for admin view
    async getAllSessions(limit = 100, offset = 0) {
        try {
            const [sessions] = await pool.execute(
                `SELECT 
                    us.id,
                    us.user_id,
                    us.session_token,
                    us.ip_address,
                    us.user_agent,
                    us.is_active,
                    us.last_activity,
                    us.created_at,
                    us.expires_at,
                    u.username,
                    u.email
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                ORDER BY us.last_activity DESC
                LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            return sessions;
        } catch (error) {
            console.error('Error getting all sessions:', error);
            return [];
        }
    }

    // Get session statistics
    async getSessionStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN is_active = TRUE AND expires_at > NOW() THEN 1 END) as active_sessions,
                    COUNT(CASE WHEN is_active = FALSE THEN 1 END) as terminated_sessions,
                    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_sessions
                FROM user_sessions
            `);

            const [recentSessions] = await pool.execute(`
                SELECT 
                    us.id,
                    us.user_id,
                    us.ip_address,
                    us.is_active,
                    us.last_activity,
                    u.username
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY us.created_at DESC
                LIMIT 10
            `);

            return {
                statistics: stats[0],
                recentSessions
            };
        } catch (error) {
            console.error('Error getting session statistics:', error);
            return { statistics: {}, recentSessions: [] };
        }
    }

    // Clean up expired sessions
    async cleanupExpiredSessions() {
        try {
            const [result] = await pool.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE'
            );
            console.log(`Cleaned up ${result.affectedRows} expired sessions`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return 0;
        }
    }

    // Terminate oldest session for a user
    async terminateOldestSession(userId) {
        try {
            const [sessions] = await pool.execute(
                'SELECT id FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_activity ASC LIMIT 1',
                [userId]
            );

            if (sessions.length > 0) {
                await pool.execute(
                    'UPDATE user_sessions SET is_active = FALSE WHERE id = ?',
                    [sessions[0].id]
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error terminating oldest session:', error);
            return false;
        }
    }

    // Extend session expiry
    async extendSession(sessionToken, additionalTime = null) {
        try {
            const extendBy = additionalTime || this.sessionTimeout;
            const newExpiry = new Date(Date.now() + extendBy);

            await pool.execute(
                'UPDATE user_sessions SET expires_at = ?, last_activity = NOW() WHERE session_token = ? AND is_active = TRUE',
                [newExpiry, sessionToken]
            );

            return true;
        } catch (error) {
            console.error('Error extending session:', error);
            return false;
        }
    }

    // Get session by ID (for admin operations)
    async getSessionById(sessionId) {
        try {
            const [sessions] = await pool.execute(
                `SELECT 
                    us.*,
                    u.username,
                    u.email
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.id = ?`,
                [sessionId]
            );

            return sessions.length > 0 ? sessions[0] : null;
        } catch (error) {
            console.error('Error getting session by ID:', error);
            return null;
        }
    }

    // Generate secure session token
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Check for suspicious session activity
    async getSuspiciousSessions() {
        try {
            // Find sessions with unusual IP patterns
            const [suspiciousSessions] = await pool.execute(`
                SELECT 
                    us.user_id,
                    u.username,
                    us.ip_address,
                    us.last_activity,
                    COUNT(DISTINCT us.ip_address) as ip_count
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.is_active = TRUE 
                AND us.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY us.user_id
                HAVING ip_count > 3
                ORDER BY ip_count DESC
            `);

            // Find sessions with very long durations
            const [longSessions] = await pool.execute(`
                SELECT 
                    us.id,
                    us.user_id,
                    u.username,
                    us.ip_address,
                    us.created_at,
                    us.last_activity,
                    TIMESTAMPDIFF(HOUR, us.created_at, us.last_activity) as duration_hours
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.is_active = TRUE
                AND TIMESTAMPDIFF(HOUR, us.created_at, us.last_activity) > 48
                ORDER BY duration_hours DESC
            `);

            return {
                suspiciousSessions,
                longSessions
            };
        } catch (error) {
            console.error('Error getting suspicious sessions:', error);
            return { suspiciousSessions: [], longSessions: [] };
        }
    }
}

module.exports = new SessionService();