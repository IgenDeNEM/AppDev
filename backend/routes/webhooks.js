const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const webhookService = require('../services/webhookService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get all webhooks
router.get('/', async (req, res) => {
    try {
        const webhooks = await webhookService.getActiveWebhooks();
        res.json({ webhooks });
    } catch (error) {
        console.error('Get webhooks error:', error);
        res.status(500).json({ error: 'Failed to get webhooks' });
    }
});

// Get webhook by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const webhook = await webhookService.getWebhook(parseInt(id));
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        res.json({ webhook });
    } catch (error) {
        console.error('Get webhook error:', error);
        res.status(500).json({ error: 'Failed to get webhook' });
    }
});

// Create new webhook
router.post('/', [
    body('name').isLength({ min: 1, max: 100 }),
    body('url').isURL(),
    body('events').isArray().notEmpty(),
    body('secret_key').optional().isLength({ min: 1, max: 255 }),
    body('headers').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, url, events, secret_key, headers } = req.body;
        
        const result = await webhookService.createWebhook(
            name,
            url,
            events,
            req.user.id,
            secret_key,
            headers
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'webhook_created', `Name: ${name}, URL: ${url}`, req);
            
            res.status(201).json({
                message: 'Webhook created successfully',
                webhookId: result.webhookId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

// Update webhook
router.put('/:id', [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('url').optional().isURL(),
    body('events').optional().isArray().notEmpty(),
    body('secret_key').optional().isLength({ min: 1, max: 255 }),
    body('headers').optional().isObject(),
    body('is_active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;
        
        const result = await webhookService.updateWebhook(parseInt(id), updates);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'webhook_updated', `ID: ${id}`, req);
            
            res.json({ message: 'Webhook updated successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Update webhook error:', error);
        res.status(500).json({ error: 'Failed to update webhook' });
    }
});

// Delete webhook
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await webhookService.deleteWebhook(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'webhook_deleted', `ID: ${id}`, req);
            
            res.json({ message: 'Webhook deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

// Test webhook
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await webhookService.testWebhook(parseInt(id));

        if (result.success) {
            res.json({
                message: 'Webhook test successful',
                status: result.status,
                response: result.response
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: 'Failed to test webhook' });
    }
});

// Get webhook logs
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        const logs = await webhookService.getWebhookLogs(parseInt(id), parseInt(limit), parseInt(offset));
        res.json({ logs });
    } catch (error) {
        console.error('Get webhook logs error:', error);
        res.status(500).json({ error: 'Failed to get webhook logs' });
    }
});

// Get all webhook logs
router.get('/logs/all', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const logs = await webhookService.getWebhookLogs(null, parseInt(limit), parseInt(offset));
        res.json({ logs });
    } catch (error) {
        console.error('Get all webhook logs error:', error);
        res.status(500).json({ error: 'Failed to get webhook logs' });
    }
});

// Get webhook statistics
router.get('/statistics/overview', async (req, res) => {
    try {
        const stats = await webhookService.getWebhookStatistics();
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get webhook statistics error:', error);
        res.status(500).json({ error: 'Failed to get webhook statistics' });
    }
});

// Get available event types
router.get('/events/available', async (req, res) => {
    try {
        const eventPayloads = webhookService.getEventPayloads();
        const availableEvents = Object.keys(eventPayloads);
        
        res.json({ 
            availableEvents,
            eventPayloads: Object.fromEntries(
                Object.entries(eventPayloads).map(([key, fn]) => [
                    key,
                    fn.toString().substring(0, 200) + '...' // Truncate for display
                ])
            )
        });
    } catch (error) {
        console.error('Get available events error:', error);
        res.status(500).json({ error: 'Failed to get available events' });
    }
});

// Send test event to all webhooks
router.post('/test/send-event', [
    body('eventType').isLength({ min: 1 }),
    body('payload').isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { eventType, payload } = req.body;
        
        const results = await webhookService.sendEventToAllWebhooks(eventType, payload);
        
        res.json({
            message: 'Test event sent to all webhooks',
            results
        });
    } catch (error) {
        console.error('Send test event error:', error);
        res.status(500).json({ error: 'Failed to send test event' });
    }
});

// Cleanup old webhook logs
router.post('/cleanup/logs', async (req, res) => {
    try {
        const cleanedCount = await webhookService.cleanupOldLogs();
        res.json({ message: `Cleaned up ${cleanedCount} old webhook logs` });
    } catch (error) {
        console.error('Cleanup webhook logs error:', error);
        res.status(500).json({ error: 'Failed to cleanup webhook logs' });
    }
});

// Get webhook configuration templates
router.get('/templates/configurations', async (req, res) => {
    try {
        const templates = {
            discord: {
                name: 'Discord Webhook',
                url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
                events: ['user_login', 'failed_login', 'admin_action', 'security_alert'],
                headers: {
                    'Content-Type': 'application/json'
                },
                description: 'Send notifications to Discord channel'
            },
            slack: {
                name: 'Slack Webhook',
                url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
                events: ['user_login', 'failed_login', 'admin_action', 'security_alert'],
                headers: {
                    'Content-Type': 'application/json'
                },
                description: 'Send notifications to Slack channel'
            },
            custom: {
                name: 'Custom Webhook',
                url: 'https://your-server.com/webhook',
                events: ['*'],
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_TOKEN'
                },
                description: 'Custom webhook endpoint'
            }
        };

        res.json({ templates });
    } catch (error) {
        console.error('Get webhook templates error:', error);
        res.status(500).json({ error: 'Failed to get webhook templates' });
    }
});

// Verify webhook signature
router.post('/verify-signature', [
    body('payload').isObject(),
    body('signature').isLength({ min: 1 }),
    body('secret').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { payload, signature, secret } = req.body;
        
        const isValid = webhookService.verifySignature(payload, signature, secret);
        
        res.json({ 
            valid: isValid,
            message: isValid ? 'Signature is valid' : 'Signature is invalid'
        });
    } catch (error) {
        console.error('Verify signature error:', error);
        res.status(500).json({ error: 'Failed to verify signature' });
    }
});

module.exports = router;