import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
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
  IconButton,
  Alert,
  Tooltip,
  Avatar,
  AvatarGroup,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  FormControl,
  Select,
  LinearProgress,
  MenuItem,
  InputLabel,
  TextField,
  InputAdornment,
  Pagination
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import TaskCreateModal from './TaskCreateModal';

// Dynamic configuration for statuses, priorities, and task types
const STATUS_CONFIG = {
  'todo': { label: 'To Do', color: 'default', icon: 'mingcute:time-line' },
  'in-progress': { label: 'In Progress', color: 'primary', icon: 'mingcute:progress-line' },
  'review': { label: 'Review', color: 'warning', icon: 'mingcute:eye-line' },
  'completed': { label: 'Completed', color: 'success', icon: 'mingcute:check-circle-line' },
  'on-hold': { label: 'On Hold', color: 'info', icon: 'mingcute:pause-circle-line' },
  'cancelled': { label: 'Cancelled', color: 'error', icon: 'mingcute:close-circle-line' },
};

const PRIORITY_CONFIG = {
  'critical': { label: 'Critical', color: 'error', icon: 'mingcute:alert-line' },
  'high': { label: 'High', color: 'warning', icon: 'mingcute:flag-2-line' },
  'medium': { label: 'Medium', color: 'info', icon: 'mingcute:flag-line' },
  'low': { label: 'Low', color: 'success', icon: 'mingcute:flag-1-line' },
};

const TASK_TYPE_CONFIG = {
  'development': { label: 'Development', icon: 'mingcute:code-line', color: '#1976d2' },
  'design': { label: 'Design', icon: 'mingcute:palette-line', color: '#2e7d32' },
  'testing': { label: 'Testing', icon: 'mingcute:bug-line', color: '#ed6c02' },
  'documentation': { label: 'Documentation', icon: 'mingcute:file-document-line', color: '#7b1fa2' },
  'meeting': { label: 'Meeting', icon: 'mingcute:calendar-line', color: '#00838f' },
  'research': { label: 'Research', icon: 'mingcute:search-line', color: '#5d4037' },
  'bug-fix': { label: 'Bug Fix', icon: 'mingcute:bug-2-line', color: '#d32f2f' },
  'feature': { label: 'Feature', icon: 'mingcute:rocket-line', color: '#388e3c' },
  'other': { label: 'Other', icon: 'mingcute:more-1-line', color: '#757575' },
};

// Dynamic filter options
const DYNAMIC_FILTER_OPTIONS = {
  statuses: [
    { value: 'all', label: 'All Status' },
    ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
      value,
      label: config.label
    }))
  ],
  priorities: [
    { value: 'all', label: 'All Priority' },
    ...Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
      value,
      label: config.label
    }))
  ],
  taskTypes: [
    { value: 'all', label: 'All Types' },
    ...Object.entries(TASK_TYPE_CONFIG).map(([value, config]) => ({
      value,
      label: config.label,
      icon: config.icon
    }))
  ]
};

const TaskManager = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [availableAssignees, setAvailableAssignees] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
    completionRate: 0,
    byPriority: {},
    byStatus: {},
    byType: {}
  });

  const itemsPerPage = 10;
  const API_BASE_URL = 'http://localhost:8000';

  // Memoized helpers
  const getInitials = useCallback((name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, []);

  const getRandomColor = useCallback(() => {
    const colors = [
      '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', 
      '#7b1fa2', '#00838f', '#5d4037'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const calculateDaysLeft = useCallback((deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // API calls
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/pm/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProjects(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAvailableAssignees = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/tm/assignees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableAssignees(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setErrorMessage('Please login to access tasks.');
        setTimeout(() => setErrorMessage(''), 5000);
        setLoading(false);
        return;
      }

      // Build dynamic query params
      const queryParams = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        priority: priorityFilter !== 'all' ? priorityFilter : '',
        projectId: projectFilter !== 'all' ? projectFilter : '',
        taskType: taskTypeFilter !== 'all' ? taskTypeFilter : '',
        sort: '-createdAt'
      }).toString();

      const response = await fetch(`${API_BASE_URL}/tm/tasks?${queryParams}`, {
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
          window.location.href = '/authentication/login';
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data.tasks || []);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setErrorMessage(data.message || 'Failed to load tasks');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setErrorMessage('Failed to load tasks: ' + error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setStatsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tm/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Task operations
  const handleAddTask = async (taskData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/tm/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to add task');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error adding task:', error);
      setErrorMessage(`Failed to add task: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!selectedTask?._id) {
        throw new Error('No task selected for update');
      }

      const response = await fetch(`${API_BASE_URL}/tm/${selectedTask._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to update task');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setErrorMessage(`Failed to update task: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = currentStatus === 'completed' ? 'in-progress' : 'completed';
      
      const response = await fetch(`${API_BASE_URL}/tm/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Task status updated to ${newStatus}!`);
        fetchTasks();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setErrorMessage('Failed to update task status');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/tm/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setSuccessMessage('Task deleted successfully!');
          fetchTasks();
          fetchStats();
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        setErrorMessage('Failed to delete task');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  const handleEditClick = (task) => {
    setSelectedTask(task);
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async (taskData) => {
    const result = await handleUpdateTask(taskData);
    
    if (result.success) {
      setTimeout(() => {
        setOpenEditDialog(false);
        setSelectedTask(null);
        setSuccessMessage('Task updated successfully!');
        fetchTasks();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 2000);
      return result;
    }
    return result;
  };

  // Effects
  useEffect(() => {
    fetchProjects();
    fetchAvailableAssignees();
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [
    page,
    searchTerm,
    statusFilter,
    priorityFilter,
    projectFilter,
    taskTypeFilter
  ]);

  // Render functions
  const renderSummaryCards = () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
      {[
        { label: 'Total Tasks', value: stats.totalTasks, color: 'primary' },
        { label: 'Completed Tasks', value: stats.completedTasks, color: 'success', 
          subtext: `${stats.completionRate}% completion rate` },
        { label: 'In Progress', value: stats.inProgressTasks, color: 'warning' },
        { label: 'Overdue Tasks', value: stats.overdueTasks, color: 'error' },
        { label: 'Active Projects', value: stats.totalProjects, color: 'info' },
      ].map((card, index) => (
        <Card key={index} sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {card.label}
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Typography variant="h4" color={`${card.color}.main`} fontWeight={700}>
                  {card.value}
                </Typography>
                {card.subtext && (
                  <Typography variant="caption" color="text.secondary">
                    {card.subtext}
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const renderFilterBar = () => (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <TextField
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
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
        
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              displayEmpty
            >
              {DYNAMIC_FILTER_OPTIONS.statuses.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              displayEmpty
            >
              {DYNAMIC_FILTER_OPTIONS.priorities.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <Select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              displayEmpty
            >
              <MenuItem value="all">All Projects</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project._id} value={project._id}>
                  {project.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <Select
              value={taskTypeFilter}
              onChange={(e) => {
                setTaskTypeFilter(e.target.value);
                setPage(1);
              }}
              displayEmpty
            >
              {DYNAMIC_FILTER_OPTIONS.taskTypes.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.icon && <IconifyIcon icon={option.icon} sx={{ mr: 1 }} />}
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

      </Grid>
    </Paper>
  );

  const renderTaskRow = (task) => {
    const statusInfo = STATUS_CONFIG[task.status] || { label: 'Unknown', color: 'default' };
    const priorityInfo = PRIORITY_CONFIG[task.priority] || { label: 'Unknown', color: 'default' };
    const daysLeft = calculateDaysLeft(task.deadline);
    const isOverdue = daysLeft < 0;
    const taskTypeInfo = TASK_TYPE_CONFIG[task.taskType] || { label: 'Other', color: '#757575' };

    return (
      <TableRow key={task._id} hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: taskTypeInfo.color,
                width: 40,
                height: 40,
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              {getInitials(task.title)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {task.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {task.taskId}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {task.projectId?.title || 'No Project'}
          </Typography>
        </TableCell>
        <TableCell>
        <Box>
            {task.assignedTo && task.assignedTo.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {task.assignedTo.slice(0, 2).map((assignee, index) => (
                <Typography 
                    key={index} 
                    variant="body2" 
                    sx={{ 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                    }}
                >
                    <Avatar
                    sx={{ 
                        width: 20, 
                        height: 20, 
                        fontSize: '0.6rem', 
                        bgcolor: assignee.avatarColor || getRandomColor() 
                    }}
                    >
                    {getInitials(assignee.name)}
                    </Avatar>
                    {assignee.name}
                    {assignee.role && (
                    <Typography variant="caption" color="text.secondary">
                        ({assignee.role})
                    </Typography>
                    )}
                </Typography>
                ))}
                {task.assignedTo.length > 2 && (
                <Typography variant="caption" color="text.secondary">
                    +{task.assignedTo.length - 2} more
                </Typography>
                )}
            </Box>
            ) : (
            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                Unassigned
            </Typography>
            )}
        </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={priorityInfo.label}
            color={priorityInfo.color}
            size="small"
            icon={<IconifyIcon icon={priorityInfo.icon} />}
            variant="outlined"
          />
        </TableCell>

        <TableCell>
          <Box>
            <Typography variant="body2">
              {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
            </Typography>
            {daysLeft !== null && (
              <Typography 
                variant="caption" 
                color={isOverdue ? 'error' : daysLeft <= 3 ? 'warning' : 'text.secondary'}
              >
                {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            icon={<IconifyIcon icon={statusInfo.icon} />}
            variant="outlined"
            onClick={() => handleUpdateStatus(task._id, task.status)}
            sx={{ cursor: 'pointer' }}
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Edit Task">
              <IconButton
                size="small"
                color="warning"
                onClick={() => handleEditClick(task)}
              >
                <IconifyIcon icon="mingcute:edit-line" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete Task">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteTask(task._id)}
              >
                <IconifyIcon icon="mingcute:delete-line" />
              </IconButton>
            </Tooltip>

          </Stack>
        </TableCell>
      </TableRow>
    );
  };

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
            Task Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all tasks and track progress
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<IconifyIcon icon="mingcute:add-fill" />}
          onClick={() => setOpenDialog(true)}
          sx={{ 
            px: 3,
            py: 1,
            borderRadius: 2
          }}
        >
          Create New Task
        </Button>
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

      {/* Success Alert */}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Search and Filter Bar */}
      {renderFilterBar()}

      {/* Tasks Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map(renderTaskRow)}
              
              {tasks.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <IconifyIcon icon="mingcute:task-line" fontSize={48} sx={{ opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No tasks found matching your search' : 'No tasks found'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="text"
                        startIcon={<IconifyIcon icon="mingcute:add-line" />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ mt: 1 }}
                      >
                        Create your first task
                      </Button>
                    )}
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

      {/* Create Task Dialog */}
      <TaskCreateModal
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={handleAddTask}
        loading={loading}
        projects={projects}
        assignees={availableAssignees}
        statusOptions={DYNAMIC_FILTER_OPTIONS.statuses}
        priorityOptions={DYNAMIC_FILTER_OPTIONS.priorities}
        taskTypeOptions={DYNAMIC_FILTER_OPTIONS.taskTypes}
        onSuccess={() => {
          setOpenDialog(false);
          setSuccessMessage('Task created successfully!');
          fetchTasks();
          fetchStats();
          setTimeout(() => setSuccessMessage(''), 3000);
        }}
      />

      {/* Edit Task Dialog */}
      <TaskCreateModal
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setSelectedTask(null);
        }}
        onSubmit={handleEditSubmit}
        loading={loading}
        projects={projects}
        assignees={availableAssignees}
        statusOptions={DYNAMIC_FILTER_OPTIONS.statuses}
        priorityOptions={DYNAMIC_FILTER_OPTIONS.priorities}
        taskTypeOptions={DYNAMIC_FILTER_OPTIONS.taskTypes}
        task={selectedTask}
        isEdit={true}
        onSuccess={() => {
          setOpenEditDialog(false);
          setSelectedTask(null);
          setSuccessMessage('Task updated successfully!');
          fetchTasks();
          fetchStats();
          setTimeout(() => setSuccessMessage(''), 3000);
        }}
      />
    </Box>
  );
};

export default TaskManager;