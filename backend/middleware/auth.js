const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists and is active
        const [users] = await pool.execute(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

const logActivity = async (userId, action, details = null, req = null) => {
    try {
        const ipAddress = req ? req.ip || req.connection.remoteAddress : null;
        const userAgent = req ? req.get('User-Agent') : null;
        
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, action, details, ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    logActivity
};