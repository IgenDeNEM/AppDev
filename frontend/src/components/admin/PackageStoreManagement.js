import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  Package as PackageIcon
} from '@mui/icons-material';
import axios from 'axios';

const PackageStoreManagement = () => {
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    category_id: '',
    publisher: '',
    version: '',
    installer_type: 'chocolatey',
    installer_source: '',
    silent_flags: '',
    download_url: '',
    icon_url: '',
    is_system_app: false,
    requires_verification: false
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '',
    sort_order: 0
  });

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
      console.error('Error loading data:', error);
      addAlert('Failed to load data', 'error');
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

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      description: '',
      category_id: '',
      publisher: '',
      version: '',
      installer_type: 'chocolatey',
      installer_source: '',
      silent_flags: '',
      download_url: '',
      icon_url: '',
      is_system_app: false,
      requires_verification: false
    });
    setDialogOpen(true);
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      category_id: pkg.category_id,
      publisher: pkg.publisher,
      version: pkg.version,
      installer_type: pkg.installer_type,
      installer_source: pkg.installer_source,
      silent_flags: pkg.silent_flags,
      download_url: pkg.download_url,
      icon_url: pkg.icon_url,
      is_system_app: pkg.is_system_app,
      requires_verification: pkg.requires_verification
    });
    setDialogOpen(true);
  };

  const handleSavePackage = async () => {
    try {
      if (editingPackage) {
        await axios.put(`/api/packages/${editingPackage.id}`, packageForm);
        addAlert('Package updated successfully', 'success');
      } else {
        await axios.post('/api/packages', packageForm);
        addAlert('Package created successfully', 'success');
      }
      
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving package:', error);
      addAlert('Failed to save package', 'error');
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      try {
        await axios.delete(`/api/packages/${packageId}`);
        addAlert('Package deleted successfully', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting package:', error);
        addAlert('Failed to delete package', 'error');
      }
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      icon: '',
      sort_order: categories.length + 1
    });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      icon: category.icon,
      sort_order: category.sort_order
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`/api/packages/categories/${editingCategory.id}`, categoryForm);
        addAlert('Category updated successfully', 'success');
      } else {
        await axios.post('/api/packages/categories', categoryForm);
        addAlert('Category created successfully', 'success');
      }
      
      setCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      addAlert('Failed to save category', 'error');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || pkg.category_id === parseInt(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Package Store Management</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePackage}
          >
            Add Package
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Packages" icon={<PackageIcon />} />
        <Tab label="Categories" icon={<CategoryIcon />} />
      </Tabs>

      {/* Packages Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Publisher</TableCell>
                    <TableCell>Installer</TableCell>
                    <TableCell>System App</TableCell>
                    <TableCell>Verification</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPackages
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {pkg.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pkg.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={pkg.category_name} size="small" />
                        </TableCell>
                        <TableCell>{pkg.publisher}</TableCell>
                        <TableCell>
                          <Chip label={pkg.installer_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pkg.is_system_app ? 'Yes' : 'No'}
                            color={pkg.is_system_app ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pkg.requires_verification ? 'Required' : 'Not Required'}
                            color={pkg.requires_verification ? 'info' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditPackage(pkg)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePackage(pkg.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
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

      {/* Categories Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCategory}
              >
                Add Category
              </Button>
            </Box>

            <Grid container spacing={2}>
              {categories.map(category => (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">{category.name}</Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePackage(category.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {category.description}
                      </Typography>
                      <Chip
                        label={`${packages.filter(p => p.category_id === category.id).length} packages`}
                        size="small"
                        color="primary"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Package Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPackage ? 'Edit Package' : 'Create Package'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Package Name"
                value={packageForm.name}
                onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={packageForm.category_id}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, category_id: e.target.value }))}
                  label="Category"
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={packageForm.description}
                onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Publisher"
                value={packageForm.publisher}
                onChange={(e) => setPackageForm(prev => ({ ...prev, publisher: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Version"
                value={packageForm.version}
                onChange={(e) => setPackageForm(prev => ({ ...prev, version: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Installer Type</InputLabel>
                <Select
                  value={packageForm.installer_type}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, installer_type: e.target.value }))}
                  label="Installer Type"
                >
                  <MenuItem value="chocolatey">Chocolatey</MenuItem>
                  <MenuItem value="winget">Winget</MenuItem>
                  <MenuItem value="direct_download">Direct Download</MenuItem>
                  <MenuItem value="msi">MSI</MenuItem>
                  <MenuItem value="exe">EXE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Installer Source"
                value={packageForm.installer_source}
                onChange={(e) => setPackageForm(prev => ({ ...prev, installer_source: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Silent Flags"
                value={packageForm.silent_flags}
                onChange={(e) => setPackageForm(prev => ({ ...prev, silent_flags: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Download URL"
                value={packageForm.download_url}
                onChange={(e) => setPackageForm(prev => ({ ...prev, download_url: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Icon URL"
                value={packageForm.icon_url}
                onChange={(e) => setPackageForm(prev => ({ ...prev, icon_url: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={packageForm.is_system_app}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, is_system_app: e.target.checked }))}
                  />
                }
                label="System Application"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={packageForm.requires_verification}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, requires_verification: e.target.checked }))}
                  />
                }
                label="Requires Verification"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePackage} variant="contained">
            {editingPackage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Create Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category Name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackageStoreManagement;