
import { useState, useEffect } from 'react';
import { 
  Stack, 
  Button, 
  Typography, 
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  Divider
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const ClientForm = ({ client = null, onSubmit, loading = false, onSuccess = () => {}, isEdit = false }) => {
  const [formSuccess, setFormSuccess] = useState(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      companyName: client?.companyName || '',
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
      city: client?.city || '',
      state: client?.state || '',
      postalCode: client?.postalCode || '',
      status: client?.status || 'active',
      notes: client?.notes || '',
    },
    validationSchema: Yup.object({
      companyName: Yup.string()
        .required('Company name is required')
        .min(2, 'Company name must be at least 2 characters'),
      name: Yup.string()
        .required('Contact name is required'),
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
      phone: Yup.string()
  .required('Phone is required')
  .test('phone', 'Phone number must be exactly 10 digits', (value) => {
    if (!value) return false;
    
  
    const digitsOnly = value.replace(/\D/g, '');
    

    return digitsOnly.length === 10;
  })

  .matches(/^[0-9+\-\s()]+$/, 'Please enter a valid phone number (only numbers, spaces, dashes, parentheses, and + allowed)'),
      address: Yup.string()
        .required('Address is required'),
      city: Yup.string()
        .required('City is required'),
      state: Yup.string()
        .required('State is required'),
      postalCode: Yup.string()
        .required('Postal code is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await onSubmit(values);
        setFormSuccess(true);
        resetForm();

        setTimeout(() => {
          onSuccess(); 
        }, 2000);
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
  });

  const handleStatusToggle = () => {
    formik.setFieldValue('status', formik.values.status === 'active' ? 'inactive' : 'active');
  };

  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        {isEdit ? 'Edit Client' : 'Add New Client'}
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
          Client {isEdit ? 'updated' : 'added'} successfully! Closing in 2 seconds...
        </Alert>
      )}

      <Stack 
        component="form" 
        onSubmit={formik.handleSubmit} 
        direction="column" 
        gap={2}
        mt={4}
      >
        {/* Company Name */}
        <TextField
          id="companyName"
          name="companyName"
          type="text"
          value={formik.values.companyName}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Company Name"
          fullWidth
          required
          error={formik.touched.companyName && Boolean(formik.errors.companyName)}
          helperText={formik.touched.companyName && formik.errors.companyName}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.companyName ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:building-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Contact Name */}
        <TextField
          id="name"
          name="name"
          type="text"
          value={formik.values.name}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Contact Person Name"
          fullWidth
          required
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.name ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:user-2-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Email */}
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.email ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:mail-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Phone */}
        <TextField
          id="phone"
          name="phone"
          type="text"
          value={formik.values.phone}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Phone Number"
          fullWidth
          required
          error={formik.touched.phone && Boolean(formik.errors.phone)}
          helperText={formik.touched.phone && formik.errors.phone}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.phone ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:phone-fill" />
              </InputAdornment>
            ),
          }}
        />

        <Divider sx={{ my: 1 }} />

        {/* Address */}
        <TextField
          id="address"
          name="address"
          type="text"
          value={formik.values.address}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Street Address"
          fullWidth
          required
          error={formik.touched.address && Boolean(formik.errors.address)}
          helperText={formik.touched.address && formik.errors.address}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.address ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:location-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* City, State, Postal Code */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            id="city"
            name="city"
            type="text"
            value={formik.values.city}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            variant="filled"
            placeholder="City"
            fullWidth
            required
            error={formik.touched.city && Boolean(formik.errors.city)}
            helperText={formik.touched.city && formik.errors.city}
          />

          <TextField
            id="state"
            name="state"
            type="text"
            value={formik.values.state}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            variant="filled"
            placeholder="State"
            fullWidth
            required
            error={formik.touched.state && Boolean(formik.errors.state)}
            helperText={formik.touched.state && formik.errors.state}
          />

          <TextField
            id="postalCode"
            name="postalCode"
            type="text"
            value={formik.values.postalCode}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            variant="filled"
            placeholder="Postal Code"
            fullWidth
            required
            error={formik.touched.postalCode && Boolean(formik.errors.postalCode)}
            helperText={formik.touched.postalCode && formik.errors.postalCode}
          />
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Notes */}
        <TextField
          id="notes"
          name="notes"
          type="text"
          value={formik.values.notes}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Additional Notes (Optional)"
          multiline
          rows={3}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.notes ? 1 : 0.5, alignSelf: 'flex-start', mt: 1.5 }}>
                <IconifyIcon icon="mingcute:document-fill" />
              </InputAdornment>
            ),
          }}
        />
        
        {/* Status Toggle */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            bgcolor: 'action.hover',
            p: 1.5,
            borderRadius: 1,
            mb: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconifyIcon 
              icon="mingcute:flag-fill" 
              fontSize={20} 
              color={formik.values.status === 'active' ? 'success.main' : 'error.main'} 
            />
            <Typography variant="body2" fontWeight={500}>
              Status: 
              <Box 
                component="span" 
                sx={{ 
                  color: formik.values.status === 'active' ? 'success.main' : 'error.main',
                  ml: 1,
                  fontWeight: 600
                }}
              >
                {formik.values.status === 'active' ? 'Active' : 'Inactive'}
              </Box>
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.status === 'active'}
                onChange={handleStatusToggle}
                size="small"
                color="success"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => formik.resetForm()}
            startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
            sx={{ 
              py: 0.75,
              fontSize: '0.8125rem',
              flex: 1
            }}
            disabled={formSuccess}
          >
            Reset
          </Button>
          
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            loadingPosition="start"
            startIcon={<IconifyIcon icon="mingcute:check-fill" />}
            disabled={!formik.isValid || !formik.dirty || loading || formSuccess}
            sx={{ 
              py: 0.75,
              fontSize: '0.8125rem',
              flex: 1
            }}
          >
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : 
              formSuccess ? (isEdit ? 'Updated!' : 'Added!') : 
              (isEdit ? 'Update Client' : 'Add Client')}
          </LoadingButton>
        </Stack>
      </Stack>
    </>
  );
};

export default ClientForm;