import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Tabs,
    Tab,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    People,
    Key,
    LocationOn,
    Computer,
    Schedule,
    CalendarToday,
    Download,
    Refresh
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const KeyStatistics = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('30d');
    const [activeTab, setActiveTab] = useState(0);
    const [dashboardData, setDashboardData] = useState(null);

    const periods = [
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' },
        { value: '1y', label: 'Last year' }
    ];

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`/api/key-statistics/dashboard?period=${period}`);
            setDashboardData(response.data);
        } catch (err) {
            setError('Failed to fetch key statistics');
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await axios.get(`/api/key-statistics/export?format=csv&period=${period}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `key-statistics-${period}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const StatCard = ({ title, value, subtitle, icon, trend, trendValue }) => (
        <Card>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="h6">
                            {title}
                        </Typography>
                        <Typography variant="h4" component="h2">
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography color="textSecondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        {icon}
                        {trend && (
                            <Chip
                                icon={trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                                label={`${trendValue}%`}
                                color={trend === 'up' ? 'success' : 'error'}
                                size="small"
                            />
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    const renderOverview = () => {
        if (!dashboardData) return null;

        const { overview, activationRate, retentionStats } = dashboardData;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Keys Generated"
                        value={overview.totalKeys}
                        subtitle={`in ${periods.find(p => p.value === period)?.label}`}
                        icon={<Key color="primary" />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Keys"
                        value={overview.activeKeys}
                        subtitle={`${((overview.activeKeys / overview.totalKeys) * 100).toFixed(1)}% of total`}
                        icon={<People color="success" />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Activation Rate"
                        value={`${activationRate.activationRate}%`}
                        subtitle={`${activationRate.totalActivated} activated`}
                        icon={<TrendingUp color="info" />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Retention Rate"
                        value={`${retentionStats.retentionRate}%`}
                        subtitle={`${retentionStats.returningUsers} returning users`}
                        icon={<Schedule color="warning" />}
                    />
                </Grid>
            </Grid>
        );
    };

    const renderCharts = () => {
        if (!dashboardData) return null;

        const { overview, timeStats, dayStats, locationStats, deviceStats } = dashboardData;

        return (
            <Grid container spacing={3}>
                {/* Daily Keys Generated */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Daily Keys Generated
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={overview.dailyKeys}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="keys_generated" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Daily Activations */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Daily Key Activations
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={overview.dailyActivations}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="keys_activated" stroke="#82ca9d" fill="#82ca9d" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Usage by Time of Day */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Key Generation by Hour
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={timeStats.hourlyGeneration}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="hour" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Bar dataKey="keys_generated" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Usage by Day of Week */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Key Generation by Day of Week
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dayStats.dailyGeneration}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day_name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Bar dataKey="keys_generated" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Role Distribution */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Users by Role
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={overview.roleStats}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ role, count }) => `${role}: ${count}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {overview.roleStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Device Distribution */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Usage by Device Type
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={deviceStats}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ device_type, unique_users }) => `${device_type}: ${unique_users}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="unique_users"
                                    >
                                        {deviceStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    const renderLocationStats = () => {
        if (!dashboardData?.locationStats) return null;

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Key Usage by Location
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Country</TableCell>
                                    <TableCell align="right">Unique Users</TableCell>
                                    <TableCell align="right">Total Logins</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dashboardData.locationStats.map((location, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LocationOn color="primary" />
                                                {location.country}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">{location.unique_users}</TableCell>
                                        <TableCell align="right">{location.total_logins}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        );
    };

    const renderPredictions = () => {
        if (!dashboardData?.predictions) return null;

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        7-Day Key Generation Predictions
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        Confidence: {dashboardData.predictions.confidence} (based on {dashboardData.predictions.basedOnDays} days of data)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dashboardData.predictions.predictions}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="predicted_keys" 
                                stroke="#ff7300" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="Predicted"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" action={
                <Button color="inherit" size="small" onClick={fetchDashboardData}>
                    Retry
                </Button>
            }>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Key Usage Statistics
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Period</InputLabel>
                        <Select
                            value={period}
                            label="Period"
                            onChange={(e) => setPeriod(e.target.value)}
                        >
                            {periods.map((p) => (
                                <MenuItem key={p.value} value={p.value}>
                                    {p.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="Refresh Data">
                        <IconButton onClick={fetchDashboardData}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleExport}
                    >
                        Export CSV
                    </Button>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Overview" />
                    <Tab label="Charts" />
                    <Tab label="Locations" />
                    <Tab label="Predictions" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 && renderOverview()}
            {activeTab === 1 && renderCharts()}
            {activeTab === 2 && renderLocationStats()}
            {activeTab === 3 && renderPredictions()}
        </Box>
    );
};

export default KeyStatistics;