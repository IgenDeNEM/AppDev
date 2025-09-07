const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const clipboardService = require('../services/clipboardService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Send text to user clipboard
router.post('/send/:userId', [
    body('content').isLength({ min: 1, max: 10000 }),
    body('contentType').optional().isIn(['text', 'html', 'url']),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.params;
        const { content, contentType = 'text', description } = req.body;
        
        const result = await clipboardService.sendToUserClipboard(
            parseInt(userId),
            content,
            contentType,
            req.user.id,
            description
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_sent', `User ID: ${userId}, Type: ${contentType}`, req);
            
            res.json({
                message: 'Content sent to user clipboard successfully',
                logId: result.logId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Send clipboard content error:', error);
        res.status(500).json({ error: 'Failed to send clipboard content' });
    }
});

// Get clipboard sharing logs
router.get('/logs', async (req, res) => {
    try {
        const { 
            userId, 
            adminId, 
            contentType, 
            status, 
            limit = 50, 
            offset = 0,
            startDate,
            endDate
        } = req.query;
        
        const filters = {
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            contentType,
            status,
            startDate,
            endDate
        };
        
        const logs = await clipboardService.getClipboardLogs(filters, parseInt(limit), parseInt(offset));
        res.json({ logs });
    } catch (error) {
        console.error('Get clipboard logs error:', error);
        res.status(500).json({ error: 'Failed to get clipboard logs' });
    }
});

// Get clipboard log by ID
router.get('/logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await clipboardService.getClipboardLogById(parseInt(id));
        
        if (!log) {
            return res.status(404).json({ error: 'Clipboard log not found' });
        }
        
        res.json({ log });
    } catch (error) {
        console.error('Get clipboard log error:', error);
        res.status(500).json({ error: 'Failed to get clipboard log' });
    }
});

// Get clipboard statistics
router.get('/statistics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const stats = await clipboardService.getClipboardStatistics(period);
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get clipboard statistics error:', error);
        res.status(500).json({ error: 'Failed to get clipboard statistics' });
    }
});

// Get user clipboard history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const history = await clipboardService.getUserClipboardHistory(parseInt(userId), parseInt(limit), parseInt(offset));
        res.json({ history });
    } catch (error) {
        console.error('Get user clipboard history error:', error);
        res.status(500).json({ error: 'Failed to get user clipboard history' });
    }
});

// Bulk send to multiple users
router.post('/bulk-send', [
    body('userIds').isArray().notEmpty(),
    body('content').isLength({ min: 1, max: 10000 }),
    body('contentType').optional().isIn(['text', 'html', 'url']),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, content, contentType = 'text', description } = req.body;
        
        const result = await clipboardService.bulkSendToUsers(
            userIds,
            content,
            contentType,
            req.user.id,
            description
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_bulk_sent', `Users: ${userIds.length}, Type: ${contentType}`, req);
            
            res.json({
                message: 'Content sent to multiple users successfully',
                sentCount: result.sentCount,
                failedCount: result.failedCount,
                logIds: result.logIds
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk send clipboard content error:', error);
        res.status(500).json({ error: 'Failed to bulk send clipboard content' });
    }
});

// Get clipboard templates
router.get('/templates', async (req, res) => {
    try {
        const templates = clipboardService.getClipboardTemplates();
        res.json({ templates });
    } catch (error) {
        console.error('Get clipboard templates error:', error);
        res.status(500).json({ error: 'Failed to get clipboard templates' });
    }
});

// Save clipboard template
router.post('/templates', [
    body('name').isLength({ min: 1, max: 100 }),
    body('content').isLength({ min: 1, max: 10000 }),
    body('contentType').optional().isIn(['text', 'html', 'url']),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, content, contentType = 'text', description } = req.body;
        
        const result = await clipboardService.saveClipboardTemplate(
            name,
            content,
            contentType,
            description,
            req.user.id
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_template_saved', `Name: ${name}`, req);
            
            res.status(201).json({
                message: 'Clipboard template saved successfully',
                templateId: result.templateId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Save clipboard template error:', error);
        res.status(500).json({ error: 'Failed to save clipboard template' });
    }
});

// Get clipboard template by ID
router.get('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await clipboardService.getClipboardTemplateById(parseInt(id));
        
        if (!template) {
            return res.status(404).json({ error: 'Clipboard template not found' });
        }
        
        res.json({ template });
    } catch (error) {
        console.error('Get clipboard template error:', error);
        res.status(500).json({ error: 'Failed to get clipboard template' });
    }
});

// Update clipboard template
router.put('/templates/:id', [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('content').optional().isLength({ min: 1, max: 10000 }),
    body('contentType').optional().isIn(['text', 'html', 'url']),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;
        
        const result = await clipboardService.updateClipboardTemplate(parseInt(id), updates);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_template_updated', `ID: ${id}`, req);
            
            res.json({ message: 'Clipboard template updated successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Update clipboard template error:', error);
        res.status(500).json({ error: 'Failed to update clipboard template' });
    }
});

// Delete clipboard template
router.delete('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await clipboardService.deleteClipboardTemplate(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_template_deleted', `ID: ${id}`, req);
            
            res.json({ message: 'Clipboard template deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete clipboard template error:', error);
        res.status(500).json({ error: 'Failed to delete clipboard template' });
    }
});

// Send template to user
router.post('/templates/:templateId/send/:userId', [
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { templateId, userId } = req.params;
        const { description } = req.body;
        
        const result = await clipboardService.sendTemplateToUser(
            parseInt(templateId),
            parseInt(userId),
            req.user.id,
            description
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_template_sent', `Template ID: ${templateId}, User ID: ${userId}`, req);
            
            res.json({
                message: 'Template sent to user clipboard successfully',
                logId: result.logId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Send template to user error:', error);
        res.status(500).json({ error: 'Failed to send template to user' });
    }
});

// Get clipboard analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        const analytics = await clipboardService.getClipboardAnalytics(period, groupBy);
        res.json({ analytics });
    } catch (error) {
        console.error('Get clipboard analytics error:', error);
        res.status(500).json({ error: 'Failed to get clipboard analytics' });
    }
});

// Clean up old clipboard logs
router.post('/cleanup', async (req, res) => {
    try {
        const { olderThanDays = 30 } = req.body;
        
        const cleanedCount = await clipboardService.cleanupOldLogs(olderThanDays);
        
        // Log activity
        await logActivity(req.user.id, 'clipboard_logs_cleaned', `Cleaned ${cleanedCount} logs older than ${olderThanDays} days`, req);
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} old clipboard logs`,
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup clipboard logs error:', error);
        res.status(500).json({ error: 'Failed to cleanup clipboard logs' });
    }
});

// Export clipboard logs
router.get('/export/logs', async (req, res) => {
    try {
        const { 
            format = 'csv',
            startDate,
            endDate,
            userId,
            adminId,
            contentType
        } = req.query;
        
        const filters = {
            startDate,
            endDate,
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            contentType
        };
        
        const result = await clipboardService.exportClipboardLogs(format, filters);
        
        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'clipboard_logs_exported', `Format: ${format}`, req);
            
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export clipboard logs error:', error);
        res.status(500).json({ error: 'Failed to export clipboard logs' });
    }
});

module.exports = router;