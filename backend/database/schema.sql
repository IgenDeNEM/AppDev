-- Tweak Application Database Schema
CREATE DATABASE IF NOT EXISTS tweak_app;
USE tweak_app;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    registration_key VARCHAR(36) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Registration keys table
CREATE TABLE IF NOT EXISTS registration_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_value VARCHAR(36) UNIQUE NOT NULL,
    generated_by INT NOT NULL,
    used_by INT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Remote commands table
CREATE TABLE IF NOT EXISTS remote_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    target_user_id INT NOT NULL,
    command TEXT NOT NULL,
    status ENUM('pending', 'executed', 'failed') DEFAULT 'pending',
    result TEXT,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Screen captures table
CREATE TABLE IF NOT EXISTS screen_captures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    admin_id INT NOT NULL,
    image_data LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification codes table
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(8) NOT NULL,
    type ENUM('registration', 'login_2fa', 'password_reset', 'password_change', 'admin_creation', 'role_change', 'security_alert') NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NOT NULL,
    type ENUM('verification_code', 'password_reset', 'admin_alert', 'security_alert', 'system_notification') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('sent', 'delivered', 'failed', 'bounced') DEFAULT 'sent',
    error_message TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- SMTP configuration table
CREATE TABLE IF NOT EXISTS smtp_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    secure BOOLEAN DEFAULT FALSE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User security settings table
CREATE TABLE IF NOT EXISTS user_security_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login TIMESTAMP NULL,
    account_locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_security (user_id)
);

-- IP logs and geolocation table
CREATE TABLE IF NOT EXISTS ip_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    ip_address VARCHAR(45) NOT NULL,
    country VARCHAR(100) NULL,
    country_code VARCHAR(2) NULL,
    region VARCHAR(100) NULL,
    region_name VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    zip VARCHAR(20) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    timezone VARCHAR(50) NULL,
    isp VARCHAR(255) NULL,
    org VARCHAR(255) NULL,
    as_field VARCHAR(255) NULL,
    action VARCHAR(100) NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User tags table
CREATE TABLE IF NOT EXISTS user_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#1976d2',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User tag assignments table
CREATE TABLE IF NOT EXISTS user_tag_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tag_id INT NOT NULL,
    assigned_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES user_tags(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, tag_id)
);

-- File transfer logs table
CREATE TABLE IF NOT EXISTS file_transfer_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    transfer_type ENUM('upload', 'download') NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Command presets table
CREATE TABLE IF NOT EXISTS command_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    command TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    is_system BOOLEAN DEFAULT FALSE,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Screen view permissions table
CREATE TABLE IF NOT EXISTS screen_view_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'denied', 'expired') DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhook_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    secret_key VARCHAR(255) NULL,
    headers JSON NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    response_status INT NULL,
    response_body TEXT NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhook_configs(id) ON DELETE CASCADE
);

-- Clipboard sharing logs table
CREATE TABLE IF NOT EXISTS clipboard_sharing_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    user_id INT NOT NULL,
    content_type ENUM('text', 'image', 'file') DEFAULT 'text',
    content_preview VARCHAR(255) NULL,
    status ENUM('sent', 'received', 'failed') DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crash reports table
CREATE TABLE IF NOT EXISTS crash_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    app_version VARCHAR(50) NULL,
    os_info VARCHAR(255) NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT NULL,
    crash_data JSON NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Offline cache table
