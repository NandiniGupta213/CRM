// src/pages/dashboard/index.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import paths from '../../routes/paths';
import PageLoader from '../../components/loading/PageLoader';

// Import all dashboard components
import Dashboard from '../pages/dashboard/index';
import ProjectManagerDashboard from '../pages/dashboard/projectmanager';
import ClientDashboard from '../pages/dashboard/client';
import EmployeeDashboard from '../pages/dashboard/employee';

const DashboardRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate(paths.login, { state: { from: location } });
      return;
    }

    if (user) {
      // Redirect from generic dashboard to role-specific dashboard
      const currentPath = location.pathname.replace('/dashdarkX', '');
      const genericDashboardPath = paths.dashboard.replace('/dashdarkX', '');
      
      if (currentPath === genericDashboardPath || currentPath === `${genericDashboardPath}/`) {
        const rolePath = getDashboardPath(user.role);
        navigate(rolePath);
      }
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <Dashboard />;
    case 'project_manager':
      return <ProjectManagerDashboard />;
    case 'client':
      return <ClientDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return <EmployeeDashboard />;
  }
};

// Helper function to get dashboard path
const getDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return paths.adminDashboard;
    case 'project_manager':
      return paths.projectManagerDashboard;
    case 'client':
      return paths.clientDashboard;
    case 'employee':
      return paths.employeeDashboard;
    default:
      return paths.login;
  }
};

export default DashboardRouter;