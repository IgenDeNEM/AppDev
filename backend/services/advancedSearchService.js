const db = require('../config/database');

class AdvancedSearchService {
    // Advanced user search with multiple filters
    async searchUsers(filters, pagination = { limit: 50, offset: 0 }) {
        try {
            const {
                searchTerm,
                role,
                status,
                registrationDateFrom,
                registrationDateTo,
                lastLoginFrom,
                lastLoginTo,
                hasTags,
                tags,
                country,
                deviceType,
                isActive,
                hasVerifiedEmail,
                failedLoginAttempts,
                accountLocked,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = filters;

            let query = `
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.is_active,
                    u.created_at,
                    u.last_login,
                    u.first_login,
                    u.login_count,
                    u.failed_login_attempts,
                    u.account_locked_until,
                    uss.two_factor_enabled,
                    uss.email_notifications,
                    uss.security_alerts,
                    uss.account_locked_until as security_locked_until,
                    GROUP_CONCAT(DISTINCT ut.name) as tags,
                    GROUP_CONCAT(DISTINCT ut.color) as tag_colors,
                    COUNT(DISTINCT il.id) as total_logins,
                    MAX(il.created_at) as last_activity,
                    COUNT(DISTINCT us.id) as active_sessions
                FROM users u
                LEFT JOIN user_security_settings uss ON u.id = uss.user_id
                LEFT JOIN user_tag_assignments uta ON u.id = uta.user_id
                LEFT JOIN user_tags ut ON uta.tag_id = ut.id
                LEFT JOIN ip_logs il ON u.id = il.user_id AND il.action = 'login'
                LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = 1
            `;

            const conditions = [];
            const params = [];

            // Search term (username, email)
            if (searchTerm) {
                conditions.push(`(u.username LIKE ? OR u.email LIKE ?)`);
                params.push(`%${searchTerm}%`, `%${searchTerm}%`);
            }

            // Role filter
            if (role) {
                conditions.push(`u.role = ?`);
                params.push(role);
            }

            // Status filter
            if (status) {
                if (status === 'active') {
                    conditions.push(`u.is_active = 1`);
                } else if (status === 'inactive') {
                    conditions.push(`u.is_active = 0`);
                } else if (status === 'locked') {
                    conditions.push(`(u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW())`);
                }
            }

            // Registration date range
            if (registrationDateFrom) {
                conditions.push(`u.created_at >= ?`);
                params.push(registrationDateFrom);
            }
            if (registrationDateTo) {
                conditions.push(`u.created_at <= ?`);
                params.push(registrationDateTo);
            }

            // Last login date range
            if (lastLoginFrom) {
                conditions.push(`u.last_login >= ?`);
                params.push(lastLoginFrom);
            }
            if (lastLoginTo) {
                conditions.push(`u.last_login <= ?`);
                params.push(lastLoginTo);
            }

            // Tags filter
            if (hasTags === 'true') {
                conditions.push(`uta.user_id IS NOT NULL`);
            } else if (hasTags === 'false') {
                conditions.push(`uta.user_id IS NULL`);
            }

            if (tags && tags.length > 0) {
                conditions.push(`ut.id IN (${tags.map(() => '?').join(',')})`);
                params.push(...tags);
            }

            // Country filter
            if (country) {
                conditions.push(`u.id IN (
                    SELECT DISTINCT user_id 
                    FROM ip_logs 
                    WHERE country = ? AND action = 'login'
                )`);
                params.push(country);
            }

            // Device type filter
            if (deviceType) {
                conditions.push(`u.id IN (
                    SELECT DISTINCT user_id 
                    FROM ip_logs 
                    WHERE user_agent LIKE ? AND action = 'login'
                )`);
                params.push(`%${deviceType}%`);
            }

            // Active status
            if (isActive !== undefined) {
                conditions.push(`u.is_active = ?`);
                params.push(isActive ? 1 : 0);
            }

            // Email verification status
            if (hasVerifiedEmail !== undefined) {
                if (hasVerifiedEmail) {
                    conditions.push(`uss.email_notifications = 1`);
                } else {
                    conditions.push(`(uss.email_notifications = 0 OR uss.email_notifications IS NULL)`);
                }
            }

            // Failed login attempts
            if (failedLoginAttempts) {
                conditions.push(`u.failed_login_attempts >= ?`);
                params.push(failedLoginAttempts);
            }

            // Account locked status
            if (accountLocked !== undefined) {
                if (accountLocked) {
                    conditions.push(`(u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW())`);
                } else {
                    conditions.push(`(u.account_locked_until IS NULL OR u.account_locked_until <= NOW())`);
                }
            }

            // Add WHERE clause
            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            // Add GROUP BY
            query += ` GROUP BY u.id`;

            // Add ORDER BY
            const validSortFields = ['created_at', 'last_login', 'username', 'email', 'role', 'login_count'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            query += ` ORDER BY u.${sortField} ${order}`;

            // Add pagination
            query += ` LIMIT ? OFFSET ?`;
            params.push(pagination.limit, pagination.offset);

            const [users] = await db.execute(query, params);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                LEFT JOIN user_security_settings uss ON u.id = uss.user_id
                LEFT JOIN user_tag_assignments uta ON u.id = uta.user_id
                LEFT JOIN user_tags ut ON uta.tag_id = ut.id
                LEFT JOIN ip_logs il ON u.id = il.user_id AND il.action = 'login'
                LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = 1
            `;

            if (conditions.length > 0) {
                countQuery += ` WHERE ${conditions.join(' AND ')}`;
            }

            const [countResult] = await db.execute(countQuery, params.slice(0, -2)); // Remove limit and offset
            const total = countResult[0].total;

            return {
                users: users.map(user => ({
                    ...user,
                    tags: user.tags ? user.tags.split(',') : [],
                    tag_colors: user.tag_colors ? user.tag_colors.split(',') : []
                })),
                total,
                page: Math.floor(pagination.offset / pagination.limit) + 1,
                totalPages: Math.ceil(total / pagination.limit)
            };
        } catch (error) {
            console.error('Advanced user search error:', error);
            throw error;
        }
    }

    // Get search filter options
    async getSearchFilterOptions() {
        try {
            // Get available roles
            const [roles] = await db.execute(`
                SELECT DISTINCT role, COUNT(*) as count
                FROM users
                GROUP BY role
                ORDER BY count DESC
            `);

            // Get available countries
            const [countries] = await db.execute(`
                SELECT DISTINCT country, COUNT(DISTINCT user_id) as user_count
                FROM ip_logs
                WHERE country IS NOT NULL AND action = 'login'
                GROUP BY country
                ORDER BY user_count DESC
                LIMIT 50
            `);

            // Get available device types
            const [deviceTypes] = await db.execute(`
                SELECT 
                    CASE 
                        WHEN user_agent LIKE '%Windows%' THEN 'Windows'
                        WHEN user_agent LIKE '%Mac%' THEN 'macOS'
                        WHEN user_agent LIKE '%Linux%' THEN 'Linux'
                        WHEN user_agent LIKE '%Android%' THEN 'Android'
                        WHEN user_agent LIKE '%iOS%' THEN 'iOS'
                        ELSE 'Other'
                    END as device_type,
                    COUNT(DISTINCT user_id) as user_count
                FROM ip_logs
                WHERE action = 'login'
                GROUP BY device_type
                ORDER BY user_count DESC
            `);

            // Get available tags
            const [tags] = await db.execute(`
                SELECT ut.id, ut.name, ut.color, COUNT(uta.user_id) as user_count
                FROM user_tags ut
                LEFT JOIN user_tag_assignments uta ON ut.id = uta.tag_id
                GROUP BY ut.id, ut.name, ut.color
                ORDER BY user_count DESC
            `);

            // Get date ranges
            const [dateRanges] = await db.execute(`
                SELECT 
                    MIN(created_at) as earliest_registration,
                    MAX(created_at) as latest_registration,
                    MIN(last_login) as earliest_login,
                    MAX(last_login) as latest_login
                FROM users
            `);

            return {
                roles,
                countries,
                deviceTypes,
                tags,
                dateRanges: dateRanges[0]
            };
        } catch (error) {
            console.error('Get search filter options error:', error);
            throw error;
        }
    }

    // Get user search suggestions
    async getUserSearchSuggestions(query, limit = 10) {
        try {
            const [suggestions] = await db.execute(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    u.last_login,
                    GROUP_CONCAT(DISTINCT ut.name) as tags
                FROM users u
                LEFT JOIN user_tag_assignments uta ON u.id = uta.user_id
                LEFT JOIN user_tags ut ON uta.tag_id = ut.id
                WHERE u.username LIKE ? OR u.email LIKE ?
                GROUP BY u.id
                ORDER BY 
                    CASE 
                        WHEN u.username LIKE ? THEN 1
                        WHEN u.email LIKE ? THEN 2
                        ELSE 3
                    END,
                    u.last_login DESC
                LIMIT ?
            `, [
                `%${query}%`,
                `%${query}%`,
                `${query}%`,
                `${query}%`,
                limit
            ]);

            return suggestions.map(user => ({
                ...user,
                tags: user.tags ? user.tags.split(',') : []
            }));
        } catch (error) {
            console.error('Get user search suggestions error:', error);
            throw error;
        }
    }

    // Get user activity summary
    async getUserActivitySummary(userId) {
        try {
            const [summary] = await db.execute(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    u.last_login,
                    u.first_login,
                    u.login_count,
                    u.failed_login_attempts,
                    COUNT(DISTINCT il.id) as total_logins,
                    COUNT(DISTINCT CASE WHEN il.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN il.id END) as logins_last_week,
                    COUNT(DISTINCT CASE WHEN il.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN il.id END) as logins_last_month,
                    COUNT(DISTINCT us.id) as active_sessions,
                    GROUP_CONCAT(DISTINCT ut.name) as tags,
                    GROUP_CONCAT(DISTINCT ut.color) as tag_colors,
                    MAX(il.created_at) as last_activity,
                    COUNT(DISTINCT CASE WHEN il.country IS NOT NULL THEN il.country END) as countries_visited
                FROM users u
                LEFT JOIN ip_logs il ON u.id = il.user_id AND il.action = 'login'
                LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = 1
                LEFT JOIN user_tag_assignments uta ON u.id = uta.user_id
                LEFT JOIN user_tags ut ON uta.tag_id = ut.id
                WHERE u.id = ?
                GROUP BY u.id
            `, [userId]);

            if (summary.length === 0) {
                return null;
            }

            const user = summary[0];
            return {
                ...user,
                tags: user.tags ? user.tags.split(',') : [],
                tag_colors: user.tag_colors ? user.tag_colors.split(',') : []
            };
        } catch (error) {
            console.error('Get user activity summary error:', error);
            throw error;
        }
    }

    // Get user login history
    async getUserLoginHistory(userId, limit = 50, offset = 0) {
        try {
            const [history] = await db.execute(`
                SELECT 
                    il.created_at,
                    il.ip_address,
                    il.country,
                    il.city,
                    il.user_agent,
                    il.action
                FROM ip_logs il
                WHERE il.user_id = ? AND il.action = 'login'
                ORDER BY il.created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);

            const [totalCount] = await db.execute(`
                SELECT COUNT(*) as total
                FROM ip_logs
                WHERE user_id = ? AND action = 'login'
            `, [userId]);

            return {
                history,
                total: totalCount[0].total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalCount[0].total / limit)
            };
        } catch (error) {
            console.error('Get user login history error:', error);
            throw error;
        }
    }

