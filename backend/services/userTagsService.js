const { pool } = require('../config/database');

class UserTagsService {
    constructor() {
        this.defaultTags = [
            { name: 'VIP', color: '#ff6b35', description: 'VIP users with special privileges' },
            { name: 'Beta Tester', color: '#4ecdc4', description: 'Users participating in beta testing' },
            { name: 'Premium', color: '#45b7d1', description: 'Premium subscription users' },
            { name: 'Support', color: '#96ceb4', description: 'Users requiring special support' },
            { name: 'Developer', color: '#feca57', description: 'Developer accounts' },
            { name: 'Trial', color: '#ff9ff3', description: 'Trial period users' }
        ];
    }

    // Initialize default tags
    async initializeDefaultTags() {
        try {
            for (const tag of this.defaultTags) {
                await pool.execute(
                    'INSERT IGNORE INTO user_tags (name, color, description) VALUES (?, ?, ?)',
                    [tag.name, tag.color, tag.description]
                );
            }
            console.log('Default user tags initialized');
        } catch (error) {
            console.error('Error initializing default tags:', error);
        }
    }

    // Create a new tag
    async createTag(name, color, description = null) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO user_tags (name, color, description) VALUES (?, ?, ?)',
                [name, color, description]
            );

            return { success: true, tagId: result.insertId };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, error: 'Tag name already exists' };
            }
            console.error('Error creating tag:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all tags
    async getAllTags() {
        try {
            const [tags] = await pool.execute(
                'SELECT * FROM user_tags ORDER BY name'
            );

            return tags;
        } catch (error) {
            console.error('Error getting all tags:', error);
            return [];
        }
    }

    // Get tag by ID
    async getTagById(tagId) {
        try {
            const [tags] = await pool.execute(
                'SELECT * FROM user_tags WHERE id = ?',
                [tagId]
            );

            return tags.length > 0 ? tags[0] : null;
        } catch (error) {
            console.error('Error getting tag by ID:', error);
            return null;
        }
    }

    // Update tag
    async updateTag(tagId, updates) {
        try {
            const allowedFields = ['name', 'color', 'description'];
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

            updateValues.push(tagId);

            await pool.execute(
                `UPDATE user_tags SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            return { success: true };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, error: 'Tag name already exists' };
            }
            console.error('Error updating tag:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete tag
    async deleteTag(tagId) {
        try {
            // First remove all assignments
            await pool.execute(
                'DELETE FROM user_tag_assignments WHERE tag_id = ?',
                [tagId]
            );

            // Then delete the tag
            await pool.execute(
                'DELETE FROM user_tags WHERE id = ?',
                [tagId]
            );

            return { success: true };
        } catch (error) {
            console.error('Error deleting tag:', error);
            return { success: false, error: error.message };
        }
    }

    // Assign tag to user
    async assignTagToUser(userId, tagId, assignedBy) {
        try {
            await pool.execute(
                'INSERT INTO user_tag_assignments (user_id, tag_id, assigned_by) VALUES (?, ?, ?)',
                [userId, tagId, assignedBy]
            );

            return { success: true };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { success: false, error: 'Tag already assigned to user' };
            }
            console.error('Error assigning tag to user:', error);
            return { success: false, error: error.message };
        }
    }

    // Remove tag from user
    async removeTagFromUser(userId, tagId) {
        try {
            await pool.execute(
                'DELETE FROM user_tag_assignments WHERE user_id = ? AND tag_id = ?',
                [userId, tagId]
            );

            return { success: true };
        } catch (error) {
            console.error('Error removing tag from user:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user tags
    async getUserTags(userId) {
        try {
            const [tags] = await pool.execute(
                `SELECT 
                    ut.id,
                    ut.name,
                    ut.color,
                    ut.description,
                    uta.assigned_by,
                    uta.created_at as assigned_at,
                    u.username as assigned_by_username
                FROM user_tag_assignments uta
                JOIN user_tags ut ON uta.tag_id = ut.id
                JOIN users u ON uta.assigned_by = u.id
                WHERE uta.user_id = ?
                ORDER BY uta.created_at DESC`,
                [userId]
            );

            return tags;
        } catch (error) {
            console.error('Error getting user tags:', error);
            return [];
        }
    }

    // Get users by tag
    async getUsersByTag(tagId, limit = 100, offset = 0) {
        try {
            const [users] = await pool.execute(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.is_admin,
                    u.is_online,
                    u.last_login,
                    u.created_at,
                    uta.assigned_by,
                    uta.created_at as tagged_at,
                    assigner.username as assigned_by_username
                FROM user_tag_assignments uta
                JOIN users u ON uta.user_id = u.id
                JOIN users assigner ON uta.assigned_by = assigner.id
                WHERE uta.tag_id = ?
                ORDER BY uta.created_at DESC
                LIMIT ? OFFSET ?`,
                [tagId, limit, offset]
            );

            return users;
        } catch (error) {
            console.error('Error getting users by tag:', error);
            return [];
        }
    }

    // Get tag statistics
    async getTagStatistics() {
        try {
            const [stats] = await pool.execute(
                `SELECT 
                    ut.id,
                    ut.name,
                    ut.color,
                    COUNT(uta.user_id) as user_count
                FROM user_tags ut
                LEFT JOIN user_tag_assignments uta ON ut.id = uta.tag_id
                GROUP BY ut.id, ut.name, ut.color
                ORDER BY user_count DESC`
            );

            return stats;
        } catch (error) {
            console.error('Error getting tag statistics:', error);
            return [];
        }
    }

    // Bulk assign tags
    async bulkAssignTags(userIds, tagIds, assignedBy) {
        try {
            const assignments = [];
            for (const userId of userIds) {
                for (const tagId of tagIds) {
                    assignments.push([userId, tagId, assignedBy]);
                }
            }

            if (assignments.length > 0) {
                await pool.execute(
                    'INSERT IGNORE INTO user_tag_assignments (user_id, tag_id, assigned_by) VALUES ?',
                    [assignments]
                );
            }

            return { success: true, assignedCount: assignments.length };
        } catch (error) {
            console.error('Error bulk assigning tags:', error);
            return { success: false, error: error.message };
        }
    }

    // Bulk remove tags
    async bulkRemoveTags(userIds, tagIds) {
        try {
            const conditions = [];
            const params = [];

            for (const userId of userIds) {
                for (const tagId of tagIds) {
                    conditions.push('(user_id = ? AND tag_id = ?)');
                    params.push(userId, tagId);
                }
            }

            if (conditions.length > 0) {
                await pool.execute(
                    `DELETE FROM user_tag_assignments WHERE ${conditions.join(' OR ')}`,
                    params
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error bulk removing tags:', error);
            return { success: false, error: error.message };
        }
    }

    // Search tags
    async searchTags(query, limit = 20) {
        try {
            const [tags] = await pool.execute(
                'SELECT * FROM user_tags WHERE name LIKE ? OR description LIKE ? ORDER BY name LIMIT ?',
                [`%${query}%`, `%${query}%`, limit]
            );

            return tags;
        } catch (error) {
            console.error('Error searching tags:', error);
            return [];
        }
    }

    // Get tag usage history
    async getTagUsageHistory(tagId, limit = 50) {
        try {
            const [history] = await pool.execute(
                `SELECT 
                    uta.created_at,
                    u.username as user_username,
                    u.email as user_email,
                    assigner.username as assigned_by_username
                FROM user_tag_assignments uta
                JOIN users u ON uta.user_id = u.id
                JOIN users assigner ON uta.assigned_by = assigner.id
                WHERE uta.tag_id = ?
                ORDER BY uta.created_at DESC
                LIMIT ?`,
                [tagId, limit]
            );

            return history;
        } catch (error) {
            console.error('Error getting tag usage history:', error);
            return [];
        }
    }

    // Get users with multiple tags
    async getUsersWithMultipleTags(minTags = 2) {
        try {
            const [users] = await pool.execute(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(uta.tag_id) as tag_count,
                    GROUP_CONCAT(ut.name) as tag_names
                FROM users u
                JOIN user_tag_assignments uta ON u.id = uta.user_id
                JOIN user_tags ut ON uta.tag_id = ut.id
                GROUP BY u.id, u.username, u.email
                HAVING tag_count >= ?
                ORDER BY tag_count DESC`,
                [minTags]
            );

            return users;
        } catch (error) {
            console.error('Error getting users with multiple tags:', error);
            return [];
        }
    }

    // Clean up orphaned tag assignments
    async cleanupOrphanedAssignments() {
        try {
            const [result] = await pool.execute(
                `DELETE uta FROM user_tag_assignments uta
                LEFT JOIN users u ON uta.user_id = u.id
                LEFT JOIN user_tags ut ON uta.tag_id = ut.id
                WHERE u.id IS NULL OR ut.id IS NULL`
            );

            console.log(`Cleaned up ${result.affectedRows} orphaned tag assignments`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up orphaned assignments:', error);
            return 0;
        }
    }
}

module.exports = new UserTagsService();