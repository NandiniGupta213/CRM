// src/pages/EmployeeUpdatesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Avatar,
  Divider,
  Badge,
  useTheme,
  alpha,
  FormHelperText,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Task as TaskIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Block as BlockIcon,
  HourglassEmpty as HourglassIcon,
  Comment as CommentIcon,
  Update as UpdateIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  Flag as FlagIcon,
  Description as DescriptionIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Note as NoteIcon,
  KeyboardArrowRight as ArrowRightIcon,
  AccessTime as TimeIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  DoneAll as DoneAllIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Edit as EditIcon
} from '@mui/icons-material';

const API_BASE_URL = 'https://crm-rx6f.onrender.com';

const EmployeeUpdatesPage = () => {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newComment, setNewComment] = useState('');
  const [stats, setStats] = useState({
    todo: 0,
    'in-progress': 0,
    completed: 0,
    blocked: 0
  });

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, searchTerm]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user || user.role !== 3) {
        setError('Access denied. Only employees can view this page.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dailyupdate/employee`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const tasksData = data.data || [];
        setTasks(tasksData);
        
        // Calculate stats
        const newStats = {
          todo: 0,
          'in-progress': 0,
          completed: 0,
          blocked: 0
        };
        
        tasksData.forEach(task => {
          if (newStats.hasOwnProperty(task.currentStatus)) {
            newStats[task.currentStatus]++;
          }
        });
        
        setStats(newStats);
      } else {
        setError(data.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      setError('Please select a status');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/dailyupdate/${selectedTask._id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          comment: newComment
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Status updated successfully');
        fetchTasks();
        setStatusDialogOpen(false);
        setNewStatus('');
        setNewComment('');
        if (taskDetailsOpen) {
          setTaskDetailsOpen(false);
          setTimeout(() => {
            setSelectedTask(data.data);
            setTaskDetailsOpen(true);
          }, 100);
        }
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    }
  };

  const handleAddComment = async (taskId, comment) => {
    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/dailyupdate/${taskId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: comment })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Comment added successfully');
        fetchTasks();
        setCommentDialogOpen(false);
        setNewComment('');
        if (taskDetailsOpen) {
          setTaskDetailsOpen(false);
          setTimeout(() => {
            setSelectedTask(data.data);
            setTaskDetailsOpen(true);
          }, 100);
        }
      } else {
        setError(data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    }
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'todo': 'warning',
      'in-progress': 'info',
      'completed': 'success',
      'blocked': 'error'
    };
    return colorMap[status] || 'warning';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'todo': <HourglassIcon />,
      'in-progress': <PendingIcon />,
      'completed': <CheckCircleIcon />,
      'blocked': <BlockIcon />
    };
    return iconMap[status] || <HourglassIcon />;
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'blocked': 'Blocked'
    };
    return labelMap[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysLeft = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.currentStatus !== statusFilter) {
      return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.taskName.toLowerCase().includes(searchLower) ||
        (task.projectName && task.projectName.toLowerCase().includes(searchLower)) ||
        (task.lastUpdate && task.lastUpdate.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  const openTaskDetails = async (task) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              My Tasks
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Update your daily progress and track deadlines
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {['todo', 'in-progress', 'completed', 'blocked'].map((status) => (
            <Grid item xs={6} sm={3} key={status}>
              <Card sx={{ 
                height: '100%',
                borderRadius: 2,
                borderLeft: 4,
                borderColor: `${getStatusColor(status)}.main`,
                boxShadow: `0 2px 12px ${alpha(theme.palette[getStatusColor(status)].main, 0.1)}`
              }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ 
                      bgcolor: alpha(theme.palette[getStatusColor(status)].main, 0.1),
                      color: theme.palette[getStatusColor(status)].main
                    }}>
                      {getStatusIcon(status)}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {stats[status] || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getStatusLabel(status)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, boxShadow: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search tasks by name, project, or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 1 }
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
                  sx={{ borderRadius: 1 }}
                >
                  <MenuItem value="all">All Tasks</MenuItem>
                  <MenuItem value="todo">To Do</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </Grid>

          </Grid>
        </Paper>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError('')}
          action={
            <IconButton size="small" onClick={() => setError('')}>
              <CloseIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Tasks List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={60} />
            <Typography color="text.secondary">Loading your tasks...</Typography>
          </Stack>
        </Box>
      ) : filteredTasks.length === 0 ? (
        <Card sx={{ 
          p: 6, 
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.02)
        }}>
          <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || statusFilter !== 'all' 
              ? 'Try changing your search or filter criteria'
              : 'All your tasks are up to date! Check back later for new assignments.'}
          </Typography>
        </Card>
      ) : (
        <Box>
        {/* Header */}
        <Typography variant="h6" sx={{ 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            color: 'text.primary'
        }}>
            <Badge badgeContent={filteredTasks.length} color="primary">
            <TaskIcon sx={{ color: 'primary.main' }} />
            </Badge>
            <span>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
            </span>
        </Typography>
        
        {/* Tasks List - Vertically Stacked */}
        <Stack spacing={2}>
            {filteredTasks.map((task) => {
            const daysLeft = getDaysLeft(task.deadline);
            const isOverdue = daysLeft < 0;
            const statusColor = getStatusColor(task.currentStatus);
            
            return (
                <Card key={task._id} sx={{ 
                borderRadius: 2,
                borderLeft: 4,
                borderColor: theme.palette[statusColor].main,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
                '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }
                }}>
                <CardContent sx={{ p: 3 }}>
                    {/* Task Title and Status - VERTICAL */}
                    <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
                        {task.taskName}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                        icon={getStatusIcon(task.currentStatus)}
                        label={getStatusLabel(task.currentStatus)}
                        color={statusColor}
                        size="small"
                        sx={{ fontWeight: 500 }}
                        />
                        <Chip
                        label={task.projectName || 'No Project'}
                        size="small"
                        variant="outlined"
                        icon={<DescriptionIcon />}
                        />
                    </Stack>
                    </Box>
                    
                    {/* Deadline Info - VERTICAL with Icon */}
                    <Box sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <CalendarIcon sx={{ 
                        fontSize: '1.1rem', 
                        color: 'text.secondary',
                        flexShrink: 0
                        }} />
                        <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Deadline
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {formatDate(task.deadline)}
                        </Typography>
                        </Box>
                    </Stack>
                    </Box>
                    
                    {/* Time Left Info - VERTICAL with Icon */}
                    <Box sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <ScheduleIcon sx={{ 
                        fontSize: '1.1rem', 
                        color: isOverdue ? 'error.main' : 'text.secondary',
                        flexShrink: 0
                        }} />
                        <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Time Status
                        </Typography>
                        <Typography 
                            variant="body1" 
                            fontWeight={600}
                            color={isOverdue ? 'error.main' : 'text.primary'}
                        >
                            {isOverdue 
                            ? `${Math.abs(daysLeft)} days overdue`
                            : daysLeft !== null ? `${daysLeft} days left` : 'No deadline'}
                        </Typography>
                        </Box>
                    </Stack>
                    </Box>
                    
                    
                    {/* Action Buttons - VERTICALLY Stacked */}
                    <Stack direction="row" spacing={2} justifyContent="flex-start" sx={{ mt: 2 }}>
                  <Button
  variant="outlined"
  startIcon={
    <Badge 
      badgeContent={
        task.comments 
          ? task.comments.filter(c => c.authorRole === 'project_manager' || c.authorId?.role === 'project_manager').length 
          : 0
      }
      color="primary"
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.6rem',
          height: 16,
          minWidth: 16,
          top: -4,
          right: -4
        }
      }}
    >
      <CommentIcon />
    </Badge>
  }
  onClick={() => openTaskDetails(task)}
  size="small"
  sx={{ 
    borderRadius: 1,
    px: 2,
    position: 'relative'
  }}
>
  View Messages
</Button>
                    <Button
                        variant="contained"
                        startIcon={<UpdateIcon />}
                        onClick={() => {
                        setSelectedTask(task);
                        setStatusDialogOpen(true);
                        }}
                        size="small"
                        sx={{ 
                        borderRadius: 1,
                        px: 2
                        }}
                    >
                        Update Status
                    </Button>
                    </Stack>
                </CardContent>
                </Card>
            );
            })}
        </Stack>
        </Box>
      )}

    {/* Update Status Dialog - PERFECTED VERSION WITH DROPDOWN */}
    <Dialog 
    open={statusDialogOpen} 
    onClose={() => setStatusDialogOpen(false)}
    maxWidth="sm"
    fullWidth
    PaperProps={{ 
        sx: { 
        borderRadius: 3,
        backgroundColor: '#110947',
        color: '#ffffff'
        }
    }}
    >
    <DialogTitle sx={{ 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: 2,
        px: 3
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
            Update Task Status
        </Typography>
        <IconButton 
            onClick={() => setStatusDialogOpen(false)} 
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
        </Box>
        <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 0.5 }}>
        Select new status and add comments
        </Typography>
    </DialogTitle>
    
    <DialogContent sx={{ pt: 3, pb: 2 }}>
        {/* Selected Task Info */}
        {selectedTask && (
        <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)" gutterBottom sx={{ fontSize: '0.75rem' }}>
            Task Information
            </Typography>
            <Box sx={{ 
            p: 2, 
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: theme.palette[getStatusColor(selectedTask.currentStatus)].main
            }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
                {selectedTask.taskName}
            </Typography>
            
            <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" color="rgba(255,255,255,0.9)">
                    {selectedTask.projectName || 'No Project'}
                </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" color="rgba(255,255,255,0.9)">
                    Deadline: {formatDate(selectedTask.deadline)}
                </Typography>
                </Box>
            </Stack>
            </Box>
        </Box>
        )}
        
        {/* Status Selection - DROPDOWN */}
        <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom color="rgba(255,255,255,0.9)">
            Select New Status *
        </Typography>
        
        <FormControl fullWidth>
            <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            displayEmpty
            sx={{ 
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1,
                color: '#ffffff',
                '& .MuiSelect-icon': {
                color: 'rgba(255,255,255,0.7)'
                },
                '&.Mui-focused': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                },
                '&:hover': {
                borderColor: 'rgba(255,255,255,0.3)'
                }
            }}
            MenuProps={{
                PaperProps: {
                sx: {
                    backgroundColor: '#110947',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    mt: 0.5
                }
                }
            }}
            >
            <MenuItem value="" disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.5)' }}>
                <HourglassIcon sx={{ fontSize: '0.9rem' }} />
                <Typography variant="body2">Select status</Typography>
                </Box>
            </MenuItem>
            
            <MenuItem value="todo">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 152, 0, 0.15)',
                    color: theme.palette.warning.main
                }}>
                    <HourglassIcon sx={{ fontSize: '0.9rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>To Do</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ display: 'block' }}>
                    Task has not been started
                    </Typography>
                </Box>
                </Box>
            </MenuItem>
            
            <MenuItem value="in-progress">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    color: theme.palette.info.main
                }}>
                    <PendingIcon sx={{ fontSize: '0.9rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>In Progress</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ display: 'block' }}>
                    Currently working on this task
                    </Typography>
                </Box>
                </Box>
            </MenuItem>
            
            <MenuItem value="completed">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    color: theme.palette.success.main
                }}>
                    <CheckCircleIcon sx={{ fontSize: '0.9rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>Completed</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ display: 'block' }}>
                    Task is finished
                    </Typography>
                </Box>
                </Box>
            </MenuItem>
            
            <MenuItem value="blocked">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(244, 67, 54, 0.15)',
                    color: theme.palette.error.main
                }}>
                    <BlockIcon sx={{ fontSize: '0.9rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>Blocked</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ display: 'block' }}>
                    Task is blocked by dependencies
                    </Typography>
                </Box>
                </Box>
            </MenuItem>
            </Select>
        </FormControl>
        
        {!newStatus && statusDialogOpen && (
            <FormHelperText sx={{ color: theme.palette.error.main, mt: 1, fontSize: '0.75rem' }}>
            Please select a status
            </FormHelperText>
        )}
        </Box>
        
        {/* Comment Section */}
        <Box>
        <Typography variant="body2" fontWeight={600} gutterBottom color="rgba(255,255,255,0.9)">
            Comment (Optional)
        </Typography>
        <TextField
            fullWidth
            multiline
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add any comments about the status change..."
            sx={{ 
            '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: '0.85rem',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.3)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main
                }
            },
            '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem'
            }
            }}
        />
        <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
            This comment will be visible to your Project Manager
        </Typography>
        </Box>
    </DialogContent>
    
    <DialogActions sx={{ 
        p: 2, 
        borderTop: '1px solid rgba(255,255,255,0.1)'
    }}>
        <Button 
        onClick={() => {
            setStatusDialogOpen(false);
            setNewStatus('');
            setNewComment('');
        }}
        sx={{ 
            color: 'rgba(255,255,255,0.7)',
            px: 2,
            '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.1)'
            }
        }}
        >
        Cancel
        </Button>
        <Button 
        variant="contained" 
        onClick={handleUpdateStatus}
        disabled={!newStatus}
        sx={{ 
            backgroundColor: theme.palette.primary.main,
            px: 3,
            '&:hover': {
            backgroundColor: theme.palette.primary.dark
            },
            '&.Mui-disabled': {
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.3)'
            }
        }}
        >
        Update Status
        </Button>
    </DialogActions>
    </Dialog>

    {/* Messages Modal - Clean message view */}
    <Dialog 
    open={taskDetailsOpen} 
    onClose={() => setTaskDetailsOpen(false)}
    maxWidth="sm"
    fullWidth
    PaperProps={{ 
        sx: { 
        borderRadius: 2,
        backgroundColor: '#110947',
        color: '#ffffff',
        maxHeight: '80vh'
        }
    }}
    >
    {selectedTask && (
        <>
        {/* Header with Close button only */}
        <DialogTitle sx={{ 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            py: 2,
            px: 2.5
        }}>
            <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
            }}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1rem' }}>
                Messages
            </Typography>
            <IconButton 
                onClick={() => setTaskDetailsOpen(false)} 
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
            </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
            {/* Messages List - Vertical Stack */}
            <Box sx={{ p: 2.5 }}>
            {/* Messages shown one by one vertically */}
            {selectedTask.comments && selectedTask.comments.length > 0 ? (
                <Box>
                {/* Show only PM messages */}
                {selectedTask.comments
                    .filter(comment => comment.authorRole === 'project_manager' || comment.authorId?.role === 'project_manager')
                    .map((comment, index) => (
                    <Box key={index} sx={{ mb: 2.5 }}>
                        {/* Message - Stacked vertically */}
                        <Box sx={{ 
                        p: 2,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                        {/* Sender */}
                        <Typography variant="body2" fontWeight={500} sx={{ 
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.8)',
                            mb: 0.5
                        }}>
                            Project Manager
                        </Typography>
                        
                        {/* Time */}
                        <Typography variant="caption" color="rgba(255,255,255,0.6)" sx={{ 
                            fontSize: '0.75rem',
                            display: 'block',
                            mb: 1.5
                        }}>
                            {formatDateTime(comment.createdAt)}
                        </Typography>
                        
                        {/* Message Content */}
                        <Typography variant="body2" sx={{ 
                            fontSize: '0.9rem', 
                            lineHeight: 1.6,
                            color: 'rgba(255,255,255,0.9)'
                        }}>
                            {comment.content}
                        </Typography>
                        </Box>
                    </Box>
                    ))}
                
                {/* If no PM messages found */}
                {selectedTask.comments.filter(comment => comment.authorRole === 'project_manager' || comment.authorId?.role === 'project_manager').length === 0 && (
                    <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    color: 'rgba(255,255,255,0.7)'
                    }}>
                    <CommentIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.6 }} />
                    <Typography variant="body1" gutterBottom sx={{ fontSize: '0.95rem' }}>
                        No messages from Project Manager
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', opacity: 0.8 }}>
                        Check back later for updates
                    </Typography>
                    </Box>
                )}
                </Box>
            ) : (
                <Box sx={{ 
                textAlign: 'center', 
                py: 4,
                color: 'rgba(255,255,255,0.7)'
                }}>
                <CommentIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.6 }} />
                <Typography variant="body1" gutterBottom sx={{ fontSize: '0.95rem' }}>
                    No messages yet
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    No communication history for this task
                </Typography>
                </Box>
            )}
            </Box>
        </DialogContent>
        </>
    )}
    </Dialog>


      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSuccess('')} 
          severity="success"
          sx={{ borderRadius: 2, boxShadow: 3 }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmployeeUpdatesPage;