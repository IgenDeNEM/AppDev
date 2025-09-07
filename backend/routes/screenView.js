const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const screenViewService = require('../services/screenViewService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Request screen view permission
router.post('/request/:userId', [
    body('reason').optional().isLength({ max: 500 }),
    body('duration').optional().isInt({ min: 1, max: 1440 }) // Max 24 hours
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.params;
        const { reason, duration = 60 } = req.body; // Default 60 minutes
        
        const result = await screenViewService.requestScreenViewPermission(
            parseInt(userId),
            req.user.id,
            reason,
            duration
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_requested', `User ID: ${userId}, Duration: ${duration}min`, req);
            
            res.json({
                message: 'Screen view permission requested successfully',
                requestId: result.requestId,
                expiresAt: result.expiresAt
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Request screen view permission error:', error);
        res.status(500).json({ error: 'Failed to request screen view permission' });
    }
});

// Get screen view permissions
router.get('/permissions', async (req, res) => {
    try {
        const { 
            userId, 
            adminId, 
            status, 
            limit = 50, 
            offset = 0,
            startDate,
            endDate
        } = req.query;
        
        const filters = {
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            status,
            startDate,
            endDate
        };
        
        const permissions = await screenViewService.getScreenViewPermissions(filters, parseInt(limit), parseInt(offset));
        res.json({ permissions });
    } catch (error) {
        console.error('Get screen view permissions error:', error);
        res.status(500).json({ error: 'Failed to get screen view permissions' });
    }
});

// Get screen view permission by ID
router.get('/permissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const permission = await screenViewService.getScreenViewPermissionById(parseInt(id));
        
        if (!permission) {
            return res.status(404).json({ error: 'Screen view permission not found' });
        }
        
        res.json({ permission });
    } catch (error) {
        console.error('Get screen view permission error:', error);
        res.status(500).json({ error: 'Failed to get screen view permission' });
    }
});

// Get pending requests
router.get('/pending', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const requests = await screenViewService.getPendingRequests(parseInt(limit));
        res.json({ requests });
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ error: 'Failed to get pending requests' });
    }
});

// Get active permissions
router.get('/active', async (req, res) => {
    try {
        const { userId } = req.query;
        const permissions = await screenViewService.getActivePermissions(userId ? parseInt(userId) : undefined);
        res.json({ permissions });
    } catch (error) {
        console.error('Get active permissions error:', error);
        res.status(500).json({ error: 'Failed to get active permissions' });
    }
});

// Cancel screen view request
router.post('/cancel/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await screenViewService.cancelScreenViewRequest(parseInt(id), req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_cancelled', `Request ID: ${id}`, req);
            
            res.json({ message: 'Screen view request cancelled successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Cancel screen view request error:', error);
        res.status(500).json({ error: 'Failed to cancel screen view request' });
    }
});

// Revoke active permission
router.post('/revoke/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await screenViewService.revokeScreenViewPermission(parseInt(id), req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_revoked', `Permission ID: ${id}`, req);
            
            res.json({ message: 'Screen view permission revoked successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Revoke screen view permission error:', error);
        res.status(500).json({ error: 'Failed to revoke screen view permission' });
    }
});

// Extend permission duration
router.post('/extend/:id', [
    body('additionalMinutes').isInt({ min: 1, max: 1440 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { additionalMinutes } = req.body;
        
        const result = await screenViewService.extendPermissionDuration(parseInt(id), additionalMinutes, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_extended', `Permission ID: ${id}, Additional: ${additionalMinutes}min`, req);
            
            res.json({
                message: 'Screen view permission extended successfully',
                newExpiresAt: result.newExpiresAt
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Extend screen view permission error:', error);
        res.status(500).json({ error: 'Failed to extend screen view permission' });
    }
});

// Get screen view statistics
router.get('/statistics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const stats = await screenViewService.getScreenViewStatistics(period);
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get screen view statistics error:', error);
        res.status(500).json({ error: 'Failed to get screen view statistics' });
    }
});

// Get user screen view history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const history = await screenViewService.getUserScreenViewHistory(parseInt(userId), parseInt(limit), parseInt(offset));
        res.json({ history });
    } catch (error) {
        console.error('Get user screen view history error:', error);
        res.status(500).json({ error: 'Failed to get user screen view history' });
    }
});

// Get admin screen view activity
router.get('/admin/:adminId/activity', async (req, res) => {
    try {
        const { adminId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const activity = await screenViewService.getAdminScreenViewActivity(parseInt(adminId), parseInt(limit), parseInt(offset));
        res.json({ activity });
    } catch (error) {
        console.error('Get admin screen view activity error:', error);
        res.status(500).json({ error: 'Failed to get admin screen view activity' });
    }
});

// Bulk request screen view
router.post('/bulk-request', [
    body('userIds').isArray().notEmpty(),
    body('reason').optional().isLength({ max: 500 }),
    body('duration').optional().isInt({ min: 1, max: 1440 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, reason, duration = 60 } = req.body;
        
        const result = await screenViewService.bulkRequestScreenView(
            userIds,
            req.user.id,
            reason,
            duration
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_bulk_requested', `Users: ${userIds.length}, Duration: ${duration}min`, req);
            
            res.json({
                message: 'Screen view permissions requested for multiple users',
                requestedCount: result.requestedCount,
                failedCount: result.failedCount,
                requestIds: result.requestIds
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk request screen view error:', error);
        res.status(500).json({ error: 'Failed to bulk request screen view' });
    }
});

// Get screen view analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        const analytics = await screenViewService.getScreenViewAnalytics(period, groupBy);
        res.json({ analytics });
    } catch (error) {
        console.error('Get screen view analytics error:', error);
        res.status(500).json({ error: 'Failed to get screen view analytics' });
    }
});

// Clean up expired permissions
router.post('/cleanup/expired', async (req, res) => {
    try {
        const cleanedCount = await screenViewService.cleanupExpiredPermissions();
        
        // Log activity
        await logActivity(req.user.id, 'screen_view_cleanup', `Cleaned ${cleanedCount} expired permissions`, req);
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} expired screen view permissions`,
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup expired permissions error:', error);
        res.status(500).json({ error: 'Failed to cleanup expired permissions' });
    }
});

// Export screen view logs
router.get('/export/logs', async (req, res) => {
    try {
        const { 
            format = 'csv',
            startDate,
            endDate,
            userId,
            adminId,
            status
        } = req.query;
        
        const filters = {
            startDate,
            endDate,
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            status
        };
        
        const result = await screenViewService.exportScreenViewLogs(format, filters);
        
        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'screen_view_logs_exported', `Format: ${format}`, req);
            
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export screen view logs error:', error);
        res.status(500).json({ error: 'Failed to export screen view logs' });
    }
});

module.exports = router;