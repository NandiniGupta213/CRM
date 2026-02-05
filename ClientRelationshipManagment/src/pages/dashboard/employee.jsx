import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
    CardHeader,
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
  CardActions,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  TablePagination,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Today as TodayIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  AddComment as AddCommentIcon,
  Update as UpdateIcon,
  Notifications as NotificationsIcon,
  Folder as FolderIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  Build as BuildIcon,
  BugReport as BugReportIcon,
  DesignServices as DesignServicesIcon,
  Description as DescriptionIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Task as TaskIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const EmployeeDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [workSummary, setWorkSummary] = useState({
    assignedTasks: 0,
    tasksDueToday: 0,
    overdueTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0
  });
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateText, setUpdateText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [statusToUpdate, setStatusToUpdate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const API_BASE_URL = 'https://crm-rx6f.onrender.com/employeedashboard';

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

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Fetch all data in parallel
    const [
      summaryResponse,
      tasksResponse,
      projectsResponse,
      notificationsResponse
    ] = await Promise.all([
      fetch(`${API_BASE_URL}/summary`, { headers }),
      fetch(`${API_BASE_URL}/tasks/today`, { headers }),
      fetch(`${API_BASE_URL}/projects`, { headers }),
      fetch(`${API_BASE_URL}/notifications`, { headers })
    ]);

    // Check all responses
    if (!summaryResponse.ok || !tasksResponse.ok || !projectsResponse.ok || !notificationsResponse.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const summaryData = await summaryResponse.json();
    const tasksData = await tasksResponse.json();
    const projectsData = await projectsResponse.json();
    const notificationsData = await notificationsResponse.json();

    console.log('Projects response data:', projectsData);

    // Update state - IMPORTANT: Check the response structure
    if (summaryData.success) setWorkSummary(summaryData.data);
    if (tasksData.success) setTodaysTasks(tasksData.data);
    
    // 🔸 C. Fix for projects data structure
    if (projectsData.success) {
      // Check if projects are in data.projects or just data
      if (projectsData.data && projectsData.data.projects) {
        // If response has { data: { projects: [...] } }
        setMyProjects(projectsData.data.projects);
      } else if (Array.isArray(projectsData.data)) {
        // If response has { data: [...] }
        setMyProjects(projectsData.data);
      } else {
        // If response has a different structure
        console.warn('Unexpected projects data structure:', projectsData.data);
        setMyProjects([]);
      }
    }
    
    if (notificationsData.success) {
      setNotifications(notificationsData.data.notifications || []);
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    setError('Failed to load dashboard data. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Add this helper function to format project data
const formatProjectData = (projects) => {
  if (!Array.isArray(projects)) return [];
  
  return projects.map(project => {
    // Handle different possible field names
    return {
      _id: project._id,
      projectName: project.projectName || project.title || project.name || 'Unnamed Project',
      projectId: project.projectId || project.id || 'N/A',
      pmName: project.pmName || project.projectManagerName || project.manager?.name || 'Not Assigned',
      pmEmail: project.pmEmail || project.projectManagerEmail || project.manager?.email || '',
      deadline: project.deadline || project.endDate,
      status: project.status || project.actualStatus || 'planned',
      progress: project.progress || 0,
      myRole: project.myRole || project.teamMemberRole || 'team member',
      daysLeft: project.daysLeft || 0,
      isDelayed: project.isDelayed || false,
      startDate: project.startDate,
      // Add fallback for project manager name if not present
      projectManager: project.pmName || project.projectManagerName || 'Not Assigned'
    };
  });
};

  // Update task status
  const handleUpdateStatus = async (taskId, status, comment = '') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, comment })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Task status updated successfully!');
        fetchDashboardData(); // Refresh data
        setUpdateDialogOpen(false);
        setUpdateText('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update task status');
    }
  };

  // Add comment to task
  const handleAddComment = async (taskId, comment) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: comment })
      });

      if (response.ok) {
        setSuccess('Comment added successfully!');
        fetchDashboardData(); // Refresh data
        setCommentDialogOpen(false);
        setCommentText('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    }
  };

  // Submit daily update
  const handleDailyUpdate = async (taskId, update, status) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/daily-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId, update, status })
      });

      if (response.ok) {
        setSuccess('Daily update submitted successfully!');
        fetchDashboardData(); // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to submit daily update');
      }
    } catch (error) {
      console.error('Error submitting daily update:', error);
      setError('Failed to submit daily update');
    }
  };

  // Open update dialog
  const openUpdateDialog = (task, status) => {
    setSelectedTask(task);
    setStatusToUpdate(status);
    setUpdateDialogOpen(true);
  };

  // Open comment dialog
  const openCommentDialog = (task) => {
    setSelectedTask(task);
    setCommentDialogOpen(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  // Format time
  const formatTime = (dateString) => {
    return dayjs(dateString).format('h:mm A');
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'todo': 'default',
      'in-progress': 'warning',
      'review': 'info',
      'completed': 'success',
      'on-hold': 'error',
      'cancelled': 'error'
    };
    return colors[status] || 'default';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'critical': 'error'
    };
    return colors[priority] || 'default';
  };

  // Get task type icon
  const getTaskTypeIcon = (type) => {
    const icons = {
      'development': <BuildIcon fontSize="small" />,
      'design': <DesignServicesIcon fontSize="small" />,
      'testing': <BugReportIcon fontSize="small" />,
      'documentation': <DescriptionIcon fontSize="small" />,
      'meeting': <GroupsIcon fontSize="small" />,
      'research': <SearchIcon fontSize="small" />,
      'bug-fix': <BugReportIcon fontSize="small" />,
      'feature': <BuildIcon fontSize="small" />,
      'other': <AssignmentIcon fontSize="small" />
    };
    return icons[type] || <AssignmentIcon fontSize="small" />;
  };

  // Get task type color
  const getTaskTypeColor = (type) => {
    const colors = {
      'development': 'primary',
      'design': 'secondary',
      'testing': 'error',
      'documentation': 'info',
      'meeting': 'warning',
      'research': 'success',
      'bug-fix': 'error',
      'feature': 'primary',
      'other': 'default'
    };
    return colors[type] || 'default';
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      'new_task_assigned': <AssignmentIcon />,
      'task_reopened': <RefreshIcon />,
      'comment_from_pm': <CommentIcon />,
      'deadline_approaching': <ScheduleIcon />,
      'task_status_updated': <UpdateIcon />
    };
    return icons[type] || <NotificationsIcon />;
  };

  // Get notification color
  const getNotificationColor = (type) => {
    const colors = {
      'new_task_assigned': 'primary',
      'task_reopened': 'warning',
      'comment_from_pm': 'info',
      'deadline_approaching': 'error',
      'task_status_updated': 'success'
    };
    return colors[type] || 'default';
  };

  // Calculate days remaining
  const getDaysRemaining = (deadline) => {
    const days = dayjs(deadline).diff(dayjs(), 'day');
    if (days < 0) return { text: 'Overdue', color: 'error' };
    if (days === 0) return { text: 'Due today', color: 'warning' };
    if (days === 1) return { text: 'Due tomorrow', color: 'warning' };
    if (days <= 7) return { text: `Due in ${days} days`, color: 'info' };
    return { text: `Due in ${days} days`, color: 'success' };
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        width: '100%' 
      }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} />
          <Typography color="text.secondary">Loading your dashboard...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      p: { xs: 1, sm: 2, md: 3 }
    }}>
      {/* Main Container - Full Width */}
      <Box sx={{ 
        width: '100%',
        maxWidth: '100%',
        mx: 'auto'
      }}>
        {/* Header */}
        <Box sx={{ 
          width: '100%',
          mb: 4,
          bgcolor: '',
          borderRadius: 2,
          p: 3,
          boxShadow: 1
        }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ width: '100%' }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <DashboardIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Employee Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track your tasks, projects, and updates • Welcome back!
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchDashboardData}
              disabled={loading}
              sx={{ 
                minWidth: { xs: '100%', sm: 'auto' },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Refresh Dashboard
            </Button>
          </Stack>
        </Box>

        {/* Error/Success Alerts */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              width: '100%',
              borderRadius: 2 
            }} 
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              width: '100%',
              borderRadius: 2 
            }} 
            onClose={() => setSuccess('')}
          >
            {success}
          </Alert>
        )}

        {/* 🔸 A. My Work Summary - Full Width Grid */}
