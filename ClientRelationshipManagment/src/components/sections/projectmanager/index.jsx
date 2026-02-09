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
  IconButton,
  Tooltip,
  Button,
  Avatar,
  Badge,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemAvatar,

} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import IconifyIcon from '../../components/base/IconifyIcon';
import CompletedTaskChart from '../../components/sections/projectmanager/completetaskchart';

const PMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifications, setNotifications] = useState([]);
const [notificationCount, setNotificationCount] = useState(0);
const [notificationModalOpen, setNotificationModalOpen] = useState(false);
const [notificationLoading, setNotificationLoading] = useState(false);
  
  const navigate = useNavigate();
  const API_BASE_URL = 'https://crm-rx6f.onrender.com';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Please login to view dashboard');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/pmdashboard`, {
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
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  const refreshDashboard = () => {
    fetchDashboardData();
    setSuccess('Dashboard data refreshed!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'planned': 'info',
      'in-progress': 'warning',
      'completed': 'success',
      'on-hold': 'error',
      'cancelled': 'error',
      'delayed': 'error'
    };
    return colors[status] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      'planned': 'Planned',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'on-hold': 'On Hold',
      'cancelled': 'Cancelled',
      'delayed': 'Delayed'
    };
    return labels[status] || status;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days left color
  const getDaysLeftColor = (daysLeft, status) => {
    if (status === 'completed') return 'success';
    if (status === 'delayed' || daysLeft < 0) return 'error';
    if (daysLeft < 3) return 'warning';
    return 'success';
  };

const fetchPMNotifications = async () => {
  setNotificationLoading(true);
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/pmdashboard/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setNotificationCount(data.data.total || 0);
      }
    }
  } catch (error) {
    console.error('Error fetching PM notifications:', error);
  } finally {
    setNotificationLoading(false);
  }
};

// Auto-fetch notifications every 5 minutes
useEffect(() => {
  fetchPMNotifications();
  const interval = setInterval(fetchPMNotifications, 300000); // 5 minutes
  return () => clearInterval(interval);
}, []);

// Add this function to handle notification click
const handleNotificationClick = (notification) => {
  switch(notification.type) {
    case 'task_overdue':
    case 'task_due_soon':
      // Navigate to the specific task
      navigate(`/pages/dashboard/projectmanager/taskManagment?taskId=${notification.data.taskId}`);
      break;
    case 'project_delayed':
    case 'project_deadline_soon':
      // Navigate to the project
      navigate(`/pages/dashboard/projectmanager/project/${notification.data.projectId}`);
      break;
    default:
      break;
  }
  setNotificationModalOpen(false);
};

// Add this function to get notification icon
const getNotificationIcon = (type) => {
  switch(type) {
    case 'task_overdue':
      return 'mingcute:alarm-fill';
    case 'task_due_soon':
      return 'mingcute:time-fill';
    case 'project_delayed':
      return 'mingcute:warning-fill';
    case 'project_deadline_soon':
      return 'mingcute:calendar-fill';
    default:
      return 'mingcute:notification-fill';
  }
};

// Add this function to get notification color
const getNotificationColor = (priority) => {
  switch(priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'info';
  }
};

// Add this function to format notification time
const formatNotificationTime = (timestamp) => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffMs = now - notificationTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notificationTime.toLocaleDateString();
};
  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 1 }}>
        <Skeleton variant="text" width="60%" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={30} sx={{ mb: 4 }} />
        
        {/* Summary Cards Skeleton */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>

        {/* Main Content Skeleton */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2, mb: 3 }} />
            <Grid container spacing={2}>
              {[1, 2, 3].map((item) => (
                <Grid item xs={12} md={4} key={item}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Render error state
  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
          onClick={fetchDashboardData}
        >
          Retry Loading Dashboard
        </Button>
      </Box>
    );
  }

  // Render empty state
  if (!dashboardData) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No dashboard data available
        </Typography>
        <Button
          variant="outlined"
          startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
          onClick={fetchDashboardData}
        >
          Refresh Dashboard
        </Button>
      </Box>
    );
  }

  // Destructure with default values to prevent undefined errors
  const {
    summary = {
      assignedProjects: 0,
      activeProjects: 0,
      delayedProjects: 0,
      tasksDueToday: 0
    },
    projects = [],
    taskSnapshot = {
      pendingTasks: 0,
      blockedTasks: 0,
      overdueTasks: 0
    },
    teamLoad = [],
    dailyUpdates = []
  } = dashboardData;

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 1 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Project Manager Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time overview of your projects, tasks, and team
            </Typography>
          </Box>

<Stack direction="row" spacing={2} alignItems="center">
  {/* PM Notification Bell */}
  <IconButton
    onClick={() => setNotificationModalOpen(true)}
    sx={{ 
      position: 'relative',
      bgcolor: notificationCount > 0 ? 'error.lighter' : 'transparent',
      '&:hover': { bgcolor: notificationCount > 0 ? '#ffffff28' : 'action.hover' }
    }}
  >
    <Badge 
      badgeContent={notificationCount} 
      color="error"
      max={99}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.7rem',
          height: 20,
          minWidth: 20,
         top: 2,
          left: 6
        }
      }}
    >
      <IconifyIcon 
        icon={notificationCount > 0 ? "mingcute:notification-fill" : "mingcute:notification-line"} 
        color={notificationCount > 0 ? "error.main" : "text.secondary"} 
        fontSize="1.5rem"
      />
    </Badge>
  </IconButton>

  <Button
    variant="outlined"
    startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
    onClick={refreshDashboard}
    disabled={loading}
  >
    Refresh
  </Button>
</Stack>
        </Box>

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

      {/* 🔸 A. PM Summary Cards - Responsive */}
<Grid container spacing={2} sx={{ mb: 4 }}>
  {/* Assigned Projects Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s'
        },
        height: '100%'
      }}
      onClick={() => navigate('/pages/dashboard/projectmanager/project')}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {summary.assignedProjects}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Assigned Projects
            </Typography>
          </Box>
          <IconifyIcon 
            icon="mingcute:projector-fill" 
            color="primary.main" 
            fontSize={{ xs: '1.75rem', sm: '2rem' }}
          />
        </Stack>
        <Stack direction="row" spacing={1} mt={1}>
          <Chip 
            label={`${summary.activeProjects} active`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
          />
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* Active Projects Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s'
        },
        height: '100%'
      }}
      onClick={() => navigate('/pm/projects?status=in-progress')}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {summary.activeProjects}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Active Projects
            </Typography>
          </Box>
          <IconifyIcon 
            icon="mingcute:activity-fill" 
            color="success.main" 
            fontSize={{ xs: '1.75rem', sm: '2rem' }}
          />
        </Stack>
        <Stack direction="row" spacing={1} mt={1}>
          <Chip 
            label={`${summary.delayedProjects} delayed`}
            size="small"
            color="error"
            variant="outlined"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
          />
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* Delayed Projects Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s'
        },
        height: '100%'
      }}
      onClick={() => navigate('/pm/projects?status=delayed')}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" fontWeight={700} color="error.main" sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {summary.delayedProjects}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Delayed Projects
            </Typography>
          </Box>
          <IconifyIcon 
            icon="mingcute:alarm-fill" 
            color="error.main" 
            fontSize={{ xs: '1.75rem', sm: '2rem' }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
          Needs immediate attention
        </Typography>
      </CardContent>
    </Card>
  </Grid>

  {/* Tasks Due Today Card */}
  <Grid item xs={12} sm={6} md={3}>
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s'
        },
        height: '100%'
      }}
      onClick={() => navigate('/pm/tasks?due=today')}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" fontWeight={700} color="warning.main" sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {summary.tasksDueToday}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Tasks Due Today
            </Typography>
          </Box>
          <IconifyIcon 
            icon="mingcute:time-fill" 
            color="warning.main" 
            fontSize={{ xs: '1.75rem', sm: '2rem' }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
          Across all projects
        </Typography>
      </CardContent>
    </Card>
  </Grid>
</Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3} sx={{ width: '100%' }}>
        {/* Left Column - Projects Table */}
        <Grid item xs={12} lg={8} sx={{ width: '100%' }}>
          {/* 🔸 B. My Projects (Core Section) */}
          <Paper sx={{ p: 3, mb: 3, width: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} >
              <Typography variant="h6" fontWeight={600}>
                My Projects
              </Typography>
              <Button
                variant="outlined"
                endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
                onClick={() => navigate('/pages/dashboard/projectmanager/project')}
              >
                View All Projects
              </Button>
            </Stack>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Project Name</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <TableRow key={project._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {project.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.projectId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.clientName || 'No Client'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2">
                              {formatDate(project.deadline)}
                            </Typography>
                            {project.daysLeft !== undefined && (
                              <Chip 
                                label={`${Math.abs(project.daysLeft)} days ${project.daysLeft >= 0 ? 'left' : 'overdue'}`}
                                size="small"
                                color={getDaysLeftColor(project.daysLeft, project.actualStatus)}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusLabel(project.actualStatus || project.status)}
                            size="small"
                            color={getStatusColor(project.actualStatus || project.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <LinearProgress 
                              variant="determinate" 
                              value={project.progress || 0}
                              color={project.progress >= 70 ? 'success' : project.progress >= 30 ? 'warning' : 'error'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {project.progress || 0}%
                            </Typography>
                          </Stack>
                        </TableCell>
                       
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" py={3}>
                          No projects found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

{/* 🔸 C. Task Execution Snapshot - BIG TRANSPARENT CHART with horizontal scroll on mobile */}
<Box sx={{ 
  mb: 3, 
  width: '100%',  
  bgcolor: '#f8fafc2f',
  overflowX: { xs: 'auto', sm: 'visible' },
  overflowY: 'visible'
}}>
  {/* Container with fixed width on mobile for scrolling */}
  <Box sx={{ 
    minWidth: { xs: '600px', sm: 'auto' },
    p: 2.5
  }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Stack alignItems="center" spacing={0.6}>
        <IconifyIcon icon="ph:clock-fill" sx={{ color: 'text.secondary' }} fontSize="h6.fontSize" />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Task Execution Overview (Monthly)
        </Typography>
      </Stack>
      
      {/* Task Stats in Header */}
      <Stack direction="row" alignItems="center" spacing={3}>
        <Stack alignItems="center">
          <Typography variant="h4" fontWeight={600} letterSpacing={1}>
            {taskSnapshot.pendingTasks + taskSnapshot.blockedTasks + taskSnapshot.overdueTasks}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Active Tasks
          </Typography>
        </Stack>
      </Stack>
    </Stack>

    {/* Task Trend Chart - BIG and TRANSPARENT */}
    <Box 
      height={400} 
      sx={{ 
        position: 'relative', 
        width: '100%',
        '& .echarts-for-react canvas': {
          background: 'transparent !important'
        }
      }}
    >
      {/* Completed Task Chart with hover details */}
      <CompletedTaskChart 
        taskData={taskSnapshot}
        monthlyTasks={taskSnapshot.monthlyTasks || []}
        sx={{ 
          height: '100% !important',
          width: '100% !important',
          background: 'transparent',
          '& .echarts-for-react': {
            height: '100% !important',
            width: '100% !important',
            background: 'transparent !important'
          }
        }}
      />
    </Box>

    {/* Footer - TRANSPARENT */}
    <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} mt={3} mb={5}>
      <Stack direction="row" spacing={2}>
        <Chip 
          label={`${taskSnapshot.pendingTasks} Pending`}
          size="small"
          sx={{ 
            bgcolor: '#3074d3',
            borderColor: 'info.main',
            color: 'info.main',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          icon={<IconifyIcon icon="mingcute:time-line" fontSize="small" />}
        />
        <Chip 
          label={`${taskSnapshot.blockedTasks} On Hold`}
          size="small"
          sx={{ 
            bgcolor: 'transparent',
            borderColor: 'warning.main',
            color: 'warning.main',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          icon={<IconifyIcon icon="mingcute:pause-circle-line" fontSize="small" />}
        />
        <Chip 
          label={`${taskSnapshot.overdueTasks} Overdue`}
          size="small"
          sx={{ 
            bgcolor: 'transparent',
            borderColor: 'error.main',
            color: 'error.main',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          icon={<IconifyIcon icon="mingcute:alarm-line" fontSize="small" />}
        />
      </Stack>
      
      <Button 
        size="small" 
        sx={{ 
          ml: 2,
          mb:2,
          mt:2,
          bgcolor: '#c12fbe',
          borderColor: 'primary.main',
          color: '#fff',
          '&:hover': { 
            bgcolor: 'action.hover',
            borderColor: 'primary.dark' 
          }
        }}
        endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
        onClick={() => navigate('/pages/dashboard/projectmanager/taskManagment')}
      >
        View All Tasks
      </Button>
    </Stack>
  </Box>
</Box>
        </Grid>

        {/* Right Column */}
<Grid item xs={12} lg={4}>
  {/* 🔸 D. Team Load Indicator */}
  <Paper sx={{ 
    p: 3, 
    mb: 3, 
    width: '100%',
    overflowX: { xs: 'auto', sm: 'visible' },
    flexShrink: 0 // Prevent shrinking
  }}>
    <Box sx={{ 
      width: { xs: 'max-content', sm: '100%' }, // Use max-content on mobile
      minWidth: { xs: '100%', sm: 'auto' } // Minimum width is full width on mobile
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Team Load Indicator
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Helps redistribute work
        </Typography>
      </Stack>

      <Stack spacing={2}>
        {teamLoad.length > 0 ? (
          teamLoad.map((member, index) => (
            <Card key={index} variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {member.employeeName || `Employee ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.designation || 'Team Member'} • {member.department || 'Department'}
                    </Typography>
                  </Box>
                  <Badge 
                    badgeContent={member.taskCount || 0} 
                    color={(member.taskCount || 0) > 10 ? "error" : (member.taskCount || 0) > 5 ? "warning" : "success"}
                  >
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {(member.employeeName || 'E').charAt(0)}
                    </Avatar>
                  </Badge>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Chip 
                    label={`${member.overdueTasks || 0} overdue`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {member.taskCount || 0} total tasks
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography color="text.secondary" textAlign="center" py={2}>
            No team load data available
          </Typography>
        )}
      </Stack>
    </Box>
  </Paper>

  {/* 🔸 E. Daily Updates Feed */}
  <Paper sx={{ 
    p: 3, 
    width: '100%',
    overflowX: { xs: 'auto', sm: 'visible' },
    flexShrink: 0 // Prevent shrinking
  }}>
    <Box sx={{ 
      width: { xs: 'max-content', sm: '100%' } // Use max-content on mobile
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Daily Updates Feed
        </Typography>
        <Button
          size="small"
          onClick={() => navigate('/pages/dashboard/projectmanager/dailyupdate')}
        >
          View All
        </Button>
      </Stack>

      <List sx={{ 
        maxHeight: 400, 
        overflow: 'auto',
        width: { xs: 'max-content', sm: '100%' } // Use max-content on mobile
      }}>
        {dailyUpdates.length > 0 ? (
          dailyUpdates.map((update, index) => (
            <div key={index}>
              <ListItem alignItems="flex-start">
                <ListItemIcon>
                  {update.currentStatus === 'completed' ? (
                    <IconifyIcon icon="mingcute:check-circle-fill" color="success" />
                  ) : update.currentStatus === 'blocked' ? (
                    <IconifyIcon icon="mingcute:stop-circle-fill" color="error" />
                  ) : update.currentStatus === 'in-progress' ? (
                    <IconifyIcon icon="mingcute:progress-fill" color="warning" />
                  ) : (
                    <IconifyIcon icon="mingcute:time-fill" color="info" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      {update.employeeName || 'Employee'}
                    </Typography>
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.primary">
                        {update.taskName || 'Task Update'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {update.lastUpdate || 'No update message'}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          {update.projectName || 'Project'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {update.formattedTime || 'Recently'}
                        </Typography>
                      </Stack>
                    </Stack>
                  }
                />
              </ListItem>
              {index < dailyUpdates.length - 1 && <Divider variant="inset" component="li" />}
            </div>
          ))
        ) : (
          <Typography color="text.secondary" textAlign="center" py={2}>
            No updates available
          </Typography>
        )}
      </List>
    </Box>
  </Paper>
</Grid>
      </Grid>
      {/* PM Notification Modal */}
<Dialog
  open={notificationModalOpen}
  onClose={() => setNotificationModalOpen(false)}
  maxWidth="sm"
  fullWidth
  scroll="paper"
>
  <DialogTitle sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottom: '1px solid',
    borderColor: 'divider',
    pb: 2
  }}>
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <IconifyIcon 
        icon="mingcute:notification-fill" 
        color="primary.main" 
        fontSize="1.5rem"
      />
      <Box>
        <Typography variant="h6" fontWeight={600}>
          Project Manager Notifications
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {notificationCount} total • Auto-updates every 5 minutes
        </Typography>
      </Box>
    </Stack>
    <IconButton onClick={() => setNotificationModalOpen(false)} size="small">
      <IconifyIcon icon="mingcute:close-line" />
    </IconButton>
  </DialogTitle>
  
  <DialogContent sx={{ p: 0 }}>
    {notificationLoading ? (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading notifications...
        </Typography>
      </Box>
    ) : notifications.length === 0 ? (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <IconifyIcon 
          icon="mingcute:check-circle-line" 
          width={48} 
          color="success.main"
          sx={{ opacity: 0.7 }}
        />
        <Typography variant="h6" color="text.secondary" mt={2}>
          All caught up!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No notifications at the moment
        </Typography>
      </Box>
    ) : (
      <List sx={{ p: 0 }}>
        {notifications.map((notification) => (
          <ListItem 
            key={notification.id}
            button
            onClick={() => handleNotificationClick(notification)}
            sx={{ 
              p: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: `${getNotificationColor(notification.priority)}.lighter`,
                transform: 'translateX(2px)'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar 
                sx={{ 
                  bgcolor: `${getNotificationColor(notification.priority)}.main`,
                  width: 40,
                  height: 40
                }}
              >
                <IconifyIcon 
                  icon={getNotificationIcon(notification.type)} 
                  color="white"
                  fontSize="1.2rem"
                />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {notification.title}
                  </Typography>
                  <Chip
                    label={notification.priority}
                    size="small"
                    color={getNotificationColor(notification.priority)}
                    sx={{ 
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}
                  />
                </Stack>
              }
              secondary={
                <>
                  <Typography variant="body2" color="text.primary">
                    {notification.message}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {formatNotificationTime(notification.timestamp)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notification.data.projectTitle && (
                        <Chip
                          label={notification.data.projectTitle}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                      {notification.data.assigneeName && notification.type.includes('task') && (
                        <Chip
                          label={notification.data.assigneeName}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                  </Stack>
                </>
              }
              sx={{ '& .MuiListItemText-secondary': { mt: 0.5 } }}
            />
          </ListItem>
        ))}
      </List>
    )}
  </DialogContent>
  
  <DialogActions sx={{ 
    p: 2, 
    borderTop: '1px solid',
    borderColor: 'divider',
    justifyContent: 'space-between'
  }}>
    <Button
      startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
      onClick={fetchPMNotifications}
      disabled={notificationLoading}
    >
      Refresh
    </Button>
    <Button
      onClick={() => setNotificationModalOpen(false)}
      variant="contained"
    >
      Close
    </Button>
  </DialogActions>
</Dialog>
    </Box>
    
  );
};

export default PMDashboard;