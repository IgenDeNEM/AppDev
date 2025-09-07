class SettingsUI {
    constructor() {
        this.settingsManager = window.settingsManager;
        this.initializeEventListeners();
        this.loadCurrentSettings();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Theme settings
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.settingsManager.setSetting('theme', e.target.value);
        });

        // Font size settings
        document.getElementById('font-size-select').addEventListener('change', (e) => {
            this.settingsManager.setSetting('fontSize', e.target.value);
        });

        // Color pickers
        document.querySelectorAll('input[type="color"]').forEach(colorPicker => {
            colorPicker.addEventListener('change', (e) => {
                this.updateCustomColor(e.target.id, e.target.value);
            });
        });

        // Layout settings
        document.getElementById('sidebar-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('layout', {
                ...this.settingsManager.getSetting('layout'),
                sidebar: e.target.checked
            });
        });

        document.getElementById('sidebar-width').addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            document.getElementById('sidebar-width-value').textContent = `${width}px`;
            this.settingsManager.setSetting('layout', {
                ...this.settingsManager.getSetting('layout'),
                sidebarWidth: width
            });
        });

        document.getElementById('compact-mode-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('layout', {
                ...this.settingsManager.getSetting('layout'),
                compactMode: e.target.checked
            });
        });

        // Behavior settings
        document.getElementById('auto-start-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('autoStart', e.target.checked);
        });

        document.getElementById('minimize-to-tray-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('minimizeToTray', e.target.checked);
        });

        document.getElementById('notifications-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('notifications', e.target.checked);
        });

        document.getElementById('sound-effects-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('soundEffects', e.target.checked);
        });

        document.getElementById('language-select').addEventListener('change', (e) => {
            this.settingsManager.setSetting('language', e.target.value);
        });

        // Privacy settings
        document.getElementById('analytics-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('privacy', {
                ...this.settingsManager.getSetting('privacy'),
                analytics: e.target.checked
            });
        });

        document.getElementById('crash-reports-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('privacy', {
                ...this.settingsManager.getSetting('privacy'),
                crashReports: e.target.checked
            });
        });

        document.getElementById('telemetry-toggle').addEventListener('change', (e) => {
            this.settingsManager.setSetting('privacy', {
                ...this.settingsManager.getSetting('privacy'),
                telemetry: e.target.checked
            });
        });

        // Advanced settings
        document.getElementById('window-size-select').addEventListener('change', (e) => {
            this.settingsManager.setSetting('windowSize', e.target.value);
        });

        // Import/Export buttons
        document.getElementById('export-settings-btn').addEventListener('click', () => {
            this.settingsManager.exportSettings();
        });

        document.getElementById('import-settings-btn').addEventListener('click', () => {
            document.getElementById('import-settings-file').click();
        });

        document.getElementById('import-settings-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importSettings(e.target.files[0]);
            }
        });

        // Reset button
        document.getElementById('reset-settings-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
                this.settingsManager.resetToDefaults();
                this.loadCurrentSettings();
                this.showNotification('Settings reset to defaults', 'success');
            }
        });

        // Save/Cancel buttons
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancel-settings-btn').addEventListener('click', () => {
            this.loadCurrentSettings();
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    loadCurrentSettings() {
        const settings = this.settingsManager.settings;

        // Theme
        document.getElementById('theme-select').value = settings.theme;

        // Font size
        document.getElementById('font-size-select').value = settings.fontSize;

        // Custom colors
        document.getElementById('primary-color').value = settings.customColors.primary;
        document.getElementById('secondary-color').value = settings.customColors.secondary;
        document.getElementById('background-color').value = settings.customColors.background;
        document.getElementById('surface-color').value = settings.customColors.surface;
        document.getElementById('text-color').value = settings.customColors.text;

        // Layout
        document.getElementById('sidebar-toggle').checked = settings.layout.sidebar;
        document.getElementById('sidebar-width').value = settings.layout.sidebarWidth;
        document.getElementById('sidebar-width-value').textContent = `${settings.layout.sidebarWidth}px`;
        document.getElementById('compact-mode-toggle').checked = settings.layout.compactMode;

        // Behavior
        document.getElementById('auto-start-toggle').checked = settings.autoStart;
        document.getElementById('minimize-to-tray-toggle').checked = settings.minimizeToTray;
        document.getElementById('notifications-toggle').checked = settings.notifications;
        document.getElementById('sound-effects-toggle').checked = settings.soundEffects;
        document.getElementById('language-select').value = settings.language;

        // Privacy
        document.getElementById('analytics-toggle').checked = settings.privacy.analytics;
        document.getElementById('crash-reports-toggle').checked = settings.privacy.crashReports;
        document.getElementById('telemetry-toggle').checked = settings.privacy.telemetry;

        // Advanced
        document.getElementById('window-size-select').value = settings.windowSize;
    }

    updateCustomColor(colorId, value) {
        const colorMap = {
            'primary-color': 'primary',
            'secondary-color': 'secondary',
            'background-color': 'background',
            'surface-color': 'surface',
            'text-color': 'text'
        };

        const colorKey = colorMap[colorId];
        if (colorKey) {
            const customColors = { ...this.settingsManager.getSetting('customColors') };
            customColors[colorKey] = value;
            this.settingsManager.setSetting('customColors', customColors);
        }
    }

    async importSettings(file) {
        try {
            await this.settingsManager.importSettings(file);
            this.loadCurrentSettings();
            this.showNotification('Settings imported successfully', 'success');
        } catch (error) {
            console.error('Error importing settings:', error);
            this.showNotification('Error importing settings: ' + error.message, 'error');
        }
    }

    saveSettings() {
        this.settingsManager.saveSettings();
        this.showNotification('Settings saved successfully', 'success');
        
        // Close settings window if running in Electron
        if (window.electronAPI) {
            window.electronAPI.closeSettingsWindow();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to document
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize settings UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsUI();
});