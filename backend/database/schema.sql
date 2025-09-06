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