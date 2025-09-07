const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');
const rbacService = require('../services/rbacService');
const auth = require('../middleware/auth');

// Get package categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await packageService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching package categories:', error);
    res.status(500).json({ error: 'Failed to fetch package categories' });
  }
});

// Get packages with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { category_id, search, requires_verification } = req.query;
    const filters = {};

    if (category_id) filters.category_id = parseInt(category_id);
    if (search) filters.search = search;
    if (requires_verification !== undefined) {
      filters.requires_verification = requires_verification === 'true';
    }

    // Check if user has access to package categories
    const hasAccess = await rbacService.hasPermission(req.user.id, 'package_category');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to package store' });
    }

    const packages = await packageService.getAccessiblePackages(req.user.id, filters);
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get package by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const package = await packageService.getPackageById(req.params.id);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if user has access to this package's category
    const hasAccess = await rbacService.hasPermission(req.user.id, 'package_category', package.category_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this package' });
    }

    res.json(package);
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Install package
router.post('/:id/install', auth, async (req, res) => {
  try {
    const package = await packageService.getPackageById(req.params.id);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if user has access to this package's category
    const hasAccess = await rbacService.hasPermission(req.user.id, 'package_category', package.category_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to install this package' });
    }

    const result = await packageService.installPackage(req.params.id, req.user.id, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error installing package:', error);
    res.status(500).json({ error: 'Failed to install package' });
  }
});

// Verify and complete installation
router.post('/:id/verify-install', auth, async (req, res) => {
  try {
    const { verification_code } = req.body;
    
    if (!verification_code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await packageService.verifyAndInstall(req.params.id, req.user.id, verification_code);
    res.json(result);
  } catch (error) {
    console.error('Error verifying package installation:', error);
    res.status(500).json({ error: 'Failed to verify package installation' });
  }
});

// Uninstall package
router.post('/:id/uninstall', auth, async (req, res) => {
  try {
    const package = await packageService.getPackageById(req.params.id);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if user has access to this package's category
    const hasAccess = await rbacService.hasPermission(req.user.id, 'package_category', package.category_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to uninstall this package' });
    }

    const result = await packageService.uninstallPackage(req.params.id, req.user.id, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error uninstalling package:', error);
    res.status(500).json({ error: 'Failed to uninstall package' });
  }
});

// Get installed applications
router.get('/installed/list', auth, async (req, res) => {
  try {
    const applications = await packageService.getInstalledApplications(req.user.id);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching installed applications:', error);
    res.status(500).json({ error: 'Failed to fetch installed applications' });
  }
});

// Get system applications (for uninstall tab)
router.get('/system/list', auth, async (req, res) => {
  try {
    const applications = await packageService.getSystemApplications();
    res.json(applications);
  } catch (error) {
    console.error('Error fetching system applications:', error);
    res.status(500).json({ error: 'Failed to fetch system applications' });
  }
});

// Admin routes - Create package
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const packageId = await packageService.createPackage(req.body, req.user.id);
    res.status(201).json({ id: packageId, message: 'Package created successfully' });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// Admin routes - Update package
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await packageService.updatePackage(req.params.id, req.body);
    res.json({ message: 'Package updated successfully' });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Admin routes - Delete package
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await packageService.deletePackage(req.params.id);
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Admin routes - Get installation logs
router.get('/admin/logs', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { user_id, status, action, date_from, date_to, limit } = req.query;
    const filters = {};

    if (user_id) filters.user_id = parseInt(user_id);
    if (status) filters.status = status;
    if (action) filters.action = action;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (limit) filters.limit = parseInt(limit);

    const logs = await packageService.getInstallLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching installation logs:', error);
    res.status(500).json({ error: 'Failed to fetch installation logs' });
  }
});

module.exports = router;