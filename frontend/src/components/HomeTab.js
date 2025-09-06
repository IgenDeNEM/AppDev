import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ClipboardIcon,
  Delete as DeleteIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  StayCurrentPortrait as AlwaysOnTopIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

const HomeTab = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tweaks, setTweaks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [executingTweaks, setExecutingTweaks] = useState(new Set());
  const [verificationDialog, setVerificationDialog] = useState({ open: false, tweak: null, code: '' });
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [systemServices, setSystemServices] = useState([]);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadData();
    loadUserPreferences();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tweaksRes, categoriesRes, clipboardRes, servicesRes] = await Promise.all([
        axios.get('/api/tweaks'),
        axios.get('/api/tweaks/categories'),
        axios.get('/api/tweaks/clipboard/history'),
        axios.get('/api/tweaks/services/list')
      ]);

      setTweaks(tweaksRes.data);
      setCategories(categoriesRes.data);
      setClipboardHistory(clipboardRes.data);
      setSystemServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      addAlert('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const [alwaysOnTopRes, safeModeRes] = await Promise.all([
        axios.get('/api/user-preferences/always-on-top/current'),
        axios.get('/api/user-preferences/safe-mode/current')
      ]);

      setAlwaysOnTop(alwaysOnTopRes.data.alwaysOnTop);
      setSafeMode(safeModeRes.data.safeMode);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const addAlert = (message, severity = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const executeTweak = async (tweak) => {
    try {
      setExecutingTweaks(prev => new Set(prev).add(tweak.id));

      const response = await axios.post(`/api/tweaks/${tweak.id}/execute`);
      
      if (response.data.requiresVerification) {
        setVerificationDialog({
          open: true,
          tweak,
          code: '',
          logId: response.data.logId
        });
        addAlert('Verification code sent to your email', 'info');
      } else {
        addAlert(`${tweak.name} executed successfully`, 'success');
      }
    } catch (error) {
      console.error('Error executing tweak:', error);
      addAlert(`Failed to execute ${tweak.name}`, 'error');
    } finally {
      setExecutingTweaks(prev => {
        const newSet = new Set(prev);
        newSet.delete(tweak.id);
        return newSet;
      });
    }
  };

  const verifyAndExecute = async () => {
    try {
      await axios.post(`/api/tweaks/${verificationDialog.tweak.id}/verify-execute`, {
        verification_code: verificationDialog.code
      });

      setVerificationDialog({ open: false, tweak: null, code: '' });
      addAlert(`${verificationDialog.tweak.name} executed successfully`, 'success');
    } catch (error) {
      console.error('Error verifying tweak execution:', error);
      addAlert('Invalid verification code', 'error');
    }
  };

  const executeSystemCleanup = async () => {
    try {
      const response = await axios.post('/api/tweaks/system/cleanup');
      addAlert(`System cleanup completed: ${response.data.commandsExecuted}/${response.data.totalCommands} commands executed`, 'success');
    } catch (error) {
      console.error('Error executing system cleanup:', error);
      addAlert('Failed to execute system cleanup', 'error');
    }
  };

  const toggleService = async (serviceName, action) => {
    try {
      await axios.post(`/api/tweaks/services/${serviceName}/toggle`, { action });
      addAlert(`Service ${serviceName} ${action}ed successfully`, 'success');
      loadData(); // Reload services
    } catch (error) {
      console.error('Error toggling service:', error);
      addAlert(`Failed to ${action} service ${serviceName}`, 'error');
    }
  };

  const handleAlwaysOnTopChange = async (event) => {
    const newValue = event.target.checked;
    setAlwaysOnTop(newValue);
    
    try {
      await axios.post('/api/user-preferences/always-on-top', { alwaysOnTop: newValue });
      addAlert('Always on top preference updated', 'success');
    } catch (error) {
      console.error('Error updating always on top preference:', error);
      addAlert('Failed to update always on top preference', 'error');
    }
  };

  const handleSafeModeChange = async (event) => {
    const newValue = event.target.checked;
    setSafeMode(newValue);
    
    try {
      await axios.post('/api/user-preferences/safe-mode', { safeMode: newValue });
      addAlert('Safe mode preference updated', 'success');
    } catch (error) {
      console.error('Error updating safe mode preference:', error);
      addAlert('Failed to update safe mode preference', 'error');
    }
  };

  const filteredTweaks = tweaks.filter(tweak => {
    const matchesSearch = tweak.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tweak.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 0 || tweak.category_id === selectedCategory;
    const matchesSafeMode = !safeMode || !tweak.is_dangerous;
    
    return matchesSearch && matchesCategory && matchesSafeMode;
  });

  const groupedTweaks = categories.map(category => ({
    ...category,
    tweaks: filteredTweaks.filter(tweak => tweak.category_id === category.id)
  }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Alerts */}
      {alerts.map(alert => (
        <Alert key={alert.id} severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      ))}

      {/* Header with Search and Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search tweaks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={alwaysOnTop}
                    onChange={handleAlwaysOnTopChange}
                    icon={<AlwaysOnTopIcon />}
                  />
                }
                label="Always On Top"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={safeMode}
                    onChange={handleSafeModeChange}
                    color="warning"
                  />
                }
                label="Safe Mode"
              />
              <IconButton onClick={toggleTheme} color="primary">
                {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(e, newValue) => setSelectedCategory(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="All Categories" value={0} />
        {categories.map(category => (
          <Tab key={category.id} label={category.name} value={category.id} />
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Performance Boost</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Terminate background processes
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<PlayIcon />}
                onClick={() => executeTweak({ id: 'performance-boost', name: 'Performance Boost' })}
              >
                Execute
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">System Cleanup</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Clean temp files and cache
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<PlayIcon />}
                onClick={executeSystemCleanup}
              >
                Execute
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <ClipboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Clipboard Manager</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View last 10 copies
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<ClipboardIcon />}>
                View History
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SettingsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Services Manager</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage Windows services
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<SettingsIcon />}>
                Manage
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Tweaks by Category */}
      {groupedTweaks.map(category => (
        category.tweaks.length > 0 && (
          <Accordion key={category.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography variant="h6" sx={{ mr: 2 }}>
                  {category.name}
                </Typography>
                <Chip label={category.tweaks.length} size="small" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {category.tweaks.map(tweak => (
                  <Grid item xs={12} sm={6} md={4} key={tweak.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            {tweak.name}
                          </Typography>
                          {tweak.is_dangerous && (
                            <WarningIcon color="warning" sx={{ ml: 1 }} />
                          )}
                          {tweak.requires_verification && (
                            <SecurityIcon color="info" sx={{ ml: 1 }} />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {tweak.description}
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {tweak.is_dangerous && (
                            <Chip label="Dangerous" color="warning" size="small" />
                          )}
                          {tweak.requires_verification && (
                            <Chip label="Verification Required" color="info" size="small" />
                          )}
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={
                            executingTweaks.has(tweak.id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <PlayIcon />
                            )
                          }
                          onClick={() => executeTweak(tweak)}
                          disabled={executingTweaks.has(tweak.id)}
                        >
                          Execute
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )
      ))}

      {/* Verification Dialog */}
      <Dialog open={verificationDialog.open} onClose={() => setVerificationDialog({ open: false, tweak: null, code: '' })}>
        <DialogTitle>Email Verification Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please enter the 8-digit verification code sent to your email to execute "{verificationDialog.tweak?.name}".
          </Typography>
          <TextField
            fullWidth
            label="Verification Code"
            value={verificationDialog.code}
            onChange={(e) => setVerificationDialog(prev => ({ ...prev, code: e.target.value }))}
            placeholder="12345678"
            inputProps={{ maxLength: 8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialog({ open: false, tweak: null, code: '' })}>
            Cancel
          </Button>
          <Button
            onClick={verifyAndExecute}
            variant="contained"
            disabled={verificationDialog.code.length !== 8}
          >
            Verify & Execute
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HomeTab;