CREATE TABLE IF NOT EXISTS offline_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    cache_data JSON NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_cache (user_id, cache_key)
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_registration_key ON users(registration_key);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_registration_keys_key_value ON registration_keys(key_value);
CREATE INDEX idx_registration_keys_generated_by ON registration_keys(generated_by);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_remote_commands_admin_id ON remote_commands(admin_id);
CREATE INDEX idx_remote_commands_target_user_id ON remote_commands(target_user_id);
CREATE INDEX idx_screen_captures_user_id ON screen_captures(user_id);
CREATE INDEX idx_screen_captures_admin_id ON screen_captures(admin_id);
CREATE INDEX idx_email_verification_codes_email ON email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);
CREATE INDEX idx_email_verification_codes_type ON email_verification_codes(type);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_email ON email_logs(email);
CREATE INDEX idx_email_logs_type ON email_logs(type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX idx_ip_logs_user_id ON ip_logs(user_id);
CREATE INDEX idx_ip_logs_ip_address ON ip_logs(ip_address);
CREATE INDEX idx_ip_logs_action ON ip_logs(action);
CREATE INDEX idx_ip_logs_created_at ON ip_logs(created_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_tag_assignments_user_id ON user_tag_assignments(user_id);
CREATE INDEX idx_user_tag_assignments_tag_id ON user_tag_assignments(tag_id);
CREATE INDEX idx_file_transfer_logs_admin_id ON file_transfer_logs(admin_id);
CREATE INDEX idx_file_transfer_logs_user_id ON file_transfer_logs(user_id);
CREATE INDEX idx_file_transfer_logs_status ON file_transfer_logs(status);
CREATE INDEX idx_command_presets_category ON command_presets(category);
CREATE INDEX idx_command_presets_created_by ON command_presets(created_by);
CREATE INDEX idx_screen_view_permissions_admin_id ON screen_view_permissions(admin_id);
CREATE INDEX idx_screen_view_permissions_user_id ON screen_view_permissions(user_id);
CREATE INDEX idx_screen_view_permissions_status ON screen_view_permissions(status);
CREATE INDEX idx_webhook_configs_created_by ON webhook_configs(created_by);
CREATE INDEX idx_webhook_configs_is_active ON webhook_configs(is_active);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_clipboard_sharing_logs_admin_id ON clipboard_sharing_logs(admin_id);
CREATE INDEX idx_clipboard_sharing_logs_user_id ON clipboard_sharing_logs(user_id);
CREATE INDEX idx_crash_reports_user_id ON crash_reports(user_id);
CREATE INDEX idx_crash_reports_is_resolved ON crash_reports(is_resolved);
CREATE INDEX idx_offline_cache_user_id ON offline_cache(user_id);
CREATE INDEX idx_offline_cache_cache_key ON offline_cache(cache_key);
CREATE INDEX idx_offline_cache_cache_type ON offline_cache(cache_type);

-- Package Store tables
CREATE TABLE IF NOT EXISTS package_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    publisher VARCHAR(200),
    version VARCHAR(50),
    installer_type ENUM('chocolatey', 'winget', 'direct_download', 'msi', 'exe') NOT NULL,
    installer_source TEXT NOT NULL,
    silent_flags VARCHAR(500),
    download_url TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_app BOOLEAN DEFAULT FALSE,
    requires_verification BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tweak categories and definitions
CREATE TABLE IF NOT EXISTS tweak_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tweaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    command TEXT NOT NULL,
    is_dangerous BOOLEAN DEFAULT FALSE,
    requires_verification BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES tweak_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- User roles and permissions
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_type ENUM('tweak', 'package_category', 'package', 'system_action') NOT NULL,
    resource_id INT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id)
);

-- Application management logs
CREATE TABLE IF NOT EXISTS app_install_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    action ENUM('install', 'uninstall', 'update') NOT NULL,
    status ENUM('pending', 'success', 'failed', 'cancelled') NOT NULL,
    error_message TEXT,
    installer_output TEXT,
    verification_code VARCHAR(8),
    verification_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tweak_execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tweak_id INT NOT NULL,
    status ENUM('pending', 'success', 'failed', 'cancelled') NOT NULL,
    error_message TEXT,
    command_output TEXT,
    verification_code VARCHAR(8),
    verification_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tweak_id) REFERENCES tweaks(id) ON DELETE CASCADE
);

-- Installed applications tracking
CREATE TABLE IF NOT EXISTS installed_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NULL,
    app_name VARCHAR(200) NOT NULL,
    version VARCHAR(50),
    publisher VARCHAR(200),
    install_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_system_app BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key)
);

-- Additional indexes for new tables
CREATE INDEX idx_package_categories_is_active ON package_categories(is_active);
CREATE INDEX idx_package_categories_sort_order ON package_categories(sort_order);
CREATE INDEX idx_packages_category_id ON packages(category_id);
CREATE INDEX idx_packages_is_active ON packages(is_active);
CREATE INDEX idx_packages_is_system_app ON packages(is_system_app);
CREATE INDEX idx_packages_requires_verification ON packages(requires_verification);
CREATE INDEX idx_tweak_categories_is_active ON tweak_categories(is_active);
CREATE INDEX idx_tweak_categories_sort_order ON tweak_categories(sort_order);
CREATE INDEX idx_tweaks_category_id ON tweaks(category_id);
CREATE INDEX idx_tweaks_is_active ON tweaks(is_active);
CREATE INDEX idx_tweaks_is_dangerous ON tweaks(is_dangerous);
CREATE INDEX idx_tweaks_requires_verification ON tweaks(requires_verification);
CREATE INDEX idx_user_roles_name ON user_roles(name);
CREATE INDEX idx_user_roles_is_system_role ON user_roles(is_system_role);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_type ON role_permissions(permission_type);
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_app_install_logs_user_id ON app_install_logs(user_id);
CREATE INDEX idx_app_install_logs_package_id ON app_install_logs(package_id);
CREATE INDEX idx_app_install_logs_status ON app_install_logs(status);
CREATE INDEX idx_app_install_logs_created_at ON app_install_logs(created_at);
CREATE INDEX idx_tweak_execution_logs_user_id ON tweak_execution_logs(user_id);
CREATE INDEX idx_tweak_execution_logs_tweak_id ON tweak_execution_logs(tweak_id);
CREATE INDEX idx_tweak_execution_logs_status ON tweak_execution_logs(status);
CREATE INDEX idx_tweak_execution_logs_created_at ON tweak_execution_logs(created_at);
CREATE INDEX idx_installed_applications_user_id ON installed_applications(user_id);
CREATE INDEX idx_installed_applications_package_id ON installed_applications(package_id);
CREATE INDEX idx_installed_applications_is_system_app ON installed_applications(is_system_app);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_preference_key ON user_preferences(preference_key);

-- Insert default data
INSERT INTO user_roles (name, description, is_system_role) VALUES
('superadmin', 'Full system access with all permissions', TRUE),
('admin', 'Administrative access with most permissions', TRUE),
('user', 'Standard user with limited permissions', TRUE);

INSERT INTO package_categories (name, description, icon, sort_order) VALUES
('Browsers', 'Web browsers and related tools', 'web', 1),
('Gaming', 'Gaming platforms and tools', 'sports_esports', 2),
('Communication', 'Communication and collaboration tools', 'chat', 3),
('Developer Tools', 'Development environments and tools', 'code', 4),
('Utilities', 'System utilities and productivity tools', 'build', 5);

INSERT INTO tweak_categories (name, description, icon, sort_order) VALUES
('Privacy', 'Privacy and telemetry related tweaks', 'privacy_tip', 1),
('Gaming', 'Gaming performance optimizations', 'sports_esports', 2),
('Files', 'File system and storage optimizations', 'folder', 3),
('Updates', 'Windows Update and system updates', 'system_update', 4),
('Performance', 'System performance optimizations', 'speed', 5),
('System', 'System configuration and services', 'settings', 6);

