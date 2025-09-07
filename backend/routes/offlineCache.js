const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const offlineCacheService = require('../services/offlineCacheService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's cache data
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { cacheType } = req.query;
        
        // Users can only access their own cache, admins can access any
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const cacheData = await offlineCacheService.getUserCache(parseInt(userId), cacheType);
        res.json({ cacheData });
    } catch (error) {
        console.error('Get user cache error:', error);
        res.status(500).json({ error: 'Failed to get user cache' });
    }
});

// Set cache data
router.post('/set', [
    body('cacheKey').isLength({ min: 1, max: 100 }),
    body('cacheData').isObject(),
    body('cacheType').optional().isLength({ max: 50 }),
    body('expiresInMinutes').optional().isInt({ min: 1, max: 10080 }) // Max 1 week
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { cacheKey, cacheData, cacheType = 'general', expiresInMinutes = 60 } = req.body;
        
        const result = await offlineCacheService.setCacheData(
            req.user.id,
            cacheKey,
            cacheData,
            cacheType,
            expiresInMinutes
        );

        if (result.success) {
            res.json({
                message: 'Cache data set successfully',
                expiresAt: result.expiresAt
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Set cache data error:', error);
        res.status(500).json({ error: 'Failed to set cache data' });
    }
});

// Get specific cache entry
router.get('/get/:cacheKey', async (req, res) => {
    try {
        const { cacheKey } = req.params;
        const { cacheType } = req.query;
        
        const cacheEntry = await offlineCacheService.getCacheEntry(
            req.user.id,
            cacheKey,
            cacheType
        );

        if (cacheEntry) {
            res.json({ cacheEntry });
        } else {
            res.status(404).json({ error: 'Cache entry not found or expired' });
        }
    } catch (error) {
        console.error('Get cache entry error:', error);
        res.status(500).json({ error: 'Failed to get cache entry' });
    }
});

// Delete cache entry
router.delete('/delete/:cacheKey', async (req, res) => {
    try {
        const { cacheKey } = req.params;
        const { cacheType } = req.query;
        
        const result = await offlineCacheService.deleteCacheEntry(
            req.user.id,
            cacheKey,
            cacheType
        );

        if (result.success) {
            res.json({ message: 'Cache entry deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete cache entry error:', error);
        res.status(500).json({ error: 'Failed to delete cache entry' });
    }
});

// Clear all user cache
router.delete('/clear', async (req, res) => {
    try {
        const { cacheType } = req.query;
        
        const result = await offlineCacheService.clearUserCache(req.user.id, cacheType);

        if (result.success) {
            res.json({ 
                message: 'User cache cleared successfully',
                clearedCount: result.clearedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Clear user cache error:', error);
        res.status(500).json({ error: 'Failed to clear user cache' });
    }
});

// Sync cache data (for when user comes back online)
router.post('/sync', [
    body('cacheUpdates').isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { cacheUpdates } = req.body;
        
        const result = await offlineCacheService.syncCacheData(req.user.id, cacheUpdates);

        if (result.success) {
            res.json({
                message: 'Cache data synced successfully',
                syncedCount: result.syncedCount,
                conflicts: result.conflicts
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Sync cache data error:', error);
        res.status(500).json({ error: 'Failed to sync cache data' });
    }
});

// Get cache statistics (admin only)
router.get('/statistics', requireAdmin, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const stats = await offlineCacheService.getCacheStatistics(period);
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get cache statistics error:', error);
        res.status(500).json({ error: 'Failed to get cache statistics' });
    }
});

// Get all cache entries (admin only)
router.get('/admin/all', requireAdmin, async (req, res) => {
    try {
        const { 
            userId, 
            cacheType, 
            limit = 100, 
            offset = 0,
            startDate,
            endDate
        } = req.query;
        
        const filters = {
            userId: userId ? parseInt(userId) : undefined,
            cacheType,
            startDate,
            endDate
        };
        
        const cacheEntries = await offlineCacheService.getAllCacheEntries(filters, parseInt(limit), parseInt(offset));
        res.json({ cacheEntries });
    } catch (error) {
        console.error('Get all cache entries error:', error);
        res.status(500).json({ error: 'Failed to get all cache entries' });
    }
});

// Get cache entry by ID (admin only)
router.get('/admin/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const cacheEntry = await offlineCacheService.getCacheEntryById(parseInt(id));
        
        if (!cacheEntry) {
            return res.status(404).json({ error: 'Cache entry not found' });
        }
        
        res.json({ cacheEntry });
    } catch (error) {
        console.error('Get cache entry by ID error:', error);
        res.status(500).json({ error: 'Failed to get cache entry' });
    }
});

// Delete cache entry by ID (admin only)
router.delete('/admin/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await offlineCacheService.deleteCacheEntryById(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'cache_entry_deleted', `Entry ID: ${id}`, req);
            
            res.json({ message: 'Cache entry deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete cache entry by ID error:', error);
        res.status(500).json({ error: 'Failed to delete cache entry' });
    }
});

// Clear user cache (admin only)
router.delete('/admin/user/:userId/clear', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cacheType } = req.query;
        
        const result = await offlineCacheService.clearUserCache(parseInt(userId), cacheType);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'user_cache_cleared', `User ID: ${userId}`, req);
            
            res.json({ 
                message: 'User cache cleared successfully',
                clearedCount: result.clearedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Clear user cache (admin) error:', error);
        res.status(500).json({ error: 'Failed to clear user cache' });
    }
});

// Bulk clear cache (admin only)
router.post('/admin/bulk-clear', requireAdmin, [
    body('userIds').optional().isArray(),
    body('cacheTypes').optional().isArray(),
    body('olderThanDays').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, cacheTypes, olderThanDays } = req.body;
        
        const result = await offlineCacheService.bulkClearCache(userIds, cacheTypes, olderThanDays);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'cache_bulk_cleared', `Cleared ${result.clearedCount} entries`, req);
            
            res.json({
                message: 'Cache cleared successfully',
                clearedCount: result.clearedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk clear cache error:', error);
        res.status(500).json({ error: 'Failed to bulk clear cache' });
    }
});

// Get cache analytics (admin only)
router.get('/admin/analytics', requireAdmin, async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        const analytics = await offlineCacheService.getCacheAnalytics(period, groupBy);
        res.json({ analytics });
    } catch (error) {
        console.error('Get cache analytics error:', error);
        res.status(500).json({ error: 'Failed to get cache analytics' });
    }
});

