const express = require('express');
const router = express.Router();
const rbacService = require('../services/rbacService');
const auth = require('../middleware/auth');

// Get all roles
router.get('/roles', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const roles = await rbacService.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role by ID
router.get('/roles/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const role = await rbacService.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create new role
router.post('/roles', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const roleId = await rbacService.createRole(req.body);
    res.status(201).json({ id: roleId, message: 'Role created successfully' });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
router.put('/roles/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await rbacService.updateRole(req.params.id, req.body);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/roles/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await rbacService.deleteRole(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Get user roles
router.get('/users/:userId/roles', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own roles
    if (!req.user.is_admin && req.params.userId != req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const roles = await rbacService.getUserRoles(req.params.userId);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Assign role to user
router.post('/users/:userId/roles/:roleId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await rbacService.assignRoleToUser(req.params.userId, req.params.roleId, req.user.id);
    res.json({ message: 'Role assigned successfully' });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: 'Failed to assign role to user' });
  }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await rbacService.removeRoleFromUser(req.params.userId, req.params.roleId);
    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: 'Failed to remove role from user' });
  }
});

// Get role permissions
router.get('/roles/:id/permissions', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const permissions = await rbacService.getRolePermissions(req.params.id);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Set role permissions
router.put('/roles/:id/permissions', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    await rbacService.setRolePermissions(req.params.id, permissions);
    res.json({ message: 'Role permissions updated successfully' });
  } catch (error) {
    console.error('Error setting role permissions:', error);
    res.status(500).json({ error: 'Failed to set role permissions' });
  }
});

// Check user permission
router.post('/check-permission', auth, async (req, res) => {
  try {
    const { permission_type, resource_id } = req.body;
    
    if (!permission_type) {
      return res.status(400).json({ error: 'Permission type is required' });
    }

    const hasPermission = await rbacService.hasPermission(req.user.id, permission_type, resource_id);
    res.json({ hasPermission });
  } catch (error) {
    console.error('Error checking user permission:', error);
    res.status(500).json({ error: 'Failed to check user permission' });
  }
});

// Get user permissions summary
router.get('/users/:userId/permissions', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own permissions
    if (!req.user.is_admin && req.params.userId != req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const permissions = await rbacService.getUserPermissionsSummary(req.params.userId);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// Get accessible tweaks for user
router.get('/users/:userId/accessible-tweaks', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own accessible tweaks
    if (!req.user.is_admin && req.params.userId != req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tweaks = await rbacService.getAccessibleTweaks(req.params.userId);
    res.json(tweaks);
  } catch (error) {
    console.error('Error fetching accessible tweaks:', error);
    res.status(500).json({ error: 'Failed to fetch accessible tweaks' });
  }
});

// Get accessible package categories for user
router.get('/users/:userId/accessible-categories', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own accessible categories
    if (!req.user.is_admin && req.params.userId != req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const categories = await rbacService.getAccessiblePackageCategories(req.params.userId);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching accessible categories:', error);
    res.status(500).json({ error: 'Failed to fetch accessible categories' });
  }
});

// Get accessible packages for user
router.get('/users/:userId/accessible-packages', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own accessible packages
    if (!req.user.is_admin && req.params.userId != req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { search } = req.query;
    const filters = {};
    if (search) filters.search = search;

    const packages = await rbacService.getAccessiblePackages(req.params.userId, filters);
    res.json(packages);
  } catch (error) {
    console.error('Error fetching accessible packages:', error);
    res.status(500).json({ error: 'Failed to fetch accessible packages' });
  }
});

// Initialize default permissions
router.post('/initialize-defaults', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await rbacService.initializeDefaultPermissions();
    res.json({ message: 'Default permissions initialized successfully' });
  } catch (error) {
    console.error('Error initializing default permissions:', error);
    res.status(500).json({ error: 'Failed to initialize default permissions' });
  }
});

module.exports = router;