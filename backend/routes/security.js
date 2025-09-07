const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const geolocationService = require('../services/geolocationService');
const sessionService = require('../services/sessionService');
const auditExportService = require('../services/auditExportService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// IP Logging and Geolocation Routes

// Get IP history for current user
router.get('/ip-history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const history = await geolocationService.getUserIPHistory(req.user.id, parseInt(limit));
        res.json({ history });
    } catch (error) {
        console.error('Get IP history error:', error);
        res.status(500).json({ error: 'Failed to get IP history' });
    }
});

// Get IP history for specific user (admin only)
router.get('/ip-history/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;
        const history = await geolocationService.getUserIPHistory(parseInt(userId), parseInt(limit));
        res.json({ history });
    } catch (error) {
        console.error('Get user IP history error:', error);
        res.status(500).json({ error: 'Failed to get user IP history' });
    }
});

// Get IP statistics (admin only)
router.get('/ip-statistics', requireAdmin, async (req, res) => {
    try {
        const stats = await geolocationService.getIPStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Get IP statistics error:', error);
        res.status(500).json({ error: 'Failed to get IP statistics' });
    }
});

// Get suspicious IP activity (admin only)
router.get('/suspicious-activity', requireAdmin, async (req, res) => {
    try {
        const activity = await geolocationService.getSuspiciousActivity();
        res.json(activity);
    } catch (error) {
        console.error('Get suspicious activity error:', error);
        res.status(500).json({ error: 'Failed to get suspicious activity' });
    }
});

// Session Management Routes

// Get current user's active sessions
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await sessionService.getActiveSessions(req.user.id);
        res.json({ sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Terminate current session
router.post('/sessions/terminate-current', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            await sessionService.terminateSession(token);
        }
        res.json({ message: 'Session terminated successfully' });
    } catch (error) {
        console.error('Terminate current session error:', error);
        res.status(500).json({ error: 'Failed to terminate session' });
    }
});

// Terminate all user sessions
router.post('/sessions/terminate-all', async (req, res) => {
    try {
        await sessionService.terminateAllUserSessions(req.user.id);
        res.json({ message: 'All sessions terminated successfully' });
    } catch (error) {
        console.error('Terminate all sessions error:', error);
        res.status(500).json({ error: 'Failed to terminate all sessions' });
    }
});

// Get all sessions (admin only)
router.get('/sessions/all', requireAdmin, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const sessions = await sessionService.getAllSessions(parseInt(limit), parseInt(offset));
        res.json({ sessions });
    } catch (error) {
        console.error('Get all sessions error:', error);
        res.status(500).json({ error: 'Failed to get all sessions' });
    }
});

// Get session statistics (admin only)
router.get('/sessions/statistics', requireAdmin, async (req, res) => {
    try {
        const stats = await sessionService.getSessionStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Get session statistics error:', error);
        res.status(500).json({ error: 'Failed to get session statistics' });
    }
});

// Terminate session by ID (admin only)
router.post('/sessions/:sessionId/terminate', requireAdmin, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const success = await sessionService.terminateSessionByAdmin(parseInt(sessionId), req.user.id);
        
        if (success) {
            res.json({ message: 'Session terminated successfully' });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        console.error('Terminate session error:', error);
        res.status(500).json({ error: 'Failed to terminate session' });
    }
});

// Get suspicious sessions (admin only)
router.get('/sessions/suspicious', requireAdmin, async (req, res) => {
    try {
        const suspicious = await sessionService.getSuspiciousSessions();
        res.json(suspicious);
    } catch (error) {
        console.error('Get suspicious sessions error:', error);
        res.status(500).json({ error: 'Failed to get suspicious sessions' });
    }
});

// Audit Export Routes (Admin Only)

// Export audit logs to CSV
router.post('/audit/export/csv', requireAdmin, [
    body('filters').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { filters = {} } = req.body;
        const result = await auditExportService.exportToCSV(filters, 'csv');

        if (result.success) {
            res.json({
                message: 'Audit logs exported successfully',
                filename: result.filename,
                recordCount: result.recordCount
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export audit CSV error:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

// Export audit logs to PDF
router.post('/audit/export/pdf', requireAdmin, [
    body('filters').optional().isObject(),
    body('options').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { filters = {}, options = {} } = req.body;
        const result = await auditExportService.exportToPDF(filters, options);

        if (result.success) {
            res.json({
                message: 'Audit logs exported successfully',
                filename: result.filename,
                recordCount: result.recordCount
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export audit PDF error:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

// Export user activity report
router.post('/audit/export/user-activity/:userId', requireAdmin, [
    body('format').optional().isIn(['pdf', 'csv'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.params;
        const { format = 'pdf' } = req.body;
        
        const result = await auditExportService.exportUserActivityReport(parseInt(userId), format);

        if (result.success) {
            res.json({
                message: 'User activity report exported successfully',
                filename: result.filename,
                recordCount: result.recordCount
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export user activity error:', error);
        res.status(500).json({ error: 'Failed to export user activity report' });
    }
});

// Get audit export statistics
router.get('/audit/export/statistics', requireAdmin, async (req, res) => {
    try {
        const stats = await auditExportService.getExportStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Get export statistics error:', error);
        res.status(500).json({ error: 'Failed to get export statistics' });
    }
});

// Security Dashboard Routes (Admin Only)

// Get security overview
router.get('/dashboard/overview', requireAdmin, async (req, res) => {
    try {
        const [ipStats, sessionStats, suspiciousActivity] = await Promise.all([
            geolocationService.getIPStatistics(),
            sessionService.getSessionStatistics(),
            geolocationService.getSuspiciousActivity()
        ]);

        res.json({
            ipStatistics: ipStats,
            sessionStatistics: sessionStats,
            suspiciousActivity
        });
    } catch (error) {
        console.error('Get security overview error:', error);
        res.status(500).json({ error: 'Failed to get security overview' });
    }
});

// Get recent security events
router.get('/dashboard/recent-events', requireAdmin, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const [recentLogins, recentSessions, recentIPs] = await Promise.all([
            pool.execute(
                'SELECT * FROM activity_logs WHERE action LIKE "%login%" ORDER BY created_at DESC LIMIT ?',
                [parseInt(limit)]
            ),
            pool.execute(
                'SELECT * FROM user_sessions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT ?',
                [parseInt(limit)]
            ),
            pool.execute(
                'SELECT * FROM ip_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT ?',
                [parseInt(limit)]
            )
        ]);

        res.json({
            recentLogins: recentLogins[0],
            recentSessions: recentSessions[0],
            recentIPs: recentIPs[0]
        });
    } catch (error) {
        console.error('Get recent security events error:', error);
        res.status(500).json({ error: 'Failed to get recent security events' });
    }
});

// Cleanup operations (Admin Only)

// Cleanup expired sessions
router.post('/cleanup/sessions', requireAdmin, async (req, res) => {
    try {
        const cleanedCount = await sessionService.cleanupExpiredSessions();
        res.json({ message: `Cleaned up ${cleanedCount} expired sessions` });
    } catch (error) {
        console.error('Cleanup sessions error:', error);
        res.status(500).json({ error: 'Failed to cleanup sessions' });
    }
});

// Cleanup old IP logs
router.post('/cleanup/ip-logs', requireAdmin, async (req, res) => {
    try {
        const cleanedCount = await geolocationService.cleanupOldLogs();
        res.json({ message: `Cleaned up ${cleanedCount} old IP logs` });
    } catch (error) {
        console.error('Cleanup IP logs error:', error);
        res.status(500).json({ error: 'Failed to cleanup IP logs' });
    }
});

// Cleanup old export files
router.post('/cleanup/exports', requireAdmin, async (req, res) => {
    try {
        const cleanedCount = await auditExportService.cleanupOldExports();
        res.json({ message: `Cleaned up ${cleanedCount} old export files` });
    } catch (error) {
        console.error('Cleanup exports error:', error);
        res.status(500).json({ error: 'Failed to cleanup export files' });
    }
});

module.exports = router;