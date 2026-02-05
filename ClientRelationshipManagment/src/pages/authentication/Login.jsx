import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import IconifyIcon from '../../components/base/IconifyIcon';
import paths from '../../routes/paths';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LoadingButton } from '@mui/lab';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get the page user was trying to access before login
  const from = location.state?.from?.pathname || paths.dashboard;

  // Validation Schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Please enter a valid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  // Formik initialization
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values) => {
      setServerError('');
      setLoading(true);

      try {
        // Save email to localStorage if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', values.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        // Call login function from AuthContext
        const result = await login(values.email, values.password);
        
        if (result.success) {
          // Navigate to the page user was trying to access
          navigate(from, { replace: true });
        } else {
          // Handle specific server errors
          if (result.error && result.error.includes('invalid')) {
            setServerError('Invalid email or password. Please try again.');
          } else if (result.error && result.error.includes('not found')) {
            setServerError('No account found with this email.');
          } else if (result.error && result.error.includes('inactive')) {
            setServerError('Your account is inactive. Please contact administrator.');
          } else {
            setServerError(result.error || 'Login failed. Please check your credentials.');
          }
        }
      } catch (err) {
        console.error('Login error:', err);
        
        // Handle specific error types
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          setServerError('Cannot connect to server. Please check your internet connection.');
        } else if (err.name === 'SyntaxError') {
          setServerError('Server returned invalid response. Please try again later.');
        } else {
          setServerError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  // Load remembered email if exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      formik.setFieldValue('email', rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleRememberMe = (e) => {
    setRememberMe(e.target.checked);
    if (!e.target.checked) {
      localStorage.removeItem('rememberedEmail');
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    // Validate email first
    await formik.validateField('email');
    
    if (!formik.values.email || formik.errors.email) {
      formik.setFieldTouched('email', true, true);
      setServerError('Please enter a valid email address first');
      return;
    }

    setServerError('');
    setLoading(true);

    try {
      const response = await fetch('https://crm-rx6f.onrender.com/user/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formik.values.email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Password reset link has been sent to your email. Please check your inbox.');
      } else {
        setServerError(data.message || 'Failed to send reset link. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setServerError('Cannot connect to server. Please check your internet connection.');
      } else if (err.name === 'SyntaxError') {
        setServerError('Server returned invalid response. Please try again later.');
      } else {
        setServerError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear server error when user starts typing
  const handleInputChange = (e) => {
    formik.handleChange(e);
    if (serverError) {
      setServerError('');
    }
  };

  // Helper function to check field errors
  const hasError = (fieldName) => {
    return formik.touched[fieldName] && Boolean(formik.errors[fieldName]);
  };

  const getFieldError = (fieldName) => {
    return formik.touched[fieldName] && formik.errors[fieldName] 
      ? formik.errors[fieldName] 
      : '';
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Login
      </Typography>

      {/* Show server error message if any */}
      {serverError && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            borderRadius: 1,
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
          icon={<IconifyIcon icon="mingcute:warning-fill" />}
          onClose={() => setServerError('')}
        >
          {serverError}
        </Alert>
      )}

      {/* Show validation errors summary */}
      {Object.keys(formik.errors).length > 0 && formik.submitCount > 0 && (
        <Alert 
          severity="warning" 
          sx={{ 
            mt: 2,
            borderRadius: 1,
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
          icon={<IconifyIcon icon="mingcute:alert-fill" />}
        >
          Please fix the following errors:
          <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
            {Object.entries(formik.errors)
              .filter(([field]) => formik.touched[field])
              .map(([field, error]) => (
                <li key={field}>
                  <Typography variant="body2">
                    {field === 'email' ? 'Email' : 'Password'}: {error}
                  </Typography>
                </li>
              ))}
          </Box>
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      <Stack component="form" onSubmit={formik.handleSubmit} direction="column" gap={2}>
        {/* Email Field */}
        <TextField
          id="email"
          name="email"
          type="email"
          value={formik.values.email}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Enter your email"
          autoComplete="email"
          fullWidth
          autoFocus
          required
          disabled={loading}
          error={hasError('email')}
          helperText={getFieldError('email')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconifyIcon icon="mingcute:mail-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Password Field */}
        <TextField
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formik.values.password}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Enter your password"
          autoComplete="current-password"
          fullWidth
          required
          disabled={loading}
          error={hasError('password')}
          helperText={getFieldError('password')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconifyIcon icon="mingcute:lock-fill" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel
            control={
              <Checkbox 
                color="primary" 
                checked={rememberMe}
                onChange={handleRememberMe}
                disabled={loading}
              />
            }
            label="Remember me"
          />

          <Link 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              handleForgotPassword();
            }}
            fontSize="body2.fontSize" 
            letterSpacing={0.5}
            sx={{ 
              textDecoration: 'none', 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
              opacity: loading ? 0.5 : 1
            }}
            disabled={loading}
          >
            Forgot password?
          </Link>
        </Stack>

        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          loading={loading}
          loadingPosition="start"
          startIcon={<IconifyIcon icon="mingcute:login-circle-line" />}
          disabled={!formik.isValid || loading}
          sx={{ 
            mt: 1,
            py: 1.5,
            fontWeight: 600
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </LoadingButton>

      </Stack>
    </>
  );
};

export default Login;