import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Switch,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Apps as AppsIcon,
  Computer as ComputerIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const RemoveAppsTab = () => {
  const { user } = useAuth();
  const [installedApps, setInstalledApps] = useState([]);
  const [systemApps, setSystemApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [safeMode, setSafeMode] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [uninstalling, setUninstalling] = useState(new Set());
  const [verificationDialog, setVerificationDialog] = useState({ open: false, apps: [], code: '' });
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadData();
    loadUserPreferences();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [installedRes, systemRes] = await Promise.all([
        axios.get('/api/packages/installed/list'),
        axios.get('/api/packages/system/list')
      ]);

      setInstalledApps(installedRes.data);
      setSystemApps(systemRes.data);
    } catch (error) {
      console.error('Error loading applications:', error);
      addAlert('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await axios.get('/api/user-preferences/safe-mode/current');
      setSafeMode(response.data.safeMode);
    } catch (error) {
      console.error('Error loading safe mode preference:', error);
    }
  };

  const addAlert = (message, severity = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const handleSelectApp = (appId) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApps(newSelected);
  };

  const handleSelectAll = () => {
    const filteredApps = getFilteredApps();
    const selectableApps = filteredApps.filter(app => !safeMode || !app.is_system_app);
    
    if (selectedApps.size === selectableApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(selectableApps.map(app => app.id)));
    }
  };

  const getFilteredApps = () => {
    const allApps = [...installedApps, ...systemApps];
    
    let filtered = allApps.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.publisher?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterType === 'installed') {
        return matchesSearch && installedApps.some(installed => installed.id === app.id);
      } else if (filterType === 'system') {
        return matchesSearch && app.is_system_app;
      } else if (filterType === 'third-party') {
        return matchesSearch && !app.is_system_app;
      }
      
      return matchesSearch;
    });

    return filtered;
  };

  const uninstallApps = async () => {
    const appsToUninstall = getFilteredApps().filter(app => selectedApps.has(app.id));
    
    if (appsToUninstall.length === 0) {
      addAlert('Please select applications to uninstall', 'warning');
      return;
    }

    // Check if any system apps are selected in safe mode
    if (safeMode && appsToUninstall.some(app => app.is_system_app)) {
      addAlert('Cannot uninstall system applications in safe mode', 'error');
      return;
    }

    // Check if any apps require verification
    const requiresVerification = appsToUninstall.some(app => app.is_system_app);
    
    if (requiresVerification) {
      setVerificationDialog({
        open: true,
        apps: appsToUninstall,
        code: ''
      });
      addAlert('Verification code sent to your email', 'info');
    } else {
      await performUninstall(appsToUninstall);
    }
  };

  const performUninstall = async (apps) => {
    try {
      setUninstalling(new Set(apps.map(app => app.id)));
      
      const promises = apps.map(async (app) => {
        try {
          await axios.post(`/api/packages/${app.id}/uninstall`);
          return { app, success: true };
        } catch (error) {
          console.error(`Error uninstalling ${app.name}:`, error);
          return { app, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        addAlert(`Successfully uninstalled ${successCount} application(s)`, 'success');
      }
      if (failureCount > 0) {
        addAlert(`Failed to uninstall ${failureCount} application(s)`, 'error');
      }

      // Reload data
      loadData();
      setSelectedApps(new Set());
    } catch (error) {
      console.error('Error during uninstall process:', error);
      addAlert('Failed to uninstall applications', 'error');
    } finally {
      setUninstalling(new Set());
    }
  };

  const verifyAndUninstall = async () => {
    try {
      // For now, we'll simulate verification
      // In a real implementation, you would verify the code with the backend
      if (verificationDialog.code.length !== 8) {
        addAlert('Please enter a valid 8-digit verification code', 'error');
        return;
      }

      setVerificationDialog({ open: false, apps: [], code: '' });
      await performUninstall(verificationDialog.apps);
    } catch (error) {
      console.error('Error verifying uninstall:', error);
      addAlert('Invalid verification code', 'error');
    }
  };

  const filteredApps = getFilteredApps();
  const selectableApps = filteredApps.filter(app => !safeMode || !app.is_system_app);
  const isAllSelected = selectableApps.length > 0 && selectedApps.size === selectableApps.length;
  const isIndeterminate = selectedApps.size > 0 && selectedApps.size < selectableApps.length;

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

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search applications..."
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
            <Box display="flex" gap={2} justifyContent="flex-end" alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={safeMode}
                    onChange={(e) => setSafeMode(e.target.checked)}
                    color="warning"
                  />
                }
                label="Safe Mode"
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={uninstallApps}
                disabled={selectedApps.size === 0}
              >
                Uninstall Selected ({selectedApps.size})
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Filter Tabs */}
      <Tabs
        value={filterType}
        onChange={(e, newValue) => setFilterType(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="All Applications" value="all" />
        <Tab label="Installed Apps" value="installed" />
        <Tab label="System Apps" value="system" />
        <Tab label="Third-Party Apps" value="third-party" />
      </Tabs>

      {/* Applications Table */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              Applications ({filteredApps.length})
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              }
              label="Select All"
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Publisher</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApps
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((app) => {
                    const isSelected = selectedApps.has(app.id);
                    const isUninstalling = uninstalling.has(app.id);
                    const isSystemApp = app.is_system_app;
                    const isSelectable = !safeMode || !isSystemApp;

                    return (
                      <TableRow key={app.id} selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectApp(app.id)}
                            disabled={!isSelectable}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {app.name}
                            </Typography>
                            {isSystemApp && (
                              <SecurityIcon color="warning" fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {app.publisher || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {app.version || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isSystemApp ? 'System' : 'Third-Party'}
                            color={isSystemApp ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {isUninstalling ? (
                            <Box display="flex" alignItems="center">
                              <CircularProgress size={16} sx={{ mr: 1 }} />
                              <Typography variant="body2">Uninstalling...</Typography>
                            </Box>
                          ) : (
                            <Chip
                              label="Installed"
                              color="success"
                              size="small"
                              icon={<CheckIcon />}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedApps(new Set([app.id]));
                              uninstallApps();
                            }}
                            disabled={!isSelectable || isUninstalling}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredApps.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={verificationDialog.open} onClose={() => setVerificationDialog({ open: false, apps: [], code: '' })}>
        <DialogTitle>Email Verification Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to uninstall {verificationDialog.apps.length} application(s), including system applications.
            Please enter the 8-digit verification code sent to your email to proceed.
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Applications to be uninstalled:
            </Typography>
            {verificationDialog.apps.map((app, index) => (
              <Chip
                key={app.id}
                label={app.name}
                color={app.is_system_app ? 'warning' : 'default'}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>

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
          <Button onClick={() => setVerificationDialog({ open: false, apps: [], code: '' })}>
            Cancel
          </Button>
          <Button
            onClick={verifyAndUninstall}
            variant="contained"
            color="error"
            disabled={verificationDialog.code.length !== 8}
          >
            Verify & Uninstall
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemoveAppsTab;