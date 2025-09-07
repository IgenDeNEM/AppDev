const axios = require('axios');
const { pool } = require('../config/database');

class GeolocationService {
    constructor() {
        this.apiKey = process.env.IP_GEOLOCATION_API_KEY || null;
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Get geolocation data for an IP address
    async getGeolocation(ipAddress) {
        try {
            // Check cache first
            if (this.cache.has(ipAddress)) {
                const cached = this.cache.get(ipAddress);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Skip private/local IPs
            if (this.isPrivateIP(ipAddress)) {
                return {
                    country: 'Local',
                    country_code: 'LOC',
                    region: 'Local Network',
                    city: 'Local',
                    latitude: null,
                    longitude: null,
                    timezone: null,
                    isp: 'Local Network',
                    org: 'Local Network'
                };
            }

            let geolocationData = null;

            // Try multiple geolocation services
            try {
                // Try ipapi.co (free tier: 1000 requests/day)
                geolocationData = await this.getFromIpapi(ipAddress);
            } catch (error) {
                console.log('ipapi.co failed, trying ip-api.com');
                try {
                    // Try ip-api.com (free tier: 1000 requests/month)
                    geolocationData = await this.getFromIpApi(ipAddress);
                } catch (error2) {
                    console.log('ip-api.com failed, using fallback');
                    geolocationData = this.getFallbackData(ipAddress);
                }
            }

            // Cache the result
            this.cache.set(ipAddress, {
                data: geolocationData,
                timestamp: Date.now()
            });

            return geolocationData;
        } catch (error) {
            console.error('Geolocation error:', error);
            return this.getFallbackData(ipAddress);
        }
    }

    // Get geolocation from ipapi.co
    async getFromIpapi(ipAddress) {
        const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
            timeout: 5000
        });

        return {
            country: response.data.country_name || 'Unknown',
            country_code: response.data.country_code || 'XX',
            region: response.data.region || 'Unknown',
            region_name: response.data.region || 'Unknown',
            city: response.data.city || 'Unknown',
            zip: response.data.postal || null,
            latitude: response.data.latitude || null,
            longitude: response.data.longitude || null,
            timezone: response.data.timezone || null,
            isp: response.data.org || 'Unknown',
            org: response.data.org || 'Unknown',
            as_field: response.data.asn || null
        };
    }

    // Get geolocation from ip-api.com
    async getFromIpApi(ipAddress) {
        const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
            timeout: 5000
        });

        return {
            country: response.data.country || 'Unknown',
            country_code: response.data.countryCode || 'XX',
            region: response.data.region || 'Unknown',
            region_name: response.data.regionName || 'Unknown',
            city: response.data.city || 'Unknown',
            zip: response.data.zip || null,
            latitude: response.data.lat || null,
            longitude: response.data.lon || null,
            timezone: response.data.timezone || null,
            isp: response.data.isp || 'Unknown',
            org: response.data.org || 'Unknown',
            as_field: response.data.as || null
        };
    }

    // Fallback data when all services fail
    getFallbackData(ipAddress) {
        return {
            country: 'Unknown',
            country_code: 'XX',
            region: 'Unknown',
            region_name: 'Unknown',
            city: 'Unknown',
            zip: null,
            latitude: null,
            longitude: null,
            timezone: null,
            isp: 'Unknown',
            org: 'Unknown',
            as_field: null
        };
    }

    // Check if IP is private/local
    isPrivateIP(ipAddress) {
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^::1$/,
            /^fe80:/,
            /^fc00:/,
            /^fd00:/
        ];

        return privateRanges.some(range => range.test(ipAddress));
    }

    // Log IP activity with geolocation
    async logIPActivity(userId, ipAddress, action, userAgent = null) {
        try {
            const geolocationData = await this.getGeolocation(ipAddress);

            await pool.execute(
                `INSERT INTO ip_logs (
                    user_id, ip_address, country, country_code, region, region_name, 
                    city, zip, latitude, longitude, timezone, isp, org, as_field, 
                    action, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    ipAddress,
                    geolocationData.country,
                    geolocationData.country_code,
                    geolocationData.region,
                    geolocationData.region_name,
                    geolocationData.city,
                    geolocationData.zip,
                    geolocationData.latitude,
                    geolocationData.longitude,
                    geolocationData.timezone,
                    geolocationData.isp,
                    geolocationData.org,
                    geolocationData.as_field,
                    action,
                    userAgent
                ]
            );

            return geolocationData;
        } catch (error) {
            console.error('Error logging IP activity:', error);
            return null;
        }
    }

    // Get IP history for a user
    async getUserIPHistory(userId, limit = 50) {
        try {
            const [logs] = await pool.execute(
                `SELECT 
                    ip_address, country, country_code, region, city, 
                    latitude, longitude, timezone, isp, action, 
                    user_agent, created_at
                FROM ip_logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?`,
                [userId, limit]
            );

            return logs;
        } catch (error) {
            console.error('Error getting user IP history:', error);
            return [];
        }
    }

    // Get IP statistics
    async getIPStatistics() {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) as total_requests,
                    country,
                    COUNT(*) as country_count
                FROM ip_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY country
                ORDER BY country_count DESC
                LIMIT 10
            `);

            const [recentActivity] = await pool.execute(`
                SELECT 
                    ip_address,
                    country,
                    city,
                    action,
                    created_at
                FROM ip_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY created_at DESC
                LIMIT 20
            `);

            return {
                topCountries: stats,
                recentActivity
            };
        } catch (error) {
            console.error('Error getting IP statistics:', error);
            return { topCountries: [], recentActivity: [] };
        }
    }

    // Clean up old IP logs (older than 90 days)
    async cleanupOldLogs() {
        try {
            const [result] = await pool.execute(
                'DELETE FROM ip_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
            );
            console.log(`Cleaned up ${result.affectedRows} old IP logs`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old IP logs:', error);
            return 0;
        }
    }

    // Get suspicious IP activity
    async getSuspiciousActivity() {
        try {
            // Find IPs with multiple failed login attempts
            const [suspiciousIPs] = await pool.execute(`
                SELECT 
                    ip_address,
                    country,
                    city,
                    COUNT(*) as failed_attempts,
                    MAX(created_at) as last_attempt
                FROM ip_logs 
                WHERE action = 'failed_login' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY ip_address
                HAVING failed_attempts >= 5
                ORDER BY failed_attempts DESC
            `);

            // Find users logging in from multiple countries
            const [multiCountryUsers] = await pool.execute(`
                SELECT 
                    user_id,
                    COUNT(DISTINCT country) as country_count,
                    GROUP_CONCAT(DISTINCT country) as countries,
                    MAX(created_at) as last_login
                FROM ip_logs 
                WHERE action = 'user_login' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY user_id
                HAVING country_count > 2
                ORDER BY country_count DESC
            `);

            return {
                suspiciousIPs,
                multiCountryUsers
            };
        } catch (error) {
            console.error('Error getting suspicious activity:', error);
            return { suspiciousIPs: [], multiCountryUsers: [] };
        }
    }
}

module.exports = new GeolocationService();