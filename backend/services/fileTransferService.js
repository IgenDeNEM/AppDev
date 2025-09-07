const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class FileTransferService {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB default
        this.allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'];
        this.uploadDir = path.join(__dirname, '../uploads');
        this.ensureUploadDir();
    }

    ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    // Log file transfer
    async logFileTransfer(adminId, userId, fileName, fileSize, transferType, status = 'pending', errorMessage = null) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO file_transfer_logs (admin_id, user_id, file_name, file_size, transfer_type, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [adminId, userId, fileName, fileSize, transferType, status, errorMessage]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error logging file transfer:', error);
            return null;
        }
    }

    // Update file transfer status
    async updateFileTransferStatus(logId, status, errorMessage = null) {
        try {
            const updateFields = ['status = ?'];
            const updateValues = [status];

            if (status === 'completed') {
                updateFields.push('completed_at = NOW()');
            }

            if (errorMessage) {
                updateFields.push('error_message = ?');
                updateValues.push(errorMessage);
            }

            updateValues.push(logId);

            await pool.execute(
                `UPDATE file_transfer_logs SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            return true;
        } catch (error) {
            console.error('Error updating file transfer status:', error);
            return false;
        }
    }

    // Get file transfer logs
    async getFileTransferLogs(filters = {}, limit = 50, offset = 0) {
        try {
            let query = `
                SELECT 
                    ftl.*,
                    admin.username as admin_username,
                    user.username as user_username
                FROM file_transfer_logs ftl
                JOIN users admin ON ftl.admin_id = admin.id
                JOIN users user ON ftl.user_id = user.id
            `;

            const conditions = [];
            const params = [];

            // Apply filters
            if (filters.admin_id) {
                conditions.push('ftl.admin_id = ?');
                params.push(filters.admin_id);
            }

            if (filters.user_id) {
                conditions.push('ftl.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.transfer_type) {
                conditions.push('ftl.transfer_type = ?');
                params.push(filters.transfer_type);
            }

            if (filters.status) {
                conditions.push('ftl.status = ?');
                params.push(filters.status);
            }

            if (filters.date_from) {
                conditions.push('ftl.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                conditions.push('ftl.created_at <= ?');
                params.push(filters.date_to);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY ftl.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [logs] = await pool.execute(query, params);
            return logs;
        } catch (error) {
            console.error('Error getting file transfer logs:', error);
            return [];
        }
    }

    // Get file transfer statistics
    async getFileTransferStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_transfers,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transfers,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transfers,
                    SUM(CASE WHEN status = 'completed' THEN file_size ELSE 0 END) as total_size_transferred,
                    AVG(CASE WHEN status = 'completed' THEN file_size ELSE NULL END) as avg_file_size
                FROM file_transfer_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const [recentTransfers] = await pool.execute(`
                SELECT 
                    ftl.file_name,
                    ftl.file_size,
                    ftl.transfer_type,
                    ftl.status,
                    ftl.created_at,
                    admin.username as admin_username,
                    user.username as user_username
                FROM file_transfer_logs ftl
                JOIN users admin ON ftl.admin_id = admin.id
                JOIN users user ON ftl.user_id = user.id
                WHERE ftl.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY ftl.created_at DESC
                LIMIT 10
            `);

            return {
                statistics: stats[0],
                recentTransfers
            };
        } catch (error) {
            console.error('Error getting file transfer statistics:', error);
            return { statistics: {}, recentTransfers: [] };
        }
    }

    // Validate file
    validateFile(fileName, fileSize) {
        const errors = [];

        // Check file size
        if (fileSize > this.maxFileSize) {
            errors.push(`File size (${this.formatFileSize(fileSize)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`);
        }

        // Check file extension
        const ext = path.extname(fileName).toLowerCase();
        if (!this.allowedExtensions.includes(ext)) {
            errors.push(`File extension '${ext}' is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`);
        }

        // Check file name
        if (fileName.length > 255) {
            errors.push('File name is too long (maximum 255 characters)');
        }

        // Check for dangerous file names
        const dangerousPatterns = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*'];
        for (const pattern of dangerousPatterns) {
            if (fileName.includes(pattern)) {
                errors.push(`File name contains invalid character: ${pattern}`);
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Set file size limit
    setFileSizeLimit(maxSize) {
        this.maxFileSize = maxSize;
    }

    // Get file size limit
    getFileSizeLimit() {
        return this.maxFileSize;
    }

    // Set allowed extensions
    setAllowedExtensions(extensions) {
        this.allowedExtensions = extensions.map(ext => ext.toLowerCase());
    }

    // Get allowed extensions
    getAllowedExtensions() {
        return this.allowedExtensions;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Generate unique file name
    generateUniqueFileName(originalName) {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        
        return `${baseName}_${timestamp}_${random}${ext}`;
    }

    // Get file path
    getFilePath(fileName) {
        return path.join(this.uploadDir, fileName);
    }

    // Check if file exists
    fileExists(fileName) {
        const filePath = this.getFilePath(fileName);
        return fs.existsSync(filePath);
    }

    // Delete file
    deleteFile(fileName) {
        try {
            const filePath = this.getFilePath(fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    // Get file info
    getFileInfo(fileName) {
        try {
            const filePath = this.getFilePath(fileName);
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const stats = fs.statSync(filePath);
            return {
                name: fileName,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                path: filePath
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    // List files in upload directory
    listFiles() {
        try {
            const files = fs.readdirSync(this.uploadDir);
            return files.map(fileName => this.getFileInfo(fileName)).filter(info => info !== null);
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    // Clean up old files
    async cleanupOldFiles(daysOld = 7) {
        try {
            const files = this.listFiles();
            const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            let deletedCount = 0;

            for (const file of files) {
                if (file.modified.getTime() < cutoffTime) {
                    if (this.deleteFile(file.name)) {
                        deletedCount++;
                    }
                }
            }

            console.log(`Cleaned up ${deletedCount} old files`);
            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up old files:', error);
            return 0;
        }
    }

    // Get transfer history for user
    async getUserTransferHistory(userId, limit = 50) {
        try {
            const [transfers] = await pool.execute(
                `SELECT 
                    ftl.*,
                    admin.username as admin_username
                FROM file_transfer_logs ftl
                JOIN users admin ON ftl.admin_id = admin.id
                WHERE ftl.user_id = ?
                ORDER BY ftl.created_at DESC
                LIMIT ?`,
                [userId, limit]
            );

            return transfers;
        } catch (error) {
            console.error('Error getting user transfer history:', error);
            return [];
        }
    }

    // Get transfer history for admin
    async getAdminTransferHistory(adminId, limit = 50) {
        try {
            const [transfers] = await pool.execute(
                `SELECT 
                    ftl.*,
                    user.username as user_username
                FROM file_transfer_logs ftl
                JOIN users user ON ftl.user_id = user.id
                WHERE ftl.admin_id = ?
                ORDER BY ftl.created_at DESC
                LIMIT ?`,
                [adminId, limit]
            );

            return transfers;
        } catch (error) {
            console.error('Error getting admin transfer history:', error);
            return [];
        }
    }

    // Get failed transfers
    async getFailedTransfers(limit = 20) {
        try {
            const [transfers] = await pool.execute(
                `SELECT 
                    ftl.*,
                    admin.username as admin_username,
                    user.username as user_username
                FROM file_transfer_logs ftl
                JOIN users admin ON ftl.admin_id = admin.id
                JOIN users user ON ftl.user_id = user.id
                WHERE ftl.status = 'failed'
                ORDER BY ftl.created_at DESC
                LIMIT ?`,
                [limit]
            );

            return transfers;
        } catch (error) {
            console.error('Error getting failed transfers:', error);
            return [];
        }
    }

    // Get transfer summary by date
    async getTransferSummaryByDate(days = 30) {
        try {
            const [summary] = await pool.execute(
                `SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_transfers,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transfers,
                    SUM(CASE WHEN status = 'completed' THEN file_size ELSE 0 END) as total_size
                FROM file_transfer_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC`,
                [days]
            );

            return summary;
        } catch (error) {
            console.error('Error getting transfer summary by date:', error);
            return [];
        }
    }
}

module.exports = new FileTransferService();