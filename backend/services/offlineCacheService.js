const { pool } = require('../config/database');

class OfflineCacheService {
    constructor() {
        this.defaultExpiryHours = 24; // 24 hours default expiry
        this.maxCacheSize = 1024 * 1024; // 1MB max cache size per entry
    }

    // Store data in offline cache
    async storeCacheData(userId, cacheKey, cacheData, cacheType = 'general', expiryHours = null) {
        try {
            // Validate cache data size
            const dataString = JSON.stringify(cacheData);
            if (dataString.length > this.maxCacheSize) {
                return { success: false, error: 'Cache data too large' };
            }

            const expiry = expiryHours || this.defaultExpiryHours;
            const expiresAt = new Date(Date.now() + expiry * 60 * 60 * 1000);

            // Insert or update cache entry
            await pool.execute(
                `INSERT INTO offline_cache (user_id, cache_key, cache_data, cache_type, expires_at) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 cache_data = VALUES(cache_data), 
                 cache_type = VALUES(cache_type), 
                 expires_at = VALUES(expires_at),
                 updated_at = NOW()`,
                [userId, cacheKey, dataString, cacheType, expiresAt]
            );

            return { success: true, message: 'Cache data stored successfully' };
        } catch (error) {
            console.error('Error storing cache data:', error);
            return { success: false, error: error.message };
        }
    }

    // Retrieve data from offline cache
    async getCacheData(userId, cacheKey) {
        try {
            const [cache] = await pool.execute(
                'SELECT * FROM offline_cache WHERE user_id = ? AND cache_key = ? AND (expires_at IS NULL OR expires_at > NOW())',
                [userId, cacheKey]
            );

            if (cache.length === 0) {
                return { success: false, error: 'Cache data not found or expired' };
            }

            const cacheEntry = cache[0];
            const cacheData = JSON.parse(cacheEntry.cache_data);

            return {
                success: true,
                data: cacheData,
                cacheType: cacheEntry.cache_type,
                createdAt: cacheEntry.created_at,
                updatedAt: cacheEntry.updated_at,
                expiresAt: cacheEntry.expires_at
            };
        } catch (error) {
            console.error('Error retrieving cache data:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all cache entries for a user
    async getUserCacheEntries(userId, cacheType = null) {
        try {
            let query = 'SELECT * FROM offline_cache WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())';
            const params = [userId];

            if (cacheType) {
                query += ' AND cache_type = ?';
                params.push(cacheType);
            }

            query += ' ORDER BY updated_at DESC';

            const [cache] = await pool.execute(query, params);
            return cache;
        } catch (error) {
            console.error('Error getting user cache entries:', error);
            return [];
        }
    }

    // Delete cache entry
    async deleteCacheEntry(userId, cacheKey) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM offline_cache WHERE user_id = ? AND cache_key = ?',
                [userId, cacheKey]
            );

            return { success: result.affectedRows > 0, message: 'Cache entry deleted' };
        } catch (error) {
            console.error('Error deleting cache entry:', error);
            return { success: false, error: error.message };
        }
    }

    // Clear all cache for a user
    async clearUserCache(userId, cacheType = null) {
        try {
            let query = 'DELETE FROM offline_cache WHERE user_id = ?';
            const params = [userId];

            if (cacheType) {
                query += ' AND cache_type = ?';
                params.push(cacheType);
            }

            const [result] = await pool.execute(query, params);

            return { success: true, deletedCount: result.affectedRows };
        } catch (error) {
            console.error('Error clearing user cache:', error);
            return { success: false, error: error.message };
        }
    }

