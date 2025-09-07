import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
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
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Apps as AppsIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PackageStoreTab = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [installing, setInstalling] = useState(new Set());
  const [verificationDialog, setVerificationDialog] = useState({ open: false, package: null, code: '' });
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesRes, categoriesRes] = await Promise.all([
        axios.get('/api/packages'),
        axios.get('/api/packages/categories')
      ]);

      setPackages(packagesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading packages:', error);
      addAlert('Failed to load packages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addAlert = (message, severity = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const installPackage = async (packageItem) => {
    try {
      setInstalling(prev => new Set(prev).add(packageItem.id));

      const response = await axios.post(`/api/packages/${packageItem.id}/install`);
      
      if (response.data.requiresVerification) {
        setVerificationDialog({
          open: true,
          package: packageItem,
          code: '',
          logId: response.data.logId
        });
        addAlert('Verification code sent to your email', 'info');
      } else {
        addAlert(`${packageItem.name} installation started`, 'success');
      }
    } catch (error) {
      console.error('Error installing package:', error);
      addAlert(`Failed to install ${packageItem.name}`, 'error');
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageItem.id);
        return newSet;
      });
    }
  };

  const verifyAndInstall = async () => {
    try {
      await axios.post(`/api/packages/${verificationDialog.package.id}/verify-install`, {
        verification_code: verificationDialog.code
      });

      setVerificationDialog({ open: false, package: null, code: '' });
      addAlert(`${verificationDialog.package.name} installed successfully`, 'success');
    } catch (error) {
      console.error('Error verifying package installation:', error);
      addAlert('Invalid verification code', 'error');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.publisher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 0 || pkg.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedPackages = categories.map(category => ({
    ...category,
    packages: filteredPackages.filter(pkg => pkg.category_id === category.id)
  }));

  const getCategoryIcon = (categoryName) => {
    switch (categoryName.toLowerCase()) {
      case 'browsers':
        return '🌐';
      case 'gaming':
        return '🎮';
      case 'communication':
        return '💬';
      case 'developer tools':
        return '💻';
      case 'utilities':
        return '🔧';
      default:
        return '📦';
    }
  };

  const getInstallerIcon = (installerType) => {
    switch (installerType) {
      case 'chocolatey':
        return '🍫';
      case 'winget':
        return '🪶';
      case 'direct_download':
        return '⬇️';
      default:
        return '📦';
    }
  };

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
              placeholder="Search packages..."
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
              <IconButton onClick={loadData} color="primary">
                <RefreshIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {filteredPackages.length} packages available
              </Typography>
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
          <Tab 
            key={category.id} 
            label={
              <Box display="flex" alignItems="center">
                <span style={{ marginRight: 8 }}>{getCategoryIcon(category.name)}</span>
                {category.name}
              </Box>
            } 
            value={category.id} 
          />
        ))}
      </Tabs>

      {/* Packages Grid */}
      {viewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredPackages.map(pkg => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pkg.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {getCategoryIcon(pkg.category_name)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" noWrap>
                        {pkg.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {pkg.publisher}
                      </Typography>
                    </Box>
                    {pkg.requires_verification && (
                      <SecurityIcon color="info" fontSize="small" />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {pkg.description}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip
                      label={pkg.category_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={pkg.installer_type}
                      size="small"
                      icon={<span>{getInstallerIcon(pkg.installer_type)}</span>}
                    />
                    {pkg.is_system_app && (
                      <Chip
                        label="System"
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>

                  {pkg.version && (
                    <Typography variant="caption" color="text.secondary">
                      Version: {pkg.version}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={
                      installing.has(pkg.id) ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DownloadIcon />
                      )
                    }
                    onClick={() => installPackage(pkg)}
                    disabled={installing.has(pkg.id)}
                  >
                    {installing.has(pkg.id) ? 'Installing...' : 'Install'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Package</TableCell>
                    <TableCell>Publisher</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Installer</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPackages
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {getCategoryIcon(pkg.category_name)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {pkg.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pkg.description}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {pkg.publisher}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pkg.category_name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <span style={{ marginRight: 4 }}>{getInstallerIcon(pkg.installer_type)}</span>
                            <Typography variant="body2">
                              {pkg.installer_type}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {pkg.version || 'Latest'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={
                              installing.has(pkg.id) ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DownloadIcon />
                              )
                            }
                            onClick={() => installPackage(pkg)}
                            disabled={installing.has(pkg.id)}
                          >
                            {installing.has(pkg.id) ? 'Installing...' : 'Install'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[12, 24, 48]}
              component="div"
              count={filteredPackages.length}
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
      )}

      {/* Verification Dialog */}
      <Dialog open={verificationDialog.open} onClose={() => setVerificationDialog({ open: false, package: null, code: '' })}>
        <DialogTitle>Email Verification Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please enter the 8-digit verification code sent to your email to install "{verificationDialog.package?.name}".
          </Typography>
          
          {verificationDialog.package && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Package Details:
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {verificationDialog.package.name}
              </Typography>
              <Typography variant="body2">
                <strong>Publisher:</strong> {verificationDialog.package.publisher}
              </Typography>
              <Typography variant="body2">
                <strong>Installer:</strong> {verificationDialog.package.installer_type}
              </Typography>
            </Box>
          )}

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
          <Button onClick={() => setVerificationDialog({ open: false, package: null, code: '' })}>
            Cancel
          </Button>
          <Button
            onClick={verifyAndInstall}
            variant="contained"
            disabled={verificationDialog.code.length !== 8}
          >
            Verify & Install
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackageStoreTab;