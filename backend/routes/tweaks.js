const express = require('express');
const router = express.Router();
const tweakService = require('../services/tweakService');
const rbacService = require('../services/rbacService');
const auth = require('../middleware/auth');

// Get tweak categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await tweakService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching tweak categories:', error);
    res.status(500).json({ error: 'Failed to fetch tweak categories' });
  }
});

// Get tweaks with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { category_id, search, is_dangerous, requires_verification } = req.query;
    const filters = {};

    if (category_id) filters.category_id = parseInt(category_id);
    if (search) filters.search = search;
    if (is_dangerous !== undefined) filters.is_dangerous = is_dangerous === 'true';
    if (requires_verification !== undefined) {
      filters.requires_verification = requires_verification === 'true';
    }

    // Check if user has access to tweaks
    const hasAccess = await rbacService.hasPermission(req.user.id, 'tweak');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to tweaks' });
    }

    const tweaks = await rbacService.getAccessibleTweaks(req.user.id);
    
    // Apply additional filtering
    let filteredTweaks = tweaks;
    if (filters.category_id) {
      filteredTweaks = filteredTweaks.filter(t => t.category_id === filters.category_id);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTweaks = filteredTweaks.filter(t => 
        t.name.toLowerCase().includes(searchLower) || 
        t.description.toLowerCase().includes(searchLower)
      );
    }
    if (filters.is_dangerous !== undefined) {
      filteredTweaks = filteredTweaks.filter(t => t.is_dangerous === filters.is_dangerous);
    }
    if (filters.requires_verification !== undefined) {
      filteredTweaks = filteredTweaks.filter(t => t.requires_verification === filters.requires_verification);
    }

    res.json(filteredTweaks);
  } catch (error) {
    console.error('Error fetching tweaks:', error);
    res.status(500).json({ error: 'Failed to fetch tweaks' });
  }
});

// Get tweak by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const tweak = await tweakService.getTweakById(req.params.id);
    if (!tweak) {
      return res.status(404).json({ error: 'Tweak not found' });
    }

    // Check if user has access to this tweak
    const hasAccess = await rbacService.hasPermission(req.user.id, 'tweak', req.params.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this tweak' });
    }

    res.json(tweak);
  } catch (error) {
    console.error('Error fetching tweak:', error);
    res.status(500).json({ error: 'Failed to fetch tweak' });
  }
});

// Execute tweak
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const tweak = await tweakService.getTweakById(req.params.id);
    if (!tweak) {
      return res.status(404).json({ error: 'Tweak not found' });
    }

    // Check if user has access to this tweak
    const hasAccess = await rbacService.hasPermission(req.user.id, 'tweak', req.params.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to execute this tweak' });
    }

    const result = await tweakService.executeTweak(req.params.id, req.user.id, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error executing tweak:', error);
    res.status(500).json({ error: 'Failed to execute tweak' });
  }
});

// Verify and execute tweak
router.post('/:id/verify-execute', auth, async (req, res) => {
  try {
    const { verification_code } = req.body;
    
    if (!verification_code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await tweakService.verifyAndExecute(req.params.id, req.user.id, verification_code);
    res.json(result);
  } catch (error) {
    console.error('Error verifying tweak execution:', error);
    res.status(500).json({ error: 'Failed to verify tweak execution' });
  }
});

// Get clipboard history
router.get('/clipboard/history', auth, async (req, res) => {
  try {
    const history = await tweakService.getClipboardHistory(req.user.id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching clipboard history:', error);
    res.status(500).json({ error: 'Failed to fetch clipboard history' });
  }
});

// Execute system cleanup
router.post('/system/cleanup', auth, async (req, res) => {
  try {
    // Check if user has permission for system actions
    const hasAccess = await rbacService.canPerformSystemAction(req.user.id, 'system_cleanup');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to system cleanup' });
    }

    const result = await tweakService.executeSystemCleanup(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error executing system cleanup:', error);
    res.status(500).json({ error: 'Failed to execute system cleanup' });
  }
});

// Get Windows services
router.get('/services/list', auth, async (req, res) => {
  try {
    // Check if user has permission for system actions
    const hasAccess = await rbacService.canPerformSystemAction(req.user.id, 'services_management');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to services management' });
    }

    const services = await tweakService.getWindowsServices();
    res.json(services);
  } catch (error) {
    console.error('Error fetching Windows services:', error);
    res.status(500).json({ error: 'Failed to fetch Windows services' });
  }
});

// Toggle Windows service
router.post('/services/:name/toggle', auth, async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!['start', 'stop', 'enable', 'disable'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be start, stop, enable, or disable' });
    }

    // Check if user has permission for system actions
    const hasAccess = await rbacService.canPerformSystemAction(req.user.id, 'services_management');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to services management' });
    }

    const result = await tweakService.toggleWindowsService(req.params.name, action);
    res.json(result);
  } catch (error) {
    console.error('Error toggling Windows service:', error);
    res.status(500).json({ error: 'Failed to toggle Windows service' });
  }
});

// Get execution logs
router.get('/logs/execution', auth, async (req, res) => {
  try {
    const { status, date_from, date_to, limit } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (limit) filters.limit = parseInt(limit);

    // If not admin, only show user's own logs
    if (!req.user.is_admin) {
      filters.user_id = req.user.id;
    }

    const logs = await tweakService.getExecutionLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

// Admin routes - Create tweak
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tweakId = await tweakService.createTweak(req.body, req.user.id);
    res.status(201).json({ id: tweakId, message: 'Tweak created successfully' });
  } catch (error) {
    console.error('Error creating tweak:', error);
    res.status(500).json({ error: 'Failed to create tweak' });
  }
});

// Admin routes - Update tweak
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await tweakService.updateTweak(req.params.id, req.body);
    res.json({ message: 'Tweak updated successfully' });
  } catch (error) {
    console.error('Error updating tweak:', error);
    res.status(500).json({ error: 'Failed to update tweak' });
  }
});

// Admin routes - Delete tweak
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await tweakService.deleteTweak(req.params.id);
    res.json({ message: 'Tweak deleted successfully' });
  } catch (error) {
    console.error('Error deleting tweak:', error);
    res.status(500).json({ error: 'Failed to delete tweak' });
  }
});

module.exports = router;