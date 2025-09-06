const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const remoteRoutes = require('./routes/remote');
const emailRoutes = require('./routes/email');
const smtpRoutes = require('./routes/smtp');
const securityRoutes = require('./routes/security');
const webhooksRoutes = require('./routes/webhooks');
const userTagsRoutes = require('./routes/userTags');
const commandPresetsRoutes = require('./routes/commandPresets');
const fileTransferRoutes = require('./routes/fileTransfer');
const clipboardRoutes = require('./routes/clipboard');
const screenViewRoutes = require('./routes/screenView');
const crashReportsRoutes = require('./routes/crashReports');
const offlineCacheRoutes = require('./routes/offlineCache');
const keyStatisticsRoutes = require('./routes/keyStatistics');
const advancedSearchRoutes = require('./routes/advancedSearch');
const packagesRoutes = require('./routes/packages');
const tweaksRoutes = require('./routes/tweaks');
const rbacRoutes = require('./routes/rbac');
const userPreferencesRoutes = require('./routes/userPreferences');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth/', authLimiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/remote', remoteRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/smtp', smtpRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/user-tags', userTagsRoutes);
app.use('/api/command-presets', commandPresetsRoutes);
app.use('/api/file-transfer', fileTransferRoutes);
app.use('/api/clipboard', clipboardRoutes);
app.use('/api/screen-view', screenViewRoutes);
app.use('/api/crash-reports', crashReportsRoutes);
app.use('/api/offline-cache', offlineCacheRoutes);
app.use('/api/key-statistics', keyStatisticsRoutes);
app.use('/api/advanced-search', advancedSearchRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/tweaks', tweaksRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication via socket
    socket.on('authenticate', async (data) => {
        try {
            // In a real implementation, you would verify the JWT token here
            // For now, we'll just store the user info
            socket.userId = data.userId;
            socket.username = data.username;
            socket.isAdmin = data.isAdmin;
            
            // Join user to their personal room
            socket.join(`user_${data.userId}`);
            
            // If admin, join admin room
            if (data.isAdmin) {
                socket.join('admins');
            }
            
            socket.emit('authenticated', { success: true });
        } catch (error) {
            socket.emit('authentication_error', { error: 'Authentication failed' });
        }
    });

    // Handle remote command execution
    socket.on('execute_command', async (data) => {
        try {
            // This would be called by the desktop app
            // Execute the command and send result back
            const { commandId, command, result, status } = data;
            
            // Emit result to admin who requested the command
            io.to('admins').emit('command_result', {
                commandId,
                command,
                result,
                status,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Command execution error:', error);
        }
    });

    // Handle screen capture
    socket.on('screen_capture', async (data) => {
        try {
            // This would be called by the desktop app with screen capture data
            const { imageData, adminId } = data;
            
            // Emit screen capture to requesting admin
            io.to(`admin_${adminId}`).emit('screen_capture_received', {
                imageData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Screen capture error:', error);
        }
    });

    // Handle user status updates
    socket.on('status_update', (data) => {
        // Broadcast status update to admins
        io.to('admins').emit('user_status_update', {
            userId: socket.userId,
            username: socket.username,
            status: data.status,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Notify admins about user disconnection
        if (socket.isAdmin) {
            io.to('admins').emit('admin_disconnected', {
                userId: socket.userId,
                username: socket.username
            });
        } else {
            io.to('admins').emit('user_disconnected', {
                userId: socket.userId,
                username: socket.username
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();
        
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Admin dashboard: http://localhost:${PORT}`);
            console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server, io };