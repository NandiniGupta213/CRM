// src/components/client/dashboard/ClientDashboard.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Button,
  Avatar,
  Badge,
  TextField,
  InputAdornment,
  Breadcrumbs,
  Link as MuiLink,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardActions,
  IconButton
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import IconifyIcon from '../../components/base/IconifyIcon';

const ClientDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:8000';

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Please login to view dashboard');
        setLoading(false);
        navigate('/login');
        return;
      }

      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      }).toString();

      const response = await fetch(`${API_BASE_URL}/clientdashboard/dashboard?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [page, rowsPerPage, statusFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        setPage(1);
        fetchDashboardData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'planned': 'default',
      'in-progress': 'info',
      'delayed': 'warning',
      'completed': 'success',
      'on-hold': 'error',
      'draft': 'default',
      'sent': 'warning',
      'paid': 'success',
      'overdue': 'error'
    };
    return colors[status] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      'planned': 'Planned',
      'in-progress': 'In Progress',
      'delayed': 'Delayed',
      'completed': 'Completed',
      'on-hold': 'On Hold',
      'draft': 'Draft',
      'sent': 'Sent',
      'paid': 'Paid',
      'overdue': 'Overdue'
    };
    return labels[status] || 'Unknown';
  };

  // Get progress color
  const getProgressColor = (progress) => {
    if (progress < 30) return 'error';
    if (progress < 70) return 'warning';
    return 'success';
  };

  // Handle project click
  const handleProjectClick = (projectId) => {
    navigate(`/pages/dashboard/client/project/${projectId}`);
  };

  // Handle invoice click
  const handleInvoiceClick = (invoiceId) => {
    navigate(`/pages/dashboard/client/project/${invoiceId}`);
  };

  // Refresh dashboard
  const refreshDashboard = () => {
    fetchDashboardData();
    setSuccess('Dashboard refreshed!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage + 1);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} />
          <Typography color="text.secondary">Loading your dashboard...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <Box sx={{ p: 3 }}>
      

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
       

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
      </Box>

      {/* 🔸 A. Project Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Projects */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Total Projects
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {dashboardData.projectSummary?.totalProjects || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                  <IconifyIcon icon="mingcute:folder-line" />
                </Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {dashboardData.projectSummary?.activePercentage || 0}% active
              </Typography>
            </CardContent>
          </Card>
        </Grid>


        {/* Completed Projects */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => setStatusFilter('completed')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Completed Projects
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {dashboardData.projectSummary?.completedProjects || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                  <IconifyIcon icon="mingcute:check-circle-line" />
                </Avatar>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={dashboardData.projectSummary?.completionRate || 0} 
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color="success"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {dashboardData.projectSummary?.completionRate || 0}% completion rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Invoices */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate('/client/invoices')}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Pending Invoices
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {dashboardData.projectSummary?.pendingInvoices || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.lighter', color: 'warning.main' }}>
                  <IconifyIcon icon="mingcute:receipt-line" />
                </Avatar>
              </Stack>
              <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>
                {formatCurrency(dashboardData.invoiceSummary?.amounts?.pending || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Amount pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Projects Overview & Health Snapshot */}
        <Grid item xs={12} lg={8} sx={{width:'100%'}}>
          {/* 🔸 B. My Projects Overview */}
          <Paper sx={{ p: 3, mb: 3  ,width:'100%'}} >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  My Projects Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track all your projects in one place
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconifyIcon icon="mingcute:search-line" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 200 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Projects</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="delayed">Delayed</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {dashboardData.projects?.projects && dashboardData.projects.projects.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Project Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Deadline</TableCell>
                        <TableCell>Project Manager</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.projects.projects.map((project) => (
                        <TableRow 
                          key={project._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleProjectClick(project._id)}
                        >
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                                <IconifyIcon icon="mingcute:projector-line" />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {project.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {project.projectId}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(project.displayStatus)}
                              size="small"
                              color={getStatusColor(project.displayStatus)}
                              variant={project.displayStatus === 'delayed' ? 'filled' : 'outlined'}
                            />
                            {project.isDelayed && (
                              <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                {project.daysLeft}d overdue
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%' }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={project.progress || 0} 
                                  color={getProgressColor(project.progress)}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                                {project.progress || 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(project.deadline).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color={project.isOverdue ? 'error' : 'text.secondary'}>
                              {project.isOverdue ? `${project.daysLeft} days ago` : `${project.daysLeft} days left`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {project.managerAvatar ? (
                                <Avatar 
                                  src={project.managerAvatar} 
                                  sx={{ width: 32, height: 32 }}
                                />
                              ) : (
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter' }}>
                                  {project.managerName?.charAt(0) || 'U'}
                                </Avatar>
                              )}
                              <Typography variant="body2">
                                {project.managerName}
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {dashboardData.projects.pagination && (
                  <TablePagination
                    component="div"
                    count={dashboardData.projects.pagination.total}
                    page={dashboardData.projects.pagination.page - 1}
                    rowsPerPage={dashboardData.projects.pagination.limit}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ mt: 2 }}
                  />
                )}
              </>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <IconifyIcon icon="mingcute:folder-open-line" sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No projects found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {search || statusFilter !== 'all' ? 'Try changing your search filters' : 'No projects assigned to you yet'}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* 🔸 C. Project Health Snapshot */}
          <Paper sx={{ p: 3 ,width:'100%'}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}  >
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Project Health Snapshot
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Read-only overview of project status
                </Typography>
              </Box>
              <Chip 
                label="Read-only" 
                size="small" 
                color="info" 
                variant="outlined"
                icon={<IconifyIcon icon="mingcute:lock-line" />}
              />
            </Stack>

            <Grid container spacing={3}>
              {/* On Track Projects */}
              <Grid item xs={12} md={4}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: '2px solid',
                    borderColor: 'success.light',
                    bgcolor: 'success.50'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'success.lighter', color: 'success.main' }}>
                        <IconifyIcon icon="mingcute:check-circle-line" />
                      </Avatar>
                      <Box>
                        <Typography variant="h3" fontWeight={700}>
                          {dashboardData.projectHealth?.onTrackProjects || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          On Track
                        </Typography>
                      </Box>
                    </Stack>
                    
                    {dashboardData.projectHealth?.details?.onTrack && 
                     dashboardData.projectHealth.details.onTrack.length > 0 ? (
                      <Stack spacing={1}>
                        {dashboardData.projectHealth.details.onTrack.map((project, index) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: '#252bceb0', borderRadius: 1, border: '1px solid', borderColor: 'success.100' }}>
                            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                              {project.name}
                            </Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <LinearProgress 
                                variant="determinate" 
                                value={project.progress} 
                                color="success"
                                sx={{ width: '60%', height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {project.progress}%
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              Manager: {project.manager}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No projects on track
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Delayed Projects */}
              <Grid item xs={12} md={4}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: '2px solid',
                    borderColor: 'warning.light',
                    bgcolor: 'warning.50'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'warning.lighter', color: 'warning.main' }}>
                        <IconifyIcon icon="mingcute:time-line" />
                      </Avatar>
                      <Box>
                        <Typography variant="h3" fontWeight={700}>
                          {dashboardData.projectHealth?.delayedProjects || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Delayed
                        </Typography>
                      </Box>
                    </Stack>
                    
                    {dashboardData.projectHealth?.details?.delayed && 
                     dashboardData.projectHealth.details.delayed.length > 0 ? (
                      <Stack spacing={1}>
                        {dashboardData.projectHealth.details.delayed.map((project, index) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'warning.100' }}>
                            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                              {project.name}
                            </Typography>
                            <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                              {project.reason}
                            </Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {project.daysOverdue} days overdue
                              </Typography>
                              <Chip 
                                label={`${project.progress}%`} 
                                size="small" 
                                color="warning"
                                sx={{ height: 20 }}
                              />
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No delayed projects
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Recently Updated Projects */}
              <Grid item xs={12} md={4}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: '2px solid',
                    borderColor: 'info.light',
                    bgcolor: 'info.50'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.main' }}>
                        <IconifyIcon icon="mingcute:refresh-line" />
                      </Avatar>
                      <Box>
                        <Typography variant="h3" fontWeight={700}>
                          {dashboardData.projectHealth?.recentlyUpdatedProjects || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Recently Updated
                        </Typography>
                      </Box>
                    </Stack>
                    
                    {dashboardData.projectHealth?.details?.recentlyUpdated && 
                     dashboardData.projectHealth.details.recentlyUpdated.length > 0 ? (
                      <Stack spacing={1}>
                        {dashboardData.projectHealth.details.recentlyUpdated.map((project, index) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: '#252bceb0', borderRadius: 1, border: '1px solid', borderColor: 'info.100' }}>
                            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                              {project.name}
                            </Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Chip 
                                label={project.updateType} 
                                size="small" 
                                color="white"
                                variant="outlined"
                                sx={{ height: 20 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(project.lastUpdate).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No recent updates
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Health Summary */}
            {dashboardData.projectHealth?.percentages && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Project Health Summary
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        On Track
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {dashboardData.projectHealth.percentages.onTrack}%
                      </Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={dashboardData.projectHealth.percentages.onTrack} 
                      color="success"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Delayed
                      </Typography>
                      <Typography variant="caption" fontWeight={600} color="warning.main">
                        {dashboardData.projectHealth.percentages.delayed}%
                      </Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={dashboardData.projectHealth.percentages.delayed} 
                      color="warning"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Recent Updates & Invoice Summary */}
        <Grid item xs={12} lg={4} sx={{width:'100%'}}>
          

          {/* 🔸 E. Invoice Summary */}
          <Paper sx={{ p: 3, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Invoice Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overview of your invoices
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
                onClick={() => navigate('/pages/dashboard/client/invoice')}
              >
                View All
              </Button>
            </Stack>

            {/* Invoice Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {dashboardData.invoiceSummary?.totalInvoices || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Invoices
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2, borderColor: 'success.light', bgcolor: 'success.50' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {dashboardData.invoiceSummary?.paidInvoices || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paid
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2, borderColor: 'warning.light', bgcolor: 'warning.50' }}>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {dashboardData.invoiceSummary?.pendingInvoices || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2, borderColor: 'error.light', bgcolor: 'error.50' }}>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {dashboardData.invoiceSummary?.overdueInvoices || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overdue
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Amounts Summary */}
            <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.100' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {formatCurrency(dashboardData.invoiceSummary?.amounts?.total || 0)}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                    <IconifyIcon icon="mingcute:dollar-circle-line" />
                  </Avatar>
                </Stack>
                
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Paid Amount:
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color="success.main">
                      {formatCurrency(dashboardData.invoiceSummary?.amounts?.paid || 0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Pending Amount:
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color="warning.main">
                      {formatCurrency(dashboardData.invoiceSummary?.amounts?.pending || 0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Overdue Amount:
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color="error.main">
                      {formatCurrency(dashboardData.invoiceSummary?.amounts?.overdue || 0)}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Recent Invoices
              </Typography>
              
              {dashboardData.invoiceSummary?.recentInvoices && 
               dashboardData.invoiceSummary.recentInvoices.length > 0 ? (
                <Stack spacing={1}>
                  {dashboardData.invoiceSummary.recentInvoices.map((invoice) => (
                    <Card 
                      key={invoice._id}
                      variant="outlined"
                      sx={{ 
                        p: 1.5,
                        cursor: 'pointer',
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          borderColor: getStatusColor(invoice.status) + '.main'
                        }
                      }}
                      onClick={() => handleInvoiceClick(invoice._id)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {invoice.invoiceNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {invoice.formattedDate}
                          </Typography>
                        </Box>
                        
                        <Stack alignItems="flex-end">
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(invoice.total)}
                          </Typography>
                          <Chip
                            label={getStatusLabel(invoice.status)}
                            size="small"
                            color={getStatusColor(invoice.status)}
                            sx={{ height: 20, mt: 0.5 }}
                          />
                        </Stack>
                      </Stack>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {invoice.projectName}
                      </Typography>
                      
                      {invoice.daysUntilDue !== undefined && (
                        <Typography 
                          variant="caption" 
                          color={invoice.isOverdue ? 'error' : invoice.daysUntilDue < 7 ? 'warning' : 'text.secondary'}
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {invoice.isOverdue 
                            ? `${Math.abs(invoice.daysUntilDue)} days overdue` 
                            : `${invoice.daysUntilDue} days until due`}
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <IconifyIcon icon="mingcute:receipt-line" sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No invoices found
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Last Updated Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Dashboard last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          • Refresh for latest updates
        </Typography>
      </Box>
    </Box>
  );
};

export default ClientDashboard;