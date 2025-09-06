const express = require('express');
const router = express.Router();
const userPreferencesService = require('../services/userPreferencesService');
const auth = require('../middleware/auth');

// Get user preference
router.get('/:key', auth, async (req, res) => {
  try {
    const value = await userPreferencesService.getUserPreference(req.user.id, req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching user preference:', error);
    res.status(500).json({ error: 'Failed to fetch user preference' });
  }
});

// Set user preference
router.post('/:key', auth, async (req, res) => {
  try {
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await userPreferencesService.setUserPreference(req.user.id, req.params.key, value);
    res.json({ message: 'Preference set successfully' });
  } catch (error) {
    console.error('Error setting user preference:', error);
    res.status(500).json({ error: 'Failed to set user preference' });
  }
});

// Get all user preferences
router.get('/', auth, async (req, res) => {
  try {
    const preferences = await userPreferencesService.getAllUserPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// Delete user preference
router.delete('/:key', auth, async (req, res) => {
  try {
    await userPreferencesService.deleteUserPreference(req.user.id, req.params.key);
    res.json({ message: 'Preference deleted successfully' });
  } catch (error) {
    console.error('Error deleting user preference:', error);
    res.status(500).json({ error: 'Failed to delete user preference' });
  }
});

// Theme preferences
router.get('/theme/current', auth, async (req, res) => {
  try {
    const theme = await userPreferencesService.getTheme(req.user.id);
    res.json({ theme });
  } catch (error) {
    console.error('Error fetching theme preference:', error);
    res.status(500).json({ error: 'Failed to fetch theme preference' });
  }
});

router.post('/theme', auth, async (req, res) => {
  try {
    const { theme } = req.body;
    
    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    await userPreferencesService.setTheme(req.user.id, theme);
    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    console.error('Error setting theme preference:', error);
    res.status(500).json({ error: 'Failed to set theme preference' });
  }
});

// Always on top preference
router.get('/always-on-top/current', auth, async (req, res) => {
  try {
    const alwaysOnTop = await userPreferencesService.getAlwaysOnTop(req.user.id);
    res.json({ alwaysOnTop });
  } catch (error) {
    console.error('Error fetching always on top preference:', error);
    res.status(500).json({ error: 'Failed to fetch always on top preference' });
  }
});

router.post('/always-on-top', auth, async (req, res) => {
  try {
    const { alwaysOnTop } = req.body;
    
    if (typeof alwaysOnTop !== 'boolean') {
      return res.status(400).json({ error: 'Always on top must be a boolean value' });
    }

    await userPreferencesService.setAlwaysOnTop(req.user.id, alwaysOnTop);
    res.json({ message: 'Always on top preference updated successfully' });
  } catch (error) {
    console.error('Error setting always on top preference:', error);
    res.status(500).json({ error: 'Failed to set always on top preference' });
  }
});

// Safe mode preference
router.get('/safe-mode/current', auth, async (req, res) => {
  try {
    const safeMode = await userPreferencesService.getSafeMode(req.user.id);
    res.json({ safeMode });
  } catch (error) {
    console.error('Error fetching safe mode preference:', error);
    res.status(500).json({ error: 'Failed to fetch safe mode preference' });
  }
});

router.post('/safe-mode', auth, async (req, res) => {
  try {
    const { safeMode } = req.body;
    
    if (typeof safeMode !== 'boolean') {
      return res.status(400).json({ error: 'Safe mode must be a boolean value' });
    }

    await userPreferencesService.setSafeMode(req.user.id, safeMode);
    res.json({ message: 'Safe mode preference updated successfully' });
  } catch (error) {
    console.error('Error setting safe mode preference:', error);
    res.status(500).json({ error: 'Failed to set safe mode preference' });
  }
});

// Notification preferences
router.get('/notifications/current', auth, async (req, res) => {
  try {
    const preferences = await userPreferencesService.getNotificationPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.post('/notifications', auth, async (req, res) => {
  try {
    const { emailNotifications, desktopNotifications, soundNotifications, verificationRequired } = req.body;
    
    if (typeof emailNotifications !== 'boolean' || 
        typeof desktopNotifications !== 'boolean' || 
        typeof soundNotifications !== 'boolean' || 
        typeof verificationRequired !== 'boolean') {
      return res.status(400).json({ error: 'All notification preferences must be boolean values' });
    }

    await userPreferencesService.setNotificationPreferences(req.user.id, {
      emailNotifications,
      desktopNotifications,
      soundNotifications,
      verificationRequired
    });
    
    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error setting notification preferences:', error);
    res.status(500).json({ error: 'Failed to set notification preferences' });
  }
});

// UI preferences
router.get('/ui/current', auth, async (req, res) => {
  try {
    const preferences = await userPreferencesService.getUIPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching UI preferences:', error);
    res.status(500).json({ error: 'Failed to fetch UI preferences' });
  }
});

router.post('/ui', auth, async (req, res) => {
  try {
    const { theme, alwaysOnTop, compactMode, showAdvancedOptions, autoRefresh, refreshInterval } = req.body;
    
    if (!theme || typeof alwaysOnTop !== 'boolean' || 
        typeof compactMode !== 'boolean' || 
        typeof showAdvancedOptions !== 'boolean' || 
        typeof autoRefresh !== 'boolean' || 
        typeof refreshInterval !== 'number') {
      return res.status(400).json({ error: 'Invalid UI preferences format' });
    }

    await userPreferencesService.setUIPreferences(req.user.id, {
      theme,
      alwaysOnTop,
      compactMode,
      showAdvancedOptions,
      autoRefresh,
      refreshInterval
    });
    
    res.json({ message: 'UI preferences updated successfully' });
  } catch (error) {
    console.error('Error setting UI preferences:', error);
    res.status(500).json({ error: 'Failed to set UI preferences' });
  }
});

// Search preferences
router.get('/search/current', auth, async (req, res) => {
  try {
    const preferences = await userPreferencesService.getSearchPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching search preferences:', error);
    res.status(500).json({ error: 'Failed to fetch search preferences' });
  }
});

router.post('/search', auth, async (req, res) => {
  try {
    const { searchHistory, maxSearchHistory, autoComplete, caseSensitive } = req.body;
    
    if (typeof searchHistory !== 'boolean' || 
        typeof maxSearchHistory !== 'number' || 
        typeof autoComplete !== 'boolean' || 
        typeof caseSensitive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid search preferences format' });
    }

    await userPreferencesService.setSearchPreferences(req.user.id, {
      searchHistory,
      maxSearchHistory,
      autoComplete,
      caseSensitive
    });
    
    res.json({ message: 'Search preferences updated successfully' });
  } catch (error) {
    console.error('Error setting search preferences:', error);
    res.status(500).json({ error: 'Failed to set search preferences' });
  }
});

// Reset all preferences
router.delete('/', auth, async (req, res) => {
  try {
    await userPreferencesService.resetUserPreferences(req.user.id);
    res.json({ message: 'All preferences reset successfully' });
  } catch (error) {
    console.error('Error resetting user preferences:', error);
    res.status(500).json({ error: 'Failed to reset user preferences' });
  }
});

// Export preferences
router.get('/export', auth, async (req, res) => {
  try {
    const exportData = await userPreferencesService.exportUserPreferences(req.user.id);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting user preferences:', error);
    res.status(500).json({ error: 'Failed to export user preferences' });
  }
});

// Import preferences
router.post('/import', auth, async (req, res) => {
  try {
    const { preferencesData } = req.body;
    
    if (!preferencesData) {
      return res.status(400).json({ error: 'Preferences data is required' });
    }

    await userPreferencesService.importUserPreferences(req.user.id, preferencesData);
    res.json({ message: 'Preferences imported successfully' });
  } catch (error) {
    console.error('Error importing user preferences:', error);
    res.status(500).json({ error: 'Failed to import user preferences' });
  }
});

module.exports = router;