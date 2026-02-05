import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TextField,
  Button,
  Alert,
  Typography,
  Stack,
  InputAdornment,
  IconButton,
  Box,
  Container,
  Paper
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import paths from '../../routes/paths';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract token from URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!token) {
      setError('Invalid reset token');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`https://crm-rx6f.onrender.com/user/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate(paths.login);
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography align="center" variant="h4" fontWeight={600} gutterBottom>
            Reset Password
          </Typography>
          
          <Typography align="center" variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Enter your new password below
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          {!token ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Invalid or expired reset link. Please request a new password reset.
            </Alert>
          ) : (
            <Stack component="form" onSubmit={handleSubmit} direction="column" gap={3}>
              <TextField
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                variant="outlined"
                placeholder="Enter new password"
                fullWidth
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                variant="outlined"
                placeholder="Confirm new password"
                fullWidth
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        <IconifyIcon icon={showConfirmPassword ? 'ion:eye' : 'ion:eye-off'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
              
              <Button
                variant="text"
                fullWidth
                onClick={() => navigate(paths.login)}
                disabled={loading}
              >
                Back to Login
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;