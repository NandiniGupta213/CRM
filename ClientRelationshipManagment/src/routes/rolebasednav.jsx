// src/components/navigation/RoleBasedNav.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paths from '../../routes/paths';
import { useAuth } from '../../contexts/AuthContext';

const RoleBasedNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    // Extract active nav based on current path
    const path = location.pathname.replace('/dashdarkX', '');
    
    if (path.includes('/pages/dashboard/admin')) {
      setActiveNav('admin-dashboard');
    } else if (path.includes('/pages/dashboard/project-manager')) {
      setActiveNav('project-manager-dashboard');
    } else if (path.includes('/pages/dashboard/client')) {
      setActiveNav('client-dashboard');
    } else if (path.includes('/pages/dashboard/employee')) {
      setActiveNav('employee-dashboard');
    }
  }, [location]);

  const getDashboardPath = () => {
    if (!user) return paths.login;
    
    switch(user.role) {
      case 'admin':
        return paths.adminDashboard;
      case 'project_manager':
        return paths.projectManagerDashboard;
      case 'client':
        return paths.clientDashboard;
      case 'employee':
        return paths.employeeDashboard;
      default:
        return paths.employeeDashboard;
    }
  };

  const handleDashboardClick = () => {
    navigate(getDashboardPath());
  };

  return (
    <button 
      onClick={handleDashboardClick}
      className={`nav-item ${activeNav.includes('dashboard') ? 'active' : ''}`}
    >
      Dashboard
    </button>
  );
};

export default RoleBasedNav;