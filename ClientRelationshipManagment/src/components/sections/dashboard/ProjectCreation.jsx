// src/components/admin/projects/CreateProjectForm.jsx
import { useState } from 'react';
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
  Box,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';

const CreateProjectForm = ({ 
  onSubmit, 
  loading = false, 
  onSuccess,
  clients = [],
  managers = [],
  fetchingClients = false 
}) => {
  const [success, setSuccess] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);

  const formik = useFormik({
    initialValues: {
      clientId: '',
      projectTitle: '',
      assignedManager: '',
      startDate: null,
      deadline: null,
      projectType: '',
      description: '',
    },
    validationSchema: Yup.object({
      clientId: Yup.string()
        .required('Client is required'),
      projectTitle: Yup.string()
        .required('Project title is required')
        .min(3, 'Project title must be at least 3 characters')
        .max(100, 'Project title cannot exceed 100 characters'),
      assignedManager: Yup.string()
        .required('Project manager is required'),
      startDate: Yup.date()
        .required('Start date is required')
        .nullable()
        .min(dayjs().startOf('day'), 'Start date cannot be in the past'),
      deadline: Yup.date()
        .required('Deadline is required')
        .nullable()
        .min(Yup.ref('startDate'), 'Deadline must be after start date'),
      projectType: Yup.string()
        .required('Project type is required'),
        description: Yup.string()
      .max(1000, 'Description cannot exceed 1000 characters'), 
    }),
    onSubmit: async (values, { resetForm }) => {
  try {
    // Generate invoice number
    const invoiceNumber = generateProjectInvoiceNumber(values);
    
    // Transform data for API
    const projectData = {
      ...values,
      status: 'planned',
      startDate: values.startDate ? dayjs(values.startDate).toISOString() : null,
      deadline: values.deadline ? dayjs(values.deadline).toISOString() : null,
      // DO NOT include invoiceNumber in API data
    };
    
    const response = await onSubmit(projectData);
    setSuccess(true);
    
    // Store the generated project with invoice number locally
    const projectWithInvoice = {
      ...response,
      invoiceNumber: invoiceNumber // Add invoice number locally
    };
    
    setCreatedProject(projectWithInvoice);
    
    // Reset form after successful submission
    resetForm();
    
    // Notify parent component about success - PASS INVOICE NUMBER
    if (onSuccess) {
      onSuccess(response, invoiceNumber); // Pass invoice number to parent
    }
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      setSuccess(false);
      setCreatedProject(null);
    }, 3000);
  } catch (error) {
    console.error('Error creating project:', error);
  }
},
  });

  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };
