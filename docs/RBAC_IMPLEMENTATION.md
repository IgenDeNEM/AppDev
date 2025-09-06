# Role-Based Access Control (RBAC) Implementation

This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented in the Tweak Application.

## 🏗️ Architecture Overview

The RBAC system is built on a flexible permission model that allows fine-grained control over user access to system resources.

### Core Components
- **Users**: Individual system users
- **Roles**: Collections of permissions
- **Permissions**: Specific access rights to resources
- **Resources**: System entities (tweaks, packages, system actions)

## 📊 Database Schema

### User Roles Table
```sql
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Role Permissions Table
```sql
CREATE TABLE role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_type ENUM('tweak', 'package_category', 'package', 'system_action') NOT NULL,
    resource_id INT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE
);
```

### User Role Assignments Table
```sql
CREATE TABLE user_role_assignments (
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
```

## 🔐 Permission Types

### 1. Tweak Permissions
Control access to system tweaks and optimizations.

**Permission Structure:**
- `permission_type`: 'tweak'
- `resource_id`: Specific tweak ID or NULL for all tweaks
- `is_allowed`: Boolean indicating access permission

**Examples:**
- Access to all tweaks: `resource_id = NULL`
- Access to specific tweak: `resource_id = 123`
- No access to tweaks: Permission not granted

### 2. Package Category Permissions
Control access to package categories in the Package Store.

**Permission Structure:**
- `permission_type`: 'package_category'
- `resource_id`: Specific category ID or NULL for all categories
- `is_allowed`: Boolean indicating access permission

**Examples:**
- Access to all categories: `resource_id = NULL`
- Access to Browsers only: `resource_id = 1`
- Access to Gaming and Utilities: Multiple permissions

### 3. Package Permissions
Control access to specific packages.

**Permission Structure:**
- `permission_type`: 'package'
- `resource_id`: Specific package ID or NULL for all packages
- `is_allowed`: Boolean indicating access permission

### 4. System Action Permissions
Control access to system-level operations.

**Permission Structure:**
- `permission_type`: 'system_action'
- `resource_id`: Specific action identifier
- `is_allowed`: Boolean indicating access permission

**Available Actions:**
- `user_management`: Manage user accounts
- `log_viewing`: View system logs
- `system_cleanup`: Execute system cleanup
- `services_management`: Manage Windows services

## 👥 Default Roles

### Superadmin Role
Full system access with all permissions.

**Permissions:**
- All tweaks: `tweak` with `resource_id = NULL`
- All package categories: `package_category` with `resource_id = NULL`
- All packages: `package` with `resource_id = NULL`
- All system actions: `system_action` with `resource_id = NULL`

### Admin Role
Administrative access with most permissions.

**Permissions:**
- All tweaks: `tweak` with `resource_id = NULL`
- All package categories: `package_category` with `resource_id = NULL`
- All packages: `package` with `resource_id = NULL`
- User management: `system_action` with `resource_id = 'user_management'`
- Log viewing: `system_action` with `resource_id = 'log_viewing'`

### User Role
Standard user with limited permissions.

**Permissions:**
- Browsers category: `package_category` with `resource_id = 1`
- Utilities category: `package_category` with `resource_id = 5`
- No dangerous tweaks: No `tweak` permissions

## 🔧 Implementation Details

### Backend Service (RBACService)

#### Permission Checking
```javascript
async hasPermission(userId, permissionType, resourceId = null) {
  // Get user roles
  const userRoles = await this.getUserRoles(userId);
  
  // Check if any role has the permission
  for (const role of userRoles) {
    const hasPermission = await this.roleHasPermission(role.id, permissionType, resourceId);
    if (hasPermission) {
      return true;
    }
  }
  
  return false;
}
```

#### Role Permission Checking
```javascript
async roleHasPermission(roleId, permissionType, resourceId = null) {
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
}
```

### API Endpoints

#### Check User Permission
```http
POST /api/rbac/check-permission
Content-Type: application/json

{
  "permission_type": "tweak",
  "resource_id": 123
}
```

#### Get User Permissions Summary
```http
GET /api/rbac/users/{userId}/permissions
```

#### Manage Role Permissions
```http
PUT /api/rbac/roles/{roleId}/permissions
Content-Type: application/json

{
  "permissions": [
    {
      "permission_type": "tweak",
      "resource_id": null,
      "is_allowed": true
    },
    {
      "permission_type": "package_category",
      "resource_id": 1,
      "is_allowed": true
    }
  ]
}
```

## 🎯 Usage Examples

### Frontend Permission Checking
```javascript
// Check if user can execute a specific tweak
const canExecuteTweak = await axios.post('/api/rbac/check-permission', {
  permission_type: 'tweak',
  resource_id: tweakId
});

if (canExecuteTweak.data.hasPermission) {
  // Allow tweak execution
  executeTweak(tweakId);
} else {
  // Show access denied message
  showAccessDenied();
}
```

### Backend Route Protection
```javascript
// Protect route with permission check
router.post('/:id/execute', auth, async (req, res) => {
  // Check if user has access to this tweak
  const hasAccess = await rbacService.hasPermission(req.user.id, 'tweak', req.params.id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to execute this tweak' });
  }
  
  // Proceed with tweak execution
  // ...
});
```

### Admin Panel Role Management
```javascript
// Assign role to user
const assignRole = async (userId, roleId) => {
  try {
    await axios.post(`/api/rbac/users/${userId}/roles/${roleId}`);
    showSuccess('Role assigned successfully');
  } catch (error) {
    showError('Failed to assign role');
  }
};

// Update role permissions
const updatePermissions = async (roleId, permissions) => {
  try {
    await axios.put(`/api/rbac/roles/${roleId}/permissions`, { permissions });
    showSuccess('Permissions updated successfully');
  } catch (error) {
    showError('Failed to update permissions');
  }
};
```

## 🔒 Security Considerations

### Permission Inheritance
- Users can have multiple roles
- Permissions are additive (OR logic)
- If any role grants permission, user has access
- Deny permissions are not supported (security by default)

### System Role Protection
- System roles cannot be deleted
- System role permissions cannot be modified
- Only custom roles can be fully managed

### Audit Trail
- All role assignments are logged
- Permission changes are tracked
- User actions are recorded with role context

## 🚀 Best Practices

### Role Design
1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Role Separation**: Separate administrative and user roles
3. **Clear Naming**: Use descriptive role and permission names
4. **Documentation**: Document role purposes and permissions

### Permission Management
1. **Regular Review**: Periodically review user roles and permissions
2. **Access Auditing**: Monitor permission usage and access patterns
3. **Temporary Access**: Use temporary role assignments for specific tasks
4. **Bulk Operations**: Use bulk permission updates for efficiency

### Security
1. **Regular Updates**: Keep permission system updated
2. **Monitoring**: Monitor for unauthorized access attempts
3. **Backup**: Regular backup of role and permission data
4. **Testing**: Regular testing of permission boundaries

## 🛠️ Troubleshooting

### Common Issues

#### Permission Denied Errors
- Check user role assignments
- Verify role permissions
- Ensure resource exists and is accessible

#### Role Assignment Failures
- Check for duplicate role assignments
- Verify user and role exist
- Ensure assigner has permission to assign roles

#### Permission Checking Failures
- Verify database connection
- Check permission data integrity
- Review role permission queries

### Debug Mode
Enable detailed permission logging:
```javascript
// Add to environment variables
DEBUG=rbac:*
LOG_LEVEL=debug
```

### Health Checks
Monitor RBAC system health:
```http
GET /api/rbac/health
```

## 📈 Future Enhancements

### Planned Features
- **Conditional Permissions**: Time-based or context-based permissions
- **Permission Groups**: Group related permissions for easier management
- **Advanced Inheritance**: Hierarchical role inheritance
- **Permission Templates**: Predefined permission sets for common roles

### Integration
- **LDAP/Active Directory**: Integration with enterprise directory services
- **SSO Support**: Single sign-on integration
- **API Keys**: Programmatic access with role-based permissions
- **Webhook Integration**: Real-time permission change notifications

---

This RBAC implementation provides a robust, scalable, and secure permission system that can adapt to various organizational needs while maintaining security and ease of management.