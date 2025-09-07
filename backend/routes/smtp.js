const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// All SMTP routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get SMTP configuration
router.get('/config', async (req, res) => {
    try {
        const [configs] = await pool.execute(
            'SELECT id, host, port, secure, username, from_email, from_name, is_active, created_at, updated_at FROM smtp_config ORDER BY created_at DESC'
        );

        res.json({ configs });
    } catch (error) {
        console.error('Get SMTP config error:', error);
        res.status(500).json({ error: 'Failed to get SMTP configuration' });
    }
});

// Create/Update SMTP configuration
router.post('/config', [
    body('host').isLength({ min: 1, max: 255 }),
    body('port').isInt({ min: 1, max: 65535 }),
    body('username').isLength({ min: 1, max: 255 }),
    body('password').isLength({ min: 1, max: 255 }),
    body('from_email').isEmail().normalizeEmail(),
    body('from_name').isLength({ min: 1, max: 255 }),
    body('secure').isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { host, port, secure, username, password, from_email, from_name, is_active = true } = req.body;

        // Deactivate all existing configurations
        await pool.execute('UPDATE smtp_config SET is_active = FALSE');

        // Insert new configuration
        const [result] = await pool.execute(
            'INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [host, port, secure, username, password, from_email, from_name, is_active]
        );

        // Test SMTP connection
        try {
            await emailService.initializeTransporter();
            
            // Log activity
            await logActivity(req.user.id, 'smtp_config_updated', `Host: ${host}, Port: ${port}`, req);
            
            res.json({
                message: 'SMTP configuration saved and tested successfully',
                configId: result.insertId
            });
        } catch (smtpError) {
            // If SMTP test fails, deactivate the configuration
            await pool.execute('UPDATE smtp_config SET is_active = FALSE WHERE id = ?', [result.insertId]);
            
            res.status(400).json({
                error: 'SMTP configuration saved but connection test failed',
                details: smtpError.message
            });
        }

    } catch (error) {
        console.error('Save SMTP config error:', error);
        res.status(500).json({ error: 'Failed to save SMTP configuration' });
    }
});

// Update SMTP configuration
router.put('/config/:id', [
    body('host').optional().isLength({ min: 1, max: 255 }),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('username').optional().isLength({ min: 1, max: 255 }),
    body('password').optional().isLength({ min: 1, max: 255 }),
    body('from_email').optional().isEmail().normalizeEmail(),
    body('from_name').optional().isLength({ min: 1, max: 255 }),
    body('secure').optional().isBoolean(),
    body('is_active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;

        // Check if configuration exists
        const [existing] = await pool.execute(
            'SELECT * FROM smtp_config WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'SMTP configuration not found' });
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(id);

        // If activating this config, deactivate others
        if (updates.is_active === true) {
            await pool.execute('UPDATE smtp_config SET is_active = FALSE WHERE id != ?', [id]);
        }

        await pool.execute(
            `UPDATE smtp_config SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Test SMTP connection if it's being activated
        if (updates.is_active === true) {
            try {
                await emailService.initializeTransporter();
                
                // Log activity
                await logActivity(req.user.id, 'smtp_config_updated', `ID: ${id}`, req);
                
                res.json({ message: 'SMTP configuration updated and tested successfully' });
            } catch (smtpError) {
                // If SMTP test fails, deactivate the configuration
                await pool.execute('UPDATE smtp_config SET is_active = FALSE WHERE id = ?', [id]);
                
                res.status(400).json({
                    error: 'SMTP configuration updated but connection test failed',
                    details: smtpError.message
                });
            }
        } else {
            // Log activity
            await logActivity(req.user.id, 'smtp_config_updated', `ID: ${id}`, req);
            
            res.json({ message: 'SMTP configuration updated successfully' });
        }

    } catch (error) {
        console.error('Update SMTP config error:', error);
        res.status(500).json({ error: 'Failed to update SMTP configuration' });
    }
});

// Delete SMTP configuration
router.delete('/config/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if configuration exists
        const [existing] = await pool.execute(
            'SELECT * FROM smtp_config WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'SMTP configuration not found' });
        }

        // Don't allow deletion of the last active configuration
        const [activeConfigs] = await pool.execute(
            'SELECT COUNT(*) as count FROM smtp_config WHERE is_active = TRUE'
        );

        if (activeConfigs[0].count === 1 && existing[0].is_active) {
            return res.status(400).json({ 
                error: 'Cannot delete the last active SMTP configuration' 
            });
        }

        await pool.execute('DELETE FROM smtp_config WHERE id = ?', [id]);

        // Log activity
        await logActivity(req.user.id, 'smtp_config_deleted', `ID: ${id}`, req);

        res.json({ message: 'SMTP configuration deleted successfully' });
    } catch (error) {
        console.error('Delete SMTP config error:', error);
        res.status(500).json({ error: 'Failed to delete SMTP configuration' });
    }
});

// Test SMTP connection
router.post('/test-connection', async (req, res) => {
    try {
        await emailService.initializeTransporter();
        
        // Log activity
        await logActivity(req.user.id, 'smtp_connection_tested', 'Connection test successful', req);
        
        res.json({ message: 'SMTP connection test successful' });
    } catch (error) {
        console.error('SMTP connection test error:', error);
        
        // Log activity
        await logActivity(req.user.id, 'smtp_connection_tested', `Connection test failed: ${error.message}`, req);
        
        res.status(400).json({ 
            error: 'SMTP connection test failed',
            details: error.message
        });
    }
});

// Get SMTP statistics
router.get('/stats', async (req, res) => {
    try {
        const [emailStats] = await pool.execute(`
            SELECT 
                DATE(sent_at) as date,
                type,
                status,
                COUNT(*) as count
            FROM email_logs 
            WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(sent_at), type, status
            ORDER BY date DESC, type, status
        `);

        const [verificationStats] = await pool.execute(`
            SELECT 
                type,
                COUNT(*) as total_codes,
                SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used_codes,
                SUM(CASE WHEN expires_at < NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as expired_codes,
                AVG(attempts) as avg_attempts
            FROM email_verification_codes 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY type
        `);

        const [recentActivity] = await pool.execute(`
            SELECT 
                el.type,
                el.status,
                el.sent_at,
                u.username
            FROM email_logs el
            LEFT JOIN users u ON el.user_id = u.id
            ORDER BY el.sent_at DESC
            LIMIT 20
        `);

        res.json({
            emailStats,
            verificationStats,
            recentActivity
        });
    } catch (error) {
        console.error('Get SMTP stats error:', error);
        res.status(500).json({ error: 'Failed to get SMTP statistics' });
    }
});

module.exports = router;