    // Clean up expired cache entries
    async cleanupExpiredCache() {
        try {
            const [result] = await pool.execute(
                'DELETE FROM offline_cache WHERE expires_at IS NOT NULL AND expires_at < NOW()'
            );

            console.log(`Cleaned up ${result.affectedRows} expired cache entries`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired cache:', error);
            return 0;
        }
    }

    // Get cache statistics
    async getCacheStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_entries,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 END) as active_entries,
                    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired_entries,
                    cache_type,
                    COUNT(*) as type_count
                FROM offline_cache
                GROUP BY cache_type
                ORDER BY type_count DESC
            `);

            const [recentActivity] = await pool.execute(`
                SELECT 
                    oc.cache_key,
                    oc.cache_type,
                    oc.updated_at,
                    u.username
                FROM offline_cache oc
                JOIN users u ON oc.user_id = u.id
                WHERE oc.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY oc.updated_at DESC
                LIMIT 20
            `);

            return {
                statistics: stats,
                recentActivity
            };
        } catch (error) {
            console.error('Error getting cache statistics:', error);
            return { statistics: [], recentActivity: [] };
        }
    }

    // Get cache usage by user
    async getCacheUsageByUser(limit = 20) {
        try {
            const [usage] = await pool.execute(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(oc.id) as cache_entries,
                    COUNT(DISTINCT oc.cache_type) as cache_types,
                    MAX(oc.updated_at) as last_activity,
                    SUM(LENGTH(oc.cache_data)) as total_size
                FROM users u
                LEFT JOIN offline_cache oc ON u.id = oc.user_id
                WHERE oc.expires_at IS NULL OR oc.expires_at > NOW()
                GROUP BY u.id, u.username, u.email
                ORDER BY cache_entries DESC
                LIMIT ?`,
                [limit]
            );

            return usage;
        } catch (error) {
            console.error('Error getting cache usage by user:', error);
            return [];
        }
    }

    // Store system optimization data
    async storeOptimizationData(userId, optimizationData) {
        return await this.storeCacheData(
            userId,
            'system_optimization',
            optimizationData,
            'optimization',
            48 // 48 hours expiry
        );
    }

    // Get system optimization data
    async getOptimizationData(userId) {
        return await this.getCacheData(userId, 'system_optimization');
    }

    // Store monitoring data
    async storeMonitoringData(userId, monitoringData) {
        return await this.storeCacheData(
            userId,
            'system_monitoring',
            monitoringData,
            'monitoring',
            2 // 2 hours expiry
        );
    }

    // Get monitoring data
    async getMonitoringData(userId) {
        return await this.getCacheData(userId, 'system_monitoring');
    }

    // Store user preferences
    async storeUserPreferences(userId, preferences) {
        return await this.storeCacheData(
            userId,
            'user_preferences',
            preferences,
            'preferences',
            24 * 7 // 7 days expiry
        );
    }

    // Get user preferences
    async getUserPreferences(userId) {
        return await this.getCacheData(userId, 'user_preferences');
    }

    // Store command history
    async storeCommandHistory(userId, commandHistory) {
        return await this.storeCacheData(
            userId,
            'command_history',
            commandHistory,
            'history',
            24 * 30 // 30 days expiry
        );
    }

    // Get command history
    async getCommandHistory(userId) {
        return await this.getCacheData(userId, 'command_history');
    }

    // Store file transfer data
    async storeFileTransferData(userId, transferData) {
        return await this.storeCacheData(
            userId,
            'file_transfer',
            transferData,
            'transfer',
            24 // 24 hours expiry
        );
    }

    // Get file transfer data
    async getFileTransferData(userId) {
        return await this.getCacheData(userId, 'file_transfer');
    }

    // Store UI state
    async storeUIState(userId, uiState) {
        return await this.storeCacheData(
            userId,
            'ui_state',
            uiState,
            'ui',
            24 * 7 // 7 days expiry
        );
    }

    // Get UI state
    async getUIState(userId) {
        return await this.getCacheData(userId, 'ui_state');
    }

    // Sync cache data (for when user comes back online)
    async syncCacheData(userId, syncData) {
        try {
            const results = [];

            for (const [cacheKey, cacheData] of Object.entries(syncData)) {
                const result = await this.storeCacheData(
                    userId,
                    cacheKey,
                    cacheData.data,
                    cacheData.type,
                    cacheData.expiryHours
                );
                results.push({ cacheKey, ...result });
            }

            return { success: true, results };
        } catch (error) {
            console.error('Error syncing cache data:', error);
            return { success: false, error: error.message };
        }
    }

    // Get cache summary for user
    async getUserCacheSummary(userId) {
        try {
            const [summary] = await pool.execute(
                `SELECT 
                    cache_type,
                    COUNT(*) as entry_count,
                    SUM(LENGTH(cache_data)) as total_size,
                    MAX(updated_at) as last_updated
                FROM offline_cache
                WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
                GROUP BY cache_type
                ORDER BY last_updated DESC`,
                [userId]
            );

            return summary;
        } catch (error) {
            console.error('Error getting user cache summary:', error);
            return [];
        }
    }

    // Set default expiry hours
    setDefaultExpiryHours(hours) {
        this.defaultExpiryHours = hours;
    }

    // Get default expiry hours
    getDefaultExpiryHours() {
        return this.defaultExpiryHours;
    }

    // Set max cache size
    setMaxCacheSize(size) {
        this.maxCacheSize = size;
    }

    // Get max cache size
    getMaxCacheSize() {
        return this.maxCacheSize;
    }

    // Get cache types
    getCacheTypes() {
        return [
            'general',
            'optimization',
            'monitoring',
            'preferences',
            'history',
            'transfer',
            'ui',
            'temporary'
        ];
    }

    // Validate cache key
    validateCacheKey(cacheKey) {
        if (!cacheKey || typeof cacheKey !== 'string') {
            return { valid: false, error: 'Cache key must be a non-empty string' };
        }

        if (cacheKey.length > 255) {
            return { valid: false, error: 'Cache key too long (maximum 255 characters)' };
        }

        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(cacheKey)) {
            return { valid: false, error: 'Cache key contains invalid characters' };
        }

        return { valid: true };
    }
}

module.exports = new OfflineCacheService();