import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Alert,
  Divider,
  Chip,
  Avatar,
  IconButton,
  FormHelperText,
  Checkbox,
  OutlinedInput,
  CircularProgress
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios'; 

const TaskCreateModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  selectedProject,
  loading: propLoading = false,
  projects = [],
  statusOptions = [],
  priorityOptions = [],
  taskTypeOptions = [],
  isEdit = false,
  task = null,
  onSuccess,
  api // Pass your API instance
}) => {
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');

  // Memoized options
  const priorityOpts = useMemo(() => 
    priorityOptions.length > 0 ? priorityOptions : [
      { value: 'low', label: 'Low', color: '#28a745', icon: 'mingcute:down-fill' },
      { value: 'medium', label: 'Medium', color: '#ffc107', icon: 'mingcute:minus-fill' },
      { value: 'high', label: 'High', color: '#ff6b35', icon: 'mingcute:up-fill' },
      { value: 'critical', label: 'Critical', color: '#dc3545', icon: 'mingcute:warning-fill' }
    ], [priorityOptions]
  );

  const taskTypeOpts = useMemo(() => 
    taskTypeOptions.length > 0 ? taskTypeOptions : [
      { value: 'development', label: 'Development', icon: 'mingcute:code-fill' },
      { value: 'design', label: 'Design', icon: 'mingcute:palette-fill' },
      { value: 'testing', label: 'Testing', icon: 'mingcute:bug-fill' },
      { value: 'documentation', label: 'Documentation', icon: 'mingcute:file-document-fill' },
      { value: 'meeting', label: 'Meeting', icon: 'mingcute:calendar-fill' },
      { value: 'research', label: 'Research', icon: 'mingcute:search-fill' },
      { value: 'bug-fix', label: 'Bug Fix', icon: 'mingcute:bug-2-fill' },
      { value: 'feature', label: 'Feature', icon: 'mingcute:feature-fill' },
      { value: 'other', label: 'Other', icon: 'mingcute:more-2-fill' }
    ], [taskTypeOptions]
  );

  const statusOpts = useMemo(() => 
    statusOptions.length > 0 ? statusOptions : [
      { value: 'todo', label: 'To Do', color: 'default', icon: 'mingcute:time-line' },
      { value: 'in-progress', label: 'In Progress', color: 'primary', icon: 'mingcute:progress-line' },
      { value: 'review', label: 'Review', color: 'warning', icon: 'mingcute:eye-line' },
      { value: 'completed', label: 'Completed', color: 'success', icon: 'mingcute:check-circle-line' },
      { value: 'on-hold', label: 'On Hold', color: 'info', icon: 'mingcute:pause-circle-line' },
      { value: 'cancelled', label: 'Cancelled', color: 'error', icon: 'mingcute:close-circle-line' },
    ], [statusOptions]
  );

  const getInitialValues = useCallback(() => {
    if (isEdit && task) {
      return {
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || '',
        status: task.status || '',
        deadline: task.deadline ? new Date(task.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: task.estimatedHours || 8,
        taskType: task.taskType || '',
        tags: task.tags || [],
        assignedTo: task.assignedTo?.map(a => a.assigneeId || a._id) || [],
        projectId: task.projectId?._id || task.projectId || (selectedProject?._id || projects[0]?._id || '')
      };
    }
    
    // CREATE MODE: Return values with project pre-selected if available
    return {
      title: '',
      description: '',
      priority: '',
      status: '',
      deadline: null,
      estimatedHours: '',
      taskType: '',
      tags: [],
      assignedTo: [],
      projectId: selectedProject?._id || projects[0]?._id || ''
    };
  }, [isEdit, task, selectedProject, projects]);
  useEffect(() => {
  console.log('🔍 DEBUG - Modal props:', {
    open,
    isEdit,
    task: task ? 'exists' : 'null',
    hasTitle: task?.title || 'no title'
  });
}, [open, isEdit, task]);

  // Form validation schema
  const validationSchema = useMemo(() => Yup.object({
    title: Yup.string()
      .required('Task title is required')
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be less than 100 characters'),
    priority: Yup.string()
      .required('Priority is required')
      .oneOf(priorityOpts.map(p => p.value), 'Invalid priority'),
    deadline: Yup.date()
      .required('Deadline is required')
      .min(new Date(), 'Deadline must be in the future'),
    taskType: Yup.string()
      .required('Task type is required')
      .oneOf(taskTypeOpts.map(t => t.value), 'Invalid task type'),
    assignedTo: Yup.array()
      .min(1, 'At least one team member must be assigned')
      .required('Team assignment is required'),
    projectId: Yup.string()
      .required('Project is required'),

  }), [priorityOpts, taskTypeOpts]);

  const formik = useFormik({
    initialValues: getInitialValues(),
    validationSchema,
    enableReinitialize: false,
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      setError('');
      
      try {
        // Format values for backend
        const formattedValues = {
          ...values,
          deadline: values.deadline ? values.deadline.toISOString() : null,
          estimatedHours: Number(values.estimatedHours) || 0,
          tags: values.tags || [],
          assignedTo: values.assignedTo.map(memberId => {
            const member = teamMembers.find(m => m._id === memberId);
            return {
              assigneeId: memberId,
              assigneeType: 'Employee',
              name: member?.name || 'Unknown',
              email: member?.email || '',
              employeeCode: member?.employeeCode || member?.employeeId || '',
              department: member?.department || '',
              role: member?.role || member?.designation || '',
              avatarColor: member?.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
              allocationPercentage: 100,
              startDate: new Date(),
              isActive: true
            };
          })
        };

        const result = await onSubmit(formattedValues);
        
        if (result && result.success) {
          setSuccess(true);
          setTimeout(() => {
            // Reset everything after success
            resetForm();
            setTagInput('');
            setSuccess(false);
            setError('');
            setMembersError('');
            setTeamMembers([]);
            
            if (onSuccess) onSuccess();
            onClose();
          }, 1500);
        } else {
          setError(result?.error || 'Failed to create task');
        }
      } catch (error) {
        console.error('Error creating task:', error);
        setError(error.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
  });

  // Fetch team members when project changes
  useEffect(() => {
    const fetchTeamMembers = async () => {
      const projectId = formik.values.projectId;
      
      console.log('🎯 Fetching team members for project:', projectId);
      
      if (!projectId) {
        console.log('❌ No projectId available');
        setTeamMembers([]);
        return;
      }

      setFetchingMembers(true);
      setMembersError('');
      
      try {
        const backendUrl = 'http://localhost:8000';
        const url = `${backendUrl}/tm/assignees?projectId=${projectId}`;
        
        const token = localStorage.getItem('accessToken') || 
                      sessionStorage.getItem('accessToken') ||
                      '';
        
        const response = await axios.get(url, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });
        
        console.log('✅ API Response:', response.data);
        
        if (response.data.success) {
          console.log('👥 Team members fetched:', response.data.data?.length || 0);
          setTeamMembers(response.data.data || []);
        } else {
          console.log('❌ API returned error:', response.data.message);
          setMembersError('Failed to fetch team members: ' + (response.data.message || 'Unknown error'));
          setTeamMembers([]);
        }
      } catch (error) {
        console.error('❌ Error fetching team members:', error);
        
        if (error.response?.status === 401) {
          setMembersError('Authentication required. Please log in again.');
        } else {
          setMembersError(`Error: ${error.response?.data?.message || error.message || 'Network error'}`);
        }
        setTeamMembers([]);
      } finally {
        setFetchingMembers(false);
      }
    };

    // Only fetch if modal is open and projectId is available
    if (open && formik.values.projectId) {
      fetchTeamMembers();
    }
  }, [formik.values.projectId, open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open && !success) {
      const initialValues = getInitialValues();
      formik.resetForm({ values: initialValues });
      setTagInput('');
      setError('');
      setMembersError('');
      // Don't clear teamMembers here - they will be fetched based on projectId
    }
  }, [open]); 

  // Form handlers
  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };

  const handleDateChange = (date) => {
    formik.setFieldValue('deadline', date);
    formik.setFieldTouched('deadline', true, false);
  };

  // Handle project change
  const handleProjectChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
    
    // Clear assignedTo when project changes
    formik.setFieldValue('assignedTo', []);
    
    // Clear team members (they will be fetched for the new project)
    setTeamMembers([]);
  };

  // Handle tag operations
  const handleAddTag = () => {
    if (tagInput.trim() && !formik.values.tags.includes(tagInput.trim())) {
      const newTags = [...formik.values.tags, tagInput.trim()];
      formik.setFieldValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = formik.values.tags.filter(tag => tag !== tagToRemove);
    formik.setFieldValue('tags', newTags);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCloseModal = useCallback(() => {
    formik.resetForm();
    setTagInput('');
    setSuccess(false);
    setError('');
    setTeamMembers([]);
    setMembersError('');
    onClose();
  }, [formik, onClose]);

  // Get member name by ID
  const getMemberById = useCallback((id) => {
    return teamMembers.find(member => member._id === id);
  }, [teamMembers]);

  // Check if team members are loading
  const isTeamMembersLoading = fetchingMembers || (formik.values.projectId && teamMembers.length === 0 && !membersError);

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#110947',
          color: '#ffffff',
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2
      }}>
        <Typography align="center" variant="h4" fontWeight={600} sx={{ flex: 1 }}>
          {isEdit ? 'Edit Task' : 'Create New Task'}
        </Typography>
        <IconButton 
          onClick={handleCloseModal} 
          size="small" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                borderRadius: 1,
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                color: '#4caf50'
              }}
              icon={<IconifyIcon icon="mingcute:check-circle-fill" />}
            >
              {isEdit ? 'Task updated successfully!' : 'Task created successfully!'}
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 1,
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: '#f44336'
              }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <Stack 
            component="form" 
            onSubmit={formik.handleSubmit} 
            direction="column" 
            gap={2}
          >
            {/* Project Selection */}
            {!selectedProject && projects.length > 0 && (
              <FormControl 
                variant="filled" 
                fullWidth
                error={formik.touched.projectId && Boolean(formik.errors.projectId)}
              >
                
                <Select
                  labelId="projectId-label"
                  id="projectId"
                  name="projectId"
                  value={formik.values.projectId}
                  onChange={handleProjectChange}
                  onBlur={formik.handleBlur}
                  label="Select Project *"
                  sx={{
                    color: '#ffffff',
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.7)', 
                    },
                    '&:before': {
                      borderBottomColor: 'rgba(255,255,255,0.3)'
                    },
                    '&:hover:not(.Mui-disabled):before': {
                      borderBottomColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                   renderValue={(selected) => {
        if (!selected) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconifyIcon icon="mingcute:folder-fill" sx={{ opacity: 0.7, fontSize: '1rem' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                Select Project *
              </Typography>
            </Box>
          );
        }
        
        const project = projects.find(p => p._id === selected);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconifyIcon icon="mingcute:folder-fill" sx={{ opacity: 0.7, fontSize: '1rem' }} />
            <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
              {project?.title || project?.projectName || selected}
            </Typography>
          </Box>
        );
      }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a project</em>
                  </MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project._id} value={project._id}>
                      {project.title || project.projectName}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.projectId && formik.errors.projectId && (
                  <FormHelperText sx={{ color: '#f44336' }}>
                    {formik.errors.projectId}
                  </FormHelperText>
                )}
              </FormControl>
            )}

            {/* Task Title */}
            <TextField
              id="title"
              name="title"
              type="text"
              value={formik.values.title}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="Task Title *"
              fullWidth
              required
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconifyIcon icon="mingcute:task-2-fill" sx={{ opacity: 0.7 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiFilledInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }
              }}
            />

            {/* Description */}
            <TextField
              id="description"
              name="description"
              type="text"
              value={formik.values.description}
              onChange={handleInputChange}
              onBlur={formik.handleBlur}
              variant="filled"
              placeholder="Task Description *"
              multiline
              rows={3}
              fullWidth
              required
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconifyIcon icon="mingcute:file-document-fill" sx={{ opacity: 0.7 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiFilledInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }
              }}
            />

            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Priority, Status, Task Type */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Priority */}
              <FormControl 
                variant="filled" 
                fullWidth
                error={formik.touched.priority && Boolean(formik.errors.priority)}
              >
                <Select
                  id="priority"
                  name="priority"
                  value={formik.values.priority}
                  onChange={handleInputChange}
                  onBlur={formik.handleBlur}
                  displayEmpty
                  sx={{
                    color: '#ffffff',
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.7)', 
                    },
                    '&:before': {
                      borderBottomColor: 'rgba(255,255,255,0.3)'
                    },
                    '& .MuiFilledInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }
                  }}
                  renderValue={(selected) => {
                    if (!selected) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconifyIcon icon="mingcute:flag-2-line" sx={{ opacity: 0.7, fontSize: '1rem' }} />
                          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                            Priority *
                          </Typography>
                        </Box>
                      );
                    }
                    
                    const option = priorityOpts.find(opt => opt.value === selected);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconifyIcon icon={option?.icon || 'mingcute:flag-2-line'} color={option?.color} />
                        <Typography color={option?.color} fontWeight={500}>
                          {option?.label || selected}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  {priorityOpts.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconifyIcon icon={option.icon} color={option.color} />
                        <Typography color={option.color} fontWeight={500}>
                          {option.label}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.priority && formik.errors.priority && (
                  <FormHelperText sx={{ color: '#f44336' }}>
                    {formik.errors.priority}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Status (for edit mode) */}
              {isEdit && (
                <FormControl 
                  variant="filled" 
                  fullWidth
                  error={formik.touched.status && Boolean(formik.errors.status)}
                >
                  <Select
                    id="status"
                    name="status"
                    value={formik.values.status}
                    onChange={handleInputChange}
                    onBlur={formik.handleBlur}
                    displayEmpty
                    sx={{
                      color: '#ffffff',
                      '& .MuiSelect-icon': {
                        color: 'rgba(255,255,255,0.7)', 
                      },
                      '&:before': {
                        borderBottomColor: 'rgba(255,255,255,0.3)'
                      },
                      '& .MuiFilledInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)'
                        }
                      }
                    }}
                    renderValue={(selected) => {
                      if (!selected) {
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconifyIcon icon="mingcute:time-line" sx={{ opacity: 0.7, fontSize: '1rem' }} />
                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                              Status *
                            </Typography>
                          </Box>
                        );
                      }
                      
                      const statusOption = statusOpts.find(opt => opt.value === selected);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <IconifyIcon icon={statusOption?.icon || 'mingcute:time-line'} />
                          <Typography>{statusOption?.label || selected}</Typography>
                        </Box>
                      );
                    }}
                  >
                    {statusOpts.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <IconifyIcon icon={status.icon} />
                          <Typography>{status.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.status && formik.errors.status && (
                    <FormHelperText sx={{ color: '#f44336' }}>
                      {formik.errors.status}
                    </FormHelperText>
                  )}
                </FormControl>
              )}

              {/* Task Type */}
              <FormControl 
                variant="filled" 
                fullWidth
                error={formik.touched.taskType && Boolean(formik.errors.taskType)}
              >
                <Select
                  id="taskType"
                  name="taskType"
                  value={formik.values.taskType}
                  onChange={handleInputChange}
                  onBlur={formik.handleBlur}
                  displayEmpty
                  sx={{
                    color: '#ffffff',
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.7)', 
                    },
                    '&:before': {
                      borderBottomColor: 'rgba(255,255,255,0.3)'
                    },
                    '& .MuiFilledInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }
                  }}
                  renderValue={(selected) => {
                    if (!selected) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconifyIcon icon="mingcute:task-2-line" sx={{ opacity: 0.7, fontSize: '1rem' }} />
                          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                            Task Type *
                          </Typography>
                        </Box>
                      );
                    }
                    
                    const typeOption = taskTypeOpts.find(opt => opt.value === selected);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconifyIcon icon={typeOption?.icon || 'mingcute:task-2-line'} />
                        <Typography>{typeOption?.label || selected}</Typography>
                      </Box>
                    );
                  }}
                >
                  {taskTypeOpts.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconifyIcon icon={type.icon} />
                        <Typography>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.taskType && formik.errors.taskType && (
                  <FormHelperText sx={{ color: '#f44336' }}>
                    {formik.errors.taskType}
                  </FormHelperText>
                )}
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {/* Deadline - Keep as is since DatePicker handles placeholder differently */}
              <FormControl 
                variant="filled" 
                fullWidth
                error={formik.touched.deadline && Boolean(formik.errors.deadline)}
              >
                <DatePicker
                  value={formik.values.deadline}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      variant: 'filled',
                      placeholder: 'Deadline *',
                      error: formik.touched.deadline && Boolean(formik.errors.deadline),
                      helperText: formik.touched.deadline && formik.errors.deadline,
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconifyIcon icon="mingcute:calendar-fill" sx={{ opacity: 0.7 }} />
                          </InputAdornment>
                        )
                      },
                      sx: {
                        '& .MuiFilledInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)'
                          },
                          '& .MuiInputBase-input::placeholder': {
                            color: 'rgba(255,255,255,0.7)',
                            opacity: 1
                          }
                        }
                      }
                    }
                  }}
                />
              </FormControl>

            </Stack>

            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Assign Team Members - Show only after project is selected */}
          {formik.values.projectId && (
            <FormControl 
              variant="filled" 
              fullWidth
              error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
              disabled={isTeamMembersLoading}
            >
              <Select
                id="assignedTo"
                name="assignedTo"
                multiple
                value={formik.values.assignedTo}
                onChange={handleInputChange}
                onBlur={formik.handleBlur}
                displayEmpty
                sx={{
                  color: '#ffffff',
                  '& .MuiSelect-icon': {
                    color: 'rgba(255,255,255,0.7)', 
                  },
                  '&:before': {
                    borderBottomColor: 'rgba(255,255,255,0.3)'
                  },
                  '& .MuiFilledInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return (
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                        Select team members *
                      </Typography>
                    );
                  }
                  
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.slice(0, 3).map((memberId) => {
                        const member = getMemberById(memberId);
                        return (
                          <Chip
                            key={memberId}
                            label={member ? `${member.firstName} ${member.lastName}` : 'Unknown'}
                            size="small"
                            sx={{
                              backgroundColor: member?.avatarColor || '#1976d2',
                              color: '#ffffff',
                              '& .MuiChip-label': {
                                fontSize: '0.75rem',
                                padding: '0 8px'
                              }
                            }}
                          />
                        );
                      })}
                      {selected.length > 3 && (
                        <Chip
                          label={`+${selected.length - 3}`}
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.1)', 
                            color: '#ffffff',
                            '& .MuiChip-label': {
                              fontSize: '0.75rem',
                              padding: '0 8px'
                            }
                          }}
                        />
                      )}
                    </Box>
                  );
                }}
              >
                {isTeamMembersLoading ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                      <CircularProgress size={20} />
                      <Typography>Loading team members...</Typography>
                    </Box>
                  </MenuItem>
                ) : membersError ? (
                  <MenuItem disabled>
                    <Typography sx={{ color: '#f44336', fontStyle: 'italic' }}>
                      {membersError}
                    </Typography>
                  </MenuItem>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <MenuItem key={member._id} value={member._id}>
                      <Checkbox checked={formik.values.assignedTo.indexOf(member._id) > -1} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: member.avatarColor || '#1976d2',
                            fontSize: '0.875rem'
                          }}
                        >
                          {member.firstName?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                            {member.firstName} {member.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {member.department || ''} {member.designation ? `• ${member.designation}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                      No team members available for this project
                    </Typography>
                  </MenuItem>
                )}
              </Select>
              {formik.touched.assignedTo && formik.errors.assignedTo && (
                <FormHelperText sx={{ color: '#f44336', mt: 1 }}>
                  {formik.errors.assignedTo}
                </FormHelperText>
              )}
            </FormControl>
          )}

            {/* Show message if no project selected */}
            {!formik.values.projectId && (
              <Alert 
                severity="info"
                sx={{ 
                  backgroundColor: 'rgba(2, 136, 209, 0.1)',
                  color: '#0288d1'
                }}
              >
                Please select a project first to assign team members
              </Alert>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        p: 2
      }}>
        <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end">
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleCloseModal}
            startIcon={<IconifyIcon icon="mingcute:close-line" />}
            size="small"
            sx={{ 
              py: 0.75,
              px: 2,
              fontSize: '0.8125rem',
              minWidth: '100px',
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.7)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cancel
          </Button>
          
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            loadingPosition="start"
            startIcon={<IconifyIcon icon={isEdit ? "mingcute:edit-fill" : "mingcute:check-fill"} />}
            disabled={!formik.isValid || loading || !formik.values.projectId}
            onClick={formik.handleSubmit}
            size="small"
            sx={{ 
              py: 0.75,
              px: 2,
              fontSize: '0.8125rem',
              minWidth: '140px',
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.9)'
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(25, 118, 210, 0.5)'
              }
            }}
          >
            {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Task' : 'Create Task')}
          </LoadingButton>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default TaskCreateModal;