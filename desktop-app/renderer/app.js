const { ipcRenderer } = require('electron');

class TweakApp {
    constructor() {
        this.currentUser = null;
        this.systemInfo = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => this.handleLogout());

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Tool buttons
        document.getElementById('optimize-btn').addEventListener('click', () => this.runOptimization());
        document.getElementById('cleanup-btn').addEventListener('click', () => this.runCleanup());
        document.getElementById('memory-monitor-btn').addEventListener('click', () => this.startMemoryMonitoring());
        document.getElementById('network-monitor-btn').addEventListener('click', () => this.startNetworkMonitoring());
        document.getElementById('cmd-btn').addEventListener('click', () => this.openCommandPrompt());
        document.getElementById('screenshot-btn').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('system-info-btn').addEventListener('click', () => this.showSystemInfo());
    }

    setupNavigation() {
        const sections = document.querySelectorAll('.content-section');
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items and sections
                navItems.forEach(nav => nav.classList.remove('active'));
                sections.forEach(section => section.classList.remove('active'));
                
                // Add active class to clicked nav item
                item.classList.add('active');
                
                // Show corresponding section
                const sectionId = item.dataset.section + '-section';
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.add('active');
                }
            });
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const result = await ipcRenderer.invoke('login', { username, password });
            
            if (result.success) {
                this.currentUser = result.user;
                this.showMainScreen();
                this.loadSystemInfo();
            } else {
                this.showError(errorDiv, result.error);
            }
        } catch (error) {
            this.showError(errorDiv, 'Login failed. Please try again.');
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-screen').classList.remove('active');
        document.getElementById('login-form').reset();
        document.getElementById('login-error').style.display = 'none';
    }

    showMainScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        // Update user info
        const userInfo = document.getElementById('user-info');
        userInfo.textContent = `Welcome, ${this.currentUser.username}`;
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    handleNavigation(e) {
        e.preventDefault();
        
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');
        
        // Remove active class from all nav items and sections
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));
        
        // Add active class to clicked nav item
        e.currentTarget.classList.add('active');
        
        // Show corresponding section
        const sectionId = e.currentTarget.dataset.section + '-section';
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
        }
    }

    async loadSystemInfo() {
        try {
            this.systemInfo = await ipcRenderer.invoke('get-system-info');
            this.updateSystemInfo();
            this.updateDashboard();
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    updateSystemInfo() {
        if (!this.systemInfo) return;

        // Update system info section
        document.getElementById('os-info').textContent = 
            `${this.systemInfo.os.platform} ${this.systemInfo.os.release} (${this.systemInfo.os.arch})`;
        
        document.getElementById('cpu-info').textContent = 
            `${this.systemInfo.cpu.manufacturer} ${this.systemInfo.cpu.brand} (${this.systemInfo.cpu.cores} cores)`;
        
        document.getElementById('memory-info').textContent = 
            `${this.systemInfo.memory.used}GB / ${this.systemInfo.memory.total}GB used`;
        
        if (this.systemInfo.disk.length > 0) {
            const disk = this.systemInfo.disk[0];
            document.getElementById('storage-info').textContent = 
                `${disk.used}GB / ${disk.size}GB used (${disk.fs})`;
        }
    }

    updateDashboard() {
        if (!this.systemInfo) return;

        // Update memory usage
        const memoryPercent = Math.round((this.systemInfo.memory.used / this.systemInfo.memory.total) * 100);
        document.getElementById('memory-usage').textContent = `${memoryPercent}% (${this.systemInfo.memory.used}GB / ${this.systemInfo.memory.total}GB)`;

        // Update disk usage
        if (this.systemInfo.disk.length > 0) {
            const disk = this.systemInfo.disk[0];
            const diskPercent = Math.round((disk.used / disk.size) * 100);
            document.getElementById('disk-usage').textContent = `${diskPercent}% (${disk.used}GB / ${disk.size}GB)`;
        }

        // Update network status
        document.getElementById('network-status').textContent = 'Connected';
    }

    async runOptimization() {
        const btn = document.getElementById('optimize-btn');
        const resultsContainer = document.getElementById('optimization-results');
        
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const result = await ipcRenderer.invoke('optimize-system');
            
            if (result.success) {
                this.showOptimizationResults(result.results);
            } else {
                this.showError(resultsContainer, result.error);
            }
        } catch (error) {
            this.showError(resultsContainer, 'Optimization failed');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    async runCleanup() {
        const btn = document.getElementById('cleanup-btn');
        const resultsContainer = document.getElementById('optimization-results');
        
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const result = await ipcRenderer.invoke('clean-storage');
            
            if (result.success) {
                this.showOptimizationResults(result.results);
            } else {
                this.showError(resultsContainer, result.error);
            }
        } catch (error) {
            this.showError(resultsContainer, 'Cleanup failed');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    showOptimizationResults(results) {
        const resultsContainer = document.getElementById('optimization-results');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('active');

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <div class="result-command">${result.command}</div>
                <div class="result-output">${result.output}</div>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
    }

    startMemoryMonitoring() {
        const btn = document.getElementById('memory-monitor-btn');
        btn.textContent = 'Memory monitoring started';
        btn.disabled = true;
        
        // In a real implementation, this would start continuous monitoring
        setTimeout(() => {
            btn.textContent = 'Start Monitoring';
            btn.disabled = false;
        }, 5000);
    }

    startNetworkMonitoring() {
        const btn = document.getElementById('network-monitor-btn');
        btn.textContent = 'Network monitoring started';
        btn.disabled = true;
        
        // In a real implementation, this would start continuous monitoring
        setTimeout(() => {
            btn.textContent = 'Start Monitoring';
            btn.disabled = false;
        }, 5000);
    }

    async openCommandPrompt() {
        try {
            await ipcRenderer.invoke('execute-command', 'cmd');
        } catch (error) {
            console.error('Failed to open command prompt:', error);
        }
    }

    async takeScreenshot() {
        const btn = document.getElementById('screenshot-btn');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const screenshot = await ipcRenderer.invoke('take-screenshot');
            if (screenshot) {
                // In a real implementation, you would display or save the screenshot
                alert('Screenshot taken successfully!');
            }
        } catch (error) {
            console.error('Failed to take screenshot:', error);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    showSystemInfo() {
        // Switch to system info section
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));
        
        document.querySelector('[data-section="system"]').classList.add('active');
        document.getElementById('system-section').classList.add('active');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TweakApp();
});