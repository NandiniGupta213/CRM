// src/components/admin/clients/ClientsPage.jsx
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
  Tooltip,
  Avatar,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import ClientForm from './ClientForm';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activePercentage: 0
  });

  const itemsPerPage = 6;
  const API_BASE_URL = 'http://localhost:8000';


// Run this in your terminal or a test route
  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token || token === 'null' || token === 'undefined') {
        setErrorMessage('Please login to access clients. No valid token found.');
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

      const response = await fetch(`${API_BASE_URL}/clients/create?${queryParams}`, {
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
        setClients(data.data.clients || []);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setErrorMessage(data.message || 'Failed to load clients');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setErrorMessage('Failed to load clients: ' + error.message);
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

      const response = await fetch(`${API_BASE_URL}/clients/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response for stats');
        return;
      }

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

  // Add new client
  const handleAddClient = async (clientData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/clients/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to add client');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error adding client:', error);
      setErrorMessage(`Failed to add client: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  // Update client
  const handleUpdateClient = async (clientData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!selectedClient || !selectedClient._id) {
        throw new Error('No client selected for update');
      }

      const response = await fetch(`${API_BASE_URL}/clients/${selectedClient._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to update client');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error updating client:', error);
      setErrorMessage(`Failed to update client: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  // Update client status
  const handleUpdateStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Client status updated to ${newStatus}!`);
        fetchClients();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating client:', error);
      setErrorMessage('Failed to update client status');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Delete client
  const handleDeleteClient = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setSuccessMessage('Client deleted successfully!');
          fetchClients();
          fetchStats();
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      } catch (error) {
        console.error('Error deleting client:', error);
        setErrorMessage('Failed to delete client');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  // Open edit dialog
  const handleEditClick = (client) => {
    setSelectedClient(client);
    setOpenEditDialog(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (clientData) => {
    const result = await handleUpdateClient(clientData);
    
    if (result.success) {
      // Close dialog and refresh data
      setTimeout(() => {
        setOpenEditDialog(false);
        setSelectedClient(null);
        setSuccessMessage('Client updated successfully!');
        fetchClients();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 2000);
      return result;
    }
    return result;
  };

  // Initial load
  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [page, searchTerm, statusFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'active': { label: 'Active', color: 'success', icon: 'mingcute:check-circle-line' },
      'inactive': { label: 'Inactive', color: 'error', icon: 'mingcute:close-circle-line' },
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

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = () => {
    const colors = [
      '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', 
      '#7b1fa2', '#00838f', '#5d4037'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
            Client Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all clients and add new ones
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
          Add New Client
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <Card sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Clients
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="primary" fontWeight={700}>
                {stats.totalClients}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Active Clients
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {stats.activeClients}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.activePercentage}% of total
                </Typography>
              </>
            )}
          </CardContent>
        </Card>


         <Card sx={{ flex: 1, borderRadius: 2 }}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Total Revenue
      </Typography>
      {statsLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" color="primary" fontWeight={700}>
          {formatCurrency(stats.totalRevenue || 0)}
        </Typography>
      )}
    </CardContent>
  </Card>

  <Card sx={{ flex: 1, borderRadius: 2 }}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Amount Received
      </Typography>
      {statsLoading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Typography variant="h4" color="success.main" fontWeight={700}>
            {formatCurrency(stats.paidRevenue || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {stats.totalRevenue > 0 
              ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100) 
              : 0}% collected
          </Typography>
        </>
      )}
    </CardContent>
  </Card>

  <Card sx={{ flex: 1, borderRadius: 2 }}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Outstanding
      </Typography>
      {statsLoading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Typography variant="h4" color="warning.main" fontWeight={700}>
            {formatCurrency(stats.outstandingRevenue || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {stats.totalRevenue > 0 
              ? Math.round((stats.outstandingRevenue / stats.totalRevenue) * 100) 
              : 0}% pending
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
      </Stack>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search clients..."
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
              All Clients
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('active')}>
              <Chip 
                label="Active" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Active
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterClose('inactive')}>
              <Chip 
                label="Inactive" 
                size="small" 
                color="error" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Inactive
            </MenuItem>
          </Menu>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {stats.totalClients} client{stats.totalClients !== 1 ? 's' : ''} total
          </Typography>
        </Stack>
      </Paper>

      {/* Clients Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Projects</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total Billed</TableCell>
                 <TableCell sx={{ fontWeight: 600 }}>Total Paid</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Outstanding</TableCell> 
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => {
                const statusInfo = getStatusInfo(client.status);
                
                return (
                  <TableRow 
                    key={client._id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
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
                          {getInitials(client.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {client.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: CLIENT-{client._id?.toString().slice(-6).toUpperCase() || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {client.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {client.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.phone}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {client.city}, {client.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.postalCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Total: {client.totalProjects}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(client.totalBilled)}
                      </Typography>
                    </TableCell>
                     <TableCell>
          <Typography variant="body2" color="success.main" fontWeight={600}>
            {formatCurrency(client.totalPaid || 0)}
          </Typography>
          {client.totalBilled > 0 && (
            <Typography variant="caption" color="text.secondary">
              {Math.round((client.totalPaid / client.totalBilled) * 100)}% paid
            </Typography>
          )}
        </TableCell>
        
        {/* NEW: Outstanding Column */}
        <TableCell>
          <Typography variant="body2" 
            color={(client.totalOutstanding || 0) > 0 ? "error.main" : "success.main"} 
            fontWeight={600}
          >
            {formatCurrency(client.totalOutstanding || 0)}
          </Typography>
          {client.totalBilled > 0 && (
            <Typography variant="caption" color="text.secondary">
              {Math.round((client.totalOutstanding / client.totalBilled) * 100)}% due
            </Typography>
          )}
        </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={<IconifyIcon icon={statusInfo.icon} />}
                        variant="outlined"
                        onClick={() => handleUpdateStatus(client._id, client.status)}
                        style={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Edit Client" arrow>
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'warning.main',
                              '&:hover': { backgroundColor: 'warning.lighter' }
                            }}
                            onClick={() => handleEditClick(client)}
                          >
                            <IconifyIcon icon="mingcute:edit-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Client" arrow>
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { backgroundColor: 'error.lighter' }
                            }}
                            onClick={() => handleDeleteClient(client._id)}
                          >
                            <IconifyIcon icon="mingcute:delete-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Send Email" arrow>
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'info.main',
                              '&:hover': { backgroundColor: 'info.lighter' }
                            }}
                          >
                            <IconifyIcon icon="mingcute:mail-line" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {clients.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <IconifyIcon icon="mingcute:user-search-line" fontSize={48} sx={{ opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No clients found matching your search' : 'No clients found'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="text"
                        startIcon={<IconifyIcon icon="mingcute:add-line" />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ mt: 1 }}
                      >
                        Add your first client
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

      {/* Add Client Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconifyIcon icon="mingcute:user-add-fill" color="primary" />
          Add New Client
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            <ClientForm 
              onSubmit={handleAddClient}
              loading={loading}
              onSuccess={() => {
                setOpenDialog(false);
                setSuccessMessage('Client added successfully!');
                fetchClients();
                fetchStats();
                setTimeout(() => setSuccessMessage(''), 3000);
              }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setSelectedClient(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconifyIcon icon="mingcute:user-edit-fill" color="warning" />
          Edit Client
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            {selectedClient && (
              <ClientForm 
                client={selectedClient}
                onSubmit={handleEditSubmit}
                loading={loading}
                isEdit={true}
                onSuccess={() => {
                  setOpenEditDialog(false);
                  setSelectedClient(null);
                  setSuccessMessage('Client updated successfully!');
                  fetchClients();
                  fetchStats();
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
              />
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => {
            setOpenEditDialog(false);
            setSelectedClient(null);
          }} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientsPage;