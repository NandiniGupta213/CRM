import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CircularProgress,
  Pagination,
  Alert,
  Tooltip,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    plannedProjects: 0,
    inProgressProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    delayedProjects: 0,
    averageProgress: 0,
    upcomingDeadlines: 0,
    userRole: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userInfo, setUserInfo] = useState({
    employeeId: '',
    fullName: '',
    role: ''
  });

  const itemsPerPage = 8;
  const API_BASE_URL = 'http://localhost:8000';

  // Fetch projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token || token === 'null' || token === 'undefined') {
        setErrorMessage('Please login to access projects.');
        setTimeout(() => setErrorMessage(''), 5000);
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        sort: '-createdAt'
      }).toString();

      // CORRECTED: Use the right endpoint
  const response = await fetch(`${API_BASE_URL}/employeeproject/my-projects?${queryParams}`,{
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          setErrorMessage('Session expired. Please login again.');
          setTimeout(() => setErrorMessage(''), 5000);
          window.location.href = '/login';
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data.projects || []);
        setTotalPages(data.data.pagination?.pages || 1);
        if (data.data.userInfo) {
          setUserInfo(data.data.userInfo);
        }
      } else {
        setErrorMessage(data.message || 'Failed to load projects');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrorMessage('Failed to load projects: ' + error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setStatsLoading(false);
        return;
      }

      // CORRECTED: Use the right endpoint
   const response = await fetch(`${API_BASE_URL}/employeeproject/my-projects/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      'planned': { 
        label: 'Planned', 
        color: 'default', 
        icon: 'mingcute:time-line',
        bgColor: '#e0e0e0'
      },
      'in-progress': { 
        label: 'In Progress', 
        color: 'info', 
        icon: 'mingcute:progress-4-fill',
        bgColor: '#bbdefb'
      },
      'completed': { 
        label: 'Completed', 
        color: 'success', 
        icon: 'mingcute:check-circle-fill',
        bgColor: '#c8e6c9'
      },
      'on-hold': { 
        label: 'On Hold', 
        color: 'warning', 
        icon: 'mingcute:pause-circle-fill',
        bgColor: '#fff3cd'
      },
      'cancelled': { 
        label: 'Cancelled', 
        color: 'error', 
        icon: 'mingcute:close-circle-fill',
        bgColor: '#f5c6cb'
      },
      'delayed': { 
        label: 'Delayed', 
        color: 'error', 
        icon: 'mingcute:alarm-warning-fill',
        bgColor: '#f8d7da'
      }
    };
    return statusMap[status] || { 
      label: 'Unknown', 
      color: 'default', 
      icon: 'mingcute:help-fill',
      bgColor: '#f5f5f5'
    };
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate progress color
  const getProgressColor = (progress) => {
    if (progress >= 90) return 'success';
    if (progress >= 70) return 'info';
    if (progress >= 50) return 'warning';
    return 'error';
  };

  // Get random color for avatars
  const getRandomColor = (str) => {
    const colors = [
      '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', 
      '#7b1fa2', '#00838f', '#5d4037', '#9c27b0',
      '#2196f3', '#4caf50', '#ff9800', '#f44336'
    ];
    if (!str) return colors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get client initials
  const getClientInitials = (client) => {
    if (!client) return '??';
    if (client.companyName) {
      return getInitials(client.companyName);
    }
    if (client.name) {
      return getInitials(client.name);
    }
    return '??';
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchProjects();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Fetch data on page change
  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [page]);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexWrap: 'wrap',
        gap: 2 
      }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            My Projects
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {errorMessage && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setErrorMessage('')}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Summary Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} flexWrap="wrap">
        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconifyIcon icon="mingcute:folder-line" color="primary" />
              <Typography variant="subtitle2" color="text.secondary">
                Total Projects
              </Typography>
            </Box>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="primary" fontWeight={700}>
                {stats.totalProjects}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconifyIcon icon="mingcute:progress-4-fill" color="info" />
              <Typography variant="subtitle2" color="text.secondary">
                In Progress
              </Typography>
            </Box>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="text.primary" fontWeight={700}>
                {stats.inProgressProjects}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconifyIcon icon="mingcute:alarm-warning-fill" color="error" />
              <Typography variant="subtitle2" color="text.secondary">
                Delayed
              </Typography>
            </Box>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="error.main" fontWeight={700}>
                {stats.delayedProjects}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconifyIcon icon="mingcute:check-circle-fill" color="success" />
              <Typography variant="subtitle2" color="text.secondary">
                Completed
              </Typography>
            </Box>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="success.main" fontWeight={700}>
                {stats.completedProjects}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>


      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="filled"
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

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {stats.totalProjects} project{stats.totalProjects !== 1 ? 's' : ''} total
          </Typography>
        </Stack>
      </Paper>

      {/* Projects Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600, width: '25%' }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>PM</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => {
                const statusInfo = getStatusInfo(project.actualStatus || project.status);
                const isDelayed = project.actualStatus === 'delayed';
                
                return (
                  <TableRow 
                    key={project._id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: isDelayed ? 'rgba(244, 67, 54, 0.04)' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: getRandomColor(project.projectId),
                            width: 40,
                            height: 40,
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          {getInitials(project.title)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {project.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {project.projectId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: getRandomColor(project.client?.name),
                            width: 32,
                            height: 32,
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                        >
                          {getClientInitials(project.client)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {project.client?.companyName || project.client?.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.client?.name && project.client?.companyName 
                              ? project.client.name 
                              : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {project.pmName || 'Not Assigned'}
                      </Typography>
                      {project.pmEmail && (
                        <Typography variant="caption" color="text.secondary">
                          {project.pmEmail}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {formatDate(project.deadline)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={project.daysLeft < 0 ? 'error.main' : 'text.secondary'}
                        >
                          {project.daysLeft < 0 
                            ? `${Math.abs(project.daysLeft)} days overdue`
                            : project.daysLeft === 0 
                              ? 'Due today'
                              : `${project.daysLeft} days left`}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={<IconifyIcon icon={statusInfo.icon} />}
                        variant="outlined"
                        sx={{ 
                          backgroundColor: statusInfo.bgColor + '20',
                          borderColor: statusInfo.bgColor,
                          '& .MuiChip-icon': { color: statusInfo.bgColor }
                        }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            mb: 0.5 
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                              {project.progress || 0}%
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            position: 'relative',
                            height: 6,
                            backgroundColor: 'action.hover',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}>
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                width: `${project.progress || 0}%`,
                                backgroundColor: getProgressColor(project.progress || 0),
                                borderRadius: 3,
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {projects.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <IconifyIcon 
                      icon="mingcute:folder-search-line" 
                      fontSize={48} 
                      sx={{ opacity: 0.3, mb: 1 }} 
                    />
                    <Typography color="text.secondary">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No projects found matching your criteria' 
                        : 'No projects assigned to you yet'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
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

    </Box>
  );
};

export default ProjectsPage;