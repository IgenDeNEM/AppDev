const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const fileTransferService = require('../services/fileTransferService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/temp');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add file type restrictions if needed
        cb(null, true);
    }
});

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get transfer logs
router.get('/logs', async (req, res) => {
    try {
        const { 
            userId, 
            adminId, 
            status, 
            transferType, 
            limit = 50, 
            offset = 0,
            startDate,
            endDate
        } = req.query;
        
        const filters = {
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            status,
            transferType,
            startDate,
            endDate
        };
        
        const logs = await fileTransferService.getTransferLogs(filters, parseInt(limit), parseInt(offset));
        res.json({ logs });
    } catch (error) {
        console.error('Get transfer logs error:', error);
        res.status(500).json({ error: 'Failed to get transfer logs' });
    }
});

// Get transfer log by ID
router.get('/logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await fileTransferService.getTransferLogById(parseInt(id));
        
        if (!log) {
            return res.status(404).json({ error: 'Transfer log not found' });
        }
        
        res.json({ log });
    } catch (error) {
        console.error('Get transfer log error:', error);
        res.status(500).json({ error: 'Failed to get transfer log' });
    }
});

// Get transfer statistics
router.get('/statistics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const stats = await fileTransferService.getTransferStatistics(period);
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get transfer statistics error:', error);
        res.status(500).json({ error: 'Failed to get transfer statistics' });
    }
});

// Get user transfer history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        const history = await fileTransferService.getUserTransferHistory(parseInt(userId), parseInt(limit), parseInt(offset));
        res.json({ history });
    } catch (error) {
        console.error('Get user transfer history error:', error);
        res.status(500).json({ error: 'Failed to get user transfer history' });
    }
});

// Upload file to user
router.post('/upload/:userId', upload.single('file'), [
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { userId } = req.params;
        const { description } = req.body;
        
        const result = await fileTransferService.uploadFileToUser(
            parseInt(userId),
            req.file,
            req.user.id,
            description
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'file_uploaded', `User ID: ${userId}, File: ${req.file.originalname}`, req);
            
            res.json({
                message: 'File uploaded successfully',
                transferId: result.transferId,
                fileInfo: result.fileInfo
            });
        } else {
            // Clean up uploaded file on failure
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to clean up uploaded file:', unlinkError);
            }
            
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Upload file error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to clean up uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Download file from user
router.post('/download/:userId', [
    body('filePath').isLength({ min: 1 }),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.params;
        const { filePath, description } = req.body;
        
        const result = await fileTransferService.downloadFileFromUser(
            parseInt(userId),
            filePath,
            req.user.id,
            description
        );

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'file_downloaded', `User ID: ${userId}, File: ${filePath}`, req);
            
            res.json({
                message: 'File download initiated successfully',
                transferId: result.transferId,
                fileInfo: result.fileInfo
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Get transfer status
router.get('/status/:transferId', async (req, res) => {
    try {
        const { transferId } = req.params;
        const status = await fileTransferService.getTransferStatus(transferId);
        
        if (!status) {
            return res.status(404).json({ error: 'Transfer not found' });
        }
        
        res.json({ status });
    } catch (error) {
        console.error('Get transfer status error:', error);
        res.status(500).json({ error: 'Failed to get transfer status' });
    }
});

// Cancel transfer
router.post('/cancel/:transferId', async (req, res) => {
    try {
        const { transferId } = req.params;
        
        const result = await fileTransferService.cancelTransfer(transferId, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'transfer_cancelled', `Transfer ID: ${transferId}`, req);
            
            res.json({ message: 'Transfer cancelled successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Cancel transfer error:', error);
        res.status(500).json({ error: 'Failed to cancel transfer' });
    }
});

// Retry failed transfer
router.post('/retry/:transferId', async (req, res) => {
    try {
        const { transferId } = req.params;
        
        const result = await fileTransferService.retryTransfer(transferId, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'transfer_retried', `Transfer ID: ${transferId}`, req);
            
            res.json({
                message: 'Transfer retry initiated successfully',
                newTransferId: result.newTransferId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Retry transfer error:', error);
        res.status(500).json({ error: 'Failed to retry transfer' });
    }
});

// Get file transfer limits
router.get('/limits', async (req, res) => {
    try {
        const limits = await fileTransferService.getTransferLimits();
        res.json({ limits });
    } catch (error) {
        console.error('Get transfer limits error:', error);
        res.status(500).json({ error: 'Failed to get transfer limits' });
    }
});

// Update file transfer limits
router.put('/limits', [
    body('maxFileSize').optional().isInt({ min: 1 }),
    body('maxFilesPerDay').optional().isInt({ min: 1 }),
    body('allowedFileTypes').optional().isArray(),
    body('blockedFileTypes').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = req.body;
        
        const result = await fileTransferService.updateTransferLimits(updates);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'transfer_limits_updated', 'File transfer limits updated', req);
            
            res.json({ message: 'Transfer limits updated successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Update transfer limits error:', error);
        res.status(500).json({ error: 'Failed to update transfer limits' });
    }
});

// Get active transfers
router.get('/active', async (req, res) => {
    try {
        const { userId } = req.query;
        const transfers = await fileTransferService.getActiveTransfers(userId ? parseInt(userId) : undefined);
        res.json({ transfers });
    } catch (error) {
        console.error('Get active transfers error:', error);
        res.status(500).json({ error: 'Failed to get active transfers' });
    }
});

// Clean up completed transfers
router.post('/cleanup', async (req, res) => {
    try {
        const { olderThanDays = 7 } = req.body;
        
        const cleanedCount = await fileTransferService.cleanupCompletedTransfers(olderThanDays);
        
        // Log activity
        await logActivity(req.user.id, 'transfers_cleaned', `Cleaned ${cleanedCount} transfers older than ${olderThanDays} days`, req);
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} completed transfers`,
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup transfers error:', error);
        res.status(500).json({ error: 'Failed to cleanup transfers' });
    }
});

// Get transfer analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        const analytics = await fileTransferService.getTransferAnalytics(period, groupBy);
        res.json({ analytics });
    } catch (error) {
        console.error('Get transfer analytics error:', error);
        res.status(500).json({ error: 'Failed to get transfer analytics' });
    }
});

// Export transfer logs
router.get('/export/logs', async (req, res) => {
    try {
        const { 
            format = 'csv',
            startDate,
            endDate,
            userId,
            adminId,
            status
        } = req.query;
        
        const filters = {
            startDate,
            endDate,
            userId: userId ? parseInt(userId) : undefined,
            adminId: adminId ? parseInt(adminId) : undefined,
            status
        };
        
        const result = await fileTransferService.exportTransferLogs(format, filters);
        
        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'transfer_logs_exported', `Format: ${format}`, req);
            
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export transfer logs error:', error);
        res.status(500).json({ error: 'Failed to export transfer logs' });
    }
});

module.exports = router;