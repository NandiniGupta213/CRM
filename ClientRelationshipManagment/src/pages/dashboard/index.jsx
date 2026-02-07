import React from 'react';
import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
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
  AvatarGroup,
  Badge,
  Tabs,
  Tab,
  CardHeader,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
   Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemAvatar,
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import IconifyIcon from '../../components/base/IconifyIcon';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
const [notificationCount, setNotificationCount] = useState(0);
const [notificationModalOpen, setNotificationModalOpen] = useState(false);
const [notificationLoading, setNotificationLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalClients: 0,
      activeProjects: 0,
      delayedProjects: 0,
      pendingInvoices: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      paidRevenue: 0,
      totalTasks: 0,
      overdueTasks: 0
    },
    projects: [],
    financial: {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      recentInvoices: []
    },
    risks: {
      delayedProjectsCount: 0,
      delayedProjects: [],
      overdueTasksCount: 0,
      overdueTasks: [],
      staleProjectsCount: 0,
      staleProjects: []
    },
    activities: [],
    metrics: {
      projectsByStatus: [],
      monthlyRevenue: [],
      clientRevenue: [],
      teamPerformance: []
    },
    quickStats: {
      totalClients: 0,
      totalProjects: 0,
      totalInvoices: 0,
      totalEmployees: 0,
      activeProjects: 0,
      pendingInvoices: 0,
      overdueProjects: 0,
      recentActivities: 0
    },
    overdue: {
      invoices: { count: 0, totalAmount: 0, avgOverdueDays: 0 },
      projects: { count: 0, avgDelayDays: 0 },
      tasks: { count: 0, avgOverdueDays: 0 }
    }
  });
const [hoveredBars, setHoveredBars] = useState({});

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day'),
    endDate: dayjs()
  });
  
  const navigate = useNavigate();
  const API_BASE_URL = 'https://crm-rx6f.onrender.com';

const refreshAccessToken = async () => {
  try {
    console.log('🔄 Attempting to refresh access token...');
    
    // Get refresh token from localStorage
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.log('❌ No refresh token found in localStorage');
      return false;
    }
    
    console.log('📤 Sending refresh token:', refreshToken.substring(0, 30) + '...');
    
    // Send refresh token in request body
    const response = await fetch(`${API_BASE_URL}/user/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }), // Send in body
      // NO credentials: 'include' since we're not using cookies
    });
    
    console.log('🔁 Refresh response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token refresh response:', data);
      
      if (data.success && data.data?.accessToken && data.data?.refreshToken) {
        // Update both tokens in localStorage
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        console.log('✅ Tokens updated in localStorage');
        return true;
      } else {
        console.log('❌ Invalid response format:', data);
        return false;
      }
    } else {
      // Try to get error message
      try {
        const errorData = await response.json();
        console.log('❌ Refresh failed with message:', errorData.message);
      } catch (e) {
        console.log('❌ Refresh failed with status:', response.status);
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    return false;
  }
};
// Helper function to safely parse JSON
const safeJsonParse = async (response) => {
  try {
    const text = await response.text();
    
    // Check if response is HTML (login page or error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || text.includes('</html>')) {
      console.error('Received HTML instead of JSON:', text.substring(0, 200));
      throw new Error('Server returned HTML page - likely authentication issue');
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', error.message);
    return { success: false, data: null, message: error.message };
  }
};

const fetchDashboardData = async () => {
  setLoading(true);
  setError('');
  
  try {
    console.log('🔄 Fetching dashboard data...');
    
    // 1. Get token
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('❌ No auth data');
      navigate('/authentication/login');
      return;
    }
    
    // 2. SIMPLE HEADERS - Most important fix
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('📤 Sending request with token:', token.substring(0, 50) + '...');
    
    // 3. Try ONE endpoint first (don't try refresh if it doesn't exist)
    const response = await fetch(`${API_BASE_URL}/admindashboard/summary`, {
      method: 'GET',
      headers,
      mode: 'cors'
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    // 4. Check response type
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      // Don't try refresh if endpoint doesn't exist
      if (response.status === 401) {
        // Check if it's HTML (backend error)
        if (contentType && contentType.includes('text/html')) {
          const html = await response.text();
          console.error('❌ Backend returned HTML (likely route issue):', html.substring(0, 200));
          
          setError('Backend authentication error. Please contact support.');
          return;
        }
        
        // If it's JSON with 401
        try {
          const errorData = await response.json();
          console.error('❌ JSON 401:', errorData);
          setError('Session expired. Please login again.');
          
          setTimeout(() => {
            localStorage.clear();
            navigate('/authentication/login');
          }, 2000);
        } catch (e) {
          console.error('❌ Cannot parse 401 response');
          setError('Authentication failed.');
        }
      }
      return;
    }
    
    // 5. Parse successful response
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('✅ Success! Data:', data);
      
      // Update your dashboard state here
      if (data.success) {
        setDashboardData(prev => ({
          ...prev,
          summary: {
            totalClients: data.data?.totalClients || 0,
            activeProjects: data.data?.activeProjects || 0,
            delayedProjects: data.data?.delayedProjects || 0,
            pendingInvoices: data.data?.pendingInvoices || 0,
            totalRevenue: data.data?.totalRevenue || 0,
            pendingRevenue: data.data?.pendingRevenue || 0,
            paidRevenue: data.data?.paidRevenue || 0,
            totalTasks: data.data?.totalTasks || 0,
            overdueTasks: data.data?.overdueTasks || 0
          }
        }));
      }
    } else {
      const text = await response.text();
      console.error('❌ Not JSON response:', text.substring(0, 200));
      setError('Invalid response from server');
    }
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    setError('Network error: ' + error.message);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  const testRefreshEndpoint = async () => {
    try {
      console.log('Testing refresh endpoint...');
      
      // Test 1: Simple GET to see if endpoint exists
      const getResponse = await fetch(`${API_BASE_URL}/user/refresh-token`);
      console.log('GET response:', getResponse.status);
      
      // Test 2: POST with empty body
      const postResponse = await fetch(`${API_BASE_URL}/user/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      console.log('POST response:', postResponse.status);
      
      // Test 3: Check what the server returns
      const text = await postResponse.text();
      console.log('Response text (first 200 chars):', text.substring(0, 200));
      
    } catch (error) {
      console.error('Test error:', error);
    }
  };
  
  testRefreshEndpoint();
}, []);

const fetchNotifications = async () => {
  setNotificationLoading(true);
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.log('No token for notifications');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${API_BASE_URL}/admindashboard/notifications`, { headers });
    
    // Handle 401
    if (response.status === 401) {
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        const newToken = localStorage.getItem('accessToken');
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${newToken}`
        };
        const retryResponse = await fetch(`${API_BASE_URL}/admindashboard/notifications`, { headers: newHeaders });
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          if (data.success) {
            setNotifications(data.data.notifications || []);
            setNotificationCount(data.data.total || 0);
          }
        }
      }
    } else if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setNotificationCount(data.data.total || 0);
      }
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
  } finally {
    setNotificationLoading(false);
  }
};

// Auto-fetch notifications every 5 minutes
useEffect(() => {
  fetchNotifications();
  const interval = setInterval(fetchNotifications, 300000); // 5 minutes
  return () => clearInterval(interval);
}, []);

// Add this function to handle notification click
const handleNotificationClick = (notification) => {
  switch(notification.type) {
    case 'invoice_overdue':
    case 'invoice_due_soon':
      navigate(`/pages/dashboard/admin/invoices/${notification.data.invoiceId}`);
      break;
    case 'project_delayed':
    case 'project_deadline_soon':
    case 'project_stale':
      navigate(`/pages/dashboard/admin/project/${notification.data.projectId}`);
      break;
    default:
      break;
  }
  setNotificationModalOpen(false);
};

// Add this function to get notification icon
const getNotificationIcon = (type) => {
  switch(type) {
    case 'invoice_overdue':
      return 'mingcute:alarm-fill';
    case 'invoice_due_soon':
      return 'mingcute:time-fill';
    case 'project_delayed':
      return 'mingcute:warning-fill';
    case 'project_deadline_soon':
      return 'mingcute:calendar-fill';
    case 'project_stale':
      return 'mingcute:history-fill';
    default:
      return 'mingcute:notification-fill';
  }
};

// Add this function to get notification color
const getNotificationColor = (priority) => {
  switch(priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

// Add this function to format notification time
const formatNotificationTime = (timestamp) => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffMs = now - notificationTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notificationTime.toLocaleDateString();
};
  // Refresh dashboard data
  const refreshDashboard = () => {
    fetchDashboardData();
    setSuccess('Dashboard data refreshed!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'planned': 'default',
      'in-progress': 'warning',
      'completed': 'success',
      'on-hold': 'error',
      'cancelled': 'error',
      'draft': 'default',
      'sent': 'info',
      'paid': 'success',
      'overdue': 'error'
    };
    return colors[status] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      'planned': 'Planned',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'on-hold': 'On Hold',
      'cancelled': 'Cancelled',
      'draft': 'Draft',
      'sent': 'Sent',
      'paid': 'Paid',
      'overdue': 'Overdue'
    };
    return labels[status] || 'Unknown';
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    const icons = {
      'project_updated': 'mingcute:projector-line',
      'project_completed': 'mingcute:check-circle-line',
      'invoice_generated': 'mingcute:receipt-line',
      'invoice_paid': 'mingcute:dollar-circle-line',
      'task_overdue': 'mingcute:time-line',
      'project_created': 'mingcute:add-circle-line',
      'client_added': 'mingcute:user-add-line',
      'payment_received': 'mingcute:money-dollar-circle-line'
    };
    return icons[type] || 'mingcute:activity-line';
  };

  // Get activity color
  const getActivityColor = (type) => {
    const colors = {
      'project_updated': 'info',
      'project_completed': 'success',
      'invoice_generated': 'primary',
      'invoice_paid': 'success',
      'task_overdue': 'error',
      'project_created': 'warning',
      'client_added': 'info',
      'payment_received': 'success'
    };
    return colors[type] || 'default';
  };
  // Helper function for random avatar colors
const getRandomColor = (email) => {
  if (!email) return 'primary.main';
  
  const colors = [
    'primary.main',
    'secondary.main', 
    'success.main',
    'warning.main',
    'error.main',
    'info.main'
  ];
  
  // Simple hash from email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};


const handleEmailClient = (client) => {
  // Open Gmail compose window directly in browser
  const email = client.email;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
};

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get progress color
  const getProgressColor = (progress) => {
    if (progress < 30) return 'error';
    if (progress < 70) return 'warning';
    return 'success';
  };

  // Navigate to different sections
  const navigateToSection = (section) => {
    switch(section) {
      case 'clients':
        navigate('/pages/dashboard/admin/client');
        break;
      case 'projects':
        navigate('/pages/dashboard/admin/project');
        break;
      case 'invoices':
        navigate('/pages/dashboard/admin/invoice');
        break;
      case 'employees':
        navigate('/pages/dashboard/admin/employees');
        break;
      case 'teams':
        navigate('/pages/dashboard/admin/projectTeam');
        break;
      default:
        break;
    }
  };

  // Calculate percentage
  const calculatePercentage = (part, total) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} />
          <Typography color="text.secondary">Loading dashboard data...</Typography>
        </Stack>
      </Box>
    );
  }

return (
  <LocalizationProvider dateAdapter={AdapterDayjs}> 
    <Box sx={{ 
      p: 3, // KEEP AS IS for desktop
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      ml: 0,
      mr: 0,
      flex: 1
    }}>
      {/* Page Header - NO CHANGES */}
      <Box sx={{ mb: 4, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time overview of business performance and key metrics
            </Typography>
          </Box>
          
       <Stack direction="row" spacing={2} alignItems="center">
  {/* Notification Bell */}
  <IconButton
    onClick={() => setNotificationModalOpen(true)}
    sx={{ 
      position: 'relative',
      bgcolor: notificationCount > 0 ? 'error.lighter' : 'transparent',
      '&:hover': { bgcolor: notificationCount > 0 ? '#ffffff28' : 'action.hover' }
    }}
  >
    <Badge 
      badgeContent={notificationCount} 
      color="error"
      max={99}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.7rem',
          height: 20,
          minWidth: 20,
          top: 2,
          left: 6
        }
      }}
    >
      <IconifyIcon 
        icon={notificationCount > 0 ? "mingcute:notification-fill" : "mingcute:notification-line"} 
        color={notificationCount > 0 ? "error.main" : "text.secondary"} 
        fontSize="1.5rem"
      />
    </Badge>
  </IconButton>

  <Button
    variant="outlined"
    startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
    onClick={refreshDashboard}
    disabled={loading}
  >
    Refresh
  </Button>
  
  <FormControl size="small" sx={{ minWidth: 120 }}>
    <InputLabel>Time Range</InputLabel>
    <Select
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
      label="Time Range"
    >
      <MenuItem value="week">Last Week</MenuItem>
      <MenuItem value="month">Last Month</MenuItem>
      <MenuItem value="quarter">Last Quarter</MenuItem>
      <MenuItem value="year">Last Year</MenuItem>
    </Select>
  </FormControl>
</Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
      </Box>

      {/* 🔸 A. Top Summary Cards - Responsive Fixed */}
    <Grid container spacing={2} sx={{ mb: 4 }}>
      {/* Total Clients Card */}
      <Grid item xs={12} sm={6} lg={3}>
        <Stack
          p={2.25}
          pl={2.5}
          direction="column"
          component={Paper}
          gap={1.5}
          height={116}
          sx={{
            cursor: 'pointer',
            width: '100%',
            '&:hover': { 
              boxShadow: 4,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s'
            }
          }}
          onClick={() => navigateToSection('clients')}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack alignItems="center" gap={1}>
              <IconifyIcon icon="mingcute:user-3-fill" color="primary.main" fontSize="h5.fontSize" />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                Total Clients
              </Typography>
            </Stack>

            <IconButton
              aria-label="menu"
              size="small"
              sx={{ color: 'neutral.light', fontSize: 'h5.fontSize' }}
            >
              <IconifyIcon icon="solar:menu-dots-bold" />
            </IconButton>
          </Stack>

          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1}>
              {dashboardData.summary.totalClients}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconifyIcon 
                icon="mingcute:arrow-up-fill" 
                fontSize="small" 
                color="success.main" 
              />
              <Typography variant="caption" color="success.main" sx={{ fontFamily: 'Work Sans' }}>
                12% from last month
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Grid>

      {/* Active Projects Card */}
      <Grid item xs={12} sm={6} lg={3}>
        <Stack
          p={2.25}
          pl={2.5}
          direction="column"
          component={Paper}
          gap={1.5}
          height={116}
          sx={{
            cursor: 'pointer',
            width: '100%',
            '&:hover': { 
              boxShadow: 4,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s'
            }
          }}
          onClick={() => navigateToSection('projects')}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack alignItems="center" gap={1}>
              <IconifyIcon icon="mingcute:projector-fill" color="success.main" fontSize="h5.fontSize" />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                Active Projects
              </Typography>
            </Stack>

            <IconButton
              aria-label="menu"
              size="small"
              sx={{ color: 'neutral.light', fontSize: 'h5.fontSize' }}
            >
              <IconifyIcon icon="solar:menu-dots-bold" />
            </IconButton>
          </Stack>

          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1} color="success.main">
              {dashboardData.summary.activeProjects}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="error" sx={{ fontFamily: 'Work Sans' }}>
                {dashboardData.summary.delayedProjects} delayed
              </Typography>
              <Box 
                component="span" 
                sx={{ 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  bgcolor: 'error.main' 
                }} 
              />
            </Stack>
          </Stack>
        </Stack>
      </Grid>

      {/* Pending Invoices Card */}
      <Grid item xs={12} sm={6} lg={3}>
        <Stack
          p={2.25}
          pl={2.5}
          direction="column"
          component={Paper}
          gap={1.5}
          height={116}
          sx={{
            cursor: 'pointer',
            width: '100%',
            '&:hover': { 
              boxShadow: 4,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s'
            }
          }}
          onClick={() => navigateToSection('invoices')}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack alignItems="center" gap={1}>
              <IconifyIcon icon="mingcute:alarm-fill" color="warning.main" fontSize="h5.fontSize" />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
               Total Invoices
              </Typography>
            </Stack>

            <IconButton
              aria-label="menu"
              size="small"
              sx={{ color: 'neutral.light', fontSize: 'h5.fontSize' }}
            >
              <IconifyIcon icon="solar:menu-dots-bold" />
            </IconButton>
          </Stack>

          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1} color="warning.main">
              {dashboardData.financial.totalInvoices || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
              {formatCurrency(dashboardData.summary.pendingRevenue)} due
            </Typography>
          </Stack>
        </Stack>
      </Grid>

      {/* Revenue Card */}
      <Grid item xs={12} sm={6} lg={3}>
        <Stack
          p={2.25}
          pl={2.5}
          direction="column"
          component={Paper}
          gap={1.5}
          height={116}
          sx={{
            cursor: 'pointer',
            width: '100%',
            '&:hover': { 
              boxShadow: 4,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s'
            }
          }}
          onClick={() => navigateToSection('projects')}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack alignItems="center" gap={1}>
              <IconifyIcon icon="mingcute:receipt-fill" color="error.main" fontSize="h5.fontSize" />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                Revenue
              </Typography>
            </Stack>

            <IconButton
              aria-label="menu"
              size="small"
              sx={{ color: 'neutral.light', fontSize: 'h5.fontSize' }}
            >
              <IconifyIcon icon="solar:menu-dots-bold" />
            </IconButton>
          </Stack>

          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1} color="error.main">
              {formatCurrency(dashboardData.summary.totalRevenue)}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" color="success.main" sx={{ fontFamily: 'Work Sans' }}>
                {formatCurrency(dashboardData.summary.paidRevenue)} paid
              </Typography>
              <IconifyIcon 
                icon="mingcute:trending-up-fill" 
                fontSize="small" 
                color="success.main" 
              />
            </Stack>
          </Stack>
        </Stack>
      </Grid>
    </Grid>

      {/* Main Content Grid - NO CHANGES */}
      <Grid container spacing={3} sx={{ width: '100%' }}>
        {/* Left Column - 8 columns */}
        <Grid item xs={12} lg={8} sx={{ width: '100%' }}>
          {/* 🔸 B. Project Health Overview - With Chart */}
<Paper sx={{ 
  p: 2.5, 
  mb: 3, 
  height: { xs: 'auto', md: 600 }, 
  width: '100%',
  overflow: 'hidden'
}}>
  {/* Header */}
  <Typography variant="subtitle1" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
    Project Health Overview
  </Typography>

  {/* Subheader */}
  <Stack justifyContent="space-between" mt={1} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
    <Stack alignItems="center" gap={0.875}>
      <Typography variant="h3" fontWeight={600} letterSpacing={1}>
        {dashboardData.summary.activeProjects} Active
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconifyIcon 
          icon={dashboardData.summary.activeProjects > 0 ? "mingcute:arrow-up-fill" : "mingcute:arrow-down-fill"} 
          fontSize="small" 
          color={dashboardData.summary.activeProjects > 0 ? "success.main" : "error.main"} 
        />
        <Typography variant="caption" color={dashboardData.summary.activeProjects > 0 ? "success.main" : "error.main"} sx={{ fontFamily: 'Work Sans' }}>
          {dashboardData.summary.delayedProjects} delayed • Auto-refreshes every 5 minutes
        </Typography>
      </Stack>
    </Stack>

    <Stack direction="row" spacing={2} alignItems="center">
      <Chip 
        label="Read-only" 
        size="small" 
        color="info" 
        variant="outlined"
        icon={<IconifyIcon icon="mingcute:lock-line" />}
        sx={{ fontFamily: 'Work Sans' }}
      />
      <Button
        size="small"
        variant="outlined"
        endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
        onClick={() => navigateToSection('projects')}
        sx={{ fontFamily: 'Work Sans' }}
      >
        View All
      </Button>
    </Stack>
  </Stack>

  {/* Project Health Chart with horizontal scroll on mobile */}
  <Box sx={{ 
    height: 360, 
    mt: 3, 
    position: 'relative',
    overflowX: { xs: 'auto', sm: 'visible' },
    overflowY: 'visible'
  }}>
    {/* Y-Axis Label - Completion % */}
    <Box sx={{ 
      position: 'absolute',
      left: -45,
      top: '50%',
      transform: 'translateY(-50%) rotate(-90deg)',
      transformOrigin: 'center'
    }}>
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          fontFamily: 'Work Sans',
          fontWeight: 600,
          fontSize: '0.8rem',
          whiteSpace: 'nowrap'
        }}
      >
        Completion %
      </Typography>
    </Box>

    {/* Chart Container with fixed width on mobile */}
    <Box sx={{ 
      height: 300,
      ml: 6,
      mr: 2,
      position: 'relative',
      minWidth: { xs: '500px', sm: 'auto' } // Ensure enough width for all bars on mobile
    }}>
      {/* Y-Axis Labels */}
      <Box sx={{ 
        position: 'absolute',
        left: -45,
        top: 0,
        bottom: 40,
        width: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        pr: 1,
        height: '100%',
        pointerEvents: 'none'
      }}>
        {[100, 75, 50, 25, 0].map((value) => (
          <Box
            key={value}
            sx={{
              position: 'absolute',
              top: `${100 - value}%`,
              right: 8,
              transform: 'translateY(-50%)'
            }}
          >
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontFamily: 'Work Sans',
                fontSize: '0.7rem',
                lineHeight: 1
              }}
            >
              {value}%
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Chart Area - Original fixed layout */}
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        px: 2,
        position: 'relative',
        borderBottom: '2px solid',
        borderColor: 'divider',
        borderLeft: '2px solid',
        borderLeftColor: 'divider',
        minWidth: '400px' // Ensure chart doesn't shrink on mobile
      }}>
        {/* Grid Lines */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          pointerEvents: 'none'
        }}>
          {[0, 25, 50, 75, 100].map((line) => (
            <Box
              key={line}
              sx={{
                position: 'absolute',
                top: `${100 - line}%`,
                left: 0,
                right: 0,
                height: '1px',
                bgcolor: 'divider',
                opacity: 0.2
              }}
            />
          ))}
        </Box>

        {/* Progress Bars - ORIGINAL CODE */}
        {Array.isArray(dashboardData.projects) && dashboardData.projects.length > 0 ? (
          dashboardData.projects.slice(0, 5).map((project, index) => {
            const progress = project.progress || 0;
            const isDelayed = project.delayFlag === 'Delayed';
            const heightPercentage = Math.min(progress, 100);
            
            // Determine bar color
            let barColor;
            let barStatus;
            if (isDelayed) {
              barColor = '#f44336'; // Red
              barStatus = 'Delayed';
            } else if (progress < 30) {
              barColor = '#ff9800'; // Orange
              barStatus = 'At Risk';
            } else if (progress < 70) {
              barColor = '#ffeb3b'; // Yellow
              barStatus = 'Needs Attention';
            } else {
              barColor = '#4caf50'; // Green
              barStatus = 'On Track';
            }

            const isHovered = hoveredBars[index] || false;

            return (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 80,
                  height: '100%',
                  position: 'relative',
                  justifyContent: 'flex-end'
                }}
                onMouseEnter={() => setHoveredBars(prev => ({ ...prev, [index]: true }))}
                onMouseLeave={() => setHoveredBars(prev => ({ ...prev, [index]: false }))}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <Box sx={{
                    position: 'absolute',
                    top: -48,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'grey.900',
                    color: 'white',
                    p: 1.5,
                    borderRadius: 1,
                    boxShadow: 3,
                    zIndex: 10,
                    minWidth: 160,
                    border: 'none',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -5,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: '5px solid',
                      borderTopColor: 'grey.900'
                    }
                  }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: 'Work Sans', color: 'white' }}>
                      {project.projectName || 'Unnamed Project'}
                    </Typography>
                    <Stack spacing={0.5} mt={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: 'grey.300' }}>Progress:</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ color: 'white' }}>{progress}%</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: 'grey.300' }}>Status:</Typography>
                        <Chip 
                          label={barStatus} 
                          size="small" 
                          sx={{ 
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: barColor,
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                      </Stack>
                      {project.projectManager && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: 'grey.300' }}>Manager:</Typography>
                          <Typography variant="caption" sx={{ color: 'white' }}>{project.projectManager}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                )}
                
                {/* Progress Percentage Label */}
                <Box sx={{ 
                  position: 'absolute',
                  top: `calc(${100 - heightPercentage}% - 28px)`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      fontFamily: 'Work Sans',
                      color: barColor,
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {progress}%
                  </Typography>
                </Box>
                
                {/* Bar Container */}
                <Box sx={{ 
                  width: 50,
                  height: '100%',
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-end'
                }}>
                  {/* Progress Fill */}
                  <Box sx={{
                    width: '100%',
                    height: `${heightPercentage}%`,
                    bgcolor: barColor,
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s ease',
                    opacity: isHovered ? 0.9 : 1,
                    position: 'relative',
                  }} />
                  
                  {/* Bar Base */}
                  <Box sx={{
                    width: '100%',
                    height: '3px',
                    bgcolor: 'grey.400',
                    borderRadius: '0 0 4px 4px',
                    position: 'absolute',
                    bottom: 0,
                    left: 0
                  }} />
                </Box>
                
                {/* Project Name at Bottom - FIXED: Removed all responsive modifications */}
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 2,
                    fontFamily: 'Work Sans',
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    position: 'absolute',
                    bottom: -30
                  }}
                >
                  {project.projectName?.substring(0, 10) || 'Unnamed'}...
                </Typography>
              </Box>
            );
          })
        ) : (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Typography color="text.secondary">
              No project data available
            </Typography>
          </Box>
        )}
      </Box>
    </Box>

    {/* X-Axis Label - Projects */}
    <Box sx={{ 
      textAlign: 'center', 
      mt: 4,
      ml: 6
    }}>
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          fontFamily: 'Work Sans',
          fontWeight: 600,
          fontSize: '0.85rem',
          letterSpacing: '0.5px'
        }}
      >
        Projects
      </Typography>
    </Box>

    {/* Project Status Legend - Centered at bottom */}
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: 4,
      mt: 6,
      flexWrap: 'wrap',
      py: 1.5,
      px: 3,
      mx: 'auto',
      maxWidth: 'fit-content'
    }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          bgcolor: '#4caf50'
        }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans', fontSize: '0.75rem', fontWeight: 500 }}>
          On Track (≥70%)
        </Typography>
      </Stack>
      
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          bgcolor: '#ffeb3b'
        }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans', fontSize: '0.75rem', fontWeight: 500 }}>
          Needs Attention (30-69%)
        </Typography>
      </Stack>
      
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          bgcolor: '#f44336'
        }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans', fontSize: '0.75rem', fontWeight: 500 }}>
          Delayed/At Risk
        </Typography>
      </Stack>
    </Box>
  </Box>
</Paper>
        </Grid>

        {/* Right Column - 4 columns */}
        <Grid item xs={12} lg={4} sx={{ width: '100%' }}>
          {/* Client Distribution - EXACT SAME */}


{/* Client Table Section - Add this right after the stats grid */}
<Paper sx={{ p: 3, mb: 3, width: '100%' }}>
  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
    <Stack direction="row" alignItems="center" spacing={2}>
      {/* Client Distribution Circle */}
      <Box sx={{ 
        width: 48, 
        height: 48, 
        borderRadius: '50%', 
        border: '3px solid',
        borderColor: 'primary.light',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        <Typography variant="h5" fontWeight={700}>
          {dashboardData.clientData?.totalClients || 0}
        </Typography>
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'transparent',
          borderTopColor: 'primary.main',
          borderRightColor: 'success.main',
          borderBottomColor: 'warning.main',
          transform: 'rotate(-45deg)',
        }} />
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          Recent Clients
        </Typography>
        <Stack direction="row" spacing={1}>
          <Typography variant="caption" color="success.main" fontWeight={500}>
            {dashboardData.clientData?.activeClients || 0} active
          </Typography>
          <Typography variant="caption" color="text.secondary">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dashboardData.clientData?.inactiveClients || 0} inactive
          </Typography>
        </Stack>
      </Box>
    </Stack>
    <Button
      variant="outlined"
      endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
      onClick={() => navigateToSection('clients')}
    >
      View All Clients
    </Button>
  </Stack>

  {/* Client Table */}
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Client Name</TableCell>
          <TableCell>Company</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {dashboardData.clientData?.recentClients && dashboardData.clientData.recentClients.length > 0 ? (
          dashboardData.clientData.recentClients.map((client, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36,
                      bgcolor: getRandomColor(client.email)
                    }}
                  >
                    {client.name?.charAt(0)?.toUpperCase() || 'C'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {client.name || 'Unnamed Client'}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {client.company || 'No company'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {client.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={client.status === 'active' ? 'Active' : 'Inactive'}
                  size="small"
                  color={client.status === 'active' ? 'success' : 'error'}
                  icon={
                    client.status === 'active' ? 
                    <IconifyIcon icon="mingcute:check-circle-fill" width={12} /> : 
                    <IconifyIcon icon="mingcute:close-circle-fill" width={12} />
                  }
                  sx={{ 
                    fontWeight: 500,
                    '& .MuiChip-icon': { ml: 0.5 }
                  }}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleEmailClient(client)}
                    title="Send Email"
                  >
                    <IconifyIcon icon="mingcute:mail-line" width={18} />
                  </IconButton>

                </Stack>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} align="center">
              <Stack alignItems="center" spacing={1} py={3}>
                <IconifyIcon 
                  icon="mingcute:user-3-line" 
                  width={48} 
                  color="text.secondary"
                />
                <Typography color="text.secondary">
                  No client data available
                </Typography>
                <Button 
                  variant="text" 
                  size="small"
                  startIcon={<IconifyIcon icon="mingcute:add-circle-line" />}
                  onClick={() => navigateToSection('clients')}
                >
                  Add New Client
                </Button>
              </Stack>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
</Paper>

        {/* Financial Snapshot - Responsive */}
<Paper sx={{ 
  p: { xs: 1.5, sm: 2.5 }, 
  mb: 3, 
  height: { xs: 'auto', sm: 440 },
  width: '100%',
  overflow: 'hidden' // Prevent outer scroll
}}>
  {/* Header */}
  <Stack 
    direction={{ xs: 'column', sm: 'row' }} 
    alignItems={{ xs: 'flex-start', sm: 'center' }}
    justifyContent="space-between" 
    spacing={{ xs: 1.5, sm: 0 }}
    mb={2}
  >
    <Typography variant="subtitle1" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
      Financial Snapshot
    </Typography>
    <Button
      variant="outlined"
      startIcon={<IconifyIcon icon="mingcute:receipt-line" />}
      endIcon={<IconifyIcon icon="mingcute:arrow-right-line" />}
      onClick={() => navigateToSection('invoices')}
      sx={{ 
        fontFamily: 'Work Sans',
        fontWeight: 600,
        py: 1.2,
        width: { xs: '100%', sm: 'auto' },
        fontSize: { xs: '0.875rem', sm: 'inherit' },
        '&:hover': {
          bgcolor: 'primary.lighter',
          borderColor: 'primary.main'
        }
      }}
    >
      View All Invoices
    </Button>
  </Stack>

  {/* Scrollable Content Container for Mobile */}
  <Box sx={{ 
    width: '100%',
    overflowX: { xs: 'auto', sm: 'visible' }, // Horizontal scroll only on mobile
    overflowY: 'visible',
    // Hide scrollbar for better aesthetics but keep functionality
    '&::-webkit-scrollbar': {
      height: 6,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 3,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 3,
    }
  }}>
    {/* Inner container with fixed min-width for mobile scrolling */}
    <Box sx={{ 
      minWidth: { xs: 600, sm: 'auto' }, // Set minimum width for mobile scrolling
      width: '100%'
    }}>
      {/* Total Revenue */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="center" 
          alignItems={{ xs: 'center', sm: 'baseline' }} 
          spacing={1}
        >
          <Typography variant="h3" fontWeight={700} sx={{ 
            fontFamily: 'Work Sans',
            fontSize: { xs: '1.75rem', sm: '2rem', lg: '2.125rem' }
          }}>
            {formatCurrency(dashboardData.financial.totalAmount || 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
            Total Revenue
          </Typography>
        </Stack>
        
      </Box>

      <Stack spacing={2}>
        {/* Invoice Stats Row - Responsive Grid */}
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          {/* Total Invoices */}
          <Grid item xs={4}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: { xs: 1, sm: 1.5 },
                height: '100%',
                borderWidth: 2,
                borderColor: 'primary.light',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              <Stack alignItems="center" spacing={0.5}>
                <IconifyIcon 
                  icon="mingcute:receipt-fill" 
                  color="primary" 
                  fontSize={{ xs: '1.25rem', sm: '1.5rem' }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Total Invoices
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  {dashboardData.financial.totalInvoices || 0}
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Paid */}
          <Grid item xs={4}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: { xs: 1, sm: 1.5 },
                height: '100%',
                borderWidth: 2,
                borderColor: 'success.light',
                '&:hover': { borderColor: 'success.main' }
              }}
            >
              <Stack alignItems="center" spacing={0.5}>
                <IconifyIcon 
                  icon="mingcute:check-circle-fill" 
                  color="success" 
                  fontSize={{ xs: '1.25rem', sm: '1.5rem' }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Paid
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main" sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  {formatCurrency(dashboardData.financial.paidAmount || 0)}
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Pending */}
          <Grid item xs={4}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: { xs: 1, sm: 1.5 },
                height: '100%',
                borderWidth: 2,
                borderColor: 'warning.light',
                '&:hover': { borderColor: 'warning.main' }
              }}
            >
              <Stack alignItems="center" spacing={0.5}>
                <IconifyIcon 
                  icon="mingcute:time-fill" 
                  color="warning" 
                  fontSize={{ xs: '1.25rem', sm: '1.5rem' }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Pending
                </Typography>
                <Typography variant="h6" fontWeight={700} color="warning.main" sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  {formatCurrency(dashboardData.financial.pendingAmount || 0)}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Overdue Section */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: { xs: 1.5, sm: 2 },
            bgcolor: 'error.50',
            borderWidth: 2,
            borderColor: 'error.200',
            '&:hover': { 
              bgcolor: 'error.100',
              borderColor: 'error.main'
            }
          }}
        >
          <Stack spacing={1.5}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              alignItems={{ xs: 'flex-start', sm: 'center' }} 
              spacing={{ xs: 1, sm: 1.5 }}
            >
              <Box sx={{ 
                width: { xs: 36, sm: 40 }, 
                height: { xs: 36, sm: 40 }, 
                borderRadius: '50%', 
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconifyIcon 
                  icon="mingcute:alarm-fill" 
                  color="error.main" 
                  fontSize={{ xs: '1rem', sm: '1.2rem' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: 'Work Sans' }}>
                  Overdue Invoices
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                  Immediate attention required
                </Typography>
              </Box>
            </Stack>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
              spacing={{ xs: 1, sm: 0 }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                  Amount due
                </Typography>
                <Typography variant="h4" color="error.main" fontWeight={800} sx={{ 
                  fontFamily: 'Work Sans',
                  fontSize: { xs: '1.5rem', sm: '2rem', lg: '2.125rem' }
                }}>
                  {formatCurrency(dashboardData.financial.overdueAmount || 0)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {/* Recent Invoices */}
        {dashboardData.financial.recentInvoices && dashboardData.financial.recentInvoices.length > 0 && (
          <Box>
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center" 
              mb={2}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                Recent Invoices
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                Last 3
              </Typography>
            </Stack>
            
            <Stack spacing={1.5}>
              {dashboardData.financial.recentInvoices.slice(0, 3).map((invoice) => (
                <Paper 
                  key={invoice._id}
                  variant="outlined"
                  sx={{ 
                    p: { xs: 1.5, sm: 2 },
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                      borderColor: getStatusColor(invoice.status) + '.main'
                    }
                  }}
                  onClick={() => navigate(`/pages/dashboard/admin/invoices/${invoice._id}`)}
                >
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    alignItems={{ xs: 'flex-start', sm: 'center' }} 
                    spacing={{ xs: 1.5, sm: 2 }}
                  >
                    <Box sx={{ 
                      width: { xs: 40, sm: 44 }, 
                      height: { xs: 40, sm: 44 }, 
                      borderRadius: '8px', 
                      bgcolor: getStatusColor(invoice.status) + '.lighter',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconifyIcon 
                        icon="mingcute:receipt-fill" 
                        color={getStatusColor(invoice.status) + '.main'} 
                        fontSize={{ xs: '1.1rem', sm: '1.2rem' }}
                      />
                    </Box>
                    
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={{ xs: 0.5, sm: 0 }}
                      >
                        <Typography variant="body2" fontWeight={600} sx={{ 
                          fontFamily: 'Work Sans',
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}>
                          {invoice.invoiceNumber}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ 
                          fontFamily: 'Work Sans',
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}>
                          {formatCurrency(invoice.total)}
                        </Typography>
                      </Stack>
                      
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'flex-start', sm: 'center' }} 
                        spacing={{ xs: 0.5, sm: 0 }} 
                        mt={1}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Work Sans' }}>
                          {invoice.clientName || 'Client'}
                        </Typography>
                        <Chip
                          label={getStatusLabel(invoice.status)}
                          size="small"
                          color={getStatusColor(invoice.status)}
                          variant="outlined"
                          sx={{ 
                            fontFamily: 'Work Sans', 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            height: 22
                          }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  </Box>
</Paper>
        </Grid>
      </Grid>
    </Box>

    {/* Notification Modal */}
<Dialog
  open={notificationModalOpen}
  onClose={() => setNotificationModalOpen(false)}
  maxWidth="sm"
  fullWidth
  scroll="paper"
>
  <DialogTitle sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottom: '1px solid',
    borderColor: 'divider',
    pb: 2
  }}>
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <IconifyIcon 
        icon="mingcute:notification-fill" 
        color="primary.main" 
        fontSize="1.5rem"
      />
      <Box>
        <Typography variant="h6" fontWeight={600}>
          Notifications
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {notificationCount} total • Auto-updates every 5 minutes
        </Typography>
      </Box>
    </Stack>
    <IconButton onClick={() => setNotificationModalOpen(false)} size="small">
      <IconifyIcon icon="mingcute:close-line" />
    </IconButton>
  </DialogTitle>
  
  <DialogContent sx={{ p: 0 }}>
    {notificationLoading ? (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading notifications...
        </Typography>
      </Box>
    ) : notifications.length === 0 ? (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <IconifyIcon 
          icon="mingcute:check-circle-line" 
          width={48} 
          color="success.main"
          sx={{ opacity: 0.7 }}
        />
        <Typography variant="h6" color="text.secondary" mt={2}>
          All caught up!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No notifications at the moment
        </Typography>
      </Box>
    ) : (
      <List sx={{ p: 0 }}>
        {notifications.map((notification, index) => (
          <React.Fragment key={notification.id}>
            <ListItem 
              button
              onClick={() => handleNotificationClick(notification)}
              sx={{ 
                p: 2.5,
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: `${getNotificationColor(notification.priority)}.lighter`,
                  transform: 'translateX(2px)'
                }
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: `${getNotificationColor(notification.priority)}.main`,
                    width: 40,
                    height: 40
                  }}
                >
                  <IconifyIcon 
                    icon={getNotificationIcon(notification.type)} 
                    color="white"
                    fontSize="1.2rem"
                  />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {notification.title}
                    </Typography>
                    <Chip
                      label={notification.priority}
                      size="small"
                      color={getNotificationColor(notification.priority)}
                      sx={{ 
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600
                      }}
                    />
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="text.primary">
                      {notification.message}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {formatNotificationTime(notification.timestamp)}
                      </Typography>
                      {notification.data.amountDue && (
                        <Typography variant="caption" fontWeight={600} color="error.main">
                          {formatCurrency(notification.data.amountDue)}
                        </Typography>
                      )}
                    </Stack>
                  </>
                }
                sx={{ '& .MuiListItemText-secondary': { mt: 0.5 } }}
              />
            </ListItem>
            {index < notifications.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    )}
  </DialogContent>
  
  <DialogActions sx={{ 
    p: 2, 
    borderTop: '1px solid',
    borderColor: 'divider',
    justifyContent: 'space-between'
  }}>
    <Button
      startIcon={<IconifyIcon icon="mingcute:refresh-line" />}
      onClick={fetchNotifications}
      disabled={notificationLoading}
    >
      Refresh
    </Button>
    <Button
      onClick={() => setNotificationModalOpen(false)}
      variant="contained"
    >
      Close
    </Button>
  </DialogActions>
</Dialog>
  </LocalizationProvider>

  
);
};

export default AdminDashboard;