    // Get user session history
    async getUserSessionHistory(userId, limit = 50, offset = 0) {
        try {
            const [sessions] = await db.execute(`
                SELECT 
                    us.created_at,
                    us.last_activity,
                    us.ip_address,
                    us.user_agent,
                    us.is_active,
                    us.expires_at
                FROM user_sessions us
                WHERE us.user_id = ?
                ORDER BY us.created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);

            const [totalCount] = await db.execute(`
                SELECT COUNT(*) as total
                FROM user_sessions
                WHERE user_id = ?
            `, [userId]);

            return {
                sessions,
                total: totalCount[0].total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalCount[0].total / limit)
            };
        } catch (error) {
            console.error('Get user session history error:', error);
            throw error;
        }
    }

    // Export search results
    async exportSearchResults(filters, format = 'csv') {
        try {
            const results = await this.searchUsers(filters, { limit: 10000, offset: 0 });
            
            if (format === 'csv') {
                return this.convertToCSV(results.users);
            } else if (format === 'json') {
                return JSON.stringify(results.users, null, 2);
            }
            
            return results.users;
        } catch (error) {
            console.error('Export search results error:', error);
            throw error;
        }
    }

    // Convert users to CSV format
    convertToCSV(users) {
        const headers = [
            'ID',
            'Username',
            'Email',
            'Role',
            'Active',
            'Created At',
            'Last Login',
            'First Login',
            'Login Count',
            'Failed Login Attempts',
            'Account Locked Until',
            'Two Factor Enabled',
            'Email Notifications',
            'Security Alerts',
            'Tags',
            'Total Logins',
            'Last Activity',
            'Active Sessions'
        ];

        const rows = users.map(user => [
            user.id,
            user.username,
            user.email,
            user.role,
            user.is_active ? 'Yes' : 'No',
            user.created_at,
            user.last_login,
            user.first_login,
            user.login_count,
            user.failed_login_attempts,
            user.account_locked_until,
            user.two_factor_enabled ? 'Yes' : 'No',
            user.email_notifications ? 'Yes' : 'No',
            user.security_alerts ? 'Yes' : 'No',
            user.tags.join(', '),
            user.total_logins,
            user.last_activity,
            user.active_sessions
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }
}

module.exports = new AdvancedSearchService();