import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function UserDashboard() {
  const { user, logout } = useAuth();
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching system information
    // In a real implementation, this would come from the desktop app
    setTimeout(() => {
      setSystemInfo({
        os: 'Windows 11',
        cpu: 'Intel Core i7-12700K',
        memory: '32 GB',
        storage: '1 TB SSD',
        network: 'Connected'
      });
      setLoading(false);
    }, 1000);
  }, []);

  const tweakFeatures = [
    {
      title: 'System Optimization',
      description: 'Optimize system performance and clean temporary files',
      icon: <SpeedIcon />,
      enabled: true
    },
    {
      title: 'Memory Management',
      description: 'Monitor and manage system memory usage',
      icon: <MemoryIcon />,
      enabled: true
    },
    {
      title: 'Storage Cleanup',
      description: 'Clean up disk space and remove unnecessary files',
      icon: <StorageIcon />,
      enabled: false
    },
    {
      title: 'Network Monitor',
      description: 'Monitor network connections and bandwidth usage',
      icon: <NetworkIcon />,
      enabled: true
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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tweak Application
          </Typography>
          <Chip 
            label={`Welcome, ${user?.username}`} 
            color="secondary" 
            variant="outlined"
            sx={{ mr: 2 }}
          />
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Dashboard
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          This is the user interface for the Tweak application. Here you can access various system optimization and monitoring features.
        </Alert>

        <Grid container spacing={3}>
          {/* System Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Information
                </Typography>
                {systemInfo && (
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Operating System" 
                        secondary={systemInfo.os} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <SpeedIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Processor" 
                        secondary={systemInfo.cpu} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <MemoryIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Memory" 
                        secondary={systemInfo.memory} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <StorageIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Storage" 
                        secondary={systemInfo.storage} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <NetworkIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Network" 
                        secondary={systemInfo.network} 
                      />
                    </ListItem>
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Tweak Features */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Available Features
                </Typography>
                <List>
                  {tweakFeatures.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {feature.title}
                            <Chip
                              label={feature.enabled ? 'Available' : 'Coming Soon'}
                              color={feature.enabled ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={feature.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="contained"
                    startIcon={<SpeedIcon />}
                    disabled={!tweakFeatures[0].enabled}
                  >
                    Run System Optimization
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<MemoryIcon />}
                    disabled={!tweakFeatures[1].enabled}
                  >
                    Check Memory Usage
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<StorageIcon />}
                    disabled={!tweakFeatures[2].enabled}
                  >
                    Clean Storage
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<NetworkIcon />}
                    disabled={!tweakFeatures[3].enabled}
                  >
                    Monitor Network
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Status Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Application Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      Online
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Connection Status
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary.main">
                      Active
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Service Status
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      Secure
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Security Status
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      v1.0.0
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Application Version
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default UserDashboard;