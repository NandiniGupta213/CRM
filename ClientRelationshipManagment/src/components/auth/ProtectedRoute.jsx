// src/components/auth/ProtectedRoute.jsx
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import paths from '../../routes/paths';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, getUserRole } = useAuth();
  
  console.log('ProtectedRoute - Checking access');
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to={paths.login} replace />;
  }
  
  if (requiredRole) {
    const userRole = getUserRole();
    console.log('ProtectedRoute - User role:', userRole);
    console.log('ProtectedRoute - Required role:', requiredRole);
    
    if (userRole !== requiredRole) {
      // Redirect to appropriate dashboard based on role
      let redirectPath = paths.dashboard;
      switch(userRole) {
        case 'admin':
          redirectPath = paths.adminDashboard;
          break;
        case 'project_manager':
          redirectPath = paths.projectManagerDashboard;
          break;
        case 'client':
          redirectPath = paths.clientDashboard;
          break;
        case 'employee':
          redirectPath = paths.employeeDashboard;
          break;
      }
      console.log('ProtectedRoute - Redirecting to:', redirectPath);
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  console.log('ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute;