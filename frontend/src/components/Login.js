import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    registrationKey: ''
  });

  // Email verification state
  const [verificationStep, setVerificationStep] = useState(null);
  const [verificationData, setVerificationData] = useState({
    email: '',
    code: '',
    userId: null
  });

  const { login, register } = useAuth();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(loginData.username, loginData.password);
    
    if (!result.success) {
      setError(result.error);
    } else if (result.requires2FA) {
      setVerificationStep('2fa');
      setVerificationData({
        email: result.user?.email || '',
        userId: result.userId
      });
      setSuccess('Two-factor authentication required. Please check your email for verification code.');
    }
    
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await register(
      registerData.username,
      registerData.email,
      registerData.password,
      registerData.registrationKey
    );
    
    if (result.success) {
      if (result.requiresVerification) {
        setVerificationStep('registration');
        setVerificationData({
          email: registerData.email,
          userId: result.userId
        });
        setSuccess('Registration successful! Please check your email for verification code.');
      } else {
        setSuccess('Registration successful! You can now login.');
        setTabValue(0);
        setRegisterData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          registrationKey: ''
        });
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleVerificationCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/email/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationData.email,
          code: verificationData.code,
          type: verificationStep
        }),
      });

      const result = await response.json();

      if (result.valid) {
        if (verificationStep === '2fa') {
          // Complete 2FA login
          const loginResponse = await fetch('/api/auth/complete-2fa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: verificationData.userId,
              code: verificationData.code
            }),
          });

          const loginResult = await loginResponse.json();

          if (loginResult.token) {
            localStorage.setItem('token', loginResult.token);
            window.location.reload();
          } else {
            setError(loginResult.error || '2FA verification failed');
          }
        } else if (verificationStep === 'registration') {
          setSuccess('Email verified successfully! You can now login.');
          setVerificationStep(null);
          setTabValue(0);
          setRegisterData({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            registrationKey: ''
          });
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    }

    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/email/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationData.email,
          type: verificationStep,
          userId: verificationData.userId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Verification code sent successfully!');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Failed to send verification code');
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    setVerificationStep(null);
    setVerificationData({ email: '', code: '', userId: null });
    setError('');
    setSuccess('');
  };

  return (
    <Box>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tweak Application
          </Typography>
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
        <Paper elevation={3} sx={{ width: '100%', padding: 2 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Tweak Application
          </Typography>
          
          {!verificationStep && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="login tabs">
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          {verificationStep && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>
                {verificationStep === '2fa' ? 'Two-Factor Authentication' : 'Email Verification'}
              </Typography>
              <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
                We've sent an 8-digit verification code to {verificationData.email}
              </Typography>
              
              <Box component="form" onSubmit={handleVerificationCode}>
                <TextField
                  fullWidth
                  label="Verification Code"
                  value={verificationData.code}
                  onChange={(e) => setVerificationData({ ...verificationData, code: e.target.value })}
                  placeholder="12345678"
                  inputProps={{ maxLength: 8, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
                  sx={{ mb: 2 }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mb: 2 }}
                  disabled={loading || verificationData.code.length !== 8}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify Code'}
                </Button>
                
                <Box display="flex" justifyContent="space-between">
                  <Button
                    variant="text"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Resend Code
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleBackToLogin}
                  >
                    Back to Login
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {!verificationStep && (
            <>
              <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="reg-username"
                label="Username"
                name="username"
                autoComplete="username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="reg-email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="reg-password"
                autoComplete="new-password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="reg-confirm-password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="registrationKey"
                label="Registration Key"
                id="reg-key"
                value={registerData.registrationKey}
                onChange={(e) => setRegisterData({ ...registerData, registrationKey: e.target.value })}
                helperText="Contact an administrator to get a registration key"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
            </Box>
          </TabPanel>
            </>
          )}
        </Paper>
      </Box>
        </Container>
      </Box>
    );
  }

export default Login;