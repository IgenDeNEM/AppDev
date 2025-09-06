import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [page, rowsPerPage, filters]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });

      if (filters.userId) {
        params.append('userId', filters.userId);
      }

      const response = await axios.get(`/api/admin/logs?${params}`);
      setLogs(response.data.logs);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      setError('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'user_login':
        return 'success';
      case 'user_logout':
        return 'info';
      case 'user_registered':
        return 'primary';
      case 'key_generated':
        return 'warning';
      case 'admin_added':
      case 'admin_removed':
        return 'secondary';
      case 'remote_command':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Details', 'IP Address'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.username,
        formatAction(log.action),
        log.details || '',
        log.ip_address || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && logs.length === 0) {
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
          Activity Logs
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportLogs}
            disabled={logs.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter by User</InputLabel>
            <Select
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              label="Filter by User"
            >
              <MenuItem value="">All Users</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Action</InputLabel>
            <Select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              label="Filter by Action"
            >
              <MenuItem value="">All Actions</MenuItem>
              <MenuItem value="user_login">User Login</MenuItem>
              <MenuItem value="user_logout">User Logout</MenuItem>
              <MenuItem value="user_registered">User Registration</MenuItem>
              <MenuItem value="key_generated">Key Generation</MenuItem>
              <MenuItem value="admin_added">Admin Added</MenuItem>
              <MenuItem value="admin_removed">Admin Removed</MenuItem>
              <MenuItem value="remote_command">Remote Command</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="To Date"
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
        </Box>
      </Paper>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">
                      {log.username}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatAction(log.action)}
                    color={getActionColor(log.action)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {log.details || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {log.ip_address || '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

export default ActivityLogs;