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
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const UserRoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    is_system_role: false
  });

  const [permissions, setPermissions] = useState({
    tweaks: [],
    package_categories: [],
    packages: [],
    system_actions: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/rbac/roles')
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
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

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      description: '',
      is_system_role: false
    });
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      is_system_role: role.is_system_role
    });
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await axios.put(`/api/rbac/roles/${editingRole.id}`, roleForm);
        addAlert('Role updated successfully', 'success');
      } else {
        await axios.post('/api/rbac/roles', roleForm);
        addAlert('Role created successfully', 'success');
      }
      
      setRoleDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving role:', error);
      addAlert('Failed to save role', 'error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await axios.delete(`/api/rbac/roles/${roleId}`);
        addAlert('Role deleted successfully', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting role:', error);
        addAlert('Failed to delete role', 'error');
      }
    }
  };

  const handleManagePermissions = async (role) => {
    setSelectedRole(role);
    try {
      const response = await axios.get(`/api/rbac/roles/${role.id}/permissions`);
      const rolePermissions = response.data;
      
      // Initialize permissions structure
      const newPermissions = {
        tweaks: [],
        package_categories: [],
        packages: [],
        system_actions: []
      };

      // Group permissions by type
      rolePermissions.forEach(permission => {
        if (newPermissions[permission.permission_type]) {
          newPermissions[permission.permission_type].push({
            id: permission.id,
            resource_id: permission.resource_id,
            is_allowed: permission.is_allowed
          });
        }
      });

      setPermissions(newPermissions);
      setPermissionDialogOpen(true);
    } catch (error) {
      console.error('Error loading permissions:', error);
      addAlert('Failed to load permissions', 'error');
    }
  };

  const handleSavePermissions = async () => {
    try {
      // Convert permissions back to flat structure
      const flatPermissions = [];
      
      Object.keys(permissions).forEach(permissionType => {
        permissions[permissionType].forEach(permission => {
          flatPermissions.push({
            permission_type: permissionType,
            resource_id: permission.resource_id,
            is_allowed: permission.is_allowed
          });
        });
      });

      await axios.put(`/api/rbac/roles/${selectedRole.id}/permissions`, {
        permissions: flatPermissions
      });
      
      addAlert('Permissions updated successfully', 'success');
      setPermissionDialogOpen(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      addAlert('Failed to save permissions', 'error');
    }
  };

  const handleAssignRole = async (userId, roleId) => {
    try {
      await axios.post(`/api/rbac/users/${userId}/roles/${roleId}`);
      addAlert('Role assigned successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error assigning role:', error);
      addAlert('Failed to assign role', 'error');
    }
  };

  const handleRemoveRole = async (userId, roleId) => {
    try {
      await axios.delete(`/api/rbac/users/${userId}/roles/${roleId}`);
      addAlert('Role removed successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error removing role:', error);
      addAlert('Failed to remove role', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Typography variant="h4">User Role Management</Typography>
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
            onClick={handleCreateRole}
          >
            Add Role
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Users" icon={<PeopleIcon />} />
        <Tab label="Roles" icon={<SecurityIcon />} />
      </Tabs>

      {/* Users Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <TextField
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ width: 300 }}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Online</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {user.username}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {user.roles?.map(role => (
                              <Chip
                                key={role.id}
                                label={role.name}
                                size="small"
                                color={role.is_system_role ? 'primary' : 'default'}
                              />
                            )) || <Typography variant="caption">No roles</Typography>}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_admin ? 'Yes' : 'No'}
                            color={user.is_admin ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_online ? 'Online' : 'Offline'}
                            color={user.is_online ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              // Open role assignment dialog
                              setSelectedUser(user);
                              setUserRoleDialogOpen(true);
                            }}
                          >
                            Manage Roles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
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

      {/* Roles Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              {roles.map(role => (
                <Grid item xs={12} sm={6} md={4} key={role.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">
                          {role.name}
                          {role.is_system_role && (
                            <Chip label="System" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleEditRole(role)}
                            disabled={role.is_system_role}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.is_system_role}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {role.description}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<SecurityIcon />}
                        onClick={() => handleManagePermissions(role)}
                      >
                        Manage Permissions
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Role Name"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={roleForm.is_system_role}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, is_system_role: e.target.checked }))}
                    disabled={editingRole?.is_system_role}
                  />
                }
                label="System Role"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained">
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Permissions - {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Tweaks</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  <ListItem>
                    <ListItemText primary="All Tweaks" />
                    <ListItemSecondaryAction>
                      <Checkbox
                        checked={permissions.tweaks.some(p => p.resource_id === null && p.is_allowed)}
                        onChange={(e) => {
                          const newPermissions = { ...permissions };
                          if (e.target.checked) {
                            newPermissions.tweaks = [{ resource_id: null, is_allowed: true }];
                          } else {
                            newPermissions.tweaks = [];
                          }
                          setPermissions(newPermissions);
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Package Categories</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  <ListItem>
                    <ListItemText primary="All Categories" />
                    <ListItemSecondaryAction>
                      <Checkbox
                        checked={permissions.package_categories.some(p => p.resource_id === null && p.is_allowed)}
                        onChange={(e) => {
                          const newPermissions = { ...permissions };
                          if (e.target.checked) {
                            newPermissions.package_categories = [{ resource_id: null, is_allowed: true }];
                          } else {
                            newPermissions.package_categories = [];
                          }
                          setPermissions(newPermissions);
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>System Actions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  <ListItem>
                    <ListItemText primary="User Management" />
                    <ListItemSecondaryAction>
                      <Checkbox
                        checked={permissions.system_actions.some(p => p.resource_id === 'user_management' && p.is_allowed)}
                        onChange={(e) => {
                          const newPermissions = { ...permissions };
                          const existingIndex = newPermissions.system_actions.findIndex(p => p.resource_id === 'user_management');
                          
                          if (e.target.checked) {
                            if (existingIndex === -1) {
                              newPermissions.system_actions.push({ resource_id: 'user_management', is_allowed: true });
                            } else {
                              newPermissions.system_actions[existingIndex].is_allowed = true;
                            }
                          } else {
                            if (existingIndex !== -1) {
                              newPermissions.system_actions[existingIndex].is_allowed = false;
                            }
                          }
                          setPermissions(newPermissions);
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Log Viewing" />
                    <ListItemSecondaryAction>
                      <Checkbox
                        checked={permissions.system_actions.some(p => p.resource_id === 'log_viewing' && p.is_allowed)}
                        onChange={(e) => {
                          const newPermissions = { ...permissions };
                          const existingIndex = newPermissions.system_actions.findIndex(p => p.resource_id === 'log_viewing');
                          
                          if (e.target.checked) {
                            if (existingIndex === -1) {
                              newPermissions.system_actions.push({ resource_id: 'log_viewing', is_allowed: true });
                            } else {
                              newPermissions.system_actions[existingIndex].is_allowed = true;
                            }
                          } else {
                            if (existingIndex !== -1) {
                              newPermissions.system_actions[existingIndex].is_allowed = false;
                            }
                          }
                          setPermissions(newPermissions);
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePermissions} variant="contained">
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserRoleManagement;