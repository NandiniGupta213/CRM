// src/components/sections/accountsetting.jsx
import { useState } from 'react';
import { 
  Stack, 
  Button, 
  Typography, 
  TextField,
  InputAdornment,
  Box,
  Alert,
  Divider,
  Container,
  Snackbar
} from '@mui/material';
import IconifyIcon from '../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

const SettingsPage = () => {
  const { user, updateProfile, changePassword, getAccessToken } = useAuth();
  const [formSuccess, setFormSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
   validationSchema: Yup.object({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  currentPassword: Yup.string()
    .when('newPassword', {
      is: (newPassword) => newPassword && newPassword.length > 0,
      then: (schema) => schema.required('Current password is required'),
      otherwise: (schema) => schema
    }),
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .when('newPassword', {
      is: (newPassword) => newPassword && newPassword.length > 0,
      then: (schema) => schema
        .required('Please confirm your password')
        .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
      otherwise: (schema) => schema
    })
}),
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      setErrorMessage('');
      console.log('=== FORM SUBMISSION STARTED ===');
      console.log('Form values:', values);
      console.log('Current user:', user);
      console.log('Access token exists:', !!getAccessToken());
      
      try {
        let hasUpdates = false;
        
        // Update profile info (username, email)
        if (values.username !== user?.username || values.email !== user?.email) {
          console.log('Profile info changed, updating...');
          console.log(`Username: ${user?.username} -> ${values.username}`);
          console.log(`Email: ${user?.email} -> ${values.email}`);
          
          try {
            const result = await updateProfile({
              username: values.username,
              email: values.email
            });
            console.log('Profile update successful:', result);
            hasUpdates = true;
          } catch (profileError) {
            console.error('Profile update failed:', profileError);
            throw new Error(`Profile update failed: ${profileError.message}`);
          }
        } else {
          console.log('Profile info unchanged, skipping update');
        }

        // Update password if provided
        if (values.newPassword && values.currentPassword) {
          console.log('Password fields filled, changing password...');
          
          try {
            const result = await changePassword(values.currentPassword, values.newPassword);
            console.log('Password change successful:', result);
            hasUpdates = true;
          } catch (passwordError) {
            console.error('Password change failed:', passwordError);
            throw new Error(`Password change failed: ${passwordError.message}`);
          }
        } else {
          console.log('Password fields not filled, skipping password change');
        }

        if (!hasUpdates) {
          console.log('No changes were made');
          setErrorMessage('No changes were made to update');
          return;
        }

        setFormSuccess(true);
        console.log('=== FORM SUBMISSION SUCCESSFUL ===');
        
        // Reset password fields only
        resetForm({
          values: {
            ...formik.values,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        });

        setTimeout(() => {
          setFormSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('=== FORM SUBMISSION ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        setErrorMessage(error.message || 'Failed to update account. Please try again.');
      } finally {
        setLoading(false);
        console.log('=== FORM SUBMISSION COMPLETED ===');
      }
    },
  });

  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };

  const isPasswordFieldsFilled = formik.values.newPassword || formik.values.confirmPassword;

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ maxWidth: '100%', width: '100%', p: 3 }}>
        <Typography align="center" variant="h3" fontWeight={600}>
          Account Settings
        </Typography>

      
        {formSuccess && (
          <Alert 
            severity="success" 
            sx={{ 
              mt: 3,
              borderRadius: 1,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
          >
            Account updated successfully!
          </Alert>
        )}

        <Stack 
          component="form" 
          onSubmit={formik.handleSubmit} 
          direction="column" 
          gap={3}
          mt={4}
          sx={{ width: '100%' }}
        >
          {/* Username - FULL WIDTH */}
          <Box sx={{ width: '100%' }}>
            <TextField
              id="username"
              name="username"
              type="text"
              value={formik.values.username}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="Username"
              fullWidth
              required
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              sx={{
                '& .MuiFilledInput-root': {
                  height: 56,
                  fontSize: '1rem',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ opacity: formik.values.username ? 1 : 0.5 }}>
                    <IconifyIcon icon="mingcute:user-2-fill" fontSize={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Email - FULL WIDTH */}
          <Box sx={{ width: '100%' }}>
            <TextField
              id="email"
              name="email"
              type="email"
              value={formik.values.email}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="Email Address"
              fullWidth
              required
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              sx={{
                '& .MuiFilledInput-root': {
                  height: 56,
                  fontSize: '1rem',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ opacity: formik.values.email ? 1 : 0.5 }}>
                    <IconifyIcon icon="mingcute:mail-fill" fontSize={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Divider sx={{ my: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              Change Password (Optional)
            </Typography>
          </Divider>

          {/* Current Password - FULL WIDTH */}
          {isPasswordFieldsFilled && (
            <Box sx={{ width: '100%' }}>
              <TextField
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formik.values.currentPassword}
                onChange={handleInputChange}
                onBlur={formik.handleBlur}
                variant="filled"
                placeholder="Current Password"
                fullWidth
                required={isPasswordFieldsFilled}
                error={formik.touched.currentPassword && Boolean(formik.errors.currentPassword)}
                helperText={formik.touched.currentPassword && formik.errors.currentPassword}
                sx={{
                  '& .MuiFilledInput-root': {
                    height: 56,
                    fontSize: '1rem',
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ opacity: formik.values.currentPassword ? 1 : 0.5 }}>
                      <IconifyIcon icon="mingcute:lock-fill" fontSize={20} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}

          {/* New Password - FULL WIDTH */}
          <Box sx={{ width: '100%' }}>
            <TextField
              id="newPassword"
              name="newPassword"
              type="password"
              value={formik.values.newPassword}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="New Password"
              fullWidth
              error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
              helperText={formik.touched.newPassword && formik.errors.newPassword}
              sx={{
                '& .MuiFilledInput-root': {
                  height: 56,
                  fontSize: '1rem',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ opacity: formik.values.newPassword ? 1 : 0.5 }}>
                    <IconifyIcon icon="mingcute:key-fill" fontSize={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Confirm Password - FULL WIDTH */}
          <Box sx={{ width: '100%' }}>
            <TextField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formik.values.confirmPassword}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="Confirm New Password"
              fullWidth
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              sx={{
                '& .MuiFilledInput-root': {
                  height: 56,
                  fontSize: '1rem',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ opacity: formik.values.confirmPassword ? 1 : 0.5 }}>
                    <IconifyIcon icon="mingcute:shield-check-fill" fontSize={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Action Buttons - FULL WIDTH */}
          <Stack direction="row" spacing={2} mt={3} sx={{ width: '100%' }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => formik.resetForm({
                values: {
                  username: user?.username || '',
                  email: user?.email || '',
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                }
              })}
              startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                flex: 1,
                height: 48
              }}
              disabled={loading || formSuccess}
            >
              Reset
            </Button>
            
            <LoadingButton
              type="submit"
              variant="contained"
              loading={loading}
              loadingPosition="start"
              startIcon={<IconifyIcon icon="mingcute:save-fill" />}
              disabled={(!formik.isValid || !formik.dirty) && !isPasswordFieldsFilled}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                flex: 1,
                height: 48
              }}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setErrorMessage('')}
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;