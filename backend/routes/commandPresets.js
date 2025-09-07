const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const commandPresetsService = require('../services/commandPresetsService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Initialize default presets
router.post('/initialize-defaults', async (req, res) => {
    try {
        await commandPresetsService.initializeDefaultPresets();
        res.json({ message: 'Default command presets initialized successfully' });
    } catch (error) {
        console.error('Initialize default presets error:', error);
        res.status(500).json({ error: 'Failed to initialize default presets' });
    }
});

// Get all presets
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const presets = await commandPresetsService.getAllPresets(category);
        res.json({ presets });
    } catch (error) {
        console.error('Get all presets error:', error);
        res.status(500).json({ error: 'Failed to get presets' });
    }
});

// Get preset by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const preset = await commandPresetsService.getPresetById(parseInt(id));
        
        if (!preset) {
            return res.status(404).json({ error: 'Preset not found' });
        }
        
        res.json({ preset });
    } catch (error) {
        console.error('Get preset error:', error);
        res.status(500).json({ error: 'Failed to get preset' });
    }
});

// Create new preset
router.post('/', [
    body('name').isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('command').isLength({ min: 1 }),
    body('category').optional().isLength({ max: 50 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, command, category = 'general' } = req.body;
        
        // Validate command
        const validation = commandPresetsService.validateCommand(command);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.reason });
        }
        
        const result = await commandPresetsService.createPreset(name, description, command, category, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'command_preset_created', `Name: ${name}, Command: ${command}`, req);
            
            res.status(201).json({
                message: 'Command preset created successfully',
                presetId: result.presetId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Create preset error:', error);
        res.status(500).json({ error: 'Failed to create preset' });
    }
});

// Update preset
router.put('/:id', [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('command').optional().isLength({ min: 1 }),
    body('category').optional().isLength({ max: 50 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;
        
        // Validate command if provided
        if (updates.command) {
            const validation = commandPresetsService.validateCommand(updates.command);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.reason });
            }
        }
        
        const result = await commandPresetsService.updatePreset(parseInt(id), updates);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'command_preset_updated', `ID: ${id}`, req);
            
            res.json({ message: 'Command preset updated successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Update preset error:', error);
        res.status(500).json({ error: 'Failed to update preset' });
    }
});

// Delete preset
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await commandPresetsService.deletePreset(parseInt(id));

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'command_preset_deleted', `ID: ${id}`, req);
            
            res.json({ message: 'Command preset deleted successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Delete preset error:', error);
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

// Get presets by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const presets = await commandPresetsService.getPresetsByCategory(category);
        res.json({ presets });
    } catch (error) {
        console.error('Get presets by category error:', error);
        res.status(500).json({ error: 'Failed to get presets by category' });
    }
});

// Get all categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await commandPresetsService.getCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get categories with counts
router.get('/categories/with-counts', async (req, res) => {
    try {
        const categories = await commandPresetsService.getCategoriesWithCounts();
        res.json({ categories });
    } catch (error) {
        console.error('Get categories with counts error:', error);
        res.status(500).json({ error: 'Failed to get categories with counts' });
    }
});

// Search presets
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { category } = req.query;
        
        const presets = await commandPresetsService.searchPresets(query, category);
        res.json({ presets });
    } catch (error) {
        console.error('Search presets error:', error);
        res.status(500).json({ error: 'Failed to search presets' });
    }
});

// Get preset usage statistics
router.get('/statistics/usage', async (req, res) => {
    try {
        const stats = await commandPresetsService.getPresetUsageStats();
        res.json({ statistics: stats });
    } catch (error) {
        console.error('Get preset usage stats error:', error);
        res.status(500).json({ error: 'Failed to get preset usage statistics' });
    }
});

// Get popular presets
router.get('/statistics/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const presets = await commandPresetsService.getPopularPresets(parseInt(limit));
        res.json({ presets });
    } catch (error) {
        console.error('Get popular presets error:', error);
        res.status(500).json({ error: 'Failed to get popular presets' });
    }
});

// Duplicate preset
router.post('/:id/duplicate', [
    body('newName').isLength({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { newName } = req.body;
        
        const result = await commandPresetsService.duplicatePreset(parseInt(id), newName, req.user.id);

        if (result.success) {
            // Log activity
            await logActivity(req.user.id, 'command_preset_duplicated', `Original ID: ${id}, New ID: ${result.presetId}`, req);
            
            res.status(201).json({
                message: 'Command preset duplicated successfully',
                presetId: result.presetId
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Duplicate preset error:', error);
        res.status(500).json({ error: 'Failed to duplicate preset' });
    }
});

// Process command with variables
router.post('/process-command', [
    body('command').isLength({ min: 1 }),
    body('variables').isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { command, variables } = req.body;
        
        const processedCommand = commandPresetsService.processCommandWithVariables(command, variables);
        
        res.json({
            originalCommand: command,
            processedCommand,
            variables
        });
    } catch (error) {
        console.error('Process command error:', error);
        res.status(500).json({ error: 'Failed to process command' });
    }
});

// Extract variables from command
router.post('/extract-variables', [
    body('command').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { command } = req.body;
        
        const variables = commandPresetsService.extractVariables(command);
        
        res.json({
            command,
            variables
        });
    } catch (error) {
        console.error('Extract variables error:', error);
        res.status(500).json({ error: 'Failed to extract variables' });
    }
});

// Validate command
router.post('/validate-command', [
    body('command').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { command } = req.body;
        
        const validation = commandPresetsService.validateCommand(command);
        
        res.json(validation);
    } catch (error) {
        console.error('Validate command error:', error);
        res.status(500).json({ error: 'Failed to validate command' });
    }
});

// Get preset templates
router.get('/templates/list', async (req, res) => {
    try {
        const templates = commandPresetsService.getPresetTemplates();
        res.json({ templates });
    } catch (error) {
        console.error('Get preset templates error:', error);
        res.status(500).json({ error: 'Failed to get preset templates' });
    }
});

module.exports = router;