const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Generate registration key
router.post('/generate-key', [
    body('expiresInHours').optional().isInt({ min: 1, max: 8760 }) // Max 1 year
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { expiresInHours } = req.body;
        const keyValue = uuidv4();
        
        let expiresAt = null;
        if (expiresInHours) {
            expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        }

        // Insert registration key
        const [result] = await pool.execute(
            'INSERT INTO registration_keys (key_value, generated_by, expires_at) VALUES (?, ?, ?)',
            [keyValue, req.user.id, expiresAt]
        );

        // Log key generation
        await logActivity(req.user.id, 'key_generated', `Key: ${keyValue}, Expires: ${expiresAt || 'Never'}`, req);

        res.status(201).json({
            message: 'Registration key generated successfully',
            key: keyValue,
            expiresAt: expiresAt,
            keyId: result.insertId
        });

    } catch (error) {
        console.error('Key generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List all registration keys
router.get('/keys', async (req, res) => {
    try {
        const [keys] = await pool.execute(`
            SELECT 
                rk.id,
                rk.key_value,
                rk.is_used,
                rk.expires_at,
                rk.created_at,
                rk.used_at,
                u1.username as generated_by_username,
                u2.username as used_by_username
            FROM registration_keys rk
            LEFT JOIN users u1 ON rk.generated_by = u1.id
            LEFT JOIN users u2 ON rk.used_by = u2.id
            ORDER BY rk.created_at DESC
        `);

        res.json({ keys });
    } catch (error) {
        console.error('Get keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                id,
                username,
                email,
                is_admin,
                is_online,
                last_login,
                created_at
            FROM users 
            ORDER BY created_at DESC
        `);

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add admin
router.post('/add-admin', [
    body('userId').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.body;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, username, is_admin FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (users[0].is_admin) {
            return res.status(400).json({ error: 'User is already an admin' });
        }

        // Make user admin
        await pool.execute(
            'UPDATE users SET is_admin = TRUE WHERE id = ?',
            [userId]
        );

        // Log admin addition
        await logActivity(req.user.id, 'admin_added', `Added ${users[0].username} as admin`, req);

        res.json({ message: 'User promoted to admin successfully' });

    } catch (error) {
        console.error('Add admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove admin
router.post('/remove-admin', [
    body('userId').isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.body;

        // Prevent removing yourself
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
        }

        // Check if user exists and is admin
        const [users] = await pool.execute(
            'SELECT id, username, is_admin FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!users[0].is_admin) {
            return res.status(400).json({ error: 'User is not an admin' });
        }

        // Remove admin privileges
        await pool.execute(
            'UPDATE users SET is_admin = FALSE WHERE id = ?',
            [userId]
        );

        // Log admin removal
        await logActivity(req.user.id, 'admin_removed', `Removed ${users[0].username} as admin`, req);

        res.json({ message: 'Admin privileges removed successfully' });

    } catch (error) {
        console.error('Remove admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset user password
router.post('/reset-password', [
    body('userId').isInt(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, newPassword } = req.body;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, username FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );

        // Log password reset
        await logActivity(req.user.id, 'password_reset', `Reset password for ${users[0].username}`, req);

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get online users
router.get('/online-users', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                id,
                username,
                email,
                is_admin,
                last_login
            FROM users 
            WHERE is_online = TRUE
            ORDER BY last_login DESC
        `);

        res.json({ onlineUsers: users });
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get activity logs
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, userId = null } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                al.id,
                al.action,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.username
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
        `;
        
        let params = [];
        
        if (userId) {
            query += ' WHERE al.user_id = ?';
            params.push(userId);
        }
        
        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM activity_logs al';
        let countParams = [];
        
        if (userId) {
            countQuery += ' WHERE al.user_id = ?';
            countParams.push(userId);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;