// Clean up expired cache entries (admin only)
router.post('/admin/cleanup', requireAdmin, async (req, res) => {
    try {
        const { olderThanDays = 7 } = req.body;
        
        const cleanedCount = await offlineCacheService.cleanupExpiredCache(olderThanDays);
        
        // Log activity
        await logActivity(req.user.id, 'cache_cleanup', `Cleaned ${cleanedCount} expired entries`, req);
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} expired cache entries`,
            cleanedCount
        });
    } catch (error) {
        console.error('Cleanup expired cache error:', error);
        res.status(500).json({ error: 'Failed to cleanup expired cache' });
    }
});

// Export cache data (admin only)
router.get('/admin/export', requireAdmin, async (req, res) => {
    try {
        const { 
            format = 'csv',
            startDate,
            endDate,
            userId,
            cacheType
        } = req.query;
        
        const filters = {
            startDate,
            endDate,
            userId: userId ? parseInt(userId) : undefined,
            cacheType
        };
        
        const result = await offlineCacheService.exportCacheData(format, filters);
        
        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'cache_data_exported', `Format: ${format}`, req);
            
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Export cache data error:', error);
        res.status(500).json({ error: 'Failed to export cache data' });
    }
});

// Get cache health status (admin only)
router.get('/admin/health', requireAdmin, async (req, res) => {
    try {
        const health = await offlineCacheService.getCacheHealth();
        res.json({ health });
    } catch (error) {
        console.error('Get cache health error:', error);
        res.status(500).json({ error: 'Failed to get cache health' });
    }
});

module.exports = router;