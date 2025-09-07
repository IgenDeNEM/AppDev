const db = require('../config/database');

class UserPreferencesService {
  // Get user preference
  async getUserPreference(userId, preferenceKey) {
    try {
      const [preferences] = await db.execute(
        'SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, preferenceKey]
      );
      
      return preferences.length > 0 ? preferences[0].preference_value : null;
    } catch (error) {
      console.error('Error fetching user preference:', error);
      throw error;
    }
  }

  // Set user preference
  async setUserPreference(userId, preferenceKey, preferenceValue) {
    try {
      await db.execute(
        `INSERT INTO user_preferences (user_id, preference_key, preference_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value), updated_at = CURRENT_TIMESTAMP`,
        [userId, preferenceKey, preferenceValue]
      );

      return true;
    } catch (error) {
      console.error('Error setting user preference:', error);
      throw error;
    }
  }

  // Get all user preferences
  async getAllUserPreferences(userId) {
    try {
      const [preferences] = await db.execute(
        'SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      const preferencesObj = {};
      preferences.forEach(pref => {
        preferencesObj[pref.preference_key] = pref.preference_value;
      });

      return preferencesObj;
    } catch (error) {
      console.error('Error fetching all user preferences:', error);
      throw error;
    }
  }

  // Delete user preference
  async deleteUserPreference(userId, preferenceKey) {
    try {
      await db.execute(
        'DELETE FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, preferenceKey]
      );

      return true;
    } catch (error) {
      console.error('Error deleting user preference:', error);
      throw error;
    }
  }

  // Get theme preference
  async getTheme(userId) {
    try {
      const theme = await this.getUserPreference(userId, 'theme');
      return theme || 'light'; // Default to light theme
    } catch (error) {
      console.error('Error fetching theme preference:', error);
      throw error;
    }
  }

  // Set theme preference
  async setTheme(userId, theme) {
    try {
      if (!['light', 'dark', 'system'].includes(theme)) {
        throw new Error('Invalid theme value');
      }

      await this.setUserPreference(userId, 'theme', theme);
      return true;
    } catch (error) {
      console.error('Error setting theme preference:', error);
      throw error;
    }
  }

  // Get always on top preference
  async getAlwaysOnTop(userId) {
    try {
      const alwaysOnTop = await this.getUserPreference(userId, 'always_on_top');
      return alwaysOnTop === 'true';
    } catch (error) {
      console.error('Error fetching always on top preference:', error);
      throw error;
    }
  }

  // Set always on top preference
  async setAlwaysOnTop(userId, alwaysOnTop) {
    try {
      await this.setUserPreference(userId, 'always_on_top', alwaysOnTop.toString());
      return true;
    } catch (error) {
      console.error('Error setting always on top preference:', error);
      throw error;
    }
  }

  // Get safe mode preference
  async getSafeMode(userId) {
    try {
      const safeMode = await this.getUserPreference(userId, 'safe_mode');
      return safeMode === 'true';
    } catch (error) {
      console.error('Error fetching safe mode preference:', error);
      throw error;
    }
  }

  // Set safe mode preference
  async setSafeMode(userId, safeMode) {
    try {
      await this.setUserPreference(userId, 'safe_mode', safeMode.toString());
      return true;
    } catch (error) {
      console.error('Error setting safe mode preference:', error);
      throw error;
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId) {
    try {
      const preferences = await this.getAllUserPreferences(userId);
      
      return {
        emailNotifications: preferences.email_notifications === 'true',
        desktopNotifications: preferences.desktop_notifications === 'true',
        soundNotifications: preferences.sound_notifications === 'true',
        verificationRequired: preferences.verification_required === 'true'
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  // Set notification preferences
  async setNotificationPreferences(userId, preferences) {
    try {
      const {
        emailNotifications,
        desktopNotifications,
        soundNotifications,
        verificationRequired
      } = preferences;

      await Promise.all([
        this.setUserPreference(userId, 'email_notifications', emailNotifications.toString()),
        this.setUserPreference(userId, 'desktop_notifications', desktopNotifications.toString()),
        this.setUserPreference(userId, 'sound_notifications', soundNotifications.toString()),
        this.setUserPreference(userId, 'verification_required', verificationRequired.toString())
      ]);

      return true;
    } catch (error) {
      console.error('Error setting notification preferences:', error);
      throw error;
    }
  }

  // Get UI preferences
  async getUIPreferences(userId) {
    try {
      const preferences = await this.getAllUserPreferences(userId);
      
      return {
        theme: preferences.theme || 'light',
        alwaysOnTop: preferences.always_on_top === 'true',
        compactMode: preferences.compact_mode === 'true',
        showAdvancedOptions: preferences.show_advanced_options === 'true',
        autoRefresh: preferences.auto_refresh === 'true',
        refreshInterval: parseInt(preferences.refresh_interval) || 30
      };
    } catch (error) {
      console.error('Error fetching UI preferences:', error);
      throw error;
    }
  }

  // Set UI preferences
  async setUIPreferences(userId, preferences) {
    try {
      const {
        theme,
        alwaysOnTop,
        compactMode,
        showAdvancedOptions,
        autoRefresh,
        refreshInterval
      } = preferences;

      await Promise.all([
        this.setTheme(userId, theme),
        this.setAlwaysOnTop(userId, alwaysOnTop),
        this.setUserPreference(userId, 'compact_mode', compactMode.toString()),
        this.setUserPreference(userId, 'show_advanced_options', showAdvancedOptions.toString()),
        this.setUserPreference(userId, 'auto_refresh', autoRefresh.toString()),
        this.setUserPreference(userId, 'refresh_interval', refreshInterval.toString())
      ]);

      return true;
    } catch (error) {
      console.error('Error setting UI preferences:', error);
      throw error;
    }
  }

  // Get search preferences
  async getSearchPreferences(userId) {
    try {
      const preferences = await this.getAllUserPreferences(userId);
      
      return {
        searchHistory: preferences.search_history === 'true',
        maxSearchHistory: parseInt(preferences.max_search_history) || 10,
        autoComplete: preferences.auto_complete === 'true',
        caseSensitive: preferences.case_sensitive === 'false'
      };
    } catch (error) {
      console.error('Error fetching search preferences:', error);
      throw error;
    }
  }

  // Set search preferences
  async setSearchPreferences(userId, preferences) {
    try {
      const {
        searchHistory,
        maxSearchHistory,
        autoComplete,
        caseSensitive
      } = preferences;

      await Promise.all([
        this.setUserPreference(userId, 'search_history', searchHistory.toString()),
        this.setUserPreference(userId, 'max_search_history', maxSearchHistory.toString()),
        this.setUserPreference(userId, 'auto_complete', autoComplete.toString()),
        this.setUserPreference(userId, 'case_sensitive', caseSensitive.toString())
      ]);

      return true;
    } catch (error) {
      console.error('Error setting search preferences:', error);
      throw error;
    }
  }

  // Reset all user preferences
  async resetUserPreferences(userId) {
    try {
      await db.execute(
        'DELETE FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      throw error;
    }
  }

  // Export user preferences
  async exportUserPreferences(userId) {
    try {
      const preferences = await this.getAllUserPreferences(userId);
      
      return {
        userId,
        exportedAt: new Date().toISOString(),
        preferences
      };
    } catch (error) {
      console.error('Error exporting user preferences:', error);
      throw error;
    }
  }

  // Import user preferences
  async importUserPreferences(userId, preferencesData) {
    try {
      // Validate the import data
      if (!preferencesData.preferences || typeof preferencesData.preferences !== 'object') {
        throw new Error('Invalid preferences data format');
      }

      // Set each preference
      for (const [key, value] of Object.entries(preferencesData.preferences)) {
        await this.setUserPreference(userId, key, value);
      }

      return true;
    } catch (error) {
      console.error('Error importing user preferences:', error);
      throw error;
    }
  }
}

module.exports = new UserPreferencesService();