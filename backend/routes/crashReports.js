const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const crashReportService = require('../services/crashReportService');

const router = express.Router();

// Submit crash report (no authentication required for users)
router.post('/submit', [
    body('appVersion').isLength({ min: 1, max: 50 }),
    body('osInfo').isLength({ min: 1, max: 200 }),
    body('errorMessage').isLength({ min: 1, max: 1000 }),
    body('stackTrace').optional().isLength({ max: 10000 }),
    body('crashData').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { appVersion, osInfo, errorMessage, stackTrace, crashData } = req.body;
        const userId = req.user ? req.user.id : null; // Optional user context
        
        const result = await crashReportService.submitCrashReport(
            userId,
            appVersion,
            osInfo,
            errorMessage,
            stackTrace,
            crashData
        );

        if (result.success) {
            res.status(201).json({
                message: 'Crash report submitted successfully',
                reportId: result.reportId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Submit crash report error:', error);
        res.status(500).json({ error: 'Failed to submit crash report' });
    }
});

// Get crash reports (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            userId, 
            appVersion, 
            isResolved, 
            limit = 50, 
            offset = 0,
            startDate,
            endDate
        } = req.query;
        
        const filters = {
            userId: userId ? parseInt(userId) : undefined,
            appVersion,
            isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
            startDate,
            endDate
        };
        
        const reports = await crashReportService.getCrashReports(filters, parseInt(limit), parseInt(offset));
        res.json({ reports });
    } catch (error) {
        console.error('Get crash reports error:', error);
        res.status(500).json({ error: 'Failed to get crash reports' });
    }
});

// Get crash report by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const report = await crashReportService.getCrashReportById(parseInt(id));
        
        if (!report) {
            return res.status(404).json({ error: 'Crash report not found' });
        }
        
        res.json({ report });
    } catch (error) {
        console.error('Get crash report error:', error);
        res.status(500).json({ error: 'Failed to get crash report' });
    }
});

// Mark crash report as resolved (admin only)
router.put('/:id/resolve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await crashReportService.resolveCrashReport(parseInt(id), req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_report_resolved', `Report ID: ${id}`, req);
            
            res.json({ message: 'Crash report marked as resolved' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Resolve crash report error:', error);
        res.status(500).json({ error: 'Failed to resolve crash report' });
    }
});

// Mark crash report as unresolved (admin only)
router.put('/:id/unresolve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await crashReportService.unresolveCrashReport(parseInt(id), req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_report_unresolved', `Report ID: ${id}`, req);
            
            res.json({ message: 'Crash report marked as unresolved' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Unresolve crash report error:', error);
        res.status(500).json({ error: 'Failed to unresolve crash report' });
    }
});

// Delete crash report (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await crashReportService.deleteCrashReport(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_report_deleted', `Report ID: ${id}`, req);
            
            res.json({ message: 'Crash report deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete crash report error:', error);
        res.status(500).json({ error: 'Failed to delete crash report' });
    }
});

// Get crash report statistics (admin only)
router.get('/statistics/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const stats = await crashReportService.getCrashReportStatistics(period);
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get crash report statistics error:', error);
        res.status(500).json({ error: 'Failed to get crash report statistics' });
    }
});

// Get crash trends (admin only)
router.get('/statistics/trends', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        const trends = await crashReportService.getCrashTrends(period, groupBy);
        res.json({ trends });
    } catch (error) {
        console.error('Get crash trends error:', error);
        res.status(500).json({ error: 'Failed to get crash trends' });
    }
});

// Get top error messages (admin only)
router.get('/statistics/top-errors', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 10, period = '30d' } = req.query;
        const topErrors = await crashReportService.getTopErrorMessages(parseInt(limit), period);
        res.json({ topErrors });
    } catch (error) {
        console.error('Get top error messages error:', error);
        res.status(500).json({ error: 'Failed to get top error messages' });
    }
});

// Get crash reports by app version (admin only)
router.get('/statistics/by-version', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const versionStats = await crashReportService.getCrashReportsByVersion(period);
        res.json({ versionStats });
    } catch (error) {
        console.error('Get crash reports by version error:', error);
        res.status(500).json({ error: 'Failed to get crash reports by version' });
    }
});

// Get user crash history (admin only)
router.get('/user/:userId/history', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const history = await crashReportService.getUserCrashHistory(parseInt(userId), parseInt(limit), parseInt(offset));
        res.json({ history });
    } catch (error) {
        console.error('Get user crash history error:', error);
        res.status(500).json({ error: 'Failed to get user crash history' });
    }
});

// Search crash reports (admin only)
router.get('/search/:query', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;
        
        const reports = await crashReportService.searchCrashReports(query, parseInt(limit));
        res.json({ reports });
    } catch (error) {
        console.error('Search crash reports error:', error);
        res.status(500).json({ error: 'Failed to search crash reports' });
    }
});

// Bulk resolve crash reports (admin only)
router.post('/bulk-resolve', authenticateToken, requireAdmin, [
    body('reportIds').isArray().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reportIds } = req.body;
        
        const result = await crashReportService.bulkResolveCrashReports(reportIds, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_reports_bulk_resolved', `Reports: ${reportIds.length}`, req);
            
            res.json({
                message: 'Crash reports resolved successfully',
                resolvedCount: result.resolvedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk resolve crash reports error:', error);
        res.status(500).json({ error: 'Failed to bulk resolve crash reports' });
    }
});

// Bulk delete crash reports (admin only)
router.post('/bulk-delete', authenticateToken, requireAdmin, [
    body('reportIds').isArray().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reportIds } = req.body;
        
        const result = await crashReportService.bulkDeleteCrashReports(reportIds);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_reports_bulk_deleted', `Reports: ${reportIds.length}`, req);
            
            res.json({
                message: 'Crash reports deleted successfully',
                deletedCount: result.deletedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk delete crash reports error:', error);
        res.status(500).json({ error: 'Failed to bulk delete crash reports' });
    }
});

// Clean up old crash reports (admin only)
router.post('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { olderThanDays = 90, keepResolved = true } = req.body;
        
        const cleanedCount = await crashReportService.cleanupOldCrashReports(olderThanDays, keepResolved);
        
        // Log activity
        await logActivity(req.user.id, 'crash_reports_cleaned', `Cleaned ${cleanedCount} reports older than ${olderThanDays} days`, req);
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} old crash reports`,
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup crash reports error:', error);
        res.status(500).json({ error: 'Failed to cleanup crash reports' });
    }
});

// Export crash reports (admin only)
router.get('/export/reports', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            format = 'csv',
            startDate,
            endDate,
            userId,
            appVersion,
            isResolved
        } = req.query;
        
        const filters = {
            startDate,
            endDate,
            userId: userId ? parseInt(userId) : undefined,
            appVersion,
            isResolved: isResolved !== undefined ? isResolved === 'true' : undefined
        };
        
        const result = await crashReportService.exportCrashReports(format, filters);
        
        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'crash_reports_exported', `Format: ${format}`, req);
            
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export crash reports error:', error);
        res.status(500).json({ error: 'Failed to export crash reports' });
    }
});

module.exports = router;