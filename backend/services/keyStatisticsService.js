const db = require('../config/database');

class KeyStatisticsService {
    // Get key usage statistics overview
    async getKeyUsageOverview(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            // Get total keys generated
            const [totalKeys] = await db.execute(`
                SELECT COUNT(*) as total_keys 
                FROM users 
                WHERE created_at >= ?
            `, [dateFilter]);
            
            // Get active keys (users who logged in within the period)
            const [activeKeys] = await db.execute(`
                SELECT COUNT(DISTINCT user_id) as active_keys 
                FROM user_sessions 
                WHERE last_activity >= ?
            `, [dateFilter]);
            
            // Get keys generated per day
            const [dailyKeys] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [dateFilter]);
            
            // Get keys activated per day (first login)
            const [dailyActivations] = await db.execute(`
                SELECT 
                    DATE(first_login) as date,
                    COUNT(*) as keys_activated
                FROM users 
                WHERE first_login >= ? AND first_login IS NOT NULL
                GROUP BY DATE(first_login)
                ORDER BY date ASC
            `, [dateFilter]);
            
            // Get key usage by role
            const [roleStats] = await db.execute(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    COUNT(CASE WHEN last_login >= ? THEN 1 END) as active_count
                FROM users 
                WHERE created_at >= ?
                GROUP BY role
            `, [dateFilter, dateFilter]);
            
            // Get key generation trends (weekly/monthly)
            const [weeklyTrends] = await db.execute(`
                SELECT 
                    YEAR(created_at) as year,
                    WEEK(created_at) as week,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= ?
                GROUP BY YEAR(created_at), WEEK(created_at)
                ORDER BY year, week ASC
            `, [dateFilter]);
            
            const [monthlyTrends] = await db.execute(`
                SELECT 
                    YEAR(created_at) as year,
                    MONTH(created_at) as month,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= ?
                GROUP BY YEAR(created_at), MONTH(created_at)
                ORDER BY year, month ASC
            `, [dateFilter]);
            
            return {
                totalKeys: totalKeys[0].total_keys,
                activeKeys: activeKeys[0].active_keys,
                dailyKeys: dailyKeys,
                dailyActivations: dailyActivations,
                roleStats: roleStats,
                weeklyTrends: weeklyTrends,
                monthlyTrends: monthlyTrends
            };
        } catch (error) {
            console.error('Get key usage overview error:', error);
            throw error;
        }
    }
    
    // Get key activation rate
    async getKeyActivationRate(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_generated,
                    COUNT(CASE WHEN first_login IS NOT NULL THEN 1 END) as total_activated,
                    COUNT(CASE WHEN first_login IS NOT NULL AND first_login >= ? THEN 1 END) as activated_in_period
                FROM users 
                WHERE created_at >= ?
            `, [dateFilter, dateFilter]);
            
            const totalGenerated = stats[0].total_generated;
            const totalActivated = stats[0].total_activated;
            const activatedInPeriod = stats[0].activated_in_period;
            
            return {
                totalGenerated,
                totalActivated,
                activatedInPeriod,
                activationRate: totalGenerated > 0 ? (totalActivated / totalGenerated * 100).toFixed(2) : 0,
                periodActivationRate: totalGenerated > 0 ? (activatedInPeriod / totalGenerated * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Get key activation rate error:', error);
            throw error;
        }
    }
    
