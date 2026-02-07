// src/components/admin/projects/ProjectsPage.jsx
import { useState, useEffect } from 'react';
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
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Alert,
  LinearProgress,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import IconifyIcon from '../../base/IconifyIcon';
import CreateProjectForm from './ProjectCreation';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = 'https://crm-rx6f.onrender.com';
  const itemsPerPage = 10;

  // Fetch projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setErrorMessage('Please login to access projects');
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

      const response = await fetch(`${API_BASE_URL}/projects?${queryParams}`, {
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
        setProjects(data.data.projects || []);
        setTotalPages(data.data.pagination?.pages || 1);
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

  // Fetch clients for dropdown
  const fetchClients = async () => {
    setFetchingClients(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/clients/create?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClients(data.data.clients || []);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setFetchingClients(false);
    }
  };

const fetchManagers = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    console.log('Token for managers fetch:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.error('No token found for fetching managers');
      return;
    }

    // Test the endpoint first
    console.log('Fetching from:', `${API_BASE_URL}/user/role/2`);
    
    const response = await fetch(`${API_BASE_URL}/user/role/2`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      
      // Try to get error message from response
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    const data = JSON.parse(responseText);
    console.log('Parsed data:', data);
    
    if (data.success) {
      console.log('Managers found:', data.data);
      setManagers(data.data || []);
    } else {
      console.error('API returned error:', data.message);
    }
  } catch (error) {
    console.error('Error fetching managers:', error);
    
    // Fallback: Try to get all users and filter
    console.log('Trying fallback: fetch all user');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const projectManagers = data.data.filter(user => user.role === 2);
          console.log('Fallback - Managers found:', projectManagers);
          setManagers(projectManagers);
        }
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  }
};

// Fallback function to fetch all users and filter by role
const fetchAllUsersAndFilter = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Filter users with role ID 2
        const projectManagers = data.data.filter(user => user.role === 2);
        setManagers(projectManagers);
      }
    }
  } catch (error) {
    console.error('Error fetching all user:', error);
  }
};

  // Create project
  const handleCreateProject = async (projectData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Transform form data to match backend API
      const apiData = {
        title: projectData.projectTitle,
        client: projectData.clientId,
        manager: projectData.assignedManager,
        description: projectData.description,
        projectType: projectData.projectType,
        startDate: projectData.startDate,
        deadline: projectData.deadline,
        // Optional fields
        estimatedHours: projectData.estimatedHours || 0,
        budget: projectData.budget || 0,
        billingType: 'fixed', // Default
        billingRate: 0,
        isBillable: false, // Default
        priority: 'medium', // Default
        teamMembers: [],
        tags: []
      };

      console.log('Creating project with data:', apiData);

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });

      const responseText = await response.text();
      console.log('Create project response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      
      if (data.success) {
        setSuccessMessage(`Project "${projectData.projectTitle}" created successfully!`);
        setOpenDialog(false);
        fetchProjects(); // Refresh the list
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
        
        return { success: true, data: data.data };
      } else {
        setErrorMessage(data.message || 'Failed to create project');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setErrorMessage(`Failed to create project: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

// Handle project creation success
const handleProjectCreationSuccess = (projectData, invoiceNumber) => {
  // Show success message with invoice number
  setSuccessMessage(`Project created successfully! Invoice Number: ${invoiceNumber}`);
  setTimeout(() => setSuccessMessage(''), 5000);
  
  // Fetch projects again to get the updated list
  fetchProjects();
  
  // Note: We don't add to projects array directly because 
  // fetchProjects() will refresh the list from server
  // The invoice number will be generated fresh when creating invoice
};

const handleGenerateInvoice = (project) => {
  // First, check if we have a client name for the invoice generation
  const getClientNameForInvoice = () => {
    if (typeof project.client === 'object' && project.client !== null) {
      return project.client.companyName || project.client.name || 'CLT';
    }
    // If client is an ID, find in clients array
    if (typeof project.client === 'string') {
      const foundClient = clients.find(c => c._id === project.client);
      return foundClient?.companyName || foundClient?.name || 'CLT';
    }
    return 'CLT';
  };

  // Generate invoice number if not already in project
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const day = new Date().getDate().toString().padStart(2, '0');
    const projectType = project.projectType || 'PROJ';
    const typeCode = projectType.substring(0, 3).toUpperCase();
    const clientName = getClientNameForInvoice();
    const clientCode = clientName.substring(0, 3).toUpperCase();
    const sequential = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `INV-${year}${month}${day}-${typeCode}-${clientCode}-${sequential}`;
  };

  // Create a new project object with invoice number
  const projectWithInvoice = {
    ...project,
    invoiceNumber: project.invoiceNumber || generateInvoiceNumber()
  };
  
  // Navigate to invoice form with project data and invoice number
  navigate('/pages/dashboard/invoice/create', { 
    state: { 
      project: projectWithInvoice,
      invoiceNumber: projectWithInvoice.invoiceNumber // Pass the invoice number
    }
  });
};

  const getClientName = (client) => {
    if (typeof client === 'object' && client !== null) {
      return client.companyName || client.name || 'Unknown Client';
    }
    return 'Unknown Client';
  };

const getManagerName = (manager) => {

  
  // If manager is a string (ID), find in managers array
  if (typeof manager === 'string') {
    
    const foundManager = managers.find(m => m._id === manager);
   
    return foundManager?.name || foundManager?.username || foundManager?.email || 'Unknown Manager';
  }
  
  // If manager is an object with _id
  if (typeof manager === 'object' && manager !== null && manager._id) {
   
    const foundManager = managers.find(m => m._id === manager._id);
  
    // If found in managers array, use that
    if (foundManager) {
      return foundManager.name || foundManager.username || foundManager.email || 'Unknown Manager';
    }
    
    // Otherwise, try to use properties from the manager object
    return manager.name || manager.username || manager.email || 'Unknown Manager';
  }
  
  // If manager is an object but no _id
  if (typeof manager === 'object' && manager !== null) {

    return manager.email || 'Unknown Manager';
  }
  
  return 'Unknown Manager';
};
  const getStatusInfo = (status) => {
    const statusMap = {
      'planned': { label: 'Planned', color: 'default', icon: 'mingcute:calendar-plan-line' },
      'in-progress': { label: 'In Progress', color: 'warning', icon: 'mingcute:progress-line' },
      'completed': { label: 'Completed', color: 'success', icon: 'mingcute:check-circle-line' },
      'on-hold': { label: 'On Hold', color: 'error', icon: 'mingcute:pause-circle-line' },
      'cancelled': { label: 'Cancelled', color: 'error', icon: 'mingcute:close-circle-line' },
    };
    return statusMap[status] || { label: 'Unknown', color: 'default', icon: 'mingcute:help-line' };
  };

  const handleStatusFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = (status) => {
    setStatusFilter(status);
    setAnchorEl(null);
    setPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const calculateDaysLeft = (deadline) => {
    if (!deadline) return null;
    
    try {
      const today = new Date();
      const deadlineDate = new Date(deadline);
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  const getInvoiceTooltip = (project) => {
    if (project.status === 'completed') {
      return 'Generate invoice for completed project';
    }
    
    if (project.status === 'in-progress') {
      return 'Only completed projects can generate invoices';
    }
    
    if (project.status === 'planned') {
      return 'Invoice cannot be generated for planned projects';
    }
    
    return 'Generate invoice';
  };

  // Initial load
  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchManagers();
  }, [page, searchTerm, statusFilter]);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header with Add Button */}
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
            Project Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all projects and create new ones
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
          Create New Project
        </Button>
      </Box>

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

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
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
          
          <Button
            variant="outlined"
            onClick={handleStatusFilterClick}
            startIcon={<IconifyIcon icon="mingcute:filter-line" />}
            endIcon={<IconifyIcon icon="mingcute:down-line" />}
            sx={{ minWidth: 140 }}
          >
            {statusFilter === 'all' ? 'All Status' : getStatusInfo(statusFilter).label}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => handleStatusFilterClose('all')}>
              All Projects
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('planned')}>
              <Chip 
                label="Planned" 
                size="small" 
                color="default" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Planned
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('in-progress')}>
              <Chip 
                label="In Progress" 
                size="small" 
                color="warning" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              In Progress
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('completed')}>
              <Chip 
                label="Completed" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Completed
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('on-hold')}>
              <Chip 
                label="On Hold" 
                size="small" 
                color="error" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              On Hold
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('cancelled')}>
              <Chip 
                label="Cancelled" 
                size="small" 
                color="error" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Cancelled
            </MenuItem>
          </Menu>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} found
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
                <TableCell sx={{ fontWeight: 600 }}>SNO</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Manager</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Timeline</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project, index) => {
                const statusInfo = getStatusInfo(project.status);
                const daysLeft = calculateDaysLeft(project.deadline);
                const sno = (page - 1) * itemsPerPage + index + 1;
                const invoiceEnabled = project.status === 'completed';
                const invoiceTooltip = getInvoiceTooltip(project);
                
                return (
                  <TableRow 
                    key={project._id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {sno}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {project.projectId || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {project.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getClientName(project.client)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getManagerName(project.manager)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={<IconifyIcon icon={statusInfo.icon} />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ width: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={project.progress || 0} 
                          sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          color={
                            (project.progress || 0) < 30 ? 'error' :
                            (project.progress || 0) < 70 ? 'warning' : 'success'
                          }
                        />
                        <Typography variant="body2" sx={{ minWidth: 35 }}>
                          {project.progress || 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Start: {formatDate(project.startDate)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Deadline: {formatDate(project.deadline)}
                        </Typography>
                        {daysLeft !== null && daysLeft > 0 && (
                          <Typography variant="caption" color={daysLeft < 30 ? 'error' : 'text.secondary'}>
                            {daysLeft} days left
                          </Typography>
                        )}
                        {daysLeft !== null && daysLeft < 0 && project.status !== 'completed' && (
                          <Typography variant="caption" color="error">
                            Overdue by {Math.abs(daysLeft)} days
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {project.projectType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {/* Generate Invoice Button */}
                        <Tooltip title={invoiceTooltip} arrow>
                          <span>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<IconifyIcon icon="mingcute:receipt-line" />}
                              onClick={() => handleGenerateInvoice(project)}
                              disabled={!invoiceEnabled}
                              sx={{
                                opacity: invoiceEnabled ? 1 : 0.5,
                                cursor: invoiceEnabled ? 'pointer' : 'not-allowed',
                                backgroundColor: invoiceEnabled ? 'success.main' : 'success.light',
                                '&:hover': {
                                  backgroundColor: invoiceEnabled ? 'success.dark' : 'success.light'
                                },
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.8125rem',
                                px: 1.5,
                                py: 0.5
                              }}
                            >
                              Generate Invoice
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {projects.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <IconifyIcon icon="mingcute:folder-search-line" fontSize={48} sx={{ opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No projects found matching your search' : 'No projects found'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="text"
                        startIcon={<IconifyIcon icon="mingcute:add-line" />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ mt: 1 }}
                      >
                        Create your first project
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

      {/* Create Project Dialog */}
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconifyIcon icon="mingcute:add-circle-fill" color="primary" />
        Create New Project
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <CreateProjectForm 
            onSubmit={handleCreateProject}
            loading={loading}
            onSuccess={handleProjectCreationSuccess} // Make sure this is passed correctly
            clients={clients}
            managers={managers}
            fetchingClients={fetchingClients}
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={() => setOpenDialog(false)} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
    </Box>
  );
};

export default ProjectsPage;