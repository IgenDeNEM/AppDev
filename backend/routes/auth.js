const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, logActivity } = require('../middleware/auth');
const emailService = require('../services/emailService');
const securityService = require('../services/securityService');

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

        // Create user security settings
        await pool.execute(
            'INSERT INTO user_security_settings (user_id) VALUES (?)',
            [result.insertId]
        );

        // Send verification email
        try {
            const verificationData = await emailService.createVerificationCode(
                result.insertId,
                email,
                'registration',
                10
            );

            await emailService.sendVerificationCode(
                result.insertId,
                email,
                'registration',
                verificationData.code,
                10
            );
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail registration if email fails, but log it
        }

        // Log registration
        await logActivity(result.insertId, 'user_registered', `Username: ${username}`, req);

        res.status(201).json({ 
            message: 'User registered successfully. Please check your email for verification code.',
            userId: result.insertId,
            requiresVerification: true
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

        // Check if account is locked
        const isLocked = await securityService.isAccountLocked(user.id);
        if (isLocked) {
            return res.status(423).json({ error: 'Account is temporarily locked due to multiple failed login attempts' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Record failed login attempt
            await securityService.recordFailedLogin(user.id, req.ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset failed login attempts on successful login
        await securityService.resetFailedLogins(user.id);

        // Check if 2FA is enabled
        const isTwoFactorEnabled = await securityService.isTwoFactorEnabled(user.id);
        
        if (isTwoFactorEnabled) {
            // Send 2FA code
            try {
                const verificationData = await emailService.createVerificationCode(
                    user.id,
                    user.email,
                    'login_2fa',
                    5
                );

                await emailService.sendVerificationCode(
                    user.id,
                    user.email,
                    'login_2fa',
                    verificationData.code,
                    5
                );

                return res.json({
                    message: 'Two-factor authentication required. Please check your email for verification code.',
                    requires2FA: true,
                    userId: user.id
                });
            } catch (emailError) {
                console.error('Failed to send 2FA email:', emailError);
                return res.status(500).json({ error: 'Failed to send verification code' });
            }
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

// Complete 2FA login
router.post('/complete-2fa', [
    body('userId').isInt(),
    body('code').isLength({ min: 8, max: 8 }).isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, code } = req.body;

        // Get user info
        const [users] = await pool.execute(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Verify 2FA code
        const verification = await emailService.verifyCode(user.email, code, 'login_2fa');

        if (!verification.valid) {
            return res.status(400).json({ error: verification.error });
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
        await logActivity(user.id, 'user_login_2fa', `Username: ${user.username}`, req);

        res.json({
            message: 'Two-factor authentication successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });

    } catch (error) {
        console.error('2FA completion error:', error);
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

// Request password reset
router.post('/request-password-reset', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // Don't reveal if email exists or not
            return res.json({ message: 'If the email exists, a password reset code has been sent.' });
        }

        const user = users[0];

        // Check rate limiting
        const rateLimit = await securityService.checkEmailRateLimit(email, 'password_reset');
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: 'Too many password reset requests. Please try again later.',
                resetTime: rateLimit.resetTime
            });
        }

        // Send password reset code
        try {
            const verificationData = await emailService.createVerificationCode(
                user.id,
                email,
                'password_reset',
                10
            );

            await emailService.sendVerificationCode(
                user.id,
                email,
                'password_reset',
                verificationData.code,
                10
            );

            // Log activity
            await logActivity(user.id, 'password_reset_requested', `Email: ${email}`, req);

            res.json({ message: 'If the email exists, a password reset code has been sent.' });
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            res.status(500).json({ error: 'Failed to send password reset code' });
        }

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset password with verification code
router.post('/reset-password', [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 8, max: 8 }).isNumeric(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, code, newPassword } = req.body;

        // Verify reset code
        const verification = await emailService.verifyCode(email, code, 'password_reset');

        if (!verification.valid) {
            return res.status(400).json({ error: verification.error });
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, verification.userId]
        );

        // Log activity
        await logActivity(verification.userId, 'password_reset_completed', `Email: ${email}`, req);

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change password (authenticated user)
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Get current user
        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Send verification code for password change
        try {
            const verificationData = await emailService.createVerificationCode(
                user.id,
                user.email,
                'password_change',
                5
            );

            await emailService.sendVerificationCode(
                user.id,
                user.email,
                'password_change',
                verificationData.code,
                5
            );

            res.json({ 
                message: 'Verification code sent to your email. Please verify to complete password change.',
                requiresVerification: true
            });
        } catch (emailError) {
            console.error('Failed to send password change verification email:', emailError);
            res.status(500).json({ error: 'Failed to send verification code' });
        }

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete password change with verification code
router.post('/complete-password-change', authenticateToken, [
    body('code').isLength({ min: 8, max: 8 }).isNumeric(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { code, newPassword } = req.body;

        // Get current user
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Verify password change code
        const verification = await emailService.verifyCode(user.email, code, 'password_change');

        if (!verification.valid) {
            return res.status(400).json({ error: verification.error });
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, user.id]
        );

        // Log activity
        await logActivity(user.id, 'password_changed', `Username: ${user.username}`, req);

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Complete password change error:', error);
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

        // Get security settings
        const securitySettings = await securityService.getUserSecuritySettings(req.user.id);

        res.json({ 
            user: users[0],
            securitySettings
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;