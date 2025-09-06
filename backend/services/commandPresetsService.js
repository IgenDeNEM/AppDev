const { pool } = require('../config/database');

class CommandPresetsService {
    constructor() {
        this.defaultPresets = [
            {
                name: 'System Information',
                description: 'Get detailed system information',
                command: 'systeminfo',
                category: 'system'
            },
            {
                name: 'Disk Usage',
                description: 'Check disk usage and free space',
                command: 'df -h',
                category: 'system'
            },
            {
                name: 'Memory Usage',
                description: 'Check memory usage',
                command: 'free -h',
                category: 'system'
            },
            {
                name: 'Running Processes',
                description: 'List all running processes',
                command: 'ps aux',
                category: 'processes'
            },
            {
                name: 'Network Connections',
                description: 'Show active network connections',
                command: 'netstat -tuln',
                category: 'network'
            },
            {
                name: 'Service Status',
                description: 'Check system services status',
                command: 'systemctl status',
                category: 'services'
            },
            {
                name: 'Clear Temp Files',
                description: 'Clear temporary files',
                command: 'rm -rf /tmp/*',
                category: 'cleanup'
            },
            {
                name: 'Update System',
                description: 'Update system packages',
                command: 'apt update && apt upgrade -y',
                category: 'maintenance'
            },
            {
                name: 'Restart Service',
                description: 'Restart a specific service',
                command: 'systemctl restart {service_name}',
                category: 'services'
            },
            {
                name: 'Check Logs',
                description: 'View system logs',
                command: 'journalctl -n 50',
                category: 'logs'
            }
        ];
    }

    // Initialize default presets
    async initializeDefaultPresets() {
        try {
            for (const preset of this.defaultPresets) {
                await pool.execute(
                    'INSERT IGNORE INTO command_presets (name, description, command, category, is_system) VALUES (?, ?, ?, ?, ?)',
                    [preset.name, preset.description, preset.command, preset.category, true]
                );
            }
            console.log('Default command presets initialized');
        } catch (error) {
            console.error('Error initializing default presets:', error);
        }
    }

    // Create a new command preset
    async createPreset(name, description, command, category = 'general', createdBy = null) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO command_presets (name, description, command, category, created_by) VALUES (?, ?, ?, ?, ?)',
                [name, description, command, category, createdBy]
            );

            return { success: true, presetId: result.insertId };
        } catch (error) {
            console.error('Error creating command preset:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all presets
    async getAllPresets(category = null) {
        try {
            let query = `
                SELECT 
                    cp.*,
                    u.username as created_by_username
                FROM command_presets cp
                LEFT JOIN users u ON cp.created_by = u.id
            `;

            const params = [];

            if (category) {
                query += ' WHERE cp.category = ?';
                params.push(category);
            }

            query += ' ORDER BY cp.category, cp.name';

            const [presets] = await pool.execute(query, params);
            return presets;
        } catch (error) {
            console.error('Error getting all presets:', error);
            return [];
        }
    }

    // Get preset by ID
    async getPresetById(presetId) {
        try {
            const [presets] = await pool.execute(
                `SELECT 
                    cp.*,
                    u.username as created_by_username
                FROM command_presets cp
                LEFT JOIN users u ON cp.created_by = u.id
                WHERE cp.id = ?`,
                [presetId]
            );

            return presets.length > 0 ? presets[0] : null;
        } catch (error) {
            console.error('Error getting preset by ID:', error);
            return null;
        }
    }

    // Update preset
    async updatePreset(presetId, updates) {
        try {
            const allowedFields = ['name', 'description', 'command', 'category'];
            const updateFields = [];
            const updateValues = [];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            }

            if (updateFields.length === 0) {
                return { success: false, error: 'No valid fields to update' };
            }

            updateFields.push('updated_at = NOW()');
            updateValues.push(presetId);

            await pool.execute(
                `UPDATE command_presets SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            return { success: true };
        } catch (error) {
            console.error('Error updating preset:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete preset
    async deletePreset(presetId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM command_presets WHERE id = ? AND is_system = FALSE',
                [presetId]
            );

            if (result.affectedRows === 0) {
                return { success: false, error: 'Preset not found or cannot delete system preset' };
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting preset:', error);
            return { success: false, error: error.message };
        }
    }

    // Get presets by category
    async getPresetsByCategory(category) {
        try {
            const [presets] = await pool.execute(
                `SELECT 
                    cp.*,
                    u.username as created_by_username
                FROM command_presets cp
                LEFT JOIN users u ON cp.created_by = u.id
                WHERE cp.category = ?
                ORDER BY cp.name`,
                [category]
            );

            return presets;
        } catch (error) {
            console.error('Error getting presets by category:', error);
            return [];
        }
    }

    // Get all categories
    async getCategories() {
        try {
            const [categories] = await pool.execute(
                'SELECT DISTINCT category FROM command_presets ORDER BY category'
            );

            return categories.map(cat => cat.category);
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    // Search presets
    async searchPresets(query, category = null) {
        try {
            let sql = `
                SELECT 
                    cp.*,
                    u.username as created_by_username
                FROM command_presets cp
                LEFT JOIN users u ON cp.created_by = u.id
                WHERE (cp.name LIKE ? OR cp.description LIKE ? OR cp.command LIKE ?)
            `;

            const params = [`%${query}%`, `%${query}%`, `%${query}%`];

            if (category) {
                sql += ' AND cp.category = ?';
                params.push(category);
            }

            sql += ' ORDER BY cp.category, cp.name';

            const [presets] = await pool.execute(sql, params);
            return presets;
        } catch (error) {
            console.error('Error searching presets:', error);
            return [];
        }
    }

    // Get preset usage statistics
    async getPresetUsageStats() {
        try {
            const [stats] = await pool.execute(
                `SELECT 
                    cp.id,
                    cp.name,
                    cp.category,
                    COUNT(rc.id) as usage_count,
                    MAX(rc.created_at) as last_used
                FROM command_presets cp
                LEFT JOIN remote_commands rc ON cp.command = rc.command
                GROUP BY cp.id, cp.name, cp.category
                ORDER BY usage_count DESC`
            );

            return stats;
        } catch (error) {
            console.error('Error getting preset usage stats:', error);
            return [];
        }
    }

    // Get popular presets
    async getPopularPresets(limit = 10) {
        try {
            const [presets] = await pool.execute(
                `SELECT 
                    cp.id,
                    cp.name,
                    cp.description,
                    cp.command,
                    cp.category,
                    COUNT(rc.id) as usage_count
                FROM command_presets cp
                LEFT JOIN remote_commands rc ON cp.command = rc.command
                WHERE rc.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY cp.id, cp.name, cp.description, cp.command, cp.category
                ORDER BY usage_count DESC
                LIMIT ?`,
                [limit]
            );

            return presets;
        } catch (error) {
            console.error('Error getting popular presets:', error);
            return [];
        }
    }

    // Duplicate preset
    async duplicatePreset(presetId, newName, createdBy) {
        try {
            const original = await this.getPresetById(presetId);
            if (!original) {
                return { success: false, error: 'Original preset not found' };
            }

            const [result] = await pool.execute(
                'INSERT INTO command_presets (name, description, command, category, created_by) VALUES (?, ?, ?, ?, ?)',
                [newName, original.description, original.command, original.category, createdBy]
            );

            return { success: true, presetId: result.insertId };
        } catch (error) {
            console.error('Error duplicating preset:', error);
            return { success: false, error: error.message };
        }
    }

    // Get preset templates
    getPresetTemplates() {
        return [
            {
                name: 'Custom Service Restart',
                description: 'Restart a custom service',
                command: 'systemctl restart {service_name}',
                category: 'services',
                variables: ['service_name']
            },
            {
                name: 'Check Specific Port',
                description: 'Check if a specific port is listening',
                command: 'netstat -tuln | grep :{port}',
                category: 'network',
                variables: ['port']
            },
            {
                name: 'Find Large Files',
                description: 'Find files larger than specified size',
                command: 'find {path} -type f -size +{size}M -exec ls -lh {} \\;',
                category: 'system',
                variables: ['path', 'size']
            },
            {
                name: 'Kill Process by Name',
                description: 'Kill processes by name',
                command: 'pkill -f {process_name}',
                category: 'processes',
                variables: ['process_name']
            },
            {
                name: 'Check Disk Usage for Directory',
                description: 'Check disk usage for specific directory',
                command: 'du -sh {directory}',
                category: 'system',
                variables: ['directory']
            }
        ];
    }

    // Process command with variables
    processCommandWithVariables(command, variables = {}) {
        let processedCommand = command;
        
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            processedCommand = processedCommand.replace(new RegExp(placeholder, 'g'), value);
        }

        return processedCommand;
    }

    // Get command variables
    extractVariables(command) {
        const variableRegex = /\{([^}]+)\}/g;
        const variables = [];
        let match;

        while ((match = variableRegex.exec(command)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    // Validate command
    validateCommand(command) {
        const dangerousCommands = [
            'rm -rf /',
            'format',
            'fdisk',
            'mkfs',
            'dd if=',
            'shutdown',
            'reboot',
            'halt',
            'poweroff'
        ];

        const lowerCommand = command.toLowerCase();
        
        for (const dangerous of dangerousCommands) {
            if (lowerCommand.includes(dangerous)) {
                return {
                    valid: false,
                    reason: `Command contains potentially dangerous operation: ${dangerous}`
                };
            }
        }

        return { valid: true };
    }

    // Get preset categories with counts
    async getCategoriesWithCounts() {
        try {
            const [categories] = await pool.execute(
                `SELECT 
                    category,
                    COUNT(*) as preset_count
                FROM command_presets
                GROUP BY category
                ORDER BY category`
            );

            return categories;
        } catch (error) {
            console.error('Error getting categories with counts:', error);
            return [];
        }
    }
}

module.exports = new CommandPresetsService();