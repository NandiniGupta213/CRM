import { useState, useEffect } from 'react';
import { 
  Stack, 
  Button, 
  Typography, 
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AddEmployeeForm = ({ 
  onSubmit, 
  loading = false, 
  employee = null, 
  isEdit = false, 
  onSuccess 
}) => {
  const [success, setSuccess] = useState(false);

  // Hardcoded departments
  const departments = [
    'Development',
    'Design',
    'Marketing',
    'Sales',
    'Operations',
    'HR',
    'Finance',
    'Engineering',
    'Product',
    'Quality Assurance',
    'Support',
    'IT',
    'Administration',
    'Research & Development'
  ];

  // If editing, set up the form with employee data
  useEffect(() => {
    if (employee && isEdit) {
      // Format the employee data for the form
      const formattedEmployee = {
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        roleId: employee.roleId || '',
        department: employee.department || '',
        status: employee.status === 'active'
      };
      
      // Use setTimeout to ensure formik is ready
      setTimeout(() => {
        formik.setValues(formattedEmployee);
      }, 0);
    }
  }, [employee, isEdit]);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      roleId: '', // 2 for Project Manager, 3 for Employee
      department: '',
      status: true,
    },
    validationSchema: Yup.object({
      firstName: Yup.string()
        .required('First name is required')
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters'),
      lastName: Yup.string()
        .required('Last name is required')
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters'),
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required')
        .max(100, 'Email must be less than 100 characters'),
      phone: Yup.string()
  .required('Phone is required')
  .test('phone', 'Phone number must be exactly 10 digits', (value) => {
    if (!value) return false;
    
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Check if we have exactly 10 digits
    return digitsOnly.length === 10;
  })
  // Keep the format validation as well
  .matches(/^[0-9+\-\s()]+$/, 'Please enter a valid phone number (only numbers, spaces, dashes, parentheses, and + allowed)'),
      roleId: Yup.string()
        .required('Role is required')
        .oneOf(['2', '3'], 'Invalid role selected'),
      department: Yup.string()
        .required('Department is required')
        .oneOf(departments, 'Please select a valid department')
        .max(100, 'Department must be less than 100 characters'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        // Format values for backend
        const formattedValues = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          roleId: values.roleId,
          department: values.department,
          status: values.status,
        };

        const result = await onSubmit(formattedValues);
        
        if (result && result.success) {
          setSuccess(true);
          
          if (!isEdit) {
            resetForm();
          }
          
          if (onSuccess) {
            onSuccess(result);
          }
          
          setTimeout(() => setSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Error adding/updating employee:', error);
      }
    },
  });

  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };

  const handleStatusToggle = () => {
    formik.setFieldValue('status', !formik.values.status);
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        {isEdit ? 'Edit Employee' : 'Add New Employee'}
      </Typography>

      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mt: 3,
            borderRadius: 1,
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
          icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
        >
          {isEdit ? 'Employee updated successfully!' : 'Employee added successfully!'}
        </Alert>
      )}

      <Stack 
        component="form" 
        onSubmit={formik.handleSubmit} 
        direction="column" 
        gap={2}
        mt={4}
      >
        {/* First Name */}
        <TextField
          id="firstName"
          name="firstName"
          type="text"
          value={formik.values.firstName}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="First Name"
          fullWidth
          required
          error={formik.touched.firstName && Boolean(formik.errors.firstName)}
          helperText={formik.touched.firstName && formik.errors.firstName}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.firstName ? 1 : 0.5 }}>
                <IconifyIcon icon="mingcute:user-2-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Last Name */}
        <TextField
          id="lastName"
          name="lastName"
          type="text"
          value={formik.values.lastName}
          onChange={handleInputChange}
          onBlur={formik.handleBlur}
          variant="filled"
          placeholder="Last Name"
          fullWidth
          required
          error={formik.touched.lastName && Boolean(formik.errors.lastName)}
          helperText={formik.touched.lastName && formik.errors.lastName}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formik.values.lastName ? 1 : 0.5 }}>
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

        {/* Role and Department */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl 
            variant="filled" 
            fullWidth
            error={formik.touched.roleId && Boolean(formik.errors.roleId)}
          >
            <InputLabel 
              id="role-label"
              sx={{
                display: formik.values.roleId ? 'none' : 'block'
              }}
            >
              Role *
            </InputLabel>
            <Select
              labelId="role-label"
              id="roleId"
              name="roleId"
              value={formik.values.roleId}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              label={formik.values.roleId ? '' : 'Role *'}
              sx={{
                '& .MuiSelect-icon': {
                  color: 'white', 
                }
              }}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}></span>;
                }
                return selected === '2' ? 'Project Manager' : 'Employee';
              }}
            >
              <MenuItem value="2">Project Manager</MenuItem>
              <MenuItem value="3">Employee</MenuItem>
            </Select>
            {formik.touched.roleId && formik.errors.roleId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                {formik.errors.roleId}
              </Typography>
            )}
          </FormControl>

          <FormControl 
            variant="filled" 
            fullWidth
            error={formik.touched.department && Boolean(formik.errors.department)}
          >
            <InputLabel 
              id="department-label"
              sx={{
                display: formik.values.department ? 'none' : 'block'
              }}
            >
              Department *
            </InputLabel>
            <Select
              labelId="department-label"
              id="department"
              name="department"
              value={formik.values.department}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              label={formik.values.department ? '' : 'Department *'}
              sx={{
                '& .MuiSelect-icon': {
                  color: 'white', 
                }
              }}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}></span>;
                }
                return selected;
              }}
            >
              <MenuItem value="" disabled>
                Select Department
              </MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
            {formik.touched.department && formik.errors.department && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                {formik.errors.department}
              </Typography>
            )}
          </FormControl>
        </Stack>

        {/* REMOVED: Manager dropdown completely */}

        <Divider sx={{ my: 1 }} />

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
              color={formik.values.status ? 'success.main' : 'error.main'} 
            />
            <Typography variant="body2" fontWeight={500}>
              Status: 
              <Box 
                component="span" 
                sx={{ 
                  color: formik.values.status ? 'success.main' : 'error.main',
                  ml: 1,
                  fontWeight: 600
                }}
              >
                {formik.values.status ? 'Active' : 'Inactive'}
              </Box>
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.status}
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
        <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => formik.resetForm()}
            startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
            size="small"
            sx={{ 
              py: 0.75,
              px: 2,
              fontSize: '0.8125rem',
              minWidth: '100px'
            }}
          >
            Reset
          </Button>
          
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            loadingPosition="start"
            startIcon={<IconifyIcon icon="mingcute:check-fill" />}
            disabled={!formik.isValid || loading}
            size="small"
            sx={{ 
              py: 0.75,
              px: 2,
              fontSize: '0.8125rem',
              minWidth: '140px'
            }}
          >
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Employee' : 'Add Employee')}
          </LoadingButton>
        </Stack>
      </Stack>
    </>
  );
};

export default AddEmployeeForm;