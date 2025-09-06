const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const emailService = require('../services/emailService');
const securityService = require('../services/securityService');

const router = express.Router();

// Send verification code
router.post('/send-verification-code', [
    body('email').isEmail().normalizeEmail(),
    body('type').isIn(['registration', 'login_2fa', 'password_reset', 'password_change', 'admin_creation', 'role_change', 'security_alert'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, type, userId = null } = req.body;

        // Check rate limiting
        const rateLimit = await securityService.checkCodeRateLimit(email, type);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: 'Too many verification code requests. Please try again later.',
                resetTime: rateLimit.resetTime
            });
        }

        // Create verification code
        const verificationData = await emailService.createVerificationCode(
            userId,
            email,
            type,
            parseInt(process.env.VERIFICATION_CODE_EXPIRY) || 10
        );

        // Send email
        await emailService.sendVerificationCode(
            userId,
            email,
            type,
            verificationData.code,
            parseInt(process.env.VERIFICATION_CODE_EXPIRY) || 10
        );

        // Log activity
        if (req.user) {
            await logActivity(req.user.id, 'verification_code_sent', `Type: ${type}, Email: ${email}`, req);
        }

        res.json({
            message: 'Verification code sent successfully',
            expiresIn: parseInt(process.env.VERIFICATION_CODE_EXPIRY) || 10
        });

    } catch (error) {
        console.error('Send verification code error:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
});

// Verify code
router.post('/verify-code', [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 8, max: 8 }).isNumeric(),
    body('type').isIn(['registration', 'login_2fa', 'password_reset', 'password_change', 'admin_creation', 'role_change', 'security_alert'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, code, type } = req.body;

        // Verify code
        const verification = await emailService.verifyCode(email, code, type);

        if (!verification.valid) {
            return res.status(400).json({ error: verification.error });
        }

        // Log activity
        if (req.user) {
            await logActivity(req.user.id, 'verification_code_verified', `Type: ${type}, Email: ${email}`, req);
        }

        res.json({
            message: 'Code verified successfully',
            valid: true,
            userId: verification.userId
        });

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

// Admin routes for email management
router.use(authenticateToken);
router.use(requireAdmin);

// Get email statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await emailService.getEmailStats();
        res.json(stats);
    } catch (error) {
        console.error('Get email stats error:', error);
        res.status(500).json({ error: 'Failed to get email statistics' });
    }
});

// Get email logs
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, type = null, status = null } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                el.id,
                el.email,
                el.type,
                el.subject,
                el.status,
                el.error_message,
                el.sent_at,
                el.delivered_at,
                u.username
            FROM email_logs el
            LEFT JOIN users u ON el.user_id = u.id
        `;
        
        let params = [];
        let conditions = [];
        
        if (type) {
            conditions.push('el.type = ?');
            params.push(type);
        }
        
        if (status) {
            conditions.push('el.status = ?');
            params.push(status);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY el.sent_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.execute(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM email_logs el';
        let countParams = [];
        
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
            countParams = params.slice(0, -2); // Remove limit and offset
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
        console.error('Get email logs error:', error);
        res.status(500).json({ error: 'Failed to get email logs' });
    }
});

// Get verification code statistics
router.get('/verification-stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                type,
                COUNT(*) as total_codes,
                SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used_codes,
                SUM(CASE WHEN expires_at < NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as expired_codes,
                SUM(CASE WHEN attempts >= max_attempts THEN 1 ELSE 0 END) as max_attempts_exceeded
            FROM email_verification_codes 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY type
        `);

        res.json({ verificationStats: stats });
    } catch (error) {
        console.error('Get verification stats error:', error);
        res.status(500).json({ error: 'Failed to get verification statistics' });
    }
});

// Clean up expired codes
router.post('/cleanup-expired-codes', async (req, res) => {
    try {
        const cleanedCount = await emailService.cleanupExpiredCodes();
        
        // Log activity
        await logActivity(req.user.id, 'expired_codes_cleaned', `Cleaned ${cleanedCount} expired codes`, req);
        
        res.json({
            message: 'Expired codes cleaned successfully',
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup expired codes error:', error);
        res.status(500).json({ error: 'Failed to cleanup expired codes' });
    }
});

// Send test email
router.post('/send-test-email', [
    body('email').isEmail().normalizeEmail(),
    body('subject').isLength({ min: 1, max: 255 }),
    body('message').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, subject, message } = req.body;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Test Email</h2>
                <p>This is a test email from the Tweak Application admin panel.</p>
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #1976d2;">
                    <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                </div>
                <p>If you received this email, the SMTP configuration is working correctly.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">This is a test email from Tweak Application.</p>
            </div>
        `;

        await emailService.sendEmail(email, subject, html, 'system_notification', req.user.id);

        // Log activity
        await logActivity(req.user.id, 'test_email_sent', `To: ${email}, Subject: ${subject}`, req);

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Send test email error:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

module.exports = router;