const generateProjectInvoiceNumber = (projectData) => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  
  // Get project type initials (first 2-3 letters)
  const projectType = projectData.projectType || 'PROJ';
  const typeCode = projectType.substring(0, 3).toUpperCase();
  
  // Get client name from clients array
  const selectedClient = clients.find(c => c._id === projectData.clientId);
  const clientName = selectedClient?.companyName || selectedClient?.name || 'CLT';
  const clientCode = clientName.substring(0, 3).toUpperCase();
  
  // Generate sequential number (for uniqueness)
  const sequential = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Format: INV-YYYYMMDD-TYPE-CLIENT-001
  return `INV-${year}${month}${day}-${typeCode}-${clientCode}-${sequential}`;
};
  const projectTypes = [
    'Web Development',
    'Mobile Application',
    'UI/UX Design',
    'Software Development',
    'E-commerce Platform',
    'CRM Implementation',
    'System Maintenance',
    'API Development',
    'Database Migration',
    'Cloud Infrastructure',
    'Research & Development',
    'Consulting Services',
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
        <Typography align="center" variant="h3" fontWeight={600} mb={3}>
          Create New Project
        </Typography>

        {success && createdProject?.success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              borderRadius: 1,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Project created successfully!
              </Typography>
              <Typography variant="body2">
                Project ID: <strong>{createdProject.data?.projectId || 'N/A'}</strong>
              </Typography>
              <Typography variant="body2">
                Title: <strong>{createdProject.data?.title || formik.values.projectTitle}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Status automatically set to "Planned". Project Manager can update status later.
              </Typography>
            </Box>
          </Alert>
        )}

        <Stack 
          component="form" 
          onSubmit={formik.handleSubmit} 
          direction="column" 
          gap={2}
          mt={4}
        >
          {/* Client Selection */}
          <FormControl 
            variant="filled" 
            fullWidth
            error={formik.touched.clientId && Boolean(formik.errors.clientId)}
          >
            <InputLabel 
              id="client-label"
              sx={{
                display: formik.values.clientId ? 'none' : 'block',
                mt: 0.5,
                ml: 3
              }}
            >
              Client *
            </InputLabel>
            <Select
              labelId="client-label"
              id="clientId"
              name="clientId"
              value={formik.values.clientId}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              label={formik.values.clientId ? '' : 'Client *'}
              disabled={fetchingClients}
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
                const selectedClient = clients.find(c => c._id === selected);
                return selectedClient ? selectedClient.companyName || selectedClient.name : selected;
              }}
              startAdornment={
                <InputAdornment position="start" sx={{ mr: 1 }}>
                  {fetchingClients ? (
                    <CircularProgress size={20} />
                  ) : (
                    <IconifyIcon icon="mingcute:building-fill" />
                  )}
                </InputAdornment>
              }
            >
              {fetchingClients ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 2 }} />
                  Loading clients...
                </MenuItem>
              ) : clients.length === 0 ? (
                <MenuItem disabled>No clients available</MenuItem>
              ) : (
                clients.map((client) => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.companyName || client.name} ({client.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Project Title */}
          <TextField
            id="projectTitle"
            name="projectTitle"
            type="text"
            value={formik.values.projectTitle}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            variant="filled"
            placeholder="e.g., E-commerce Website Development"
            fullWidth
            required
            error={formik.touched.projectTitle && Boolean(formik.errors.projectTitle)}
            helperText={formik.touched.projectTitle && formik.errors.projectTitle}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ opacity: formik.values.projectTitle ? 1 : 0.5 }}>
                  <IconifyIcon icon="mingcute:document-fill" />
                </InputAdornment>
              ),
            }}
          />

          {/* Assigned Manager - Updated to use username if name doesn't exist */}
        <FormControl 
          variant="filled" 
          fullWidth
          error={formik.touched.assignedManager && Boolean(formik.errors.assignedManager)}
        >
          <InputLabel 
            id="manager-label"
            sx={{
              display: formik.values.assignedManager ? 'none' : 'block',
              mt: 0.5,
              ml: 3
            }}
          >
            Project Manager *
          </InputLabel>
          <Select
            labelId="manager-label"
            id="assignedManager"
            name="assignedManager"
            value={formik.values.assignedManager}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            label={formik.values.assignedManager ? '' : 'Project Manager *'}
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
              const selectedManager = managers.find(m => m._id === selected);
              // Use name if exists, otherwise use username
              return selectedManager ? `${selectedManager.name || selectedManager.username}` : selected;
            }}
            startAdornment={
              <InputAdornment position="start" sx={{ mr: 1 }}>
                <IconifyIcon icon="mingcute:user-star-fill" />
              </InputAdornment>
            }
          >
            {managers.length === 0 ? (
              <MenuItem disabled>No managers available</MenuItem>
            ) : (
              managers.map((manager) => (
                <MenuItem key={manager._id} value={manager._id}>
                  {/* Show name if exists, otherwise show username */}
                  {manager.name || manager.username} 
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

          {/* Start Date and Deadline */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ width: '100%' }}>
              <DatePicker
                label="Start Date *"
                value={formik.values.startDate}
                onChange={(date) => formik.setFieldValue('startDate', date)}
                minDate={dayjs()}
                slotProps={{
                  textField: {
                    variant: 'filled',
                    fullWidth: true,
                    error: formik.touched.startDate && Boolean(formik.errors.startDate),
                    helperText: formik.touched.startDate && formik.errors.startDate,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ opacity: formik.values.startDate ? 1 : 0.5 }}>
                          <IconifyIcon icon="mingcute:calendar-fill" sx={{ mt: 2 }} />
                        </InputAdornment>
                      ),
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ width: '100%' }}>
              <DatePicker
                label="Deadline *"
                value={formik.values.deadline}
                onChange={(date) => formik.setFieldValue('deadline', date)}
                minDate={formik.values.startDate || dayjs()}
                slotProps={{
                  textField: {
                    variant: 'filled',
                    fullWidth: true,
                    error: formik.touched.deadline && Boolean(formik.errors.deadline),
                    helperText: formik.touched.deadline && formik.errors.deadline,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ opacity: formik.values.deadline ? 1 : 0.5 }}>
                          <IconifyIcon icon="mingcute:time-fill" sx={{ mt: 2 }}/>
                        </InputAdornment>
                      ),
                    },
                  },
                }}
              />
            </Box>
          </Stack>

          {/* Project Type */}
          <FormControl 
            variant="filled" 
            fullWidth
            error={formik.touched.projectType && Boolean(formik.errors.projectType)}
          >
            <InputLabel 
              id="projectType-label"
              sx={{
                display: formik.values.projectType ? 'none' : 'block'
              }}
            >
              Project Type *
            </InputLabel>
            <Select
              labelId="projectType-label"
              id="projectType"
              name="projectType"
              value={formik.values.projectType}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              label={formik.values.projectType ? '' : 'Project Type *'}
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
              startAdornment={
                <InputAdornment position="start" sx={{ mr: 1 }}>
                  <IconifyIcon icon="mingcute:category-fill" />
                </InputAdornment>
              }
            >
              {projectTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 1 }} />

          {/* Description */}
          <TextField
            id="description"
            name="description"
            type="text"
            value={formik.values.description}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            variant="filled"
            placeholder="Describe project objectives, scope, requirements, and deliverables..."
            multiline
            rows={5}
            fullWidth
            required
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={`${formik.values.description.length}/1000 characters`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5, opacity: formik.values.description ? 1 : 0.5 }}>
                  <IconifyIcon icon="mingcute:file-description-fill" />
                </InputAdornment>
              ),
            }}
          />

          {/* Project Status (System Controlled - Read-only) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'info.light',
              p: 1.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.main',
              mb: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconifyIcon
                icon="mingcute:calendar-plan-fill"
                fontSize={20}
                color="info.main"
              />
              <Typography variant="body2" fontWeight={500}>
                Project Status:
                <Box
                  component="span"
                  sx={{
                    color: 'info.main',
                    ml: 1,
                    fontWeight: 600,
                  }}
                >
                  Planned
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} mt={3}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                formik.resetForm();
              }}
              startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
              fullWidth
              size="small"
              sx={{ 
                py: 0.75,
                fontSize: '0.8125rem',
                width: '15%'
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
              disabled={!formik.isValid || !formik.dirty || loading || fetchingClients}
              fullWidth
              size="small"
              sx={{ 
                py: 0.75,
                fontSize: '0.8125rem',
                width: '20%'
              }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateProjectForm;