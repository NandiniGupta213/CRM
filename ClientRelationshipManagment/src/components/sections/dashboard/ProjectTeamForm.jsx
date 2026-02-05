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
  Box,
  Alert,
  Divider,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Paper
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AddProjectTeamForm = ({ 
  onSubmit, 
  loading = false, 
  team = null, 
  isEdit = false, 
  onSuccess,
  projects = [],
  projectManagers = [],
  employees = [],
  loadingProjects = false,
  loadingManagers = false,
  loadingEmployees = false
}) => {
  const [success, setSuccess] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (team && isEdit) {
      const formattedTeam = {
        projectId: team.projectId?._id || team.projectId || '',
        projectManager: team.projectManager?._id || team.projectManager || ''
      };
      
      setTimeout(() => {
        formik.setValues(formattedTeam);
      }, 0);

      if (team.teamMembers && team.teamMembers.length > 0) {
        const memberIds = team.teamMembers.map(m => m.employeeId?._id || m.employeeId);
        const existingMembers = employees.filter(emp => 
          memberIds.some(id => id?.toString() === emp._id?.toString())
        );
        setSelectedMembers(existingMembers);
      }
    }
  }, [team, isEdit, employees]);

  const formik = useFormik({
    initialValues: {
      projectId: '',
      projectManager: ''
    },
    validationSchema: Yup.object({
      projectId: Yup.string()
        .required('Project is required')
        .min(24, 'Please select a valid project'),
      projectManager: Yup.string()
        .required('Project Manager is required')
        .min(24, 'Please select a valid project manager')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const teamMembersData = selectedMembers.map(member => ({
          employeeId: member._id,
          name: member.fullName || `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: 'developer',
          department: member.department || 'Development',
          allocationPercentage: 100
        }));

        const teamData = {
          projectId: values.projectId,
          projectManager: values.projectManager,
          teamMembers: teamMembersData
        };

        const result = await onSubmit(teamData);
        
        if (result && result.success) {
          setSuccess(true);
          
          if (!isEdit) {
            resetForm();
            setSelectedMembers([]);
          }
          
          if (onSuccess) {
            onSuccess(result);
          }
          
          setTimeout(() => setSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Error adding/updating team:', error);
      }
    },
  });

  const handleInputChange = (e) => {
    formik.handleChange(e);
    formik.setFieldTouched(e.target.name, true, false);
  };

  const handleAddMember = (employee) => {
    if (!selectedMembers.find(m => m._id === employee._id)) {
      setSelectedMembers([...selectedMembers, employee]);
    }
  };

  const handleRemoveMember = (employeeId) => {
    setSelectedMembers(selectedMembers.filter(m => m._id !== employeeId));
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRandomColor = () => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        {isEdit ? 'Edit Project Team' : 'Create Project Team'}
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
          {isEdit ? 'Project team updated successfully!' : 'Project team created successfully!'}
        </Alert>
      )}

      <Stack 
        component="form" 
        onSubmit={formik.handleSubmit} 
        direction="column" 
        gap={2}
        mt={4}
      >
        {/* Project Selection */}
        <FormControl 
          variant="filled" 
          fullWidth
          error={formik.touched.projectId && Boolean(formik.errors.projectId)}
          disabled={loadingProjects}
        >
          <InputLabel 
            id="project-label"
            sx={{
              display: formik.values.projectId ? 'none' : 'block'
            }}
          >
            Project *
          </InputLabel>
          <Select
            labelId="project-label"
            id="projectId"
            name="projectId"
            value={formik.values.projectId}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            label={formik.values.projectId ? '' : 'Project *'}
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
              const project = projects.find(p => p._id === selected);
              return project ? (project.title || project.projectId || 'Selected Project') : '';
            }}
          >
            {loadingProjects ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading projects...</Typography>
                </Box>
              </MenuItem>
            ) : projects.length === 0 ? (
              <MenuItem disabled>No projects available</MenuItem>
            ) : (
              projects.map((project) => (
                <MenuItem key={project._id} value={project._id}>
                  <Box>
                    <Typography variant="body2">
                      {project.title || project.projectId || `Project`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
          {formik.touched.projectId && formik.errors.projectId && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
              {formik.errors.projectId}
            </Typography>
          )}
        </FormControl>

        {/* Project Manager Selection */}
        <FormControl 
          variant="filled" 
          fullWidth
          error={formik.touched.projectManager && Boolean(formik.errors.projectManager)}
          disabled={loadingManagers}
        >
          <InputLabel 
            id="manager-label"
            sx={{
              display: formik.values.projectManager ? 'none' : 'block'
            }}
          >
            Project Manager *
          </InputLabel>
          <Select
            labelId="manager-label"
            id="projectManager"
            name="projectManager"
            value={formik.values.projectManager}
            onChange={handleInputChange}
            onBlur={formik.handleBlur}
            label={formik.values.projectManager ? '' : 'Project Manager *'}
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
              const manager = projectManagers.find(pm => pm._id === selected);
              return manager ? manager.fullName : '';
            }}
          >
            {loadingManagers ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading managers...</Typography>
                </Box>
              </MenuItem>
            ) : projectManagers.length === 0 ? (
              <MenuItem disabled>No project managers found</MenuItem>
            ) : (
              projectManagers.map((pm) => (
                <MenuItem key={pm._id} value={pm._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      fontSize: 12,
                      bgcolor: getRandomColor()
                    }}>
                      {getInitials(pm.fullName)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{pm.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pm.department}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
          {formik.touched.projectManager && formik.errors.projectManager && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
              {formik.errors.projectManager}
            </Typography>
          )}
        </FormControl>

        <Divider sx={{ my: 1 }} />

        {/* Team Members */}
        <FormControl variant="filled" fullWidth>
          <InputLabel 
            id="member-label"
            sx={{
              display: 'block'
            }}
          >
          </InputLabel>
          <Select
            labelId="member-label"
            label="Add Team Member"
            disabled={loadingEmployees}
            onChange={(e) => {
              const employee = employees.find(emp => emp._id === e.target.value);
              if (employee) handleAddMember(employee);
              e.target.value = '';
            }}
            sx={{
              '& .MuiSelect-icon': {
                color: 'white', 
              }
            }}
            displayEmpty
            renderValue={() => {
              return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select employee to add</span>;
            }}
          >
            {loadingEmployees ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading employees...</Typography>
                </Box>
              </MenuItem>
            ) : employees.length === 0 ? (
              <MenuItem disabled>No employees found</MenuItem>
            ) : (
              employees
                .filter(emp => !selectedMembers.find(m => m._id === emp._id))
                .map((emp) => (
                  <MenuItem key={emp._id} value={emp._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        fontSize: 12,
                        bgcolor: getRandomColor()
                      }}>
                        {getInitials(emp.fullName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{emp.fullName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.department}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))
            )}
          </Select>
        </FormControl>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Selected Members ({selectedMembers.length})
            </Typography>
            
            <Stack spacing={1}>
              {selectedMembers.map((member) => (
                <Box 
                  key={member._id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    bgcolor: '#691d9b',
                    borderRadius: 0.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: getRandomColor(),
                      width: 32,
                      height: 32,
                      fontSize: 12
                    }}>
                      {getInitials(member.fullName)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{member.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.department}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveMember(member._id)}
                    color="error"
                  >
                    <IconifyIcon icon="mingcute:close-line" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              formik.resetForm();
              setSelectedMembers([]);
            }}
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
            disabled={!formik.isValid || loading || selectedMembers.length === 0}
            size="small"
            sx={{ 
              py: 0.75,
              px: 2,
              fontSize: '0.8125rem',
              minWidth: '140px'
            }}
          >
            {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Team' : 'Create Team')}
          </LoadingButton>
        </Stack>
      </Stack>
    </>
  );
};

export default AddProjectTeamForm;