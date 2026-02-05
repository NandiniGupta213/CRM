import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import { LoadingButton } from '@mui/lab';

const ProjectStatus = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    inProgress: 0,
    delayed: 0,
    completed: 0,
    onHold: 0,
    averageProgress: 0
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    status: '',
    progress: 0,
    delayReason: '',
    description: '',
    remarks: ''
  });

  const API_BASE_URL = 'http://localhost:8000';

  // Fetch projects assigned to this PM
  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Please login to continue');
        window.location.href = '/authentication/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/ps/pm`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/authentication/login';
        return;
      }

      const data = await response.json();
      console.log('Projects data:', data);
      
      if (data.success) {
        const projectsData = data.data || [];
        setProjects(projectsData);
        setFilteredProjects(projectsData);
        calculateStats(projectsData);
      } else {
        setError(data.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (projectList) => {
    const newStats = {
      totalProjects: projectList.length,
      inProgress: 0,
      delayed: 0,
      completed: 0,
      onHold: 0,
      totalProgress: 0
    };

    projectList.forEach(project => {
      const status = project.status || project.actualStatus;
      if (status === 'in-progress') newStats.inProgress++;
      else if (status === 'delayed') newStats.delayed++;
      else if (status === 'completed') newStats.completed++;
      else if (status === 'on-hold') newStats.onHold++;
      
      newStats.totalProgress += project.progress || 0;
    });

    newStats.averageProgress = projectList.length > 0 
      ? Math.round(newStats.totalProgress / projectList.length)
      : 0;

    setStats(newStats);
  };

  // Filter projects based on search and status
  useEffect(() => {
    let filtered = projects;
    
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectTeamName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.status === statusFilter || project.actualStatus === statusFilter
      );
    }
    
    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  // Handle opening status update dialog
  const handleOpenStatusDialog = (project) => {
    setSelectedProject(project);
    setFormData({
      status: project.actualStatus || project.status || 'in-progress',
      progress: project.progress || 0,
      delayReason: '',
      description: '',
      remarks: ''
    });
    setOpenStatusDialog(true);
    setError('');
  };

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'progress' ? parseInt(value) || 0 : value
    }));

    // Clear delay reason if status changes from delayed
    if (name === 'status' && value !== 'delayed') {
      setFormData(prev => ({
        ...prev,
        delayReason: ''
      }));
    }
  };

  // Submit status update
  const handleSubmitStatus = async () => {
    // Validation
    if (formData.status === 'delayed' && !formData.delayReason.trim()) {
      setError('Delay reason is required when status is Delayed');
      return;
    }

    if (formData.progress < 0 || formData.progress > 100) {
      setError('Progress percentage must be between 0 and 100');
      return;
    }

    if (!selectedProject) {
      setError('No project selected');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/ps/${selectedProject._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: formData.status,
          progressPercentage: formData.progress,
          delayReason: formData.delayReason,
          description: formData.description,
          remarks: formData.remarks
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Project status updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setOpenStatusDialog(false);
        fetchProjects(); // Refresh the list
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusMap = {
      'planned': 'default',
      'in-progress': 'primary',
      'delayed': 'error',
      'completed': 'success',
      'on-hold': 'warning'
    };
    return statusMap[status] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labelMap = {
      'planned': 'Planned',
      'in-progress': 'In Progress',
      'delayed': 'Delayed',
      'completed': 'Completed',
      'on-hold': 'On Hold'
    };
    return labelMap[status] || status;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format days left
  const formatDaysLeft = (daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return 'N/A';
    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    return `${daysLeft} days left`;
  };

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Project Status Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update and track the status of your assigned projects
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Projects
              </Typography>
              <Typography variant="h3" color="primary" fontWeight={700}>
                {stats.totalProjects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Average Progress
              </Typography>
              <Typography variant="h3" color="info.main" fontWeight={700}>
                {stats.averageProgress}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.averageProgress}
                sx={{ mt: 2, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                In Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" color="primary.main" fontWeight={700}>
                  {stats.inProgress}
                </Typography>
                <Chip 
                  label="In Progress" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Delayed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" color="error.main" fontWeight={700}>
                  {stats.delayed}
                </Typography>
                <Chip 
                  label="Delayed" 
                  size="small" 
                  color="error" 
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" color="success.main" fontWeight={700}>
                  {stats.completed}
                </Typography>
                <Chip 
                  label="Completed" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconifyIcon icon="mingcute:search-line" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="delayed">Delayed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" align="center">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Projects Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Timeline</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Team Size</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow 
                  key={project._id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {project.title || project.projectTeamName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.projectId || 'No Code'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {project.projectType || 'Unknown Type'}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {project.clientName || project.client?.name || project.client?.companyName || 'N/A'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {formatDate(project.startDate)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        to {formatDate(project.deadline)}
                      </Typography>
                      <Typography variant="caption" color={project.daysLeft < 0 ? 'error' : 'text.secondary'} display="block">
                        {formatDaysLeft(project.daysLeft)}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={getStatusLabel(project.actualStatus || project.status)}
                      color={getStatusColor(project.actualStatus || project.status)}
                      size="small"
                      sx={{ minWidth: 100 }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ 
                          height: 8, 
                          bgcolor: 'grey.200', 
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}>
                          <Box 
                            sx={{ 
                              height: '100%', 
                              bgcolor: (project.actualStatus || project.status) === 'completed' 
                                ? 'success.main' 
                                : (project.actualStatus || project.status) === 'delayed'
                                ? 'error.main'
                                : 'primary.main',
                              width: `${project.progress || 0}%`
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {project.progress || 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" align="center">
                      {project.totalTeamSize || project.teamMembers?.length || 0}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<IconifyIcon icon="mingcute:edit-line" />}
                      onClick={() => handleOpenStatusDialog(project)}
                      disabled={loading || updating}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredProjects.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <IconifyIcon 
                      icon="mingcute:file-search-line" 
                      fontSize={48} 
                      sx={{ opacity: 0.3, mb: 1 }} 
                    />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No projects found matching your search' : 'No projects assigned to you'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
{/* Status Update Dialog */}
<Dialog
  open={openStatusDialog}
  onClose={() => !updating && setOpenStatusDialog(false)}
  maxWidth="sm"
  fullWidth
  PaperProps={{ 
    sx: { 
      borderRadius: 3,
      maxWidth: 500 
    } 
  }}
>
  <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
    <Typography align="center" variant="h3" fontWeight={600}>
      Update Project Status
    </Typography>
  </DialogTitle>
  
  <DialogContent sx={{ pt: 3, pb: 0 }}>
    {selectedProject && (
      <Stack 
        component="form" 
        direction="column" 
        gap={2}
        mt={1}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitStatus();
        }}
      >
        {/* Project Info */}
        <Paper 
          sx={{ 
            p: 2, 
            bgcolor: '#09218e',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            mb: 1
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Project Details
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconifyIcon icon="mingcute:projector-fill" color="primary" fontSize={20} />
            <Typography variant="h6" fontWeight={600}>
              {selectedProject.title || selectedProject.projectTeamName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconifyIcon icon="mingcute:building-fill" color="text.secondary" fontSize={16} />
            <Typography variant="body2" color="text.secondary">
              {selectedProject.clientName || selectedProject.client?.name || 'No Client'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <IconifyIcon icon="mingcute:id-card-fill" color="text.secondary" fontSize={16} />
            <Typography variant="body2" color="text.secondary">
              {selectedProject.projectId} • {formatDaysLeft(selectedProject.daysLeft)}
            </Typography>
          </Box>
        </Paper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 1,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Status Selection */}
        <TextField
          select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleFormChange}
          variant="filled"
          placeholder="Project Status"
          fullWidth
          required
          disabled={updating}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formData.status ? 1 : 0.5 }}>
                <IconifyIcon 
                  icon="mingcute:flag-fill" 
                  color={
                    formData.status === 'completed' 
                      ? 'success' 
                      : formData.status === 'delayed'
                      ? 'error'
                      : formData.status === 'on-hold'
                      ? 'warning'
                      : 'primary'
                  } 
                />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="planned">Planned</MenuItem>
          <MenuItem value="in-progress">In Progress</MenuItem>
          <MenuItem value="delayed">Delayed</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="on-hold">On Hold</MenuItem>
        </TextField>

        {/* Progress Percentage */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progress Percentage *
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={formData.progress}
                color={
                  formData.status === 'completed' 
                    ? 'success' 
                    : formData.status === 'delayed'
                    ? 'error'
                    : 'primary'
                }
                sx={{ 
                  height: 6, 
                  borderRadius: 3 
                }}
              />
            </Box>
            <TextField
              id="progress"
              name="progress"
              type="number"
              value={formData.progress}
              onChange={handleFormChange}
              variant="filled"
              size="small"
              inputProps={{ 
                min: 0, 
                max: 100,
                step: 1
              }}
              sx={{ width: 100 }}
              disabled={updating}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">%</InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {/* Delay Reason (conditionally shown) */}
        {formData.status === 'delayed' && (
          <TextField
            id="delayReason"
            name="delayReason"
            value={formData.delayReason}
            onChange={handleFormChange}
            variant="filled"
            placeholder="Delay Reason *"
            multiline
            rows={3}
            fullWidth
            required
            disabled={updating}
            helperText="Mandatory field when project is delayed"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ opacity: formData.delayReason ? 1 : 0.5, alignSelf: 'flex-start', mt: 1.5 }}>
                  <IconifyIcon icon="mingcute:alert-fill" color="error" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Description */}
        <TextField
          id="description"
          name="description"
          value={formData.description}
          onChange={handleFormChange}
          variant="filled"
          placeholder="Description / Notes (Optional)"
          multiline
          rows={2}
          fullWidth
          disabled={updating}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formData.description ? 1 : 0.5, alignSelf: 'flex-start', mt: 1.5 }}>
                <IconifyIcon icon="mingcute:document-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Remarks */}
        <TextField
          id="remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleFormChange}
          variant="filled"
          placeholder="Remarks / Internal Notes (Optional)"
          multiline
          rows={2}
          fullWidth
          disabled={updating}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ opacity: formData.remarks ? 1 : 0.5, alignSelf: 'flex-start', mt: 1.5 }}>
                <IconifyIcon icon="mingcute:chat-fill" />
              </InputAdornment>
            ),
          }}
        />

        {/* Current Status Summary */}
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
              icon="mingcute:info-circle-fill" 
              fontSize={20} 
              color={
                formData.status === 'completed' 
                  ? 'success' 
                  : formData.status === 'delayed'
                  ? 'error'
                  : 'primary'
              } 
            />
            <Typography variant="body2" fontWeight={500}>
              Current: 
              <Box 
                component="span" 
                sx={{ 
                  ml: 1,
                  fontWeight: 600
                }}
              >
                {getStatusLabel(formData.status)}
              </Box>
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {formData.progress}% Complete
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setOpenStatusDialog(false)}
            startIcon={<IconifyIcon icon="mingcute:close-line" />}
            sx={{ 
              py: 0.75,
              fontSize: '0.8125rem',
              flex: 1
            }}
            disabled={updating}
          >
            Cancel
          </Button>
          
          <LoadingButton
            onClick={handleSubmitStatus}
            variant="contained"
            loading={updating}
            loadingPosition="start"
            startIcon={<IconifyIcon icon="mingcute:save-fill" />}
            disabled={updating || (formData.status === 'delayed' && !formData.delayReason.trim())}
            sx={{ 
              py: 0.75,
              fontSize: '0.8125rem',
              flex: 1
            }}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </LoadingButton>
        </Stack>
      </Stack>
    )}
  </DialogContent>
</Dialog>
    </Box>
  );
};

export default ProjectStatus;