const { pool } = require('../config/database');

class CrashReportService {
    constructor() {
        this.maxStackTraceLength = 10000; // 10KB max stack trace
        this.maxCrashDataSize = 50000; // 50KB max crash data
    }

    // Submit crash report
    async submitCrashReport(crashData) {
        try {
            const {
                userId = null,
                appVersion = null,
                osInfo = null,
                errorMessage,
                stackTrace = null,
                crashData: additionalData = null
            } = crashData;

            // Validate required fields
            if (!errorMessage) {
                return { success: false, error: 'Error message is required' };
            }

            // Validate data sizes
            if (stackTrace && stackTrace.length > this.maxStackTraceLength) {
                return { success: false, error: 'Stack trace too long' };
            }

            if (additionalData && JSON.stringify(additionalData).length > this.maxCrashDataSize) {
                return { success: false, error: 'Crash data too large' };
            }

            // Insert crash report
            const [result] = await pool.execute(
                'INSERT INTO crash_reports (user_id, app_version, os_info, error_message, stack_trace, crash_data) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, appVersion, osInfo, errorMessage, stackTrace, additionalData ? JSON.stringify(additionalData) : null]
            );

            const reportId = result.insertId;

            console.log(`Crash report submitted: ID ${reportId}, User ${userId}, Error: ${errorMessage}`);

            return {
                success: true,
                reportId,
                message: 'Crash report submitted successfully'
            };
        } catch (error) {
            console.error('Error submitting crash report:', error);
            return { success: false, error: error.message };
        }
    }

    // Get crash reports
    async getCrashReports(filters = {}, limit = 50, offset = 0) {
        try {
            let query = `
                SELECT 
                    cr.*,
                    u.username,
                    u.email
                FROM crash_reports cr
                LEFT JOIN users u ON cr.user_id = u.id
            `;

            const conditions = [];
            const params = [];

            // Apply filters
            if (filters.user_id) {
                conditions.push('cr.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.app_version) {
                conditions.push('cr.app_version = ?');
                params.push(filters.app_version);
            }

            if (filters.is_resolved !== undefined) {
                conditions.push('cr.is_resolved = ?');
                params.push(filters.is_resolved);
            }

            if (filters.date_from) {
                conditions.push('cr.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                conditions.push('cr.created_at <= ?');
                params.push(filters.date_to);
            }

            if (filters.error_message) {
                conditions.push('cr.error_message LIKE ?');
                params.push(`%${filters.error_message}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY cr.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [reports] = await pool.execute(query, params);
            return reports;
        } catch (error) {
            console.error('Error getting crash reports:', error);
            return [];
        }
    }

    // Get crash report by ID
    async getCrashReportById(reportId) {
        try {
            const [reports] = await pool.execute(
                `SELECT 
                    cr.*,
                    u.username,
                    u.email
                FROM crash_reports cr
                LEFT JOIN users u ON cr.user_id = u.id
                WHERE cr.id = ?`,
                [reportId]
            );

            return reports.length > 0 ? reports[0] : null;
        } catch (error) {
            console.error('Error getting crash report by ID:', error);
            return null;
        }
    }

    // Mark crash report as resolved
    async markAsResolved(reportId, resolvedBy = null) {
        try {
            const [result] = await pool.execute(
                'UPDATE crash_reports SET is_resolved = TRUE, resolved_at = NOW() WHERE id = ?',
                [reportId]
            );

            if (result.affectedRows === 0) {
                return { success: false, error: 'Crash report not found' };
            }

            return { success: true, message: 'Crash report marked as resolved' };
        } catch (error) {
            console.error('Error marking crash report as resolved:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark crash report as unresolved
    async markAsUnresolved(reportId) {
        try {
            const [result] = await pool.execute(
                'UPDATE crash_reports SET is_resolved = FALSE, resolved_at = NULL WHERE id = ?',
                [reportId]
            );

            if (result.affectedRows === 0) {
                return { success: false, error: 'Crash report not found' };
            }

            return { success: true, message: 'Crash report marked as unresolved' };
        } catch (error) {
            console.error('Error marking crash report as unresolved:', error);
            return { success: false, error: error.message };
        }
    }

    // Get crash statistics
    async getCrashStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_crashes,
                    COUNT(CASE WHEN is_resolved = TRUE THEN 1 END) as resolved_crashes,
                    COUNT(CASE WHEN is_resolved = FALSE THEN 1 END) as unresolved_crashes,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as crashes_24h,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as crashes_7d,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as crashes_30d
                FROM crash_reports
            `);

            const [topErrors] = await pool.execute(`
                SELECT 
                    error_message,
                    COUNT(*) as crash_count
                FROM crash_reports
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY error_message
                ORDER BY crash_count DESC
                LIMIT 10
            `);

            const [appVersions] = await pool.execute(`
                SELECT 
                    app_version,
                    COUNT(*) as crash_count
                FROM crash_reports
                WHERE app_version IS NOT NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY app_version
                ORDER BY crash_count DESC
                LIMIT 10
            `);

            return {
                statistics: stats[0],
                topErrors,
                appVersions
            };
        } catch (error) {
            console.error('Error getting crash statistics:', error);
            return { statistics: {}, topErrors: [], appVersions: [] };
        }
    }

    // Get crash trends
    async getCrashTrends(days = 30) {
        try {
            const [trends] = await pool.execute(
                `SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as crash_count,
                    COUNT(CASE WHEN is_resolved = TRUE THEN 1 END) as resolved_count
                FROM crash_reports
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC`,
                [days]
            );

            return trends;
        } catch (error) {
            console.error('Error getting crash trends:', error);
            return [];
        }
    }

    // Get user crash history
    async getUserCrashHistory(userId, limit = 20) {
        try {
            const [history] = await pool.execute(
                `SELECT 
                    id,
                    app_version,
                    os_info,
                    error_message,
                    is_resolved,
                    created_at,
                    resolved_at
                FROM crash_reports
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?`,
                [userId, limit]
            );

            return history;
        } catch (error) {
            console.error('Error getting user crash history:', error);
            return [];
        }
    }

    // Get similar crashes
    async getSimilarCrashes(errorMessage, limit = 10) {
        try {
            const [similar] = await pool.execute(
                `SELECT 
                    cr.*,
                    u.username
                FROM crash_reports cr
                LEFT JOIN users u ON cr.user_id = u.id
                WHERE cr.error_message LIKE ?
                AND cr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY cr.created_at DESC
                LIMIT ?`,
                [`%${errorMessage}%`, limit]
            );

            return similar;
        } catch (error) {
            console.error('Error getting similar crashes:', error);
            return [];
        }
    }

    // Delete old crash reports
    async deleteOldCrashReports(daysOld = 90) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM crash_reports WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysOld]
            );

            console.log(`Deleted ${result.affectedRows} old crash reports`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting old crash reports:', error);
            return 0;
        }
    }

    // Get crash report summary
    async getCrashReportSummary() {
        try {
            const [summary] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN is_resolved = TRUE THEN 1 END) as resolved_reports,
                    COUNT(CASE WHEN is_resolved = FALSE THEN 1 END) as unresolved_reports,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as reports_24h,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as reports_7d,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as reports_30d,
                    AVG(CASE WHEN is_resolved = TRUE THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) END) as avg_resolution_time_hours
                FROM crash_reports
            `);

            return summary[0];
        } catch (error) {
            console.error('Error getting crash report summary:', error);
            return {};
        }
    }

    // Get most problematic users
    async getMostProblematicUsers(limit = 10) {
        try {
            const [users] = await pool.execute(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(cr.id) as crash_count,
                    COUNT(CASE WHEN cr.is_resolved = TRUE THEN 1 END) as resolved_count,
                    MAX(cr.created_at) as last_crash
                FROM users u
                JOIN crash_reports cr ON u.id = cr.user_id
                WHERE cr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id, u.username, u.email
                ORDER BY crash_count DESC
                LIMIT ?`,
                [limit]
            );

            return users;
        } catch (error) {
            console.error('Error getting most problematic users:', error);
            return [];
        }
    }

    // Set max stack trace length
    setMaxStackTraceLength(length) {
        this.maxStackTraceLength = length;
    }

    // Get max stack trace length
    getMaxStackTraceLength() {
        return this.maxStackTraceLength;
    }

    // Set max crash data size
    setMaxCrashDataSize(size) {
        this.maxCrashDataSize = size;
    }

    // Get max crash data size
    getMaxCrashDataSize() {
        return this.maxCrashDataSize;
    }

    // Get crash report by error pattern
    async getCrashReportsByPattern(pattern, limit = 20) {
        try {
            const [reports] = await pool.execute(
                `SELECT 
                    cr.*,
                    u.username
                FROM crash_reports cr
                LEFT JOIN users u ON cr.user_id = u.id
                WHERE cr.error_message LIKE ?
                ORDER BY cr.created_at DESC
                LIMIT ?`,
                [`%${pattern}%`, limit]
            );

            return reports;
        } catch (error) {
            console.error('Error getting crash reports by pattern:', error);
            return [];
        }
    }
}

module.exports = new CrashReportService();