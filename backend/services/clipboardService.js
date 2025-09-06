const { pool } = require('../config/database');

class ClipboardService {
    constructor() {
        this.maxContentLength = 10000; // 10KB max content length
        this.allowedContentTypes = ['text', 'image', 'file'];
    }

    // Share content to user's clipboard
    async shareToClipboard(adminId, userId, content, contentType = 'text') {
        try {
            // Validate content
            const validation = this.validateContent(content, contentType);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Create content preview
            const contentPreview = this.createContentPreview(content, contentType);

            // Log clipboard sharing
            const [result] = await pool.execute(
                'INSERT INTO clipboard_sharing_logs (admin_id, user_id, content_type, content_preview, status) VALUES (?, ?, ?, ?, ?)',
                [adminId, userId, contentType, contentPreview, 'sent']
            );

            const logId = result.insertId;

            // In a real implementation, you would send this to the user's desktop app via WebSocket
            // For now, we'll just log it and return success
            console.log(`Clipboard content shared to user ${userId} by admin ${adminId}:`, {
                logId,
                contentType,
                contentPreview,
                contentLength: content.length
            });

            return {
                success: true,
                logId,
                message: 'Content shared to user clipboard'
            };
        } catch (error) {
            console.error('Error sharing to clipboard:', error);
            return { success: false, error: error.message };
        }
    }

    // Validate clipboard content
    validateContent(content, contentType) {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: 'Content is required and must be a string' };
        }

        if (!this.allowedContentTypes.includes(contentType)) {
            return { valid: false, error: `Invalid content type. Allowed types: ${this.allowedContentTypes.join(', ')}` };
        }

        if (content.length > this.maxContentLength) {
            return { valid: false, error: `Content too long. Maximum length: ${this.maxContentLength} characters` };
        }

        // Additional validation based on content type
        switch (contentType) {
            case 'text':
                // Basic text validation - no special restrictions
                break;
            case 'image':
                // For images, content should be base64 encoded
                if (!this.isValidBase64(content)) {
                    return { valid: false, error: 'Image content must be base64 encoded' };
                }
                break;
            case 'file':
                // For files, content should be file path or file data
                if (content.length < 1) {
                    return { valid: false, error: 'File content cannot be empty' };
                }
                break;
        }

        return { valid: true };
    }

    // Create content preview
    createContentPreview(content, contentType) {
        switch (contentType) {
            case 'text':
                return content.length > 100 ? content.substring(0, 100) + '...' : content;
            case 'image':
                return `[Image: ${content.length} characters]`;
            case 'file':
                return `[File: ${content.length} characters]`;
            default:
                return content.substring(0, 50) + '...';
        }
    }

    // Check if string is valid base64
    isValidBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch (err) {
            return false;
        }
    }

    // Get clipboard sharing logs
    async getClipboardLogs(filters = {}, limit = 50, offset = 0) {
        try {
            let query = `
                SELECT 
                    csl.*,
                    admin.username as admin_username,
                    user.username as user_username
                FROM clipboard_sharing_logs csl
                JOIN users admin ON csl.admin_id = admin.id
                JOIN users user ON csl.user_id = user.id
            `;

            const conditions = [];
            const params = [];

            // Apply filters
            if (filters.admin_id) {
                conditions.push('csl.admin_id = ?');
                params.push(filters.admin_id);
            }

            if (filters.user_id) {
                conditions.push('csl.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.content_type) {
                conditions.push('csl.content_type = ?');
                params.push(filters.content_type);
            }

            if (filters.status) {
                conditions.push('csl.status = ?');
                params.push(filters.status);
            }

            if (filters.date_from) {
                conditions.push('csl.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                conditions.push('csl.created_at <= ?');
                params.push(filters.date_to);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY csl.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [logs] = await pool.execute(query, params);
            return logs;
        } catch (error) {
            console.error('Error getting clipboard logs:', error);
            return [];
        }
    }

    // Update clipboard sharing status
    async updateClipboardStatus(logId, status) {
        try {
            await pool.execute(
                'UPDATE clipboard_sharing_logs SET status = ? WHERE id = ?',
                [status, logId]
            );

            return true;
        } catch (error) {
            console.error('Error updating clipboard status:', error);
            return false;
        }
    }

    // Get clipboard sharing statistics
    async getClipboardStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_shares,
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_shares,
                    COUNT(CASE WHEN status = 'received' THEN 1 END) as received_shares,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_shares,
                    COUNT(CASE WHEN content_type = 'text' THEN 1 END) as text_shares,
                    COUNT(CASE WHEN content_type = 'image' THEN 1 END) as image_shares,
                    COUNT(CASE WHEN content_type = 'file' THEN 1 END) as file_shares
                FROM clipboard_sharing_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const [recentShares] = await pool.execute(`
                SELECT 
                    csl.content_type,
                    csl.content_preview,
                    csl.status,
                    csl.created_at,
                    admin.username as admin_username,
                    user.username as user_username
                FROM clipboard_sharing_logs csl
                JOIN users admin ON csl.admin_id = admin.id
                JOIN users user ON csl.user_id = user.id
                WHERE csl.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY csl.created_at DESC
                LIMIT 10
            `);

            return {
                statistics: stats[0],
                recentShares
            };
        } catch (error) {
            console.error('Error getting clipboard statistics:', error);
            return { statistics: {}, recentShares: [] };
        }
    }

    // Get clipboard history for user
    async getUserClipboardHistory(userId, limit = 50) {
        try {
            const [history] = await pool.execute(
                `SELECT 
                    csl.*,
                    admin.username as admin_username
                FROM clipboard_sharing_logs csl
                JOIN users admin ON csl.admin_id = admin.id
                WHERE csl.user_id = ?
                ORDER BY csl.created_at DESC
                LIMIT ?`,
                [userId, limit]
            );

            return history;
        } catch (error) {
            console.error('Error getting user clipboard history:', error);
            return [];
        }
    }

    // Get clipboard history for admin
    async getAdminClipboardHistory(adminId, limit = 50) {
        try {
            const [history] = await pool.execute(
                `SELECT 
                    csl.*,
                    user.username as user_username
                FROM clipboard_sharing_logs csl
                JOIN users user ON csl.user_id = user.id
                WHERE csl.admin_id = ?
                ORDER BY csl.created_at DESC
                LIMIT ?`,
                [adminId, limit]
            );

            return history;
        } catch (error) {
            console.error('Error getting admin clipboard history:', error);
            return [];
        }
    }

    // Get clipboard sharing summary by date
    async getClipboardSummaryByDate(days = 30) {
        try {
            const [summary] = await pool.execute(
                `SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_shares,
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_shares,
                    COUNT(CASE WHEN status = 'received' THEN 1 END) as received_shares,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_shares
                FROM clipboard_sharing_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC`,
                [days]
            );

            return summary;
        } catch (error) {
            console.error('Error getting clipboard summary by date:', error);
            return [];
        }
    }

    // Set content length limit
    setContentLengthLimit(maxLength) {
        this.maxContentLength = maxLength;
    }

    // Get content length limit
    getContentLengthLimit() {
        return this.maxContentLength;
    }

    // Set allowed content types
    setAllowedContentTypes(types) {
        this.allowedContentTypes = types;
    }

    // Get allowed content types
    getAllowedContentTypes() {
        return this.allowedContentTypes;
    }

    // Clean up old clipboard logs
    async cleanupOldLogs(daysOld = 30) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM clipboard_sharing_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysOld]
            );

            console.log(`Cleaned up ${result.affectedRows} old clipboard logs`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old clipboard logs:', error);
            return 0;
        }
    }

    // Get clipboard content types statistics
    async getContentTypeStatistics() {
        try {
            const [stats] = await pool.execute(
                `SELECT 
                    content_type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count
                FROM clipboard_sharing_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY content_type
                ORDER BY count DESC`
            );

            return stats;
        } catch (error) {
            console.error('Error getting content type statistics:', error);
            return [];
        }
    }

    // Get most active clipboard users
    async getMostActiveUsers(limit = 10) {
        try {
            const [users] = await pool.execute(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(csl.id) as total_shares,
                    COUNT(CASE WHEN csl.status = 'received' THEN 1 END) as received_shares
                FROM users u
                JOIN clipboard_sharing_logs csl ON u.id = csl.user_id
                WHERE csl.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id, u.username, u.email
                ORDER BY total_shares DESC
                LIMIT ?`,
                [limit]
            );

            return users;
        } catch (error) {
            console.error('Error getting most active users:', error);
            return [];
        }
    }
}

module.exports = new ClipboardService();