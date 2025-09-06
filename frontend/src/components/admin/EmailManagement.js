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
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Email as EmailIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function EmailManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // SMTP Configuration
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    is_active: true
  });

  // Email Statistics
  const [emailStats, setEmailStats] = useState(null);
  const [verificationStats, setVerificationStats] = useState(null);

  // Email Logs
  const [emailLogs, setEmailLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  // Test Email
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailForm, setTestEmailForm] = useState({
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchData();
  }, [tabValue, logsPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (tabValue === 0) {
        // SMTP Configuration
        const configResponse = await axios.get('/api/smtp/config');
        setSmtpConfigs(configResponse.data.configs);
      } else if (tabValue === 1) {
        // Email Statistics
        const [statsResponse, verificationResponse] = await Promise.all([
          axios.get('/api/email/stats'),
          axios.get('/api/email/verification-stats')
        ]);
        setEmailStats(statsResponse.data);
        setVerificationStats(verificationResponse.data);
      } else if (tabValue === 2) {
        // Email Logs
        const logsResponse = await axios.get(`/api/email/logs?page=${logsPage}&limit=20`);
        setEmailLogs(logsResponse.data.logs);
        setLogsTotal(logsResponse.data.pagination.total);
      }
    } catch (error) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleSmtpSubmit = async () => {
    try {
      setLoading(true);
      await axios.post('/api/smtp/config', smtpForm);
      setSuccess('SMTP configuration saved successfully');
      setSmtpDialogOpen(false);
      fetchData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save SMTP configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setLoading(true);
      await axios.post('/api/email/send-test-email', testEmailForm);
      setSuccess('Test email sent successfully');
      setTestEmailDialogOpen(false);
      setTestEmailForm({ email: '', subject: '', message: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSmtpConfig = async (id) => {
    if (window.confirm('Are you sure you want to delete this SMTP configuration?')) {
      try {
        setLoading(true);
        await axios.delete(`/api/smtp/config/${id}`);
        setSuccess('SMTP configuration deleted successfully');
        fetchData();
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to delete SMTP configuration');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon color="success" />;
      case 'failed':
      case 'bounced':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'success';
      case 'failed':
      case 'bounced':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading && !emailStats) {
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
          Email Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
        >
          Refresh
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="email management tabs">
          <Tab label="SMTP Configuration" />
          <Tab label="Statistics" />
          <Tab label="Email Logs" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">SMTP Configuration</Typography>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setSmtpDialogOpen(true)}
          >
            Add Configuration
          </Button>
        </Box>

        <Grid container spacing={3}>
          {smtpConfigs.map((config) => (
            <Grid item xs={12} md={6} key={config.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {config.host}:{config.port}
                    </Typography>
                    <Box>
                      <Chip
                        label={config.is_active ? 'Active' : 'Inactive'}
                        color={config.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSmtpConfig(config.id)}
                        disabled={config.is_active}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    From: {config.from_name} &lt;{config.from_email}&gt;
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Username: {config.username}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Secure: {config.secure ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Created: {new Date(config.created_at).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Email Statistics
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Email Types (Last 30 Days)
                </Typography>
                {emailStats?.emailStats?.map((stat, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">
                      {stat.type} ({stat.status})
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stat.count}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Verification Codes (Last 30 Days)
                </Typography>
                {verificationStats?.verificationStats?.map((stat, index) => (
                  <Box key={index} mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      {stat.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Total:</Typography>
                      <Typography variant="body2">{stat.total_codes}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Used:</Typography>
                      <Typography variant="body2" color="success.main">{stat.used_codes}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Expired:</Typography>
                      <Typography variant="body2" color="error.main">{stat.expired_codes}</Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Email Logs</Typography>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setTestEmailDialogOpen(true)}
          >
            Send Test Email
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Sent At</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emailLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(log.status)}
                      <Chip
                        label={log.status}
                        color={getStatusColor(log.status)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.type.replace('_', ' ')}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.email}</TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>{log.username || '-'}</TableCell>
                  <TableCell>{new Date(log.sent_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {log.error_message ? (
                      <Tooltip title={log.error_message}>
                        <ErrorIcon color="error" />
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* SMTP Configuration Dialog */}
      <Dialog open={smtpDialogOpen} onClose={() => setSmtpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>SMTP Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={smtpForm.host}
                onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={smtpForm.port}
                onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={smtpForm.username}
                onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={smtpForm.password}
                onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="From Email"
                type="email"
                value={smtpForm.from_email}
                onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="From Name"
                value={smtpForm.from_name}
                onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={smtpForm.secure}
                    onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                  />
                }
                label="Use SSL/TLS"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmtpDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSmtpSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Save Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onClose={() => setTestEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={testEmailForm.email}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Subject"
            value={testEmailForm.subject}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, subject: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            value={testEmailForm.message}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, message: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTestEmail} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EmailManagement;