const { pool } = require('../config/database');

class ScreenViewService {
    constructor() {
        this.defaultExpiryMinutes = 10; // 10 minutes default expiry
        this.maxPendingRequests = 3; // Maximum pending requests per user
    }

    // Request screen view permission
    async requestScreenView(adminId, userId, expiryMinutes = null) {
        try {
            // Check if user already has pending requests
            const pendingCount = await this.getPendingRequestsCount(userId);
            if (pendingCount >= this.maxPendingRequests) {
                return { success: false, error: 'User has too many pending screen view requests' };
            }

            // Check if there's already a pending request from this admin
            const existingRequest = await this.getPendingRequest(adminId, userId);
            if (existingRequest) {
                return { success: false, error: 'Screen view request already pending' };
            }

            const expiry = expiryMinutes || this.defaultExpiryMinutes;
            const expiresAt = new Date(Date.now() + expiry * 60 * 1000);

            const [result] = await pool.execute(
                'INSERT INTO screen_view_permissions (admin_id, user_id, expires_at) VALUES (?, ?, ?)',
                [adminId, userId, expiresAt]
            );

            const requestId = result.insertId;

            // In a real implementation, you would notify the user via WebSocket
            console.log(`Screen view request created: ID ${requestId}, Admin ${adminId}, User ${userId}, Expires: ${expiresAt}`);

            return {
                success: true,
                requestId,
                expiresAt,
                message: 'Screen view request sent to user'
            };
        } catch (error) {
            console.error('Error requesting screen view:', error);
            return { success: false, error: error.message };
        }
    }

    // Respond to screen view request
    async respondToRequest(requestId, userId, approved) {
        try {
            // Verify the request belongs to this user
            const request = await this.getRequestById(requestId);
            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (request.user_id !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (request.status !== 'pending') {
                return { success: false, error: 'Request already responded to' };
            }

            if (request.expires_at < new Date()) {
                return { success: false, error: 'Request has expired' };
            }

            const status = approved ? 'approved' : 'denied';
            const respondedAt = new Date();

            await pool.execute(
                'UPDATE screen_view_permissions SET status = ?, responded_at = ? WHERE id = ?',
                [status, respondedAt, requestId]
            );

            // In a real implementation, you would notify the admin via WebSocket
            console.log(`Screen view request ${requestId} ${status} by user ${userId}`);

            return {
                success: true,
                status,
                message: `Screen view request ${approved ? 'approved' : 'denied'}`
            };
        } catch (error) {
            console.error('Error responding to screen view request:', error);
            return { success: false, error: error.message };
        }
    }

    // Get request by ID
    async getRequestById(requestId) {
        try {
            const [requests] = await pool.execute(
                `SELECT 
                    svp.*,
                    admin.username as admin_username,
                    user.username as user_username
                FROM screen_view_permissions svp
                JOIN users admin ON svp.admin_id = admin.id
                JOIN users user ON svp.user_id = user.id
                WHERE svp.id = ?`,
                [requestId]
            );

            return requests.length > 0 ? requests[0] : null;
        } catch (error) {
            console.error('Error getting request by ID:', error);
            return null;
        }
    }

    // Get pending request between admin and user
    async getPendingRequest(adminId, userId) {
        try {
            const [requests] = await pool.execute(
                'SELECT * FROM screen_view_permissions WHERE admin_id = ? AND user_id = ? AND status = "pending" AND expires_at > NOW()',
                [adminId, userId]
            );

            return requests.length > 0 ? requests[0] : null;
        } catch (error) {
            console.error('Error getting pending request:', error);
            return null;
        }
    }

    // Get pending requests count for user
    async getPendingRequestsCount(userId) {
        try {
            const [result] = await pool.execute(
                'SELECT COUNT(*) as count FROM screen_view_permissions WHERE user_id = ? AND status = "pending" AND expires_at > NOW()',
                [userId]
            );

            return result[0].count;
        } catch (error) {
            console.error('Error getting pending requests count:', error);
            return 0;
        }
    }

    // Get pending requests for user
    async getPendingRequestsForUser(userId) {
        try {
            const [requests] = await pool.execute(
                `SELECT 
                    svp.*,
                    admin.username as admin_username,
                    admin.email as admin_email
                FROM screen_view_permissions svp
                JOIN users admin ON svp.admin_id = admin.id
                WHERE svp.user_id = ? AND svp.status = 'pending' AND svp.expires_at > NOW()
                ORDER BY svp.created_at DESC`,
                [userId]
            );

            return requests;
        } catch (error) {
            console.error('Error getting pending requests for user:', error);
            return [];
        }
    }

    // Get requests for admin
    async getRequestsForAdmin(adminId, status = null, limit = 50) {
        try {
            let query = `
                SELECT 
                    svp.*,
                    user.username as user_username,
                    user.email as user_email
                FROM screen_view_permissions svp
                JOIN users user ON svp.user_id = user.id
                WHERE svp.admin_id = ?
            `;

            const params = [adminId];

            if (status) {
                query += ' AND svp.status = ?';
                params.push(status);
            }

            query += ' ORDER BY svp.created_at DESC LIMIT ?';
            params.push(limit);

            const [requests] = await pool.execute(query, params);
            return requests;
        } catch (error) {
            console.error('Error getting requests for admin:', error);
            return [];
        }
    }

    // Get all screen view requests (admin view)
    async getAllRequests(filters = {}, limit = 100, offset = 0) {
        try {
            let query = `
                SELECT 
                    svp.*,
                    admin.username as admin_username,
                    user.username as user_username
                FROM screen_view_permissions svp
                JOIN users admin ON svp.admin_id = admin.id
                JOIN users user ON svp.user_id = user.id
            `;

            const conditions = [];
            const params = [];

            // Apply filters
            if (filters.admin_id) {
                conditions.push('svp.admin_id = ?');
                params.push(filters.admin_id);
            }

            if (filters.user_id) {
                conditions.push('svp.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.status) {
                conditions.push('svp.status = ?');
                params.push(filters.status);
            }

            if (filters.date_from) {
                conditions.push('svp.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                conditions.push('svp.created_at <= ?');
                params.push(filters.date_to);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY svp.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [requests] = await pool.execute(query, params);
            return requests;
        } catch (error) {
            console.error('Error getting all requests:', error);
            return [];
        }
    }

    // Get screen view statistics
    async getScreenViewStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_requests,
                    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_requests
                FROM screen_view_permissions
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const [recentRequests] = await pool.execute(`
                SELECT 
                    svp.id,
                    svp.status,
                    svp.created_at,
                    svp.responded_at,
                    admin.username as admin_username,
                    user.username as user_username
                FROM screen_view_permissions svp
                JOIN users admin ON svp.admin_id = admin.id
                JOIN users user ON svp.user_id = user.id
                WHERE svp.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY svp.created_at DESC
                LIMIT 10
            `);

            return {
                statistics: stats[0],
                recentRequests
            };
        } catch (error) {
            console.error('Error getting screen view statistics:', error);
            return { statistics: {}, recentRequests: [] };
        }
    }

    // Clean up expired requests
    async cleanupExpiredRequests() {
        try {
            const [result] = await pool.execute(
                'UPDATE screen_view_permissions SET status = "expired" WHERE status = "pending" AND expires_at < NOW()'
            );

            console.log(`Cleaned up ${result.affectedRows} expired screen view requests`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired requests:', error);
            return 0;
        }
    }

    // Cancel request (admin only)
    async cancelRequest(requestId, adminId) {
        try {
            const [result] = await pool.execute(
                'UPDATE screen_view_permissions SET status = "expired" WHERE id = ? AND admin_id = ? AND status = "pending"',
                [requestId, adminId]
            );

            if (result.affectedRows === 0) {
                return { success: false, error: 'Request not found or cannot be cancelled' };
            }

            return { success: true, message: 'Request cancelled' };
        } catch (error) {
            console.error('Error cancelling request:', error);
            return { success: false, error: error.message };
        }
    }

    // Get approval rate statistics
    async getApprovalRateStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    admin_id,
                    admin.username as admin_username,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    ROUND(COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*), 2) as approval_rate
                FROM screen_view_permissions svp
                JOIN users admin ON svp.admin_id = admin.id
                WHERE svp.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY admin_id, admin.username
                HAVING total_requests > 0
                ORDER BY approval_rate DESC
            `);

            return stats;
        } catch (error) {
            console.error('Error getting approval rate statistics:', error);
            return [];
        }
    }

    // Get user response statistics
    async getUserResponseStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    user_id,
                    user.username as user_username,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_requests,
                    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_requests,
                    ROUND(COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*), 2) as approval_rate
                FROM screen_view_permissions svp
                JOIN users user ON svp.user_id = user.id
                WHERE svp.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY user_id, user.username
                HAVING total_requests > 0
                ORDER BY total_requests DESC
            `);

            return stats;
        } catch (error) {
            console.error('Error getting user response statistics:', error);
            return [];
        }
    }

    // Set default expiry time
    setDefaultExpiryMinutes(minutes) {
        this.defaultExpiryMinutes = minutes;
    }

    // Get default expiry time
    getDefaultExpiryMinutes() {
        return this.defaultExpiryMinutes;
    }

    // Set max pending requests
    setMaxPendingRequests(max) {
        this.maxPendingRequests = max;
    }

    // Get max pending requests
    getMaxPendingRequests() {
        return this.maxPendingRequests;
    }

    // Get request summary by date
    async getRequestSummaryByDate(days = 30) {
        try {
            const [summary] = await pool.execute(
                `SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_requests,
                    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_requests
                FROM screen_view_permissions
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC`,
                [days]
            );

            return summary;
        } catch (error) {
            console.error('Error getting request summary by date:', error);
            return [];
        }
    }
}

module.exports = new ScreenViewService();