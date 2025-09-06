class SettingsManager {
    constructor() {
        this.settings = {
            theme: 'dark',
            fontSize: 'medium',
            windowSize: 'normal',
            autoStart: false,
            minimizeToTray: true,
            notifications: true,
            soundEffects: true,
            language: 'en',
            customColors: {
                primary: '#1976d2',
                secondary: '#dc004e',
                background: '#121212',
                surface: '#1e1e1e',
                text: '#ffffff'
            },
            layout: {
                sidebar: true,
                sidebarWidth: 250,
                compactMode: false
            },
            privacy: {
                analytics: true,
                crashReports: true,
                telemetry: false
            }
        };
        
        this.loadSettings();
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('tweak-desktop-settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('tweak-desktop-settings', JSON.stringify(this.settings));
            this.applySettings();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    applySettings() {
        // Apply theme
        this.applyTheme();
        
        // Apply font size
        this.applyFontSize();
        
        // Apply custom colors
        this.applyCustomColors();
        
        // Apply layout settings
        this.applyLayoutSettings();
        
        // Apply window settings
        this.applyWindowSettings();
    }

    applyTheme() {
        const body = document.body;
        const theme = this.settings.theme;
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Add new theme class
        body.classList.add(`theme-${theme}`);
        
        // Update CSS custom properties
        const root = document.documentElement;
        
        if (theme === 'light') {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f5f5f5');
            root.style.setProperty('--text-primary', '#212121');
            root.style.setProperty('--text-secondary', '#757575');
            root.style.setProperty('--border-color', '#e0e0e0');
        } else if (theme === 'dark') {
            root.style.setProperty('--bg-primary', '#121212');
            root.style.setProperty('--bg-secondary', '#1e1e1e');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b0b0b0');
            root.style.setProperty('--border-color', '#333333');
        } else {
            // Auto theme - use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.style.setProperty('--bg-primary', '#121212');
                root.style.setProperty('--bg-secondary', '#1e1e1e');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#b0b0b0');
                root.style.setProperty('--border-color', '#333333');
            } else {
                root.style.setProperty('--bg-primary', '#ffffff');
                root.style.setProperty('--bg-secondary', '#f5f5f5');
                root.style.setProperty('--text-primary', '#212121');
                root.style.setProperty('--text-secondary', '#757575');
                root.style.setProperty('--border-color', '#e0e0e0');
            }
        }
    }

    applyFontSize() {
        const fontSize = this.settings.fontSize;
        const root = document.documentElement;
        
        const sizes = {
            small: '12px',
            medium: '14px',
            large: '16px',
            extraLarge: '18px'
        };
        
        root.style.setProperty('--font-size-base', sizes[fontSize] || sizes.medium);
    }

    applyCustomColors() {
        const colors = this.settings.customColors;
        const root = document.documentElement;
        
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-background', colors.background);
        root.style.setProperty('--color-surface', colors.surface);
        root.style.setProperty('--color-text', colors.text);
    }

    applyLayoutSettings() {
        const layout = this.settings.layout;
        
        // Apply sidebar settings
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (layout.sidebar) {
                sidebar.style.display = 'block';
                sidebar.style.width = `${layout.sidebarWidth}px`;
            } else {
                sidebar.style.display = 'none';
            }
        }
        
        // Apply compact mode
        const body = document.body;
        if (layout.compactMode) {
            body.classList.add('compact-mode');
        } else {
            body.classList.remove('compact-mode');
        }
    }

    applyWindowSettings() {
        // This would be handled by the main process
        if (window.electronAPI) {
            window.electronAPI.updateWindowSettings(this.settings);
        }
    }

    resetToDefaults() {
        this.settings = {
            theme: 'dark',
            fontSize: 'medium',
            windowSize: 'normal',
            autoStart: false,
            minimizeToTray: true,
            notifications: true,
            soundEffects: true,
            language: 'en',
            customColors: {
                primary: '#1976d2',
                secondary: '#dc004e',
                background: '#121212',
                surface: '#1e1e1e',
                text: '#ffffff'
            },
            layout: {
                sidebar: true,
                sidebarWidth: 250,
                compactMode: false
            },
            privacy: {
                analytics: true,
                crashReports: true,
                telemetry: false
            }
        };
        this.saveSettings();
    }

    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tweak-desktop-settings.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    this.updateSettings(importedSettings);
                    resolve(importedSettings);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

// Create global settings manager instance
window.settingsManager = new SettingsManager();

// Apply settings on load
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager.applySettings();
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (window.settingsManager.getSetting('theme') === 'auto') {
        window.settingsManager.applyTheme();
    }
});