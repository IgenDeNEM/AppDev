const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// Register with key
router.post('/register', [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('registrationKey').isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, registrationKey } = req.body;

        // Check if registration key is valid and unused
        const [keys] = await pool.execute(
            'SELECT id, generated_by FROM registration_keys WHERE key_value = ? AND is_used = FALSE AND (expires_at IS NULL OR expires_at > NOW())',
            [registrationKey]
        );

        if (keys.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired registration key' });
        }

        // Check if username or email already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, registration_key) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, registrationKey]
        );

        // Mark registration key as used
        await pool.execute(
            'UPDATE registration_keys SET is_used = TRUE, used_by = ?, used_at = NOW() WHERE key_value = ?',
            [result.insertId, registrationKey]
        );

        // Log registration
        await logActivity(result.insertId, 'user_registered', `Username: ${username}`, req);

        res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertId 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', [
    body('username').trim().escape(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Find user
        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash, is_admin FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login and online status
        await pool.execute(
            'UPDATE users SET last_login = NOW(), is_online = TRUE WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, isAdmin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log login
        await logActivity(user.id, 'user_login', `Username: ${username}`, req);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Update online status
        await pool.execute(
            'UPDATE users SET is_online = FALSE WHERE id = ?',
            [req.user.id]
        );

        // Log logout
        await logActivity(req.user.id, 'user_logout', `Username: ${req.user.username}`, req);

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, is_admin, is_online, last_login, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;