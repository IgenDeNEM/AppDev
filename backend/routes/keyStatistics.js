const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const keyStatisticsService = require('../services/keyStatisticsService');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get key usage overview
router.get('/overview', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const overview = await keyStatisticsService.getKeyUsageOverview(period);
        res.json({ overview });
    } catch (error) {
        console.error('Get key usage overview error:', error);
        res.status(500).json({ error: 'Failed to get key usage overview' });
    }
});

// Get key activation rate
router.get('/activation-rate', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const activationRate = await keyStatisticsService.getKeyActivationRate(period);
        res.json({ activationRate });
    } catch (error) {
        console.error('Get key activation rate error:', error);
        res.status(500).json({ error: 'Failed to get key activation rate' });
    }
});

// Get key usage by time of day
router.get('/time-of-day', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const timeStats = await keyStatisticsService.getKeyUsageByTimeOfDay(period);
        res.json({ timeStats });
    } catch (error) {
        console.error('Get key usage by time of day error:', error);
        res.status(500).json({ error: 'Failed to get key usage by time of day' });
    }
});

// Get key usage by day of week
router.get('/day-of-week', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const dayStats = await keyStatisticsService.getKeyUsageByDayOfWeek(period);
        res.json({ dayStats });
    } catch (error) {
        console.error('Get key usage by day of week error:', error);
        res.status(500).json({ error: 'Failed to get key usage by day of week' });
    }
});

// Get key retention statistics
router.get('/retention', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const retentionStats = await keyStatisticsService.getKeyRetentionStats(period);
        res.json({ retentionStats });
    } catch (error) {
        console.error('Get key retention stats error:', error);
        res.status(500).json({ error: 'Failed to get key retention stats' });
    }
});

// Get key usage by geographic location
router.get('/location', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const locationStats = await keyStatisticsService.getKeyUsageByLocation(period);
        res.json({ locationStats });
    } catch (error) {
        console.error('Get key usage by location error:', error);
        res.status(500).json({ error: 'Failed to get key usage by location' });
    }
});

// Get key usage by device
router.get('/device', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const deviceStats = await keyStatisticsService.getKeyUsageByDevice(period);
        res.json({ deviceStats });
    } catch (error) {
        console.error('Get key usage by device error:', error);
        res.status(500).json({ error: 'Failed to get key usage by device' });
    }
});

// Get key generation velocity
router.get('/velocity', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const velocity = await keyStatisticsService.getKeyGenerationVelocity(period);
        res.json({ velocity });
    } catch (error) {
        console.error('Get key generation velocity error:', error);
        res.status(500).json({ error: 'Failed to get key generation velocity' });
    }
});

// Get key usage predictions
router.get('/predictions', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const predictions = await keyStatisticsService.getKeyUsagePredictions(parseInt(days));
        res.json({ predictions });
    } catch (error) {
        console.error('Get key usage predictions error:', error);
        res.status(500).json({ error: 'Failed to get key usage predictions' });
    }
});

// Get comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // Get all statistics in parallel for better performance
        const [
            overview,
            activationRate,
            retentionStats,
            timeStats,
            dayStats,
            locationStats,
            deviceStats,
            velocity,
            predictions
        ] = await Promise.all([
            keyStatisticsService.getKeyUsageOverview(period),
            keyStatisticsService.getKeyActivationRate(period),
            keyStatisticsService.getKeyRetentionStats(period),
            keyStatisticsService.getKeyUsageByTimeOfDay(period),
            keyStatisticsService.getKeyUsageByDayOfWeek(period),
            keyStatisticsService.getKeyUsageByLocation(period),
            keyStatisticsService.getKeyUsageByDevice(period),
            keyStatisticsService.getKeyGenerationVelocity(period),
            keyStatisticsService.getKeyUsagePredictions(7)
        ]);
        
        res.json({
            overview,
            activationRate,
            retentionStats,
            timeStats,
            dayStats,
            locationStats,
            deviceStats,
            velocity,
            predictions,
            period,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get dashboard data error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
});

// Get key statistics export
router.get('/export', async (req, res) => {
    try {
        const { 
            format = 'csv',
            period = '30d',
            includePredictions = false
        } = req.query;
        
        const overview = await keyStatisticsService.getKeyUsageOverview(period);
        const activationRate = await keyStatisticsService.getKeyActivationRate(period);
        const retentionStats = await keyStatisticsService.getKeyRetentionStats(period);
        
        let exportData = {
            overview,
            activationRate,
            retentionStats,
            period,
            exportedAt: new Date().toISOString()
        };
        
        if (includePredictions === 'true') {
            exportData.predictions = await keyStatisticsService.getKeyUsagePredictions(7);
        }
        
        if (format === 'csv') {
            // Convert to CSV format
            const csvData = this.convertToCSV(exportData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="key-statistics-${period}.csv"`);
            res.send(csvData);
        } else {
            res.json(exportData);
        }
    } catch (error) {
        console.error('Export key statistics error:', error);
        res.status(500).json({ error: 'Failed to export key statistics' });
    }
});

// Helper method to convert data to CSV
function convertToCSV(data) {
    const lines = [];
    
    // Add header
    lines.push('Metric,Value,Period');
    
    // Add overview data
    lines.push(`Total Keys Generated,${data.overview.totalKeys},${data.period}`);
    lines.push(`Active Keys,${data.overview.activeKeys},${data.period}`);
    
    // Add activation rate data
    lines.push(`Activation Rate,${data.activationRate.activationRate}%,${data.period}`);
    lines.push(`Total Activated,${data.activationRate.totalActivated},${data.period}`);
    
    // Add retention data
    lines.push(`Retention Rate,${data.retentionStats.retentionRate}%,${data.period}`);
    lines.push(`Weekly Active Rate,${data.retentionStats.weeklyActiveRate}%,${data.period}`);
    lines.push(`Monthly Active Rate,${data.retentionStats.monthlyActiveRate}%,${data.period}`);
    
    // Add role statistics
    data.overview.roleStats.forEach(role => {
        lines.push(`${role.role} Users,${role.count},${data.period}`);
        lines.push(`${role.role} Active,${role.active_count},${data.period}`);
    });
    
    return lines.join('\n');
}

module.exports = router;