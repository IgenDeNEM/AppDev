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
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Visibility as ScreenIcon,
  History as HistoryIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';

function RemoteControl() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [screenCaptureOpen, setScreenCaptureOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCommandHistory();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      const onlineUsers = response.data.users.filter(user => user.is_online);
      setUsers(onlineUsers);
    } catch (error) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommandHistory = async () => {
    try {
      const response = await axios.get('/api/remote/command-history');
      setCommandHistory(response.data.commands);
    } catch (error) {
      console.error('Failed to fetch command history:', error);
    }
  };

  const handleExecuteCommand = async () => {
    if (!selectedUser || !command.trim()) {
      setError('Please select a user and enter a command');
      return;
    }

    setExecuting(true);
    try {
      await axios.post('/api/remote/execute-command', {
        targetUserId: selectedUser,
        command: command.trim()
      });
      
      setSuccess('Command sent successfully');
      setCommand('');
      fetchCommandHistory();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to execute command');
    } finally {
      setExecuting(false);
    }
  };

  const handleRequestScreenCapture = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    try {
      await axios.post('/api/remote/request-screen-capture', {
        targetUserId: selectedUser
      });
      
      setSuccess('Screen capture request sent');
      setScreenCaptureOpen(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to request screen capture');
    }
  };

  const commonCommands = [
    'dir',
    'ls',
    'pwd',
    'whoami',
    'ipconfig',
    'ifconfig',
    'ps',
    'tasklist',
    'netstat -an',
    'systeminfo'
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
        Remote Control
      </Typography>

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

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Execute Command
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Select User</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Select User"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                        />
                        {user.username}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                margin="normal"
                label="Command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command to execute..."
                multiline
                rows={3}
              />

              <Box mt={2} display="flex" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<ExecuteIcon />}
                  onClick={handleExecuteCommand}
                  disabled={executing || !selectedUser || !command.trim()}
                >
                  {executing ? <CircularProgress size={20} /> : 'Execute'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ScreenIcon />}
                  onClick={() => setScreenCaptureOpen(true)}
                  disabled={!selectedUser}
                >
                  Screen Capture
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common Commands
              </Typography>
              <List dense>
                {commonCommands.map((cmd, index) => (
                  <ListItem 
                    key={index}
                    button
                    onClick={() => setCommand(cmd)}
                  >
                    <ListItemText 
                      primary={cmd}
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Command History
              </Typography>
              <List>
                {commandHistory.slice(0, 10).map((cmd) => (
                  <ListItem key={cmd.id}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                            {cmd.command}
                          </Typography>
                          <Chip
                            label={cmd.status}
                            color={cmd.status === 'executed' ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Admin: {cmd.admin_username} | Target: {cmd.target_username}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(cmd.created_at).toLocaleString()}
                          </Typography>
                          {cmd.result && (
                            <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                              Result: {cmd.result}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Screen Capture Dialog */}
      <Dialog 
        open={screenCaptureOpen} 
        onClose={() => setScreenCaptureOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Request Screen Capture</DialogTitle>
        <DialogContent>
          <Typography>
            This will request a screen capture from the selected user's desktop.
            The capture will be displayed here once received.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScreenCaptureOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRequestScreenCapture} 
            variant="contained"
            startIcon={<ScreenIcon />}
          >
            Request Capture
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RemoteControl;