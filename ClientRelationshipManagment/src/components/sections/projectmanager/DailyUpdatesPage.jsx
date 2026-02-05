// src/pages/DailyUpdatesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Block as BlockIcon,
  HourglassEmpty as HourglassIcon,
  Comment as CommentIcon,
  Send as SendIcon
} from '@mui/icons-material';

const API_BASE_URL = 'https://crm-rx6f.onrender.com';

const DailyUpdatesPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      let endpoint = '';
      if (userData.role === 3) {
        endpoint = `${API_BASE_URL}/dailyupdate/employee`;
      } else if (userData.role === 2) {
        endpoint = `${API_BASE_URL}/dailyupdate/project-manager`;
      } else {
        setError('Access denied');
        return;
      }
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to load tasks');
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
      
      if (data.success) {
        setSuccess('Status updated successfully');
        fetchTasks();
        setStatusDialogOpen(false);
        setNewStatus('');
        setNewComment('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to update status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/dailyupdate/${selectedTask._id}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Comment added successfully');
        fetchTasks();
        setCommentDialogOpen(false);
        setNewComment('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to add comment');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircleIcon />;
      case 'in-progress': return <PendingIcon />;
      case 'blocked': return <BlockIcon />;
      default: return <HourglassIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'blocked': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  const isEmployee = user?.role === 3;
  const isPM = user?.role === 2;

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {isEmployee ? 'My Tasks' : 'Team Updates'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isEmployee 
            ? 'Update your task status and add comments'
            : 'Monitor team progress and add comments'}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No tasks found
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {tasks.map((task) => (
            <Card key={task._id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {task.taskName}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip
                        icon={getStatusIcon(task.currentStatus)}
                        label={task.currentStatus}
                        color={getStatusColor(task.currentStatus)}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Project: {task.projectName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Deadline: {formatDate(task.deadline)}
                      </Typography>
                    </Stack>
                    
                    {isPM && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Assigned to: {task.employeeName}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Last update: {task.lastUpdate} • {new Date(task.lastUpdateTime).toLocaleString()}
                    </Typography>
                    
                    {task.comments && task.comments.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Comments:
                        </Typography>
                        <List dense>
                          {task.comments.slice(-3).map((comment, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={comment.content}
                                secondary={`${comment.authorName} • ${new Date(comment.createdAt).toLocaleString()}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                  
                  <Stack spacing={1}>
                    {isEmployee && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedTask(task);
                            setStatusDialogOpen(true);
                          }}
                        >
                          Update Status
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CommentIcon />}
                          onClick={() => {
                            setSelectedTask(task);
                            setCommentDialogOpen(true);
                          }}
                        >
                          Add Comment
                        </Button>
                      </>
                    )}
                    {isPM && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CommentIcon />}
                        onClick={() => {
                          setSelectedTask(task);
                          setCommentDialogOpen(true);
                        }}
                      >
                        Add Comment
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Task Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2, minWidth: 300 }}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                label="New Status"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Comment (Optional)"
              multiline
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add any comments about the status change..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your comment here..."
            sx={{ mt: 2, minWidth: 300 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddComment} startIcon={<SendIcon />}>
            Post Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DailyUpdatesPage;