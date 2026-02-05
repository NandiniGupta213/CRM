// src/components/EmployeeTaskUpdate.jsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Menu,
  MenuItem,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Block as BlockIcon,
  HourglassEmpty as HourglassIcon,
  MoreVert as MoreIcon,
  Comment as CommentIcon,
  Update as UpdateIcon
} from '@mui/icons-material';

const EmployeeTaskUpdate = ({ task, onUpdate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'to_do', label: 'To Do', icon: <HourglassIcon fontSize="small" />, color: 'default' },
    { value: 'in_progress', label: 'In Progress', icon: <PendingIcon fontSize="small" />, color: 'primary' },
    { value: 'completed', label: 'Completed', icon: <CheckCircleIcon fontSize="small" />, color: 'success' },
    { value: 'blocked', label: 'Blocked', icon: <BlockIcon fontSize="small" />, color: 'error' }
  ];

  const getStatusInfo = (status) => {
    return statusOptions.find(opt => opt.value === status) || statusOptions[0];
  };

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      // Call API to update status
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8000/dailyupdate/${task._id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          comment: comment
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        onUpdate(); // Refresh parent component
        setComment('');
        setCommentDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
      setAnchorEl(null);
    }
  };

  const currentStatus = getStatusInfo(task.currentStatus);

  return (
    <>
      <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                {task.taskName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {task.projectName}
              </Typography>
              
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 1.5 }}>
                <Chip
                  icon={currentStatus.icon}
                  label={currentStatus.label}
                  size="small"
                  color={currentStatus.color}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  Due: {new Date(task.deadline).toLocaleDateString()}
                </Typography>
              </Stack>

              {task.estimatedHours > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.actualHours || 0}h / {task.estimatedHours}h
                    </Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(((task.actualHours || 0) / task.estimatedHours) * 100, 100)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
            </Box>

            <Box>
              <Tooltip title="Quick Actions">
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  disabled={loading}
                >
                  <MoreIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Update Status
        </Typography>
        {statusOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            disabled={task.currentStatus === option.value || loading}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              {option.icon}
              <Typography>{option.label}</Typography>
            </Stack>
          </MenuItem>
        ))}
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setCommentDialogOpen(true);
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CommentIcon fontSize="small" />
            <Typography>Add Comment</Typography>
          </Stack>
        </MenuItem>
      </Menu>

      <Dialog 
        open={commentDialogOpen} 
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your comment"
            fullWidth
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your comment here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleStatusChange(task.currentStatus)}
            disabled={!comment.trim() || loading}
          >
            {loading ? 'Updating...' : 'Add Comment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmployeeTaskUpdate;