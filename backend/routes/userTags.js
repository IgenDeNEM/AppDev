const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const userTagsService = require('../services/userTagsService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Initialize default tags
router.post('/initialize-defaults', async (req, res) => {
    try {
        await userTagsService.initializeDefaultTags();
        res.json({ message: 'Default tags initialized successfully' });
    } catch (error) {
        console.error('Initialize default tags error:', error);
        res.status(500).json({ error: 'Failed to initialize default tags' });
    }
});

// Get all tags
router.get('/', async (req, res) => {
    try {
        const tags = await userTagsService.getAllTags();
        res.json({ tags });
    } catch (error) {
        console.error('Get all tags error:', error);
        res.status(500).json({ error: 'Failed to get tags' });
    }
});

// Get tag by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await userTagsService.getTagById(parseInt(id));
        
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        
        res.json({ tag });
    } catch (error) {
        console.error('Get tag error:', error);
        res.status(500).json({ error: 'Failed to get tag' });
    }
});

// Create new tag
router.post('/', [
    body('name').isLength({ min: 1, max: 50 }),
    body('color').matches(/^#[0-9A-Fa-f]{6}$/),
    body('description').optional().isLength({ max: 255 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, color, description } = req.body;
        
        const result = await userTagsService.createTag(name, color, description);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tag_created', `Name: ${name}, Color: ${color}`, req);
            
            res.status(201).json({
                message: 'Tag created successfully',
                tagId: result.tagId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Failed to create tag' });
    }
});

// Update tag
router.put('/:id', [
    body('name').optional().isLength({ min: 1, max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('description').optional().isLength({ max: 255 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;
        
        const result = await userTagsService.updateTag(parseInt(id), updates);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tag_updated', `ID: ${id}`, req);
            
            res.json({ message: 'Tag updated successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Update tag error:', error);
        res.status(500).json({ error: 'Failed to update tag' });
    }
});

// Delete tag
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await userTagsService.deleteTag(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tag_deleted', `ID: ${id}`, req);
            
            res.json({ message: 'Tag deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
});

// Search tags
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;
        
        const tags = await userTagsService.searchTags(query, parseInt(limit));
        res.json({ tags });
    } catch (error) {
        console.error('Search tags error:', error);
        res.status(500).json({ error: 'Failed to search tags' });
    }
});

// Get tag statistics
router.get('/statistics/overview', async (req, res) => {
    try {
        const stats = await userTagsService.getTagStatistics();
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get tag statistics error:', error);
        res.status(500).json({ error: 'Failed to get tag statistics' });
    }
});

// Get tag usage history
router.get('/:id/usage-history', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;
        
        const history = await userTagsService.getTagUsageHistory(parseInt(id), parseInt(limit));
        res.json({ history });
    } catch (error) {
        console.error('Get tag usage history error:', error);
        res.status(500).json({ error: 'Failed to get tag usage history' });
    }
});

// Get users by tag
router.get('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        const users = await userTagsService.getUsersByTag(parseInt(id), parseInt(limit), parseInt(offset));
        res.json({ users });
    } catch (error) {
        console.error('Get users by tag error:', error);
        res.status(500).json({ error: 'Failed to get users by tag' });
    }
});

// Assign tag to user
router.post('/:id/assign/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        const result = await userTagsService.assignTagToUser(parseInt(userId), parseInt(id), req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tag_assigned', `Tag ID: ${id}, User ID: ${userId}`, req);
            
            res.json({ message: 'Tag assigned successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Assign tag error:', error);
        res.status(500).json({ error: 'Failed to assign tag' });
    }
});

// Remove tag from user
router.delete('/:id/assign/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        const result = await userTagsService.removeTagFromUser(parseInt(userId), parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tag_removed', `Tag ID: ${id}, User ID: ${userId}`, req);
            
            res.json({ message: 'Tag removed successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Remove tag error:', error);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
});

// Bulk assign tags
router.post('/bulk-assign', [
    body('userIds').isArray().notEmpty(),
    body('tagIds').isArray().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, tagIds } = req.body;
        
        const result = await userTagsService.bulkAssignTags(userIds, tagIds, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tags_bulk_assigned', `Users: ${userIds.length}, Tags: ${tagIds.length}`, req);
            
            res.json({
                message: 'Tags assigned successfully',
                assignedCount: result.assignedCount
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk assign tags error:', error);
        res.status(500).json({ error: 'Failed to bulk assign tags' });
    }
});

// Bulk remove tags
router.post('/bulk-remove', [
    body('userIds').isArray().notEmpty(),
    body('tagIds').isArray().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userIds, tagIds } = req.body;
        
        const result = await userTagsService.bulkRemoveTags(userIds, tagIds);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'tags_bulk_removed', `Users: ${userIds.length}, Tags: ${tagIds.length}`, req);
            
            res.json({ message: 'Tags removed successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Bulk remove tags error:', error);
        res.status(500).json({ error: 'Failed to bulk remove tags' });
    }
});

// Get users with multiple tags
router.get('/users/multiple-tags', async (req, res) => {
    try {
        const { minTags = 2 } = req.query;
        
        const users = await userTagsService.getUsersWithMultipleTags(parseInt(minTags));
        res.json({ users });
    } catch (error) {
        console.error('Get users with multiple tags error:', error);
        res.status(500).json({ error: 'Failed to get users with multiple tags' });
    }
});

// Cleanup orphaned assignments
router.post('/cleanup/orphaned', async (req, res) => {
    try {
        const cleanedCount = await userTagsService.cleanupOrphanedAssignments();
        res.json({ message: `Cleaned up ${cleanedCount} orphaned tag assignments` });
    } catch (error) {
        console.error('Cleanup orphaned assignments error:', error);
        res.status(500).json({ error: 'Failed to cleanup orphaned assignments' });
    }
});

module.exports = router;