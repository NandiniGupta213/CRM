import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday,
  AccessTime,
  AttachMoney,
  TrendingUp,
  Warning,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ClientProjectsPage = () => {
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [client, setClient] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  // Dialog state
  const [selectedProject, setSelectedProject] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const API_BASE_URL = 'https://crm-rx6f.onrender.com';

  // Fetch client's own projects
  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Please login to view projects');
        navigate('/authentication/login');
        return;
      }

      const queryParams = new URLSearchParams({
        page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        ...(dateFilter.start && { startDate: dateFilter.start.toISOString() }),
        ...(dateFilter.end && { endDate: dateFilter.end.toISOString() })
      }).toString();

      // Simple endpoint - uses logged-in client's identity
      const response = await fetch(
        `${API_BASE_URL}/client-projects/my-projects?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Only clients can view their projects.');
          navigate('/dashboard');
          return;
        }
        if (response.status === 404) {
          setError('Client profile not found. Please contact administrator.');
          return;
        }
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data.projects || []);
        setClient(data.data.client);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setError(data.message || 'Failed to load projects');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching client projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // View project details
  const handleViewProject = async (projectId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/client-projects/my-projects/${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedProject(data.data.project);
          setDialogOpen(true);
        }
      } else if (response.status === 403) {
        setError('Access denied to view this project');
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
    }
  };

  // Status chip colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return 'default';
      case 'in-progress': return 'primary';
      case 'completed': return 'success';
      case 'on-hold': return 'warning';
      case 'delayed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'planned': return <CalendarToday fontSize="small" />;
      case 'in-progress': return <PlayCircle fontSize="small" />;
      case 'completed': return <CheckCircle fontSize="small" />;
      case 'on-hold': return <PauseCircle fontSize="small" />;
      default: return <CalendarToday fontSize="small" />;
    }
  };

  // Progress bar color
  const getProgressColor = (progress) => {
    if (progress < 30) return 'error';
    if (progress < 70) return 'warning';
    return 'success';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days left
  const calculateDaysLeft = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check if project is overdue
  const isProjectOverdue = (deadline, status) => {
    const daysLeft = calculateDaysLeft(deadline);
    return daysLeft < 0 && status === 'in-progress';
  };

  // Initial load
  useEffect(() => {
    fetchMyProjects();
  }, [page, searchTerm, statusFilter, dateFilter]);

  if (loading && !projects.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {client?.companyName || 'My'} Projects
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Dashboard showing all your projects and their current status
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={() => setError('')}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <CalendarToday />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.totalProjects}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Projects
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <TrendingUp />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.activeProjects}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Projects
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Warning />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{stats.overdueProjects}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overdue Projects
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <AttachMoney />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {formatCurrency(stats.totalBudget || 0)}
                      </Typography>

                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}


        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="on-hold">On Hold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={2}>
                  <DatePicker
                    label="Start Date"
                    value={dateFilter.start}
                    onChange={(newValue) => {
                      setDateFilter(prev => ({ ...prev, start: newValue }));
                      setPage(1);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateFilter.end}
                    onChange={(newValue) => {
                      setDateFilter(prev => ({ ...prev, end: newValue }));
                      setPage(1);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Timeline</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projects.map((project) => {
                        const daysLeft = calculateDaysLeft(project.deadline);
                        const overdue = isProjectOverdue(project.deadline, project.status);
                        
                        return (
                          <TableRow key={project._id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {project.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {project.projectId} • {project.projectType}
                                </Typography>
                                {project.description && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {project.description.length > 60
                                      ? `${project.description.substring(0, 60)}...`
                                      : project.description}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  icon={getStatusIcon(project.status)}
                                  label={project.status.replace('-', ' ')}
                                  color={getStatusColor(project.status)}
                                  size="small"
                                  variant="outlined"
                                />
                                {overdue && (
                                  <Chip
                                    label={`Overdue by ${Math.abs(daysLeft)} days`}
                                    color="error"
                                    size="small"
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            
                            <TableCell sx={{ width: 200 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={project.progress}
                                    color={getProgressColor(project.progress)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                </Box>
                                <Typography variant="body2" fontWeight={500} sx={{ minWidth: 40 }}>
                                  {project.progress}%
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Start: {formatDate(project.startDate)}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Deadline: {formatDate(project.deadline)}
                                </Typography>
                                {daysLeft > 0 && (
                                  <Typography variant="caption" color="primary" fontWeight={500}>
                                    {daysLeft} days left
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            
                            
                            <TableCell>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewProject(project._id)}
                                  sx={{ 
                                    bgcolor: 'primary.light',
                                    '&:hover': { bgcolor: 'primary.main', color: 'white' }
                                  }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {projects.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <CalendarToday sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" gutterBottom>
                                No projects found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {searchTerm || statusFilter !== 'all' 
                                  ? 'No projects match your search criteria' 
                                  : 'You have no projects assigned yet'}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, value) => setPage(value)}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Project Details Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedProject && (
            <>
              <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {selectedProject.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedProject.projectId} • {selectedProject.projectType}
                  </Typography>
                </Box>
              </DialogTitle>
              
              <DialogContent dividers sx={{ pt: 3 }}>
                {/* Project Description */}
                {selectedProject.description && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedProject.description}
                    </Typography>
                  </Box>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Project Details
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Chip
                          label={selectedProject.status.replace('-', ' ')}
                          color={getStatusColor(selectedProject.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Progress:
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedProject.progress}%
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Start Date:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedProject.startDate)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Deadline:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(selectedProject.deadline)}
                        </Typography>
                      </Box>
                      
                      {selectedProject.actualEndDate && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Completed On:
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(selectedProject.actualEndDate)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Grid>
                  
                
                </Grid>

                {/* Progress Section */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Project Progress
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={selectedProject.progress}
                        color={getProgressColor(selectedProject.progress)}
                        sx={{ height: 12, borderRadius: 6 }}
                      />
                    </Box>
                    <Typography variant="h5" fontWeight={600}>
                      {selectedProject.progress}%
                    </Typography>
                  </Box>
                </Box>

                {/* Milestones */}
                {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Milestones ({selectedProject.completedMilestones || 0}/{selectedProject.totalMilestones || 0} Completed)
                    </Typography>
                    <Stack spacing={1.5}>
                      {selectedProject.milestones.map((milestone, index) => (
                        <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {milestone.name}
                              </Typography>
                              {milestone.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {milestone.description}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={milestone.status}
                              size="small"
                              color={
                                milestone.status === 'completed' ? 'success' :
                                milestone.status === 'in-progress' ? 'primary' :
                                milestone.status === 'delayed' ? 'error' : 'default'
                              }
                            />
                          </Box>
                          {milestone.deadline && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Deadline: {formatDate(milestone.deadline)}
                            </Typography>
                          )}
                          {milestone.completedDate && (
                            <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                              Completed: {formatDate(milestone.completedDate)}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}
              </DialogContent>
              
              <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button 
                  onClick={() => setDialogOpen(false)}
                  variant="outlined"
                >
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default ClientProjectsPage;