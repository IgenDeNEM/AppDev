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