<Grid 
  container 
  spacing={2} 
  sx={{ 
    mb: 4, 
    width: '100%' 
  }}
>
  {[
    {
      title: 'Assigned Tasks',
      value: workSummary.assignedTasks,
      icon: <AssignmentIcon />,
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      subtitle: `${workSummary.inProgressTasks} in progress`
    },
    {
      title: 'Due Today',
      value: workSummary.tasksDueToday,
      icon: <TodayIcon />,
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      subtitle: 'Focus on these first'
    },
    {
      title: 'Overdue',
      value: workSummary.overdueTasks,
      icon: <WarningIcon />,
      color: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
      subtitle: 'Needs immediate attention'
    },
    {
      title: 'Completed (Week)',
      value: workSummary.completedTasks,
      icon: <CheckCircleIcon />,
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      subtitle: 'Great work this week!'
    }
  ].map((item, index) => (
    <Grid 
      item 
      xs={12} 
      sm={6} 
      md={3} 
      lg={3} 
      xl={3}
      key={index}
    >
      <Card sx={{ 
        background: item.color,
        color: 'white',
        transition: 'transform 0.3s',
        height: '100%',
        width: '100%',
        minHeight: { xs: 120, sm: 140 },
        '&:hover': { transform: 'translateY(-5px)' }
      }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" fontWeight={700} gutterBottom sx={{ 
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' } 
              }}>
                {item.value}
              </Typography>
              <Typography variant="body1" sx={{ 
                opacity: 0.9, 
                fontSize: { xs: '0.8rem', sm: '0.9rem' } 
              }}>
                {item.title}
              </Typography>
            </Box>
            <Avatar sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)',
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 }
            }}>
              {item.icon}
            </Avatar>
          </Stack>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.8, 
              display: 'block', 
              mt: 1,
              fontSize: { xs: '0.7rem', sm: '0.75rem' }
            }}
          >
            {item.subtitle}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  ))}
</Grid>

        {/* Main Content - Full Width Grid */}
        <Grid 
          container 
          spacing={3} 
          sx={{ 
            width: '100%',
            minHeight: 'calc(100vh - 300px)'
          }}
        >
          {/* Left Column - Today's Tasks (66.66% width on large screens) */}
          <Grid 
            item 
            xs={12} 
            lg={8} 
            sx={{ 
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 🔸 B. Today's Tasks (Main Focus) */}
            <Card sx={{ 
              flex: 1,
              mb: 3,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: 3
            }}>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <TodayIcon color="primary" />
                    <Box>
                      <Typography variant="h5" fontWeight={600}>
                        Today's Tasks - Main Focus
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Prioritize and update your daily tasks
                      </Typography>
                    </Box>
                  </Stack>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label={`${todaysTasks.length} tasks`} 
                      color="primary" 
                      variant="outlined"
                      size="small"
                    />
                    <Tooltip title="Refresh">
                      <IconButton onClick={fetchDashboardData} size="small">
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
                sx={{ 
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'primary.50',
                  width: '100%'
                }}
              />
              <CardContent sx={{ 
                p: 0, 
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {todaysTasks.length > 0 ? (
                  <>
                    <TableContainer sx={{ flex: 1, width: '100%' }}>
                      <Table sx={{ width: '100%' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Task Details</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Project</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Deadline</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Progress</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {todaysTasks
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((task) => (
                            <TableRow 
                              key={task._id} 
                              hover
                              sx={{ 
                                '&:last-child td, &:last-child th': { border: 0 },
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <TableCell>
                                <Stack spacing={1}>
                                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                    <Tooltip title={task.taskType}>
                                      <Chip
                                        icon={getTaskTypeIcon(task.taskType)}
                                        label={isMobile ? task.taskType.substring(0, 3) : task.taskType}
                                        size="small"
                                        color={getTaskTypeColor(task.taskType)}
                                        variant="outlined"
                                      />
                                    </Tooltip>
                                    <Chip
                                      label={task.priority}
                                      size="small"
                                      color={getPriorityColor(task.priority)}
                                    />
                                  </Stack>
                                  <Typography fontWeight={600} noWrap>
                                    {task.taskName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {task.taskId}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography fontWeight={500} noWrap>
                                    {task.project?.name || 'No Project'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {task.project?.projectId || 'N/A'}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="body2" noWrap>
                                    {formatDate(task.deadline)}
                                  </Typography>
                                  <Chip
                                    label={getDaysRemaining(task.deadline).text}
                                    size="small"
                                    color={getDaysRemaining(task.deadline).color}
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  color={getStatusColor(task.status)}
                                  sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={1}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={task.progress}
                                        color={getStatusColor(task.status)}
                                        sx={{ height: 6, borderRadius: 3 }}
                                      />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                      {task.progress}%
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>

                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={todaysTasks.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      sx={{ width: '100%' }}
                    />
                  </>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}>
                    <TodayIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No tasks due today!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enjoy your productive day or check upcoming tasks
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

           <Card sx={{ 
  width: '100%',
  borderRadius: 2,
  boxShadow: 3
}}>
  <CardHeader
    title={
      <Stack direction="row" alignItems="center" spacing={2}>
        <FolderIcon color="info" />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            My Active Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Projects you're currently working on
          </Typography>
        </Box>
      </Stack>
    }
    action={
      <Chip 
        label={`${myProjects.length} projects`} 
        color="info" 
        variant="outlined"
        size="small"
      />
    }
    sx={{ 
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: 'info.50',
      width: '100%'
    }}
  />
  <CardContent sx={{ width: '100%' }}>
    {myProjects.length > 0 ? (
      <Grid container spacing={2} sx={{ width: '100%' }}>
        {myProjects.map((project) => {
          // Format the project data to ensure consistency
          const formattedProject = {
            _id: project._id,
            projectName: project.projectName || project.title,
            projectId: project.projectId,
            pmName: project.pmName || 'Not Assigned',
            pmEmail: project.pmEmail || '',
            deadline: project.deadline,
            status: project.status,
            progress: project.progress || 0,
            myRole: project.myRole || 'team member',
            daysLeft: project.daysLeft || 0,
            isDelayed: project.isDelayed || false,
            startDate: project.startDate
          };

          // Calculate days remaining if not provided
          const daysLeft = formattedProject.daysLeft || 
            (formattedProject.deadline 
              ? Math.ceil((new Date(formattedProject.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0
            );

          return (
            <Grid item xs={12} key={formattedProject._id}>
              <Card variant="outlined" sx={{ p: 2, width: '100%' }}>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  alignItems="center" 
                  spacing={2}
                  sx={{ width: '100%' }}
                >
                  <Avatar sx={{ bgcolor: 'info.light' }}>
                    <FolderIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      justifyContent="space-between" 
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      spacing={1}
                      sx={{ width: '100%' }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {formattedProject.projectName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {formattedProject.projectId} • Your Role: {formattedProject.myRole}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={formattedProject.status}
                          size="small"
                          color={getStatusColor(formattedProject.status)}
                          sx={{ fontWeight: 500 }}
                        />
                        <Typography variant="h6" fontWeight={700}>
                          {formattedProject.progress}%
                        </Typography>
                      </Stack>
                    </Stack>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={3} 
                      sx={{ mt: 2, width: '100%' }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Project Manager
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formattedProject.pmName}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text-secondary">
                          Deadline
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formattedProject.deadline ? formatDate(formattedProject.deadline) : 'No deadline'}
                        </Typography>
                        {daysLeft !== undefined && (
                          <Typography variant="caption" color={daysLeft < 0 ? 'error' : daysLeft <= 7 ? 'warning' : 'success'}>
                            {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : 
                             daysLeft === 0 ? 'Due today' : 
                             daysLeft === 1 ? 'Due tomorrow' : 
                             `Due in ${daysLeft} days`}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={formattedProject.progress}
                      color={getStatusColor(formattedProject.status)}
                      sx={{ mt: 2, height: 6, borderRadius: 3, width: '100%' }}
                    />
                  </Box>
                </Stack>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    ) : (
      <Box sx={{ 
        textAlign: 'center', 
        py: 4,
        width: '100%'
      }}>
        <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography color="text.secondary">
          No active projects assigned
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Contact your manager for project assignments
        </Typography>
      </Box>
    )}
  </CardContent>
</Card>
          </Grid>

          {/* Right Column - Notifications (33.33% width on large screens) */}
          <Grid 
            item 
            xs={12} 
            lg={4} 
            sx={{ 
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 🔸 D. Notifications */}
            <Card sx={{ 
              flex: 1,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: 3
            }}>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Badge badgeContent={notifications.length} color="error">
                      <NotificationsIcon color="action" />
                    </Badge>
                    <Box>
                      <Typography variant="h5" fontWeight={600}>
                        Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Recent updates and alerts
                      </Typography>
                    </Box>
                  </Stack>
                }
                sx={{ 
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: '100%'
                }}
              />
              <CardContent sx={{ 
                p: 0, 
                flex: 1,
                width: '100%',
                overflow: 'auto'
              }}>
                {notifications.length > 0 ? (
                  <List disablePadding sx={{ width: '100%' }}>
                    {notifications.slice(0, 10).map((notification, index) => (
                      <React.Fragment key={index}>
                        <ListItem 
                          alignItems="flex-start"
                          sx={{ 
                            py: 2,
                            '&:hover': { bgcolor: 'action.hover' },
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32,
                                bgcolor: `${getNotificationColor(notification.type)}.light`,
                                color: `${getNotificationColor(notification.type)}.main`
                              }}
                            >
                              {getNotificationIcon(notification.type)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {notification.title}
                              </Typography>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mt: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                >
                                  {notification.message}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary" 
                                  sx={{ 
                                    display: 'block', 
                                    mt: 0.5 
                                  }}
                                >
                                  {dayjs(notification.timestamp).fromNow()}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                        {index < notifications.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <NotificationsIcon sx={{ 
                      fontSize: 48, 
                      color: 'text.secondary', 
                      mb: 2, 
                      opacity: 0.5 
                    }} />
                    <Typography color="text.secondary">
                      All caught up!
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      No new notifications
                    </Typography>
                  </Box>
                )}
              </CardContent>
              {notifications.length > 0 && (
                <CardActions sx={{ 
                  justifyContent: 'center', 
                  borderTop: '1px solid', 
                  borderColor: 'divider',
                  width: '100%'
                }}>
                  
                </CardActions>
              )}
            </Card>

          </Grid>
        </Grid>
      </Box>

      {/* Update Status Dialog */}
      <Dialog 
        open={updateDialogOpen} 
        onClose={() => setUpdateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <UpdateIcon color="primary" />
            <Typography variant="h6">Update Task Status</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={3} sx={{ pt: 2, width: '100%' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Task Details
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedTask.taskName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTask.taskId}
                </Typography>
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={statusToUpdate}
                  onChange={(e) => setStatusToUpdate(e.target.value)}
                  label="New Status"
                  fullWidth
                >
                  <SelectMenuItem value="todo">To Do</SelectMenuItem>
                  <SelectMenuItem value="in-progress">In Progress</SelectMenuItem>
                  <SelectMenuItem value="review">Review</SelectMenuItem>
                  <SelectMenuItem value="completed">Completed</SelectMenuItem>
                  <SelectMenuItem value="on-hold">On Hold</SelectMenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Update Comment (Optional)"
                multiline
                rows={3}
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Add details about what you've done or any blockers..."
                helperText="This will be added as a comment to the task"
                fullWidth
              />
              
              {statusToUpdate === 'completed' && (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Marking as complete will set progress to 100% and notify your manager.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, width: '100%' }}>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleUpdateStatus(selectedTask?._id, statusToUpdate, updateText);
              if (updateText) {
                handleDailyUpdate(selectedTask?._id, updateText, statusToUpdate);
              }
            }}
            disabled={!statusToUpdate}
          >
            Update & Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog 
        open={commentDialogOpen} 
        onClose={() => setCommentDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AddCommentIcon color="info" />
            <Typography variant="h6">Add Task Comment</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={3} sx={{ pt: 2, width: '100%' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Task Details
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedTask.taskName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current Status: <Chip 
                    label={selectedTask.status} 
                    size="small" 
                    color={getStatusColor(selectedTask.status)} 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>
              
              <TextField
                label="Your Comment"
                multiline
                rows={4}
                required
                fullWidth
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your update, questions, or feedback here..."
                helperText="Your comment will be visible to your manager and team members"
              />
              
              <Alert severity="info" sx={{ width: '100%' }}>
                Comments are permanent and will be included in task history.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, width: '100%' }}>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="info"
            disabled={!commentText.trim()}
            onClick={() => handleAddComment(selectedTask?._id, commentText)}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeDashboard;