import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  VpnKey as KeyIcon,
  Visibility as OnlineIcon,
  Assessment as LogsIcon
} from '@mui/icons-material';
import axios from 'axios';

function DashboardOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalKeys: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersResponse, keysResponse, logsResponse] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/keys'),
        axios.get('/api/admin/logs?limit=5')
      ]);

      const onlineUsers = usersResponse.data.users.filter(user => user.is_online);
      
      setStats({
        totalUsers: usersResponse.data.users.length,
        onlineUsers: onlineUsers.length,
        totalKeys: keysResponse.data.keys.length,
        recentLogs: logsResponse.data.logs
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <PeopleIcon />,
      color: '#1976d2'
    },
    {
      title: 'Online Users',
      value: stats.onlineUsers,
      icon: <OnlineIcon />,
      color: '#2e7d32'
    },
    {
      title: 'Registration Keys',
      value: stats.totalKeys,
      icon: <KeyIcon />,
      color: '#ed6c02'
    },
    {
      title: 'Recent Activities',
      value: stats.recentLogs.length,
      icon: <LogsIcon />,
      color: '#9c27b0'
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {card.title}
                    </Typography>
                    <Typography variant="h4">
                      {card.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: card.color, width: 56, height: 56 }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Online Users
            </Typography>
            <List>
              {stats.onlineUsers > 0 ? (
                stats.recentLogs
                  .filter(log => log.action === 'user_login')
                  .slice(0, 5)
                  .map((log, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <OnlineIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={log.username}
                        secondary={`Last seen: ${new Date(log.created_at).toLocaleString()}`}
                      />
                    </ListItem>
                  ))
              ) : (
                <ListItem>
                  <ListItemText primary="No users currently online" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {stats.recentLogs.map((log, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={log.action.replace('_', ' ').toUpperCase()}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {log.username} - {new Date(log.created_at).toLocaleString()}
                        </Typography>
                        {log.details && (
                          <Typography variant="caption" color="textSecondary">
                            {log.details}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardOverview;