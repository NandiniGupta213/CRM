// src/components/sections/projectmanager/project.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
  Button,
  Tab,
  Tabs,
  CardHeader,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Folder as FolderIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Timeline as TimelineIcon,
  PauseCircle as PauseIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreVertIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

const PMDashboard = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalClients: 0,
    totalTeamMembers: 0
  });

  const API_BASE_URL = 'http://localhost:8000';

  // Color palette for professional look
  const colors = {
    primary: '#1976d2',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#ffffff',
    white: '#ffffff'
  };

  // Fetch data
  useEffect(() => {
    // Fix the fetchData function in your PMDashboard component:
const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      setError('Please login to access dashboard');
      setLoading(false);
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Fetch all data in parallel to improve performance
    const [projectsRes, clientsRes, teamRes] = await Promise.all([
      fetch(`${API_BASE_URL}/pm/projects`, { headers }),
      fetch(`${API_BASE_URL}/pm/clients`, { headers }),
      fetch(`${API_BASE_URL}/pm/team-members`, { headers })
    ]);

    // Check for authentication error first
    if (projectsRes.status === 401 || clientsRes.status === 401 || teamRes.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return;
    }

    // Parse all responses
    const projectsData = projectsRes.ok ? await projectsRes.json() : null;
    const clientsData = clientsRes.ok ? await clientsRes.json() : null;
    const teamData = teamRes.ok ? await teamRes.json() : null;

    // Process projects
    if (!projectsData || !projectsData.success) {
      throw new Error(projectsData?.message || 'Failed to load projects');
    }
    
    const projectsWithProgress = (projectsData.data || []).map(project => ({
      ...project,
      progress: project.progress || 0,
      status: project.status || 'planned'
    }));
    setProjects(projectsWithProgress);

    // Process clients
    if (clientsData?.success) {
      setClients(clientsData.data || []);
    } else {
      console.warn('Failed to fetch clients:', clientsData?.message || 'Unknown error');
      setClients([]);
    }

    // Process team members
    if (teamData?.success) {
      setTeamMembers(teamData.data?.teamMembers || []);
    } else {
      console.warn('Failed to fetch team members:', teamData?.message || 'Unknown error');
      setTeamMembers([]);
    }

    // Update dashboard stats
    setDashboardStats({
      totalProjects: projectsWithProgress.length,
      activeProjects: projectsWithProgress.filter(p => p.status === 'in-progress').length,
      totalClients: clientsData?.success ? (clientsData.data?.length || 0) : 0,
      totalTeamMembers: teamData?.success ? (teamData.data?.teamMembers?.length || 0) : 0
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    setError(error.message || 'Failed to load data');
    
    // Reset state on error
    setProjects([]);
    setClients([]);
    setTeamMembers([]);
    setDashboardStats({
      totalProjects: 0,
      activeProjects: 0,
      totalClients: 0,
      totalTeamMembers: 0
    });
  } finally {
    setLoading(false);
  }
};

    fetchData();
  }, []);

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { 
          icon: <CheckCircleIcon fontSize="small" />, 
          color: 'success',
          bgColor: alpha(colors.success, 0.1),
          textColor: colors.success,
          borderColor: alpha(colors.success, 0.3)
        };
      case 'in-progress':
        return { 
          icon: <TimelineIcon fontSize="small" />, 
          color: 'primary',
          bgColor: alpha(colors.primary, 0.1),
          textColor: colors.primary,
          borderColor: alpha(colors.primary, 0.3)
        };
      case 'planned':
        return { 
          icon: <HourglassIcon fontSize="small" />, 
          color: 'warning',
          bgColor: alpha(colors.warning, 0.1),
          textColor: colors.warning,
          borderColor: alpha(colors.warning, 0.3)
        };
      case 'on-hold':
        return { 
          icon: <PauseIcon fontSize="small" />, 
          color: 'info',
          bgColor: alpha(colors.info, 0.1),
          textColor: colors.info,
          borderColor: alpha(colors.info, 0.3)
        };
      case 'cancelled':
        return { 
          icon: <CancelIcon fontSize="small" />, 
          color: 'error',
          bgColor: alpha(colors.danger, 0.1),
          textColor: colors.danger,
          borderColor: alpha(colors.danger, 0.3)
        };
      default:
        return { 
          icon: <FolderIcon fontSize="small" />, 
          color: 'default',
          bgColor: alpha(colors.white, 0.1),
          textColor: colors.white,
          borderColor: alpha(colors.white, 0.3)
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate days left
  const calculateDaysLeft = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Custom Tab Component
  const CustomTab = ({ label, count, icon, active }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      px: 2,
      py: 1.5,
      borderRadius: '8px',
      backgroundColor: active ? alpha(colors.primary, 0.08) : 'transparent',
      border: active ? `1px solid ${alpha(colors.primary, 0.2)}` : '1px solid transparent',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}>
      {icon}
      <Typography 
        variant="body1" 
        fontWeight={active ? 600 : 400}
        color={active ? colors.primary : colors.white}
      >
        {label}
      </Typography>
      <Badge 
        badgeContent={count} 
        color={active ? "primary" : "default"}
        sx={{ 
          '& .MuiBadge-badge': { 
            fontSize: '0.7rem',
            height: '20px',
            minWidth: '20px'
          }
        }}
      />
    </Box>
  );

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Box textAlign="center">
          <CircularProgress size={60} sx={{ color: colors.primary }} />
          <Typography variant="body1" sx={{ mt: 2 }} color={colors.white}>
            Loading dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center', 
          borderRadius: 2,
          border: `1px solid ${alpha(colors.danger, 0.2)}`,
          backgroundColor: alpha(colors.danger, 0.02)
        }}>
          <Box sx={{ mb: 3 }}>
            <CancelIcon sx={{ fontSize: 60, color: colors.danger, opacity: 0.8 }} />
          </Box>
          <Typography variant="h6" color={colors.danger} gutterBottom fontWeight={600}>
            Unable to Load Dashboard
          </Typography>
          <Typography variant="body2" color={colors.white} sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{
              backgroundColor: colors.primary,
              '&:hover': {
                backgroundColor: alpha(colors.primary, 0.9)
              }
            }}
          >
            Retry Loading
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>

      {/* Dashboard Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Projects Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            height: '100%',
            bgcolor: '#110947'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                  <FolderIcon sx={{ color: 'primary.white' }} />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Projects
                </Typography>
              </Box>
              <Typography variant="h3" color="primary" fontWeight={800}>
                {dashboardStats.totalProjects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Active Projects Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            height: '100%',
             bgcolor: '#110947'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', mr: 2 }}>
                  <TimelineIcon sx={{ color: 'success.white' }} />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Projects
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main" fontWeight={800}>
                {dashboardStats.activeProjects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Team Members Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            height: '100%',
            bgcolor: '#110947'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', mr: 2 }}>
                  <PeopleIcon sx={{ color: 'warning.white' }} />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Team Members
                </Typography>
              </Box>
              <Typography variant="h3" color="warning.main" fontWeight={800}>
                {dashboardStats.totalTeamMembers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Clients Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            height: '100%',
             bgcolor: '#110947'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.light', mr: 2 }}>
                  <BusinessIcon sx={{ color: 'info.white' }} />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Clients
                </Typography>
              </Box>
              <Typography variant="h3" color="info.white" fontWeight={800}>
                {dashboardStats.totalClients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigation */}
      <Paper sx={{ 
        mb: 4, 
        borderRadius: 2,
        border: `1px solid ${alpha(colors.white, 0.1)}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <Box sx={{ 
          borderBottom: `1px solid ${alpha(colors.white, 0.1)}`,
          px: 2,
          py: 1
        }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: colors.primary,
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              label={
                <CustomTab 
                  label="Projects" 
                  count={projects.length} 
                  icon={<FolderIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                  active={tabValue === 0}
                />
              }
              sx={{ 
                minHeight: 60,
                '&.Mui-selected': {
                  color: colors.primary
                }
              }}
            />
            <Tab 
              label={
                <CustomTab 
                  label="Clients" 
                  count={clients.length} 
                  icon={<BusinessIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                  active={tabValue === 1}
                />
              }
              sx={{ 
                minHeight: 60,
                '&.Mui-selected': {
                  color: colors.primary
                }
              }}
            />
            <Tab 
            label={
                <CustomTab 
                label="Team" 
                count={(() => {
                    // Get unique project IDs from team members
                    const uniqueProjectIds = new Set();
                    teamMembers.forEach(member => {
                    if (member.projectId) {
                        uniqueProjectIds.add(member.projectId);
                    }
                    });
                    return uniqueProjectIds.size;
                })()}
                icon={<PeopleIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                active={tabValue === 2}
                />
            }
            sx={{ 
                minHeight: 60,
                '&.Mui-selected': {
                color: colors.primary
                }
            }}
            />
          </Tabs>
        </Box>

        {/* Content Area */}
        {/* Content Area */}
<Box sx={{ p: 3 }}>
  {/* Projects Tab */}
  {tabValue === 0 && (
    <>
      {projects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FolderIcon sx={{ fontSize: 80, color: alpha(colors.white, 0.3), mb: 2 }} />
          <Typography variant="h6" color={colors.white} gutterBottom>
            No Projects Found
          </Typography>
          <Typography variant="body2" color={alpha(colors.white, 0.7)}>
            You don't have any projects assigned to you yet.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          overflowX: { xs: 'auto', sm: 'visible' },
          '&::-webkit-scrollbar': {
            height: '6px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '3px'
          }
        }}>
          <Box sx={{ minWidth: { xs: '800px', sm: 'auto' } }}>
            <Grid container spacing={3}>
              {projects.map((project) => {
                const daysLeft = calculateDaysLeft(project.deadline);
                const statusConfig = getStatusConfig(project.status);
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={project._id} sx={{ minWidth: { xs: '300px', sm: 'auto' } }}>
                    <Card sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      border: `1px solid ${alpha(colors.white, 0.1)}`,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        borderColor: alpha(colors.primary, 0.2)
                      }
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        {/* Project Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                          <Box>
                            <Typography variant="caption" color={colors.white} display="block" sx={{ mb: 0.5 }}>
                              {project.projectId}
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color={colors.dark}>
                              {project.title}
                            </Typography>
                            <Typography variant="body2" color={alpha(colors.white, 0.7)} sx={{ mt: 0.5 }}>
                              {project.projectType}
                            </Typography>
                          </Box>
                          <Chip
                            icon={statusConfig.icon}
                            label={project.status}
                            size="small"
                            sx={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.textColor,
                              border: `1px solid ${statusConfig.borderColor}`,
                              fontWeight: 500,
                              textTransform: 'capitalize',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>

                        {/* Client Info */}
                        <Box sx={{ 
                          mb: 3, 
                          p: 2, 
                          borderRadius: 1.5, 
                          backgroundColor: alpha(colors.white, 0.02),
                          border: `1px solid ${alpha(colors.white, 0.08)}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <BusinessIcon fontSize="small" sx={{ color: colors.white }} />
                            <Typography variant="body2" fontWeight={500} color={colors.white}>
                              Client
                            </Typography>
                          </Box>
                          <Typography variant="subtitle2" color={colors.dark} fontWeight={500}>
                            {project.client?.companyName || 'No client assigned'}
                          </Typography>
                          <Typography variant="caption" color={alpha(colors.white, 0.7)}>
                            {project.client?.name || 'N/A'}
                          </Typography>
                        </Box>

                        {/* Progress */}
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color={colors.white}>
                              Progress
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color={colors.dark}>
                              {project.progress || 0}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress || 0}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(colors.white, 0.1),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: project.progress >= 70 ? colors.success : 
                                              project.progress >= 40 ? colors.warning : colors.primary
                              }
                            }}
                          />
                        </Box>

                        {/* Timeline */}
                        <Box sx={{ mb: 3 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <CalendarIcon fontSize="small" sx={{ color: colors.white, fontSize: 14 }} />
                                <Typography variant="caption" color={colors.white}>
                                  Start Date
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={500} color={colors.dark}>
                                {formatDate(project.startDate)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <CalendarIcon fontSize="small" sx={{ color: colors.white, fontSize: 14 }} />
                                <Typography variant="caption" color={colors.white}>
                                  Deadline
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={500} color={colors.dark}>
                                {formatDate(project.deadline)}
                              </Typography>
                              {daysLeft !== null && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 500,
                                    color: daysLeft < 0 ? colors.danger : 
                                          daysLeft < 7 ? colors.warning : colors.success
                                  }}
                                >
                                  {daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}
                                </Typography>
                              )}
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Team Members Count */}
                        <Divider sx={{ 
                          my: 2, 
                          borderColor: alpha(colors.white, 0.1) 
                        }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" color={colors.white} display="block" sx={{ mb: 1 }}>
                              Team Members
                            </Typography>
                            <Typography variant="body2" color={alpha(colors.white, 0.6)}>
                              Team details available in Team tab
                            </Typography>
                          </Box>
                          <Typography variant="caption" color={colors.white}>
                            {teamMembers.filter(m => m.projectId === project.projectId).length || 0} member(s)
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
      )}
    </>
  )}

  {/* Clients Tab */}
  {tabValue === 1 && (
    <>
      {clients.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BusinessIcon sx={{ fontSize: 80, color: alpha(colors.white, 0.3), mb: 2 }} />
          <Typography variant="h6" color={colors.white} gutterBottom>
            No Clients Found
          </Typography>
          <Typography variant="body2" color={alpha(colors.white, 0.7)}>
            No clients are associated with your projects.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          overflowX: { xs: 'auto', sm: 'visible' },
          '&::-webkit-scrollbar': {
            height: '6px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '3px'
          }
        }}>
          <Box sx={{ minWidth: { xs: '800px', sm: 'auto' } }}>
            <Grid container spacing={3}>
              {clients.map((client) => (
                <Grid item xs={12} sm={6} md={4} key={client._id} sx={{ minWidth: { xs: '300px', sm: 'auto' } }}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 2,
                    border: `1px solid ${alpha(colors.white, 0.1)}`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      borderColor: alpha(colors.primary, 0.2)
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      {/* Client Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            backgroundColor: alpha(colors.primary, 0.1),
                            color: colors.primary,
                            fontWeight: 600
                          }}
                        >
                          {client.companyName?.charAt(0) || 'C'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={600} color={colors.dark} noWrap>
                            {client.companyName}
                          </Typography>
                          <Typography variant="body2" color={alpha(colors.white, 0.7)} noWrap>
                            {client.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={client.status}
                          size="small"
                          color={client.status === 'active' ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>

                      {/* Contact Info */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <EmailIcon fontSize="small" sx={{ color: colors.white }} />
                          <Typography variant="body2" color={colors.white} noWrap>
                            {client.email}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <PhoneIcon fontSize="small" sx={{ color: colors.white }} />
                          <Typography variant="body2" color={colors.white}>
                            {client.phone}
                          </Typography>
                        </Box>
                        {client.city && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <LocationIcon fontSize="small" sx={{ color: colors.white }} />
                            <Typography variant="body2" color={colors.white}>
                              {client.city}, {client.state}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Stats */}
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 1.5, 
                        backgroundColor: alpha(colors.white, 0.02),
                        border: `1px solid ${alpha(colors.white, 0.08)}`,
                        mb: 3 
                      }}>
                        <Typography variant="caption" color={colors.white} display="block" sx={{ mb: 1 }}>
                          PROJECTS WITH YOU
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h4" fontWeight={700} color={colors.dark}>
                            {client.projectCount || 0}
                          </Typography>
                          <FolderIcon sx={{ color: alpha(colors.primary, 0.5) }} />
                        </Box>
                      </Box>

                      {/* Projects Summary */}
                      <Typography variant="caption" color={colors.white} display="block" sx={{ mb: 1 }}>
                        Summary
                      </Typography>
                      <Typography variant="body2" color={alpha(colors.white, 0.7)}>
                        {client.projectCount === 0 
                          ? 'No projects assigned' 
                          : `Manages ${client.projectCount} project${client.projectCount > 1 ? 's' : ''} with you`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      )}
    </>
  )}

  {/* Team Tab */}
  {tabValue === 2 && (
    <>
      {teamMembers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PeopleIcon sx={{ fontSize: 80, color: alpha(colors.white, 0.3), mb: 2 }} />
          <Typography variant="h6" color={colors.white} gutterBottom>
            No Team Members
          </Typography>
          <Typography variant="body2" color={alpha(colors.white, 0.7)}>
            No team members are assigned to your projects.
          </Typography>
        </Box>
      ) : (
        <>
          {/* First, group team members by project */}
          {(() => {
            // Group team members by project
            const projectsWithTeams = {};
            
            teamMembers.forEach(member => {
              const projectId = member.projectId || 'unassigned';
              if (!projectsWithTeams[projectId]) {
                projectsWithTeams[projectId] = {
                  projectId: projectId,
                  projectTitle: member.projectTitle || 'Unassigned Project',
                  members: []
                };
              }
              projectsWithTeams[projectId].members.push(member);
            });

            const projectEntries = Object.values(projectsWithTeams);

            return (
              <Box sx={{ 
                overflowX: { xs: 'auto', sm: 'visible' },
                '&::-webkit-scrollbar': {
                  height: '6px'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '3px'
                }
              }}>
                <Box sx={{ minWidth: { xs: '800px', sm: 'auto' } }}>
                  <Grid container spacing={3}>
                    {projectEntries.map((projectGroup, projectIndex) => (
                      <Grid item xs={12} key={projectGroup.projectId || projectIndex} sx={{ minWidth: { xs: '800px', sm: 'auto' } }}>
                        <Card sx={{ 
                          borderRadius: 2,
                          border: `1px solid ${alpha(colors.white, 0.1)}`,
                          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                          mb: 3
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            {/* Project Header */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              mb: 3,
                              pb: 2,
                              borderBottom: `2px solid ${alpha(colors.primary, 0.2)}`
                            }}>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                  <FolderIcon sx={{ color: colors.primary }} />
                                  <Typography variant="h6" fontWeight={600} color={colors.dark}>
                                    {projectGroup.projectTitle}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color={colors.white}>
                                  Project ID: {projectGroup.projectId}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${projectGroup.members.length} Member${projectGroup.members.length !== 1 ? 's' : ''}`}
                                color="primary"
                                variant="outlined"
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.875rem'
                                }}
                              />
                            </Box>

                            {/* Team Members Grid */}
                            <Grid container spacing={2}>
                              {projectGroup.members.map((member, index) => (
                                <Grid item xs={12} sm={6} md={4} key={member._id || index} sx={{ minWidth: { xs: '300px', sm: 'auto' } }}>
                                  <Paper sx={{ 
                                    p: 2, 
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(colors.white, 0.08)}`,
                                    backgroundColor: alpha(colors.white, 0.02),
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      backgroundColor: alpha(colors.white, 0.04),
                                      borderColor: alpha(colors.primary, 0.2)
                                    }
                                  }}>
                                    {/* Member Info */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                      <Avatar
                                        sx={{
                                          width: 48,
                                          height: 48,
                                          backgroundColor: alpha(colors.primary, 0.1),
                                          color: colors.primary,
                                          fontWeight: 600,
                                          border: `2px solid ${alpha(colors.primary, 0.3)}`
                                        }}
                                      >
                                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                                      </Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography 
                                          variant="subtitle1" 
                                          fontWeight={600} 
                                          color={colors.dark}
                                          noWrap
                                        >
                                          {member.name || 'Unknown Member'}
                                        </Typography>
                                        <Chip
                                          label={member.memberRole || member.role || 'Member'}
                                          size="small"
                                          sx={{
                                            backgroundColor: alpha(colors.primary, 0.1),
                                            color: colors.primary,
                                            border: `1px solid ${alpha(colors.primary, 0.3)}`,
                                            fontWeight: 500,
                                            fontSize: '0.7rem',
                                            height: 20,
                                            mt: 0.5
                                          }}
                                        />
                                      </Box>
                                    </Box>

                                    {/* Member Details */}
                                    <Box sx={{ pl: 6 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <EmailIcon fontSize="small" sx={{ color: colors.white, fontSize: 16 }} />
                                        <Typography variant="body2" color={colors.white} noWrap>
                                          {member.email}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PersonIcon fontSize="small" sx={{ color: colors.white, fontSize: 16 }} />
                                        <Typography variant="body2" color={colors.white}>
                                          {member.department || 'Not specified'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>

                            {/* Summary for the project */}
                            {projectGroup.members.length > 0 && (
                              <Box sx={{ 
                                mt: 3, 
                                pt: 2, 
                                borderTop: `1px solid ${alpha(colors.white, 0.1)}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <Typography variant="caption" color={colors.white}>
                                  Team Summary for {projectGroup.projectTitle}
                                </Typography>
                                <Typography variant="body2" color={colors.primary} fontWeight={500}>
                                  {projectGroup.members.length} team member{projectGroup.members.length !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            );
          })()}
        </>
      )}
    </>
  )}
</Box>
      </Paper>

      {/* Summary Footer */}
      <Paper sx={{ 
        p: 3, 
        borderRadius: 2,
        backgroundColor: alpha(colors.primary, 0.02),
        border: `1px solid ${alpha(colors.primary, 0.1)}`
      }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '10px',
                backgroundColor: alpha(colors.primary, 0.1)
              }}>
                <FolderIcon sx={{ color: colors.primary }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={600} color={colors.dark}>
                  {projects.length}
                </Typography>
                <Typography variant="body2" color={colors.white}>
                  Total Projects
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '10px',
                backgroundColor: alpha(colors.success, 0.1)
              }}>
                <BusinessIcon sx={{ color: colors.success }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={600} color={colors.dark}>
                  {clients.length}
                </Typography>
                <Typography variant="body2" color={colors.white}>
                  Active Clients
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '10px',
                backgroundColor: alpha(colors.warning, 0.1)
              }}>
                <PeopleIcon sx={{ color: colors.warning }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={600} color={colors.dark}>
                  {teamMembers.length}
                </Typography>
                <Typography variant="body2" color={colors.white}>
                  Team Members
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default PMDashboard;