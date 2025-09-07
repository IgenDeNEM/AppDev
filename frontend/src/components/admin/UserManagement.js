import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  AdminPanelSettings as AdminIcon,
  PersonRemove as RemoveAdminIcon,
  LockReset as ResetPasswordIcon
} from '@mui/icons-material';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (userId) => {
    try {
      await axios.post('/api/admin/add-admin', { userId });
      setSuccess('User promoted to admin successfully');
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      await axios.post('/api/admin/remove-admin', { userId });
      setSuccess('Admin privileges removed successfully');
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to remove admin');
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post('/api/admin/reset-password', {
        userId: selectedUser.id,
        newPassword
      });
      setSuccess('Password reset successfully');
      setResetPasswordOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleMenuClick = (event, user) => {
    setMenuAnchor(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedUser(null);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    {
      field: 'is_admin',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Admin' : 'User'}
          color={params.value ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'is_online',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Online' : 'Offline'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'last_login',
      headerName: 'Last Login',
      width: 180,
      renderCell: (params) => (
        params.value ? new Date(params.value).toLocaleString() : 'Never'
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => handleMenuClick(e, params.row)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddAdminOpen(true)}
        >
          Add Admin
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
        />
      </Box>

      {/* Add Admin Dialog */}
      <Dialog open={addAdminOpen} onClose={() => setAddAdminOpen(false)}>
        <DialogTitle>Add Admin</DialogTitle>
        <DialogContent>
          <Typography>
            Select a user to promote to admin from the table above and use the actions menu.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAdminOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedUser && !selectedUser.is_admin && (
          <MenuItem onClick={() => {
            handleAddAdmin(selectedUser.id);
            handleMenuClose();
          }}>
            <AdminIcon sx={{ mr: 1 }} />
            Make Admin
          </MenuItem>
        )}
        {selectedUser && selectedUser.is_admin && (
          <MenuItem onClick={() => {
            handleRemoveAdmin(selectedUser.id);
            handleMenuClose();
          }}>
            <RemoveAdminIcon sx={{ mr: 1 }} />
            Remove Admin
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          setResetPasswordOpen(true);
          handleMenuClose();
        }}>
          <ResetPasswordIcon sx={{ mr: 1 }} />
          Reset Password
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default UserManagement;