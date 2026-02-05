import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Chip from '@mui/material/Chip';
import { green, orange, blue, red } from '@mui/material/colors';

const MyTasks = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Implement user authentication',
      project: 'Mobile Banking App',
      priority: 'High',
      dueDate: '2024-01-15',
      completed: false,
      estimatedHours: 8,
    },
    {
      id: 2,
      title: 'Fix responsive design issues',
      project: 'E-commerce Platform',
      priority: 'Medium',
      dueDate: '2024-01-16',
      completed: true,
      estimatedHours: 4,
    },
    {
      id: 3,
      title: 'Write unit tests for payment module',
      project: 'CRM System',
      priority: 'High',
      dueDate: '2024-01-17',
      completed: false,
      estimatedHours: 6,
    },
    {
      id: 4,
      title: 'Update API documentation',
      project: 'Data Analytics',
      priority: 'Low',
      dueDate: '2024-01-18',
      completed: false,
      estimatedHours: 3,
    },
  ]);

  const handleToggle = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return red[500];
      case 'medium':
        return orange[500];
      default:
        return green[500];
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">My Tasks</Typography>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>
        <List>
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              sx={{
                borderBottom: '1px solid #eee',
                '&:last-child': { borderBottom: 'none' },
                py: 1.5,
                bgcolor: task.completed ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={task.completed}
                  onChange={() => handleToggle(task.id)}
                  color="primary"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? 'text.disabled' : 'text.primary',
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{
                        bgcolor: getPriorityColor(task.priority),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box display="flex" justifyContent="space-between" mt={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      {task.project} • Due: {task.dueDate}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {task.estimatedHours}h
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small">
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary">
            Completed: {tasks.filter(t => t.completed).length}/{tasks.length}
          </Typography>
          <Chip
            label={`${Math.round(
              (tasks.filter(t => t.completed).length / tasks.length) * 100
            )}%`}
            color="primary"
            size="small"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default MyTasks;