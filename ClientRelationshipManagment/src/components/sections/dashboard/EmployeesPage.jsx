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
  CircularProgress,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import IconifyIcon from '../../base/IconifyIcon';
import AddEmployeeForm from './EmployeeForm';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    activePercentage: 0,
    departmentStats: [],
    roleStats: []
  });

  const itemsPerPage = 8;
  const API_BASE_URL = 'http://localhost:8000';

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token || token === 'null' || token === 'undefined') {
        setErrorMessage('Please login to access employees. No valid token found.');
        setTimeout(() => setErrorMessage(''), 5000);
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        department: departmentFilter !== 'all' ? departmentFilter : '',
        roleId: roleFilter !== 'all' ? roleFilter : '',
        sort: '-createdAt'
      }).toString();

      const response = await fetch(`${API_BASE_URL}/employees?${queryParams}`, {
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
          window.location.href = '/login';
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEmployees(data.data.employees || []);
        setDepartments(data.data.departments || []);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setErrorMessage(data.message || 'Failed to load employees');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setErrorMessage('Failed to load employees: ' + error.message);
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

      const response = await fetch(`${API_BASE_URL}/employees/stats`, {
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

  // Add new employee
  const handleAddEmployee = async (employeeData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to add employee');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      setErrorMessage(`Failed to add employee: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  // Update employee
  const handleUpdateEmployee = async (employeeData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!selectedEmployee || !selectedEmployee._id) {
        throw new Error('No employee selected for update');
      }

      const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        setErrorMessage(data.message || 'Failed to update employee');
        setTimeout(() => setErrorMessage(''), 5000);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      setErrorMessage(`Failed to update employee: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
      return { success: false, error: error.message };
    }
  };

  // Update employee status
  const handleUpdateStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`${API_BASE_URL}/employees/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Employee status updated to ${newStatus}!`);
        fetchEmployees();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      setErrorMessage('Failed to update employee status');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setSuccessMessage('Employee deleted successfully!');
          fetchEmployees();
          fetchStats();
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        setErrorMessage('Failed to delete employee');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  // Open edit dialog
  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setOpenEditDialog(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (employeeData) => {
    const result = await handleUpdateEmployee(employeeData);
    
    if (result.success) {
      // Close dialog and refresh data
      setTimeout(() => {
        setOpenEditDialog(false);
        setSelectedEmployee(null);
        setSuccessMessage('Employee updated successfully!');
        fetchEmployees();
        fetchStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 2000);
      return result;
    }
    return result;
  };

  // Initial load
  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, [page, searchTerm, statusFilter, departmentFilter, roleFilter]);

  const getStatusInfo = (status) => {
    const statusMap = {
      'active': { label: 'Active', color: 'success', icon: 'mingcute:check-circle-line' },
      'inactive': { label: 'Inactive', color: 'error', icon: 'mingcute:close-circle-line' },
    };
    return statusMap[status] || { label: 'Unknown', color: 'default', icon: 'mingcute:help-line' };
  };

  const getRoleInfo = (roleId) => {
    const roleMap = {
      '2': { label: 'Project Manager', color: 'primary', icon: 'mingcute:badge-fill' },
      '3': { label: 'Employee', color: 'primary', icon: 'mingcute:badge-fill' },
    };
    return roleMap[roleId] || { label: 'Unknown', color: 'default', icon: 'mingcute:help-line' };
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRandomColor = () => {
    const colors = [
      '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', 
      '#7b1fa2', '#00838f', '#5d4037', '#9c27b0',
      '#2196f3', '#4caf50', '#ff9800'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
            Employee Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all employees and add new ones
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1}>
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
            Add New Employee
          </Button>
        </Stack>
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
              Total Employees
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="primary" fontWeight={700}>
                {stats.totalEmployees}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Active Employees
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {stats.activeEmployees}
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
              Inactive Employees
            </Typography>
            {statsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" color="error.main" fontWeight={700}>
                {stats.inactiveEmployees}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search employees..."
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

          <FormControl variant="filled" size="small" sx={{ minWidth: 140 }}>
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              label="Role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="2">Project Manager</MenuItem>
              <MenuItem value="3">Employee</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={(e) => setAnchorEl(e.currentTarget)}
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
            <MenuItem onClick={() => { setStatusFilter('all'); setAnchorEl(null); setPage(1); }}>
              All Employees
            </MenuItem>
            <MenuItem onClick={() => { setStatusFilter('active'); setAnchorEl(null); setPage(1); }}>
              <Chip 
                label="Active" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              Active
            </MenuItem>
            <MenuItem onClick={() => { setStatusFilter('inactive'); setAnchorEl(null); setPage(1); }}>
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
            {stats.totalEmployees} employee{stats.totalEmployees !== 1 ? 's' : ''} total
          </Typography>
        </Stack>
      </Paper>

      {/* Employees Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Join Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => {
                const statusInfo = getStatusInfo(employee.status);
                const roleInfo = getRoleInfo(employee.roleId);
                
                return (
                  <TableRow 
                    key={employee._id}
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
                          {getInitials(employee.firstName, employee.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {employee.firstName} {employee.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {employee.employeeId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {employee.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {employee.phone}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.department}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleInfo.label}
                        size="small"
                        color={roleInfo.color}
                        icon={<IconifyIcon icon={roleInfo.icon} />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(employee.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={<IconifyIcon icon={statusInfo.icon} />}
                        variant="outlined"
                        onClick={() => handleUpdateStatus(employee._id, employee.status)}
                        style={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Edit Employee" arrow>
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'warning.main',
                              '&:hover': { backgroundColor: 'warning.lighter' }
                            }}
                            onClick={() => handleEditClick(employee)}
                          >
                            <IconifyIcon icon="mingcute:edit-line" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Employee" arrow>
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { backgroundColor: 'error.lighter' }
                            }}
                            onClick={() => handleDeleteEmployee(employee._id)}
                          >
                            <IconifyIcon icon="mingcute:delete-line" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {employees.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <IconifyIcon icon="mingcute:user-search-line" fontSize={48} sx={{ opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm ? 'No employees found matching your search' : 'No employees found'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="text"
                        startIcon={<IconifyIcon icon="mingcute:add-line" />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ mt: 1 }}
                      >
                        Add your first employee
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

      {/* Add Employee Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconifyIcon icon="mingcute:user-add-fill" color="primary" />
          Add New Employee
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            <AddEmployeeForm 
              onSubmit={handleAddEmployee}
              loading={loading}
              onSuccess={() => {
                setOpenDialog(false);
                setSuccessMessage('Employee added successfully!');
                fetchEmployees();
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

      {/* Edit Employee Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setSelectedEmployee(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconifyIcon icon="mingcute:user-edit-fill" color="warning" />
          Edit Employee
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            {selectedEmployee && (
              <AddEmployeeForm 
                employee={selectedEmployee}
                onSubmit={handleEditSubmit}
                loading={loading}
                isEdit={true}
                onSuccess={() => {
                  setOpenEditDialog(false);
                  setSelectedEmployee(null);
                  setSuccessMessage('Employee updated successfully!');
                  fetchEmployees();
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
            setSelectedEmployee(null);
          }} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeesPage;