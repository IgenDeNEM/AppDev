const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');

class WebhookService {
    constructor() {
        this.timeout = 10000; // 10 seconds timeout
        this.maxRetries = 3;
    }

    // Send webhook notification
    async sendWebhook(webhookId, eventType, payload) {
        try {
            const webhook = await this.getWebhook(webhookId);
            if (!webhook || !webhook.is_active) {
                return { success: false, error: 'Webhook not found or inactive' };
            }

            // Check if webhook is configured for this event
            const events = JSON.parse(webhook.events);
            if (!events.includes(eventType) && !events.includes('*')) {
                return { success: false, error: 'Event not configured for this webhook' };
            }

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Tweak-App-Webhook/1.0'
            };

            // Add custom headers if configured
            if (webhook.headers) {
                const customHeaders = JSON.parse(webhook.headers);
                Object.assign(headers, customHeaders);
            }

            // Add signature if secret key is configured
            if (webhook.secret_key) {
                const signature = this.generateSignature(payload, webhook.secret_key);
                headers['X-Webhook-Signature'] = signature;
            }

            // Send webhook
            const response = await axios.post(webhook.url, payload, {
                headers,
                timeout: this.timeout,
                validateStatus: (status) => status < 500 // Don't throw for 4xx errors
            });

            // Log webhook attempt
            await this.logWebhook(webhookId, eventType, payload, response.status, response.data, null);

            return {
                success: response.status >= 200 && response.status < 300,
                status: response.status,
                response: response.data
            };

        } catch (error) {
            // Log failed webhook
            await this.logWebhook(webhookId, eventType, payload, null, null, error.message);

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send webhook to all configured webhooks for an event
    async sendEventToAllWebhooks(eventType, payload) {
        try {
            const webhooks = await this.getActiveWebhooks();
            const results = [];

            for (const webhook of webhooks) {
                const result = await this.sendWebhook(webhook.id, eventType, payload);
                results.push({
                    webhookId: webhook.id,
                    webhookName: webhook.name,
                    ...result
                });
            }

            return results;
        } catch (error) {
            console.error('Error sending event to all webhooks:', error);
            return [];
        }
    }

    // Get webhook by ID
    async getWebhook(webhookId) {
        try {
            const [webhooks] = await pool.execute(
                'SELECT * FROM webhook_configs WHERE id = ?',
                [webhookId]
            );

            return webhooks.length > 0 ? webhooks[0] : null;
        } catch (error) {
            console.error('Error getting webhook:', error);
            return null;
        }
    }

    // Get all active webhooks
    async getActiveWebhooks() {
        try {
            const [webhooks] = await pool.execute(
                'SELECT * FROM webhook_configs WHERE is_active = TRUE'
            );

            return webhooks;
        } catch (error) {
            console.error('Error getting active webhooks:', error);
            return [];
        }
    }

    // Create new webhook
    async createWebhook(name, url, events, createdBy, secretKey = null, headers = null) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO webhook_configs (name, url, events, secret_key, headers, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [name, url, JSON.stringify(events), secretKey, headers ? JSON.stringify(headers) : null, createdBy]
            );

            return { success: true, webhookId: result.insertId };
        } catch (error) {
            console.error('Error creating webhook:', error);
            return { success: false, error: error.message };
        }
    }

    // Update webhook
    async updateWebhook(webhookId, updates) {
        try {
            const allowedFields = ['name', 'url', 'events', 'secret_key', 'headers', 'is_active'];
            const updateFields = [];
            const updateValues = [];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    if (key === 'events' || key === 'headers') {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(JSON.stringify(value));
                    } else {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                }
            }

            if (updateFields.length === 0) {
                return { success: false, error: 'No valid fields to update' };
            }

            updateValues.push(webhookId);

            await pool.execute(
                `UPDATE webhook_configs SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            return { success: true };
        } catch (error) {
            console.error('Error updating webhook:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete webhook
    async deleteWebhook(webhookId) {
        try {
            await pool.execute('DELETE FROM webhook_configs WHERE id = ?', [webhookId]);
            return { success: true };
        } catch (error) {
            console.error('Error deleting webhook:', error);
            return { success: false, error: error.message };
        }
    }

    // Test webhook
    async testWebhook(webhookId) {
        const testPayload = {
            event: 'webhook_test',
            timestamp: new Date().toISOString(),
            message: 'This is a test webhook from Tweak Application',
            data: {
                test: true,
                webhookId: webhookId
            }
        };

        return await this.sendWebhook(webhookId, 'webhook_test', testPayload);
    }

    // Log webhook attempt
    async logWebhook(webhookId, eventType, payload, responseStatus, responseBody, errorMessage) {
        try {
            await pool.execute(
                'INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body, error_message) VALUES (?, ?, ?, ?, ?, ?)',
                [webhookId, eventType, JSON.stringify(payload), responseStatus, responseBody, errorMessage]
            );
        } catch (error) {
            console.error('Error logging webhook:', error);
        }
    }

    // Get webhook logs
    async getWebhookLogs(webhookId = null, limit = 100, offset = 0) {
        try {
            let query = `
                SELECT 
                    wl.id,
                    wl.event_type,
                    wl.response_status,
                    wl.error_message,
                    wl.sent_at,
                    wc.name as webhook_name,
                    wc.url as webhook_url
                FROM webhook_logs wl
                JOIN webhook_configs wc ON wl.webhook_id = wc.id
            `;

            const params = [];

            if (webhookId) {
                query += ' WHERE wl.webhook_id = ?';
                params.push(webhookId);
            }

            query += ' ORDER BY wl.sent_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [logs] = await pool.execute(query, params);
            return logs;
        } catch (error) {
            console.error('Error getting webhook logs:', error);
            return [];
        }
    }

    // Get webhook statistics
    async getWebhookStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    wc.id,
                    wc.name,
                    wc.url,
                    wc.is_active,
                    COUNT(wl.id) as total_attempts,
                    COUNT(CASE WHEN wl.response_status >= 200 AND wl.response_status < 300 THEN 1 END) as successful_attempts,
                    COUNT(CASE WHEN wl.error_message IS NOT NULL THEN 1 END) as failed_attempts,
                    MAX(wl.sent_at) as last_attempt
                FROM webhook_configs wc
                LEFT JOIN webhook_logs wl ON wc.id = wl.webhook_id
                GROUP BY wc.id, wc.name, wc.url, wc.is_active
                ORDER BY wc.name
            `);

            return stats;
        } catch (error) {
            console.error('Error getting webhook statistics:', error);
            return [];
        }
    }

    // Generate webhook signature
    generateSignature(payload, secret) {
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    }

    // Verify webhook signature
    verifySignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }

    // Clean up old webhook logs (older than 30 days)
    async cleanupOldLogs() {
        try {
            const [result] = await pool.execute(
                'DELETE FROM webhook_logs WHERE sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );
            console.log(`Cleaned up ${result.affectedRows} old webhook logs`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old webhook logs:', error);
            return 0;
        }
    }

    // Predefined event payloads
    getEventPayloads() {
        return {
            user_login: (user, ipAddress, userAgent) => ({
                event: 'user_login',
                timestamp: new Date().toISOString(),
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.is_admin
                },
                session: {
                    ipAddress,
                    userAgent
                }
            }),

            user_registration: (user, ipAddress) => ({
                event: 'user_registration',
                timestamp: new Date().toISOString(),
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                session: {
                    ipAddress
                }
            }),

            failed_login: (username, ipAddress, reason) => ({
                event: 'failed_login',
                timestamp: new Date().toISOString(),
                attempt: {
                    username,
                    ipAddress,
                    reason
                }
            }),

            admin_action: (admin, action, target, details) => ({
                event: 'admin_action',
                timestamp: new Date().toISOString(),
                admin: {
                    id: admin.id,
                    username: admin.username
                },
                action: {
                    type: action,
                    target,
                    details
                }
            }),

            security_alert: (alertType, user, details) => ({
                event: 'security_alert',
                timestamp: new Date().toISOString(),
                alert: {
                    type: alertType,
                    severity: 'high'
                },
                user: user ? {
                    id: user.id,
                    username: user.username,
                    email: user.email
                } : null,
                details
            }),

            key_generated: (admin, keyData) => ({
                event: 'key_generated',
                timestamp: new Date().toISOString(),
                admin: {
                    id: admin.id,
                    username: admin.username
                },
                key: {
                    id: keyData.id,
                    key: keyData.key_value,
                    expiresAt: keyData.expires_at
                }
            }),

            remote_command: (admin, user, command, result) => ({
                event: 'remote_command',
                timestamp: new Date().toISOString(),
                admin: {
                    id: admin.id,
                    username: admin.username
                },
                target: {
                    id: user.id,
                    username: user.username
                },
                command: {
                    text: command,
                    result: result
                }
            })
        };
    }
}

module.exports = new WebhookService();