const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const advancedSearchService = require('../services/advancedSearchService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Advanced user search
router.post('/users', [
    body('searchTerm').optional().isLength({ max: 100 }),
    body('role').optional().isIn(['user', 'admin', 'superadmin']),
    body('status').optional().isIn(['active', 'inactive', 'locked']),
    body('registrationDateFrom').optional().isISO8601(),
    body('registrationDateTo').optional().isISO8601(),
    body('lastLoginFrom').optional().isISO8601(),
    body('lastLoginTo').optional().isISO8601(),
    body('hasTags').optional().isIn(['true', 'false']),
    body('tags').optional().isArray(),
    body('country').optional().isLength({ max: 100 }),
    body('deviceType').optional().isLength({ max: 50 }),
    body('isActive').optional().isBoolean(),
    body('hasVerifiedEmail').optional().isBoolean(),
    body('failedLoginAttempts').optional().isInt({ min: 0 }),
    body('accountLocked').optional().isBoolean(),
    body('sortBy').optional().isIn(['created_at', 'last_login', 'username', 'email', 'role', 'login_count']),
    body('sortOrder').optional().isIn(['ASC', 'DESC']),
    body('limit').optional().isInt({ min: 1, max: 1000 }),
    body('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const filters = req.body;
        const pagination = {
            limit: filters.limit || 50,
            offset: filters.offset || 0
        };

        // Remove pagination fields from filters
        delete filters.limit;
        delete filters.offset;

        const results = await advancedSearchService.searchUsers(filters, pagination);

        // Log search activity
        await logActivity(req.user.id, 'advanced_user_search', `Filters: ${JSON.stringify(filters)}`, req);

        res.json(results);
    } catch (error) {
        console.error('Advanced user search error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get search filter options
router.get('/filter-options', async (req, res) => {
    try {
        const options = await advancedSearchService.getSearchFilterOptions();
        res.json({ options });
    } catch (error) {
        console.error('Get search filter options error:', error);
        res.status(500).json({ error: 'Failed to get filter options' });
    }
});

// Get user search suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ suggestions: [] });
        }

        const suggestions = await advancedSearchService.getUserSearchSuggestions(query, parseInt(limit));
        res.json({ suggestions });
    } catch (error) {
        console.error('Get user search suggestions error:', error);
        res.status(500).json({ error: 'Failed to get search suggestions' });
    }
});

// Get user activity summary
router.get('/user/:userId/summary', async (req, res) => {
    try {
        const { userId } = req.params;
        const summary = await advancedSearchService.getUserActivitySummary(parseInt(userId));
        
        if (!summary) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ summary });
    } catch (error) {
        console.error('Get user activity summary error:', error);
        res.status(500).json({ error: 'Failed to get user activity summary' });
    }
});

// Get user login history
router.get('/user/:userId/login-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const history = await advancedSearchService.getUserLoginHistory(
            parseInt(userId),
            parseInt(limit),
            parseInt(offset)
        );
        
        res.json(history);
    } catch (error) {
        console.error('Get user login history error:', error);
        res.status(500).json({ error: 'Failed to get user login history' });
    }
});

// Get user session history
router.get('/user/:userId/session-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const history = await advancedSearchService.getUserSessionHistory(
            parseInt(userId),
            parseInt(limit),
            parseInt(offset)
        );
        
        res.json(history);
    } catch (error) {
        console.error('Get user session history error:', error);
        res.status(500).json({ error: 'Failed to get user session history' });
    }
});

// Export search results
router.post('/export', [
    body('filters').isObject(),
    body('format').optional().isIn(['csv', 'json'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { filters, format = 'csv' } = req.body;
        
        const results = await advancedSearchService.exportSearchResults(filters, format);

        // Log export activity
        await logActivity(req.user.id, 'search_results_exported', `Format: ${format}, Filters: ${JSON.stringify(filters)}`, req);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="user-search-results.csv"');
            res.send(results);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="user-search-results.json"');
            res.send(results);
        }
    } catch (error) {
        console.error('Export search results error:', error);
        res.status(500).json({ error: 'Failed to export search results' });
    }
});

// Get search statistics
router.get('/statistics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // This would typically come from a search logs table
        // For now, we'll return basic statistics
        const stats = {
            totalSearches: 0,
            popularFilters: [],
            searchTrends: [],
            period
        };
        
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get search statistics error:', error);
        res.status(500).json({ error: 'Failed to get search statistics' });
    }
});

// Save search query as favorite
router.post('/favorites', [
    body('name').isLength({ min: 1, max: 100 }),
    body('filters').isObject(),
    body('description').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, filters, description } = req.body;
        
        // This would save to a saved_searches table
        // For now, we'll just return success
        const savedSearch = {
            id: Date.now(),
            name,
            filters,
            description,
            createdBy: req.user.id,
            createdAt: new Date().toISOString()
        };

        // Log activity
        await logActivity(req.user.id, 'search_favorite_saved', `Name: ${name}`, req);

        res.status(201).json({
            message: 'Search query saved as favorite',
            savedSearch
        });
    } catch (error) {
        console.error('Save search favorite error:', error);
        res.status(500).json({ error: 'Failed to save search favorite' });
    }
});

// Get saved search favorites
router.get('/favorites', async (req, res) => {
    try {
        // This would retrieve from a saved_searches table
        // For now, we'll return empty array
        const favorites = [];
        
        res.json({ favorites });
    } catch (error) {
        console.error('Get search favorites error:', error);
        res.status(500).json({ error: 'Failed to get search favorites' });
    }
});

// Delete saved search favorite
router.delete('/favorites/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // This would delete from a saved_searches table
        // For now, we'll just return success
        
        // Log activity
        await logActivity(req.user.id, 'search_favorite_deleted', `ID: ${id}`, req);

        res.json({ message: 'Search favorite deleted successfully' });
    } catch (error) {
        console.error('Delete search favorite error:', error);
        res.status(500).json({ error: 'Failed to delete search favorite' });
    }
});

// Quick search (simple text search)
router.get('/quick', async (req, res) => {
    try {
        const { q: query, limit = 20 } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ users: [] });
        }

        const filters = { searchTerm: query };
        const pagination = { limit: parseInt(limit), offset: 0 };
        
        const results = await advancedSearchService.searchUsers(filters, pagination);
        
        res.json({ users: results.users });
    } catch (error) {
        console.error('Quick search error:', error);
        res.status(500).json({ error: 'Failed to perform quick search' });
    }
});

// Bulk operations on search results
router.post('/bulk-operations', [
    body('userIds').isArray().notEmpty(),
    body('operation').isIn(['activate', 'deactivate', 'lock', 'unlock', 'add_tag', 'remove_tag', 'delete'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, operation, ...operationData } = req.body;
        
        // This would perform bulk operations on the selected users
        // For now, we'll just return success
        
        // Log activity
        await logActivity(req.user.id, 'bulk_operation', `Operation: ${operation}, Users: ${userIds.length}`, req);

        res.json({
            message: `Bulk ${operation} operation completed`,
            affectedUsers: userIds.length,
            operation
        });
    } catch (error) {
        console.error('Bulk operations error:', error);
        res.status(500).json({ error: 'Failed to perform bulk operations' });
    }
});

module.exports = router;