    // Get key usage by time of day
    async getKeyUsageByTimeOfDay(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            const [hourlyStats] = await db.execute(`
                SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= ?
                GROUP BY HOUR(created_at)
                ORDER BY hour ASC
            `, [dateFilter]);
            
            const [hourlyActivations] = await db.execute(`
                SELECT 
                    HOUR(first_login) as hour,
                    COUNT(*) as keys_activated
                FROM users 
                WHERE first_login >= ? AND first_login IS NOT NULL
                GROUP BY HOUR(first_login)
                ORDER BY hour ASC
            `, [dateFilter]);
            
            return {
                hourlyGeneration: hourlyStats,
                hourlyActivations: hourlyActivations
            };
        } catch (error) {
            console.error('Get key usage by time of day error:', error);
            throw error;
        }
    }
    
    // Get key usage by day of week
    async getKeyUsageByDayOfWeek(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            const [dailyStats] = await db.execute(`
                SELECT 
                    DAYOFWEEK(created_at) as day_of_week,
                    DAYNAME(created_at) as day_name,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= ?
                GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
                ORDER BY day_of_week ASC
            `, [dateFilter]);
            
            const [dailyActivations] = await db.execute(`
                SELECT 
                    DAYOFWEEK(first_login) as day_of_week,
                    DAYNAME(first_login) as day_name,
                    COUNT(*) as keys_activated
                FROM users 
                WHERE first_login >= ? AND first_login IS NOT NULL
                GROUP BY DAYOFWEEK(first_login), DAYNAME(first_login)
                ORDER BY day_of_week ASC
            `, [dateFilter]);
            
            return {
                dailyGeneration: dailyStats,
                dailyActivations: dailyActivations
            };
        } catch (error) {
            console.error('Get key usage by day of week error:', error);
            throw error;
        }
    }
    
    // Get key retention statistics
    async getKeyRetentionStats(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            // Get users who logged in multiple times
            const [retentionStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN login_count > 1 THEN 1 END) as returning_users,
                    COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_last_week,
                    COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_month
                FROM users 
                WHERE created_at >= ?
            `, [dateFilter]);
            
            const totalUsers = retentionStats[0].total_users;
            const returningUsers = retentionStats[0].returning_users;
            const activeLastWeek = retentionStats[0].active_last_week;
            const activeLastMonth = retentionStats[0].active_last_month;
            
            return {
                totalUsers,
                returningUsers,
                activeLastWeek,
                activeLastMonth,
                retentionRate: totalUsers > 0 ? (returningUsers / totalUsers * 100).toFixed(2) : 0,
                weeklyActiveRate: totalUsers > 0 ? (activeLastWeek / totalUsers * 100).toFixed(2) : 0,
                monthlyActiveRate: totalUsers > 0 ? (activeLastMonth / totalUsers * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Get key retention stats error:', error);
            throw error;
        }
    }
    
    // Get key usage by geographic location
    async getKeyUsageByLocation(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            const [locationStats] = await db.execute(`
                SELECT 
                    il.country,
                    il.country_code,
                    COUNT(DISTINCT il.user_id) as unique_users,
                    COUNT(*) as total_logins
                FROM ip_logs il
                JOIN users u ON il.user_id = u.id
                WHERE il.created_at >= ? AND il.action = 'login'
                GROUP BY il.country, il.country_code
                ORDER BY unique_users DESC
                LIMIT 20
            `, [dateFilter]);
            
            return locationStats;
        } catch (error) {
            console.error('Get key usage by location error:', error);
            throw error;
        }
    }
    
    // Get key usage by device/browser
    async getKeyUsageByDevice(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            const [deviceStats] = await db.execute(`
                SELECT 
                    CASE 
                        WHEN user_agent LIKE '%Windows%' THEN 'Windows'
                        WHEN user_agent LIKE '%Mac%' THEN 'macOS'
                        WHEN user_agent LIKE '%Linux%' THEN 'Linux'
                        WHEN user_agent LIKE '%Android%' THEN 'Android'
                        WHEN user_agent LIKE '%iOS%' THEN 'iOS'
                        ELSE 'Other'
                    END as device_type,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) as total_logins
                FROM ip_logs
                WHERE created_at >= ? AND action = 'login'
                GROUP BY device_type
                ORDER BY unique_users DESC
            `, [dateFilter]);
            
            return deviceStats;
        } catch (error) {
            console.error('Get key usage by device error:', error);
            throw error;
        }
    }
    
    // Get key generation velocity
    async getKeyGenerationVelocity(period = '30d') {
        try {
            const dateFilter = this.getDateFilter(period);
            
            // Get daily generation rates
            const [dailyRates] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as keys_generated,
                    LAG(COUNT(*)) OVER (ORDER BY DATE(created_at)) as previous_day_count
                FROM users 
                WHERE created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [dateFilter]);
            
            // Calculate growth rates
            const ratesWithGrowth = dailyRates.map(rate => {
                const growth = rate.previous_day_count > 0 
                    ? ((rate.keys_generated - rate.previous_day_count) / rate.previous_day_count * 100).toFixed(2)
                    : 0;
                return {
                    ...rate,
                    growth_rate: parseFloat(growth)
                };
            });
            
            // Get average daily generation
            const [avgStats] = await db.execute(`
                SELECT 
                    AVG(daily_count) as avg_daily_generation,
                    MAX(daily_count) as peak_daily_generation,
                    MIN(daily_count) as min_daily_generation
                FROM (
                    SELECT DATE(created_at) as date, COUNT(*) as daily_count
                    FROM users 
                    WHERE created_at >= ?
                    GROUP BY DATE(created_at)
                ) as daily_counts
            `, [dateFilter]);
            
            return {
                dailyRates: ratesWithGrowth,
                averageDailyGeneration: avgStats[0].avg_daily_generation,
                peakDailyGeneration: avgStats[0].peak_daily_generation,
                minDailyGeneration: avgStats[0].min_daily_generation
            };
        } catch (error) {
            console.error('Get key generation velocity error:', error);
            throw error;
        }
    }
    
    // Get key usage predictions
    async getKeyUsagePredictions(days = 7) {
        try {
            // Get historical data for the last 30 days
            const [historicalData] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as keys_generated
                FROM users 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);
            
            if (historicalData.length < 7) {
                return { predictions: [], confidence: 'low' };
            }
            
            // Simple linear regression for prediction
            const predictions = this.calculateLinearRegression(historicalData, days);
            
            return {
                predictions,
                confidence: historicalData.length >= 14 ? 'high' : 'medium',
                basedOnDays: historicalData.length
            };
        } catch (error) {
            console.error('Get key usage predictions error:', error);
            throw error;
        }
    }
    
    // Helper method to get date filter based on period
    getDateFilter(period) {
        const now = new Date();
        switch (period) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case '1y':
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }
    
    // Simple linear regression calculation
    calculateLinearRegression(data, days) {
        const n = data.length;
        const x = data.map((_, index) => index);
        const y = data.map(d => d.keys_generated);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const predictions = [];
        for (let i = 0; i < days; i++) {
            const futureX = n + i;
            const predictedY = Math.max(0, Math.round(slope * futureX + intercept));
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i + 1);
            
            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                predicted_keys: predictedY
            });
        }
        
        return predictions;
    }
}

module.exports = new KeyStatisticsService();