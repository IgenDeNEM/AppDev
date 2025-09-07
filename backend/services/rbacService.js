const db = require('../config/database');

class RBACService {
  // Get all user roles
  async getRoles() {
    try {
      const [roles] = await db.execute(
        'SELECT * FROM user_roles ORDER BY is_system_role DESC, name'
      );
      return roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  // Get role by ID
  async getRoleById(roleId) {
    try {
      const [roles] = await db.execute(
        'SELECT * FROM user_roles WHERE id = ?',
        [roleId]
      );
      return roles[0] || null;
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
    }
  }

  // Create new role
  async createRole(roleData) {
    try {
      const { name, description, is_system_role } = roleData;

      const [result] = await db.execute(
        'INSERT INTO user_roles (name, description, is_system_role) VALUES (?, ?, ?)',
        [name, description, is_system_role || false]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  // Update role
  async updateRole(roleId, roleData) {
    try {
      const { name, description } = roleData;

      await db.execute(
        'UPDATE user_roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, roleId]
      );

      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  // Delete role
  async deleteRole(roleId) {
    try {
      // Check if role is a system role
      const role = await this.getRoleById(roleId);
      if (role && role.is_system_role) {
        throw new Error('Cannot delete system roles');
      }

      // Check if role is assigned to any users
      const [assignments] = await db.execute(
        'SELECT COUNT(*) as count FROM user_role_assignments WHERE role_id = ?',
        [roleId]
      );

      if (assignments[0].count > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      await db.execute('DELETE FROM user_roles WHERE id = ?', [roleId]);
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  // Get user roles
  async getUserRoles(userId) {
    try {
      const [roles] = await db.execute(
        `SELECT r.*, ura.assigned_by, ura.created_at as assigned_at
         FROM user_roles r
         JOIN user_role_assignments ura ON r.id = ura.role_id
         WHERE ura.user_id = ?
         ORDER BY r.is_system_role DESC, r.name`,
        [userId]
      );
      return roles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  // Assign role to user
  async assignRoleToUser(userId, roleId, assignedBy) {
    try {
      await db.execute(
        'INSERT INTO user_role_assignments (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
        [userId, roleId, assignedBy]
      );

      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('User already has this role assigned');
      }
      console.error('Error assigning role to user:', error);
      throw error;
    }
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleId) {
    try {
      const [result] = await db.execute(
        'DELETE FROM user_role_assignments WHERE user_id = ? AND role_id = ?',
        [userId, roleId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Role assignment not found');
      }

      return true;
    } catch (error) {
      console.error('Error removing role from user:', error);
      throw error;
    }
  }

  // Get role permissions
  async getRolePermissions(roleId) {
    try {
      const [permissions] = await db.execute(
        'SELECT * FROM role_permissions WHERE role_id = ? ORDER BY permission_type, resource_id',
        [roleId]
      );
      return permissions;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw error;
    }
  }

  // Set role permissions
  async setRolePermissions(roleId, permissions) {
    try {
      // Start transaction
      await db.execute('START TRANSACTION');

      try {
        // Delete existing permissions
        await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

        // Insert new permissions
        for (const permission of permissions) {
          await db.execute(
            'INSERT INTO role_permissions (role_id, permission_type, resource_id, is_allowed) VALUES (?, ?, ?, ?)',
            [roleId, permission.permission_type, permission.resource_id, permission.is_allowed]
          );
        }

        await db.execute('COMMIT');
        return true;
      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error setting role permissions:', error);
      throw error;
    }
  }

  // Check if user has permission
  async hasPermission(userId, permissionType, resourceId = null) {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(userId);
      
      if (userRoles.length === 0) {
        return false;
      }

      // Check if any role has the permission
      for (const role of userRoles) {
        const hasPermission = await this.roleHasPermission(role.id, permissionType, resourceId);
        if (hasPermission) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw error;
    }
  }

  // Check if role has permission
  async roleHasPermission(roleId, permissionType, resourceId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count FROM role_permissions 
        WHERE role_id = ? AND permission_type = ? AND is_allowed = TRUE
      `;
      const params = [roleId, permissionType];

      if (resourceId !== null) {
        query += ' AND (resource_id = ? OR resource_id IS NULL)';
        params.push(resourceId);
      } else {
        query += ' AND resource_id IS NULL';
      }

      const [result] = await db.execute(query, params);
      return result[0].count > 0;
    } catch (error) {
      console.error('Error checking role permission:', error);
      throw error;
    }
  }

  // Get user permissions summary
  async getUserPermissionsSummary(userId) {
    try {
      const userRoles = await this.getUserRoles(userId);
      const permissions = {
        tweaks: [],
        package_categories: [],
        packages: [],
        system_actions: []
      };

      for (const role of userRoles) {
        const rolePermissions = await this.getRolePermissions(role.id);
        
        for (const permission of rolePermissions) {
          if (permission.is_allowed) {
            permissions[permission.permission_type].push({
              resource_id: permission.resource_id,
              role_name: role.name
            });
          }
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions summary:', error);
      throw error;
    }
  }

  // Get accessible tweaks for user
  async getAccessibleTweaks(userId) {
    try {
      const hasPermission = await this.hasPermission(userId, 'tweak');
      
      if (!hasPermission) {
        return [];
      }

      // Get all tweaks that user has access to
      const userRoles = await this.getUserRoles(userId);
      const accessibleTweakIds = new Set();

      for (const role of userRoles) {
        const rolePermissions = await this.getRolePermissions(role.id);
        
        for (const permission of rolePermissions) {
          if (permission.permission_type === 'tweak' && permission.is_allowed) {
            if (permission.resource_id === null) {
              // Access to all tweaks
              const [allTweaks] = await db.execute('SELECT id FROM tweaks WHERE is_active = TRUE');
              allTweaks.forEach(tweak => accessibleTweakIds.add(tweak.id));
            } else {
              // Access to specific tweak
              accessibleTweakIds.add(permission.resource_id);
            }
          }
        }
      }

      if (accessibleTweakIds.size === 0) {
        return [];
      }

      const tweakIds = Array.from(accessibleTweakIds);
      const placeholders = tweakIds.map(() => '?').join(',');

      const [tweaks] = await db.execute(
        `SELECT t.*, tc.name as category_name, tc.icon as category_icon
         FROM tweaks t
         JOIN tweak_categories tc ON t.category_id = tc.id
         WHERE t.id IN (${placeholders}) AND t.is_active = TRUE
         ORDER BY tc.sort_order, t.name`,
        tweakIds
      );

      return tweaks;
    } catch (error) {
      console.error('Error getting accessible tweaks:', error);
      throw error;
    }
  }

  // Get accessible package categories for user
  async getAccessiblePackageCategories(userId) {
    try {
      const hasPermission = await this.hasPermission(userId, 'package_category');
      
      if (!hasPermission) {
        return [];
      }

      const userRoles = await this.getUserRoles(userId);
      const accessibleCategoryIds = new Set();

      for (const role of userRoles) {
        const rolePermissions = await this.getRolePermissions(role.id);
        
        for (const permission of rolePermissions) {
          if (permission.permission_type === 'package_category' && permission.is_allowed) {
            if (permission.resource_id === null) {
              // Access to all categories
              const [allCategories] = await db.execute('SELECT id FROM package_categories WHERE is_active = TRUE');
              allCategories.forEach(category => accessibleCategoryIds.add(category.id));
            } else {
              // Access to specific category
              accessibleCategoryIds.add(permission.resource_id);
            }
          }
        }
      }

      if (accessibleCategoryIds.size === 0) {
        return [];
      }

      const categoryIds = Array.from(accessibleCategoryIds);
      const placeholders = categoryIds.map(() => '?').join(',');

      const [categories] = await db.execute(
        `SELECT * FROM package_categories 
         WHERE id IN (${placeholders}) AND is_active = TRUE
         ORDER BY sort_order, name`,
        categoryIds
      );

      return categories;
    } catch (error) {
      console.error('Error getting accessible package categories:', error);
      throw error;
    }
  }

  // Get accessible packages for user
  async getAccessiblePackages(userId, filters = {}) {
    try {
      const accessibleCategories = await this.getAccessiblePackageCategories(userId);
      
      if (accessibleCategories.length === 0) {
        return [];
      }

      const categoryIds = accessibleCategories.map(cat => cat.id);
      const placeholders = categoryIds.map(() => '?').join(',');

      let query = `
        SELECT p.*, pc.name as category_name, pc.icon as category_icon
        FROM packages p
        JOIN package_categories pc ON p.category_id = pc.id
        WHERE p.category_id IN (${placeholders}) AND p.is_active = TRUE
      `;
      const params = [...categoryIds];

      if (filters.search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY pc.sort_order, p.name';

      const [packages] = await db.execute(query, params);
      return packages;
    } catch (error) {
      console.error('Error getting accessible packages:', error);
      throw error;
    }
  }

  // Check if user can perform system action
  async canPerformSystemAction(userId, action) {
    try {
      return await this.hasPermission(userId, 'system_action', action);
    } catch (error) {
      console.error('Error checking system action permission:', error);
      throw error;
    }
  }

  // Initialize default permissions for system roles
  async initializeDefaultPermissions() {
    try {
      // Get system roles
      const [roles] = await db.execute('SELECT * FROM user_roles WHERE is_system_role = TRUE');
      
      for (const role of roles) {
        let permissions = [];

        switch (role.name) {
          case 'superadmin':
            // Superadmin has all permissions
            permissions = [
              { permission_type: 'tweak', resource_id: null, is_allowed: true },
              { permission_type: 'package_category', resource_id: null, is_allowed: true },
              { permission_type: 'package', resource_id: null, is_allowed: true },
              { permission_type: 'system_action', resource_id: null, is_allowed: true }
            ];
            break;

          case 'admin':
            // Admin has most permissions except dangerous tweaks
            permissions = [
              { permission_type: 'tweak', resource_id: null, is_allowed: true },
              { permission_type: 'package_category', resource_id: null, is_allowed: true },
              { permission_type: 'package', resource_id: null, is_allowed: true },
              { permission_type: 'system_action', resource_id: 'user_management', is_allowed: true },
              { permission_type: 'system_action', resource_id: 'log_viewing', is_allowed: true }
            ];
            break;

          case 'user':
            // Regular user has limited permissions
            permissions = [
              { permission_type: 'package_category', resource_id: 1, is_allowed: true }, // Browsers
              { permission_type: 'package_category', resource_id: 5, is_allowed: true }, // Utilities
              { permission_type: 'tweak', resource_id: null, is_allowed: false } // No dangerous tweaks
            ];
            break;
        }

        if (permissions.length > 0) {
          await this.setRolePermissions(role.id, permissions);
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing default permissions:', error);
      throw error;
    }
  }
}

module.exports = new RBACService();