import { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  Pagination,
  Alert,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Tabs,
  Tab,
  Badge,
  MenuItem,
  Snackbar,
  LinearProgress,
  CardHeader
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import AddProjectTeamForm from './ProjectTeamForm'; // Import the form component

const ProjectTeamManagement = () => {
  const [projectTeams, setProjectTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [projectManagers, setProjectManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [stats, setStats] = useState({
    totalTeams: 0,
    activeTeams: 0,
    completedTeams: 0,
    onHoldTeams: 0,
    teamSizeStats: { totalMembers: 0, avgTeamSize: 0, maxTeamSize: 0, minTeamSize: 0 },
    departmentStats: [],
    roleStats: []
  });

  const itemsPerPage = 10;
  const API_BASE_URL = 'https://crm-rx6f.onrender.com';

  // Show snackbar message
  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/projects?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch projects`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const projectsArray = Array.isArray(data.data) 
          ? data.data 
          : Array.isArray(data.data?.projects) 
            ? data.data.projects 
            : Array.isArray(data.data?.data)
              ? data.data.data
              : [];
        
        setProjects(projectsArray);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      showMessage('Failed to load projects', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Fetch project teams
  const fetchProjectTeams = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showMessage('Please login first', 'error');
        setLoading(false);
        return;
      }
      
      const queryParams = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        projectId: projectFilter !== 'all' ? projectFilter : '',
        sort: '-createdAt'
      }).toString();

      const response = await fetch(`${API_BASE_URL}/project-teams?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/authentication/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch project teams`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProjectTeams(Array.isArray(data.data.projectTeams) ? data.data.projectTeams : []);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        showMessage(data.message || 'Failed to load project teams', 'error');
      }
    } catch (error) {
      console.error('Error fetching project teams:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, projectFilter]);

  // Fetch project managers
  const fetchProjectManagers = useCallback(async () => {
    setLoadingManagers(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/project-teams/managers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch project managers');
      
      const data = await response.json();
      if (data.success) {
        setProjectManagers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching project managers:', error);
      showMessage('Failed to load project managers', 'error');
    } finally {
      setLoadingManagers(false);
    }
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/project-teams/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch employees');
      
      const data = await response.json();
      if (data.success) {
        setEmployees(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      showMessage('Failed to load employees', 'error');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/project-teams/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Save project team
  const handleSaveProjectTeam = async (teamData) => {
    try {
      const token = localStorage.getItem('accessToken');
      const method = selectedTeam ? 'PUT' : 'POST';
      const url = selectedTeam 
        ? `${API_BASE_URL}/project-teams/${selectedTeam._id}`
        : `${API_BASE_URL}/project-teams`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        showMessage(selectedTeam ? 'Project team updated successfully!' : 'Project team created successfully!', 'success');
        fetchProjectTeams();
        fetchStats();
        setOpenDialog(false);
        setSelectedTeam(null);
        return { success: true, data };
      } else {
        throw new Error(data.message || 'Failed to save project team');
      }
    } catch (error) {
      console.error('Error saving project team:', error);
      showMessage(`Error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  };

  // Delete project team
  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project team?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/project-teams/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('Project team deleted successfully!', 'success');
        fetchProjectTeams();
        fetchStats();
      } else {
        throw new Error(data.message || 'Failed to delete project team');
      }
    } catch (error) {
      console.error('Error deleting project team:', error);
      showMessage('Failed to delete project team', 'error');
    }
  };

  // Update team status
  const handleUpdateStatus = async (id, currentStatus) => {
    const statusMap = {
      'active': 'on-hold',
      'on-hold': 'completed',
      'completed': 'active'
    };
    const newStatus = statusMap[currentStatus] || 'active';
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/project-teams/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage(`Status updated to ${newStatus}!`, 'success');
        fetchProjectTeams();
        fetchStats();
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showMessage('Failed to update status', 'error');
    }
  };

  // Handle edit click
  const handleEditClick = (team) => {
    setSelectedTeam(team);
    setOpenDialog(true);
  };

  // Handle form success
  const handleFormSuccess = (result) => {
    if (result && result.success) {
      fetchProjectTeams();
      fetchStats();
    }
  };

  // Initial load
  useEffect(() => {
    fetchProjects();
    fetchProjectManagers();
    fetchEmployees();
    fetchStats();
  }, [fetchProjects, fetchProjectManagers, fetchEmployees, fetchStats]);

  // Fetch project teams when filters change
  useEffect(() => {
    fetchProjectTeams();
  }, [fetchProjectTeams]);

  // Helper functions
  const getStatusInfo = (status) => {
    const statusMap = {
      'active': { label: 'Active', color: 'success', icon: 'mingcute:check-circle-line' },
      'completed': { label: 'Completed', color: 'primary', icon: 'mingcute:flag-fill' },
      'on-hold': { label: 'On Hold', color: 'warning', icon: 'mingcute:pause-circle-line' },
    };
    return statusMap[status] || { label: 'Unknown', color: 'default', icon: 'mingcute:help-line' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  };

  const getRandomColor = () => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#00838f'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <Box sx={{ width: '100%', p: 3, position: 'relative' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Project Team Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage project teams, assign project managers and team members
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<IconifyIcon icon="mingcute:add-fill" />}
          onClick={() => {
            setSelectedTeam(null);
            setOpenDialog(true);
          }}
          sx={{ 
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Create Team
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4} >
          <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                  <IconifyIcon icon="mingcute:team-fill" color="primary.main" />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Teams
                </Typography>
              </Box>
              {statsLoading ? (
                <LinearProgress sx={{ my: 1 }} />
              ) : (
                <Typography variant="h3" color="primary" fontWeight={800}>
                  {stats.totalTeams}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', mr: 2 }}>
                  <IconifyIcon icon="mingcute:activity-fill" color="success.main" />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Teams
                </Typography>
              </Box>
              {statsLoading ? (
                <LinearProgress sx={{ my: 1 }} />
              ) : (
                <Typography variant="h3" color="success.main" fontWeight={800}>
                  {stats.activeTeams}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', mr: 2 }}>
                  <IconifyIcon icon="mingcute:project-fill" color="warning.main" />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Projects
                </Typography>
              </Box>
              <Typography variant="h3" color="warning.main" fontWeight={800}>
                {projects.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
      </Grid>

      {/* Tabs and Search */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconifyIcon icon="mingcute:team-fill" />
                  All Teams
                  <Badge 
                    badgeContent={stats.totalTeams} 
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconifyIcon icon="mingcute:activity-fill" />
                  Active Teams
                  <Badge 
                    badgeContent={stats.activeTeams} 
                    color="success"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
            />
          </Tabs>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search teams, managers, members..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconifyIcon icon="mingcute:search-line" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setPage(1);
                  }}
                  label="Project"
                >
                  <MenuItem value="all">All Projects</MenuItem>
                  {loadingProjects ? (
                    <MenuItem disabled>Loading projects...</MenuItem>
                  ) : projects.length === 0 ? (
                    <MenuItem disabled>No projects found</MenuItem>
                  ) : (
                    projects.map((project) => (
                      <MenuItem key={project._id} value={project._id}>
                        {project.title || project.projectId || `Project ${project._id.substring(0, 8)}`}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Project Teams Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <CardHeader
          title="Project Teams"
          subheader={`Total ${projectTeams.length} teams found`}
          action={
            loading && <CircularProgress size={24} sx={{ mr: 2 }} />
          }
        />
        
        <TableContainer>
          {loading && projectTeams.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Project Manager</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Team Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectTeams.map((team) => {
                  const statusInfo = getStatusInfo(team.status);
                  
                  return (
                    <TableRow 
                      key={team._id}
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: getRandomColor(),
                              width: 40,
                              height: 40,
                              fontSize: '0.875rem',
                              fontWeight: 600
                            }}
                          >
                            {getInitials(team.projectName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {team.projectName || 'Unnamed Project'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team.projectId?.projectId || 'No ID'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                            {getInitials(team.projectManagerName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {team.projectManagerName}
                            </Typography>
                            
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<IconifyIcon icon="mingcute:user-fill" />}
                          label={`${team.totalTeamSize || 1} members`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(team.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          color={statusInfo.color}
                          size="small"
                          icon={<IconifyIcon icon={statusInfo.icon} />}
                          onClick={() => handleUpdateStatus(team._id, team.status)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit Team" arrow>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleEditClick(team)}
                            >
                              <IconifyIcon icon="mingcute:edit-line" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Team" arrow>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTeam(team._id)}
                            >
                              <IconifyIcon icon="mingcute:delete-line" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {projectTeams.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <IconifyIcon 
                        icon="mingcute:team-line" 
                        sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} 
                      />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No project teams found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {searchTerm 
                          ? 'Try adjusting your search or filters'
                          : 'Create your first project team to get started'
                        }
                      </Typography>
                      {!searchTerm && (
                        <Button
                          variant="contained"
                          startIcon={<IconifyIcon icon="mingcute:add-line" />}
                          onClick={() => setOpenDialog(true)}
                          sx={{ borderRadius: 2 }}
                        >
                          Create Project Team
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: 1, borderColor: 'divider' }}>
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
      </Card>

      {/* Create/Edit Team Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedTeam(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 2,
            maxWidth: '500px',
            width: '100%'
          } 
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <AddProjectTeamForm
            onSubmit={handleSaveProjectTeam}
            loading={false}
            team={selectedTeam}
            isEdit={!!selectedTeam}
            onSuccess={handleFormSuccess}
            projects={projects}
            projectManagers={projectManagers}
            employees={employees}
            loadingProjects={loadingProjects}
            loadingManagers={loadingManagers}
            loadingEmployees={loadingEmployees}
          />
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectTeamManagement;