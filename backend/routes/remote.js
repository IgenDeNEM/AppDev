const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');

const router = express.Router();

// All remote control routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Execute command on user's machine
router.post('/execute-command', [
    body('targetUserId').isInt(),
    body('command').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { targetUserId, command } = req.body;

        // Check if target user exists and is online
        const [users] = await pool.execute(
            'SELECT id, username, is_online FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        if (!users[0].is_online) {
            return res.status(400).json({ error: 'Target user is not online' });
        }

        // Create remote command record
        const [result] = await pool.execute(
            'INSERT INTO remote_commands (admin_id, target_user_id, command) VALUES (?, ?, ?)',
            [req.user.id, targetUserId, command]
        );

        // Log command execution
        await logActivity(req.user.id, 'remote_command', `Executed "${command}" on ${users[0].username}`, req);

        // In a real implementation, you would send this command to the target user's desktop app
        // For now, we'll simulate the command execution
        res.json({
            message: 'Command queued for execution',
            commandId: result.insertId,
            status: 'pending'
        });

    } catch (error) {
        console.error('Execute command error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get command history
router.get('/command-history', async (req, res) => {
    try {
        const { page = 1, limit = 50, targetUserId = null } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                rc.id,
                rc.command,
                rc.status,
                rc.result,
                rc.created_at,
                rc.executed_at,
                u1.username as admin_username,
                u2.username as target_username
            FROM remote_commands rc
            JOIN users u1 ON rc.admin_id = u1.id
            JOIN users u2 ON rc.target_user_id = u2.id
        `;
        
        let params = [];
        
        if (targetUserId) {
            query += ' WHERE rc.target_user_id = ?';
            params.push(targetUserId);
        }
        
        query += ' ORDER BY rc.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [commands] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM remote_commands rc';
        let countParams = [];
        
        if (targetUserId) {
            countQuery += ' WHERE rc.target_user_id = ?';
            countParams.push(targetUserId);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            commands,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get command history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update command status (called by desktop app)
router.put('/command-status/:commandId', [
    body('status').isIn(['executed', 'failed']),
    body('result').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { commandId } = req.params;
        const { status, result } = req.body;

        // Update command status
        await pool.execute(
            'UPDATE remote_commands SET status = ?, result = ?, executed_at = NOW() WHERE id = ?',
            [status, result, commandId]
        );

        res.json({ message: 'Command status updated successfully' });

    } catch (error) {
        console.error('Update command status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request screen capture
router.post('/request-screen-capture', [
    body('targetUserId').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { targetUserId } = req.body;

        // Check if target user exists and is online
        const [users] = await pool.execute(
            'SELECT id, username, is_online FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        if (!users[0].is_online) {
            return res.status(400).json({ error: 'Target user is not online' });
        }

        // Log screen capture request
        await logActivity(req.user.id, 'screen_capture_request', `Requested screen capture from ${users[0].username}`, req);

        // In a real implementation, you would send this request to the target user's desktop app
        res.json({
            message: 'Screen capture request sent',
            targetUserId: targetUserId
        });

    } catch (error) {
        console.error('Request screen capture error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get screen captures
router.get('/screen-captures', async (req, res) => {
    try {
        const { page = 1, limit = 20, targetUserId = null } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                sc.id,
                sc.created_at,
                u1.username as admin_username,
                u2.username as target_username
            FROM screen_captures sc
            JOIN users u1 ON sc.admin_id = u1.id
            JOIN users u2 ON sc.user_id = u2.id
        `;
        
        let params = [];
        
        if (targetUserId) {
            query += ' WHERE sc.user_id = ?';
            params.push(targetUserId);
        }
        
        query += ' ORDER BY sc.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [captures] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM screen_captures sc';
        let countParams = [];
        
        if (targetUserId) {
            countQuery += ' WHERE sc.user_id = ?';
            countParams.push(targetUserId);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            captures,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get screen captures error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific screen capture
router.get('/screen-capture/:captureId', async (req, res) => {
    try {
        const { captureId } = req.params;

        const [captures] = await pool.execute(
            'SELECT image_data FROM screen_captures WHERE id = ?',
            [captureId]
        );

        if (captures.length === 0) {
            return res.status(404).json({ error: 'Screen capture not found' });
        }

        res.set('Content-Type', 'image/png');
        res.send(captures[0].image_data);

    } catch (error) {
        console.error('Get screen capture error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;