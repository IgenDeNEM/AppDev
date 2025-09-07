const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class AuditExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../exports');
        this.ensureExportDir();
    }

    ensureExportDir() {
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    // Export audit logs to CSV
    async exportToCSV(filters = {}, format = 'csv') {
        try {
            const logs = await this.getAuditLogs(filters);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `audit_logs_${timestamp}.${format}`;
            const filepath = path.join(this.exportDir, filename);

            if (format === 'csv') {
                const csvWriter = createCsvWriter({
                    path: filepath,
                    header: [
                        { id: 'id', title: 'ID' },
                        { id: 'username', title: 'Username' },
                        { id: 'action', title: 'Action' },
                        { id: 'details', title: 'Details' },
                        { id: 'ip_address', title: 'IP Address' },
                        { id: 'user_agent', title: 'User Agent' },
                        { id: 'created_at', title: 'Created At' }
                    ]
                });

                await csvWriter.writeRecords(logs);
            }

            return {
                success: true,
                filename,
                filepath,
                recordCount: logs.length
            };
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Export audit logs to PDF
    async exportToPDF(filters = {}, options = {}) {
        try {
            const logs = await this.getAuditLogs(filters);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `audit_logs_${timestamp}.pdf`;
            const filepath = path.join(this.exportDir, filename);

            const doc = new PDFDocument({ margin: 50 });
            doc.pipe(fs.createWriteStream(filepath));

            // Header
            doc.fontSize(20).text('Audit Log Report', { align: 'center' });
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.fontSize(10).text(`Total Records: ${logs.length}`, { align: 'center' });
            doc.moveDown(2);

            // Filters applied
            if (Object.keys(filters).length > 0) {
                doc.fontSize(12).text('Filters Applied:', { underline: true });
                Object.entries(filters).forEach(([key, value]) => {
                    doc.fontSize(10).text(`${key}: ${value}`);
                });
                doc.moveDown(1);
            }

            // Table header
            doc.fontSize(10);
            const tableTop = doc.y;
            const itemHeight = 20;
            const pageHeight = doc.page.height - 100;

            // Draw table headers
            doc.text('ID', 50, tableTop);
            doc.text('User', 80, tableTop);
            doc.text('Action', 150, tableTop);
            doc.text('Details', 250, tableTop);
            doc.text('IP Address', 400, tableTop);
            doc.text('Date', 500, tableTop);

            // Draw header line
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            let currentY = tableTop + 25;

            // Add logs
            logs.forEach((log, index) => {
                // Check if we need a new page
                if (currentY > pageHeight) {
                    doc.addPage();
                    currentY = 50;
                }

                doc.text(log.id.toString(), 50, currentY);
                doc.text(log.username || 'System', 80, currentY);
                doc.text(log.action, 150, currentY);
                
                // Truncate details if too long
                const details = log.details ? log.details.substring(0, 50) + (log.details.length > 50 ? '...' : '') : '';
                doc.text(details, 250, currentY);
                doc.text(log.ip_address || 'N/A', 400, currentY);
                doc.text(new Date(log.created_at).toLocaleDateString(), 500, currentY);

                currentY += itemHeight;
            });

            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        recordCount: logs.length
                    });
                });

                doc.on('error', (error) => {
                    reject({
                        success: false,
                        error: error.message
                    });
                });
            });

        } catch (error) {
            console.error('Error exporting to PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get audit logs with filters
    async getAuditLogs(filters = {}) {
        try {
            let query = `
                SELECT 
                    al.id,
                    u.username,
                    al.action,
                    al.details,
                    al.ip_address,
                    al.user_agent,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
            `;

            const conditions = [];
            const params = [];

            // Apply filters
            if (filters.user_id) {
                conditions.push('al.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.action) {
                conditions.push('al.action LIKE ?');
                params.push(`%${filters.action}%`);
            }

            if (filters.date_from) {
                conditions.push('al.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                conditions.push('al.created_at <= ?');
                params.push(filters.date_to);
            }

            if (filters.ip_address) {
                conditions.push('al.ip_address = ?');
                params.push(filters.ip_address);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY al.created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filters.limit));
            }

            const [logs] = await pool.execute(query, params);
            return logs;
        } catch (error) {
            console.error('Error getting audit logs:', error);
            return [];
        }
    }

    // Export user activity report
    async exportUserActivityReport(userId, format = 'pdf') {
        try {
            const user = await this.getUserInfo(userId);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            const activities = await this.getUserActivities(userId);
            const sessions = await this.getUserSessions(userId);
            const ipHistory = await this.getUserIPHistory(userId);

            if (format === 'pdf') {
                return await this.generateUserActivityPDF(user, activities, sessions, ipHistory);
            } else {
                return await this.generateUserActivityCSV(user, activities, sessions, ipHistory);
            }
        } catch (error) {
            console.error('Error exporting user activity report:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate user activity PDF
    async generateUserActivityPDF(user, activities, sessions, ipHistory) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `user_activity_${user.username}_${timestamp}.pdf`;
            const filepath = path.join(this.exportDir, filename);

            const doc = new PDFDocument({ margin: 50 });
            doc.pipe(fs.createWriteStream(filepath));

            // Header
            doc.fontSize(20).text('User Activity Report', { align: 'center' });
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            // User Information
            doc.fontSize(14).text('User Information', { underline: true });
            doc.fontSize(10);
            doc.text(`Username: ${user.username}`);
            doc.text(`Email: ${user.email}`);
            doc.text(`Admin: ${user.is_admin ? 'Yes' : 'No'}`);
            doc.text(`Created: ${new Date(user.created_at).toLocaleString()}`);
            doc.text(`Last Login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}`);
            doc.moveDown(1);

            // Recent Activities
            doc.fontSize(14).text('Recent Activities', { underline: true });
            doc.fontSize(10);
            activities.slice(0, 20).forEach(activity => {
                doc.text(`${new Date(activity.created_at).toLocaleString()} - ${activity.action}: ${activity.details}`);
            });
            doc.moveDown(1);

            // Active Sessions
            doc.fontSize(14).text('Active Sessions', { underline: true });
            doc.fontSize(10);
            sessions.forEach(session => {
                doc.text(`IP: ${session.ip_address} - Last Activity: ${new Date(session.last_activity).toLocaleString()}`);
            });
            doc.moveDown(1);

            // IP History
            doc.fontSize(14).text('IP History', { underline: true });
            doc.fontSize(10);
            ipHistory.slice(0, 10).forEach(ip => {
                doc.text(`${ip.ip_address} (${ip.country}, ${ip.city}) - ${ip.action} - ${new Date(ip.created_at).toLocaleString()}`);
            });

            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        recordCount: activities.length
                    });
                });

                doc.on('error', (error) => {
                    reject({
                        success: false,
                        error: error.message
                    });
                });
            });

        } catch (error) {
            console.error('Error generating user activity PDF:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate user activity CSV
    async generateUserActivityCSV(user, activities, sessions, ipHistory) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `user_activity_${user.username}_${timestamp}.csv`;
            const filepath = path.join(this.exportDir, filename);

            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'type', title: 'Type' },
                    { id: 'timestamp', title: 'Timestamp' },
                    { id: 'action', title: 'Action' },
                    { id: 'details', title: 'Details' },
                    { id: 'ip_address', title: 'IP Address' },
                    { id: 'location', title: 'Location' }
                ]
            });

            const records = [];

            // Add activities
            activities.forEach(activity => {
                records.push({
                    type: 'Activity',
                    timestamp: activity.created_at,
                    action: activity.action,
                    details: activity.details,
                    ip_address: activity.ip_address || 'N/A',
                    location: 'N/A'
                });
            });

            // Add IP history
            ipHistory.forEach(ip => {
                records.push({
                    type: 'IP Access',
                    timestamp: ip.created_at,
                    action: ip.action,
                    details: `${ip.country}, ${ip.city}`,
                    ip_address: ip.ip_address,
                    location: `${ip.country}, ${ip.city}`
                });
            });

            await csvWriter.writeRecords(records);

            return {
                success: true,
                filename,
                filepath,
                recordCount: records.length
            };
        } catch (error) {
            console.error('Error generating user activity CSV:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user information
    async getUserInfo(userId) {
        try {
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error getting user info:', error);
            return null;
        }
    }

    // Get user activities
    async getUserActivities(userId, limit = 100) {
        try {
            const [activities] = await pool.execute(
                'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit]
            );
            return activities;
        } catch (error) {
            console.error('Error getting user activities:', error);
            return [];
        }
    }

    // Get user sessions
    async getUserSessions(userId) {
        try {
            const [sessions] = await pool.execute(
                'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_activity DESC',
                [userId]
            );
            return sessions;
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return [];
        }
    }

    // Get user IP history
    async getUserIPHistory(userId, limit = 50) {
        try {
            const [ipHistory] = await pool.execute(
                'SELECT * FROM ip_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit]
            );
            return ipHistory;
        } catch (error) {
            console.error('Error getting user IP history:', error);
            return [];
        }
    }

    // Clean up old export files (older than 7 days)
    async cleanupOldExports() {
        try {
            const files = fs.readdirSync(this.exportDir);
            let deletedCount = 0;
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            files.forEach(file => {
                const filepath = path.join(this.exportDir, file);
                const stats = fs.statSync(filepath);
                
                if (stats.mtime.getTime() < sevenDaysAgo) {
                    fs.unlinkSync(filepath);
                    deletedCount++;
                }
            });

            console.log(`Cleaned up ${deletedCount} old export files`);
            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up old exports:', error);
            return 0;
        }
    }

    // Get export statistics
    async getExportStatistics() {
        try {
            const files = fs.readdirSync(this.exportDir);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                fileTypes: {}
            };

            files.forEach(file => {
                const filepath = path.join(this.exportDir, file);
                const fileStats = fs.statSync(filepath);
                stats.totalSize += fileStats.size;

                const ext = path.extname(file).toLowerCase();
                stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting export statistics:', error);
            return { totalFiles: 0, totalSize: 0, fileTypes: {} };
        }
    }
}

module.exports = new AuditExportService();