-- Insert default tweaks
INSERT INTO tweaks (name, description, category_id, command, is_dangerous, requires_verification) VALUES
('Uninstall Edge', 'Completely remove Microsoft Edge browser', 1, 'powershell -Command "Get-AppxPackage *edge* | Remove-AppxPackage"', TRUE, TRUE),
('Undo Edge Redirections', 'Restore default browser associations', 1, 'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations" /v "UrlAssociations" /t REG_SZ /d "" /f', FALSE, FALSE),
('Disable Telemetry', 'Disable Windows telemetry and data collection', 1, 'reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f', FALSE, FALSE),
('Disable Ads', 'Disable Windows advertising and promotional content', 1, 'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 0 /f', FALSE, FALSE),
('Enable Ultimate Power Plan', 'Enable Windows Ultimate Performance power plan', 5, 'powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61', FALSE, FALSE),
('Disable Sticky Keys Hotkey', 'Disable Sticky Keys accessibility hotkey', 5, 'reg add "HKEY_CURRENT_USER\\Control Panel\\Accessibility\\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f', FALSE, FALSE),
('Install Vencord', 'Install Vencord Discord client mod', 2, 'powershell -Command "iwr -useb https://vencord.dev/install.ps1 | iex"', FALSE, FALSE),
('Clean Recycle Bin', 'Empty the Windows Recycle Bin', 3, 'powershell -Command "Clear-RecycleBin -Force"', FALSE, FALSE),
('Delete Temporary Files', 'Clean temporary files and cache', 3, 'powershell -Command "Get-ChildItem -Path $env:TEMP -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"', FALSE, FALSE),
('System Cleanup', 'Advanced system cleanup including logs and prefetch', 3, 'powershell -Command "Get-ChildItem -Path C:\\Windows\\Prefetch -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; Get-ChildItem -Path C:\\Windows\\Logs -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"', FALSE, FALSE),
('DNS Flush', 'Flush DNS cache to resolve connectivity issues', 5, 'ipconfig /flushdns', FALSE, FALSE),
('Performance Boost', 'Terminate non-essential background processes', 5, 'powershell -Command "Get-Process | Where-Object {$_.ProcessName -match \'^(Teams|Skype|Spotify|Discord)\'} | Stop-Process -Force"', FALSE, FALSE);

-- Insert default packages
INSERT INTO packages (name, description, category_id, publisher, installer_type, installer_source, silent_flags, requires_verification) VALUES
('Google Chrome', 'Fast, secure web browser', 1, 'Google LLC', 'chocolatey', 'googlechrome', '--silent', FALSE),
('Mozilla Firefox', 'Privacy-focused web browser', 1, 'Mozilla Corporation', 'chocolatey', 'firefox', '--silent', FALSE),
('Microsoft Edge', 'Microsoft web browser', 1, 'Microsoft Corporation', 'chocolatey', 'microsoft-edge', '--silent', FALSE),
('Brave Browser', 'Privacy-focused browser with ad blocking', 1, 'Brave Software', 'chocolatey', 'brave', '--silent', FALSE),
('Steam', 'Gaming platform and store', 2, 'Valve Corporation', 'chocolatey', 'steam', '--silent', FALSE),
('Epic Games Launcher', 'Epic Games store and launcher', 2, 'Epic Games', 'chocolatey', 'epicgameslauncher', '--silent', FALSE),
('Discord', 'Voice and text communication', 3, 'Discord Inc.', 'chocolatey', 'discord', '--silent', FALSE),
('Microsoft Teams', 'Business communication platform', 3, 'Microsoft Corporation', 'chocolatey', 'microsoft-teams', '--silent', FALSE),
('Visual Studio Code', 'Code editor and IDE', 4, 'Microsoft Corporation', 'chocolatey', 'vscode', '--silent', FALSE),
('Git', 'Version control system', 4, 'Git', 'chocolatey', 'git', '--silent', FALSE),
('7-Zip', 'File archiver and compressor', 5, 'Igor Pavlov', 'chocolatey', '7zip', '--silent', FALSE),
('VLC Media Player', 'Media player for various formats', 5, 'VideoLAN', 'chocolatey', 'vlc', '--silent', FALSE);