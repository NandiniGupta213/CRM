// src/config/sitemap.js
import paths from '../routes/paths';
import { useAuth } from '../contexts/AuthContext';

// Create a hook for role-based sitemap
export const useSitemap = () => {
  const { user, getUserRole } = useAuth();
  
  
  const userRole = getUserRole ? getUserRole() : null;
  
  // Normalize the role to lowercase for consistent comparison
  const normalizedRole = userRole ? userRole.toLowerCase() : null;
  
  const getDashboardPath = () => {
    if (!user) {
      return paths.login;
    }
    
    
    switch(normalizedRole) {
      case 'admin':
        return paths.adminDashboard;
      case 'project_manager':
      case 'project manager': 
        return paths.projectManagerDashboard;
      case 'client':
        return paths.clientDashboard;
      case 'employee':
        console.log('getDashboardPath: Redirecting to employee dashboard');
        return paths.employeeDashboard;
      default:
        console.log('getDashboardPath: Default to employee dashboard, role was:', normalizedRole);
        return paths.employeeDashboard;
    }
  };

  const getRoleBasedItems = () => {
    console.log('getRoleBasedItems: Starting with normalized role:', normalizedRole);
    
    const baseItems = [
      {
        id: 'dashboard',
        subheader: 'Dashboard',
        path: getDashboardPath(),
        icon: 'mingcute:home-1-fill',
        active: true,
      },
    ];

    console.log('getRoleBasedItems: Normalized role is', normalizedRole);
    
    // Add role-specific items using normalizedRole
    if (normalizedRole === 'admin') {
      baseItems.push(
        {
          id: 'client',
          subheader: 'Clients',
          path: paths.client,
          icon: 'mingcute:user-3-fill',
          active: true,
        },
        {
          id: 'employee',
          subheader: 'Employee',
          path: paths.employees,
          icon: 'mingcute:user-2-fill',
          active: true,
        },
        {
          id: 'project',
          subheader: 'Project',
          path: paths.project,
          icon: 'mingcute:folder-fill',
          active: true,
        },
        {
          id: 'projectTeamManagment',
          subheader: 'ProjectTeamManagment',
          path: paths.projectTeam,
          icon: 'mingcute:group-fill', // Changed icon
          active: true,
        },
        {
          id: 'invoice',
          subheader: 'Invoice',
          path: paths.invoice,
          icon: 'mingcute:file-fill', // Changed icon
          active: true,
        }
      );
    }

    // Update other conditions similarly...
    if (normalizedRole === 'project_manager' || normalizedRole === 'project manager') {
      console.log('getRoleBasedItems: Adding project manager items');
      baseItems.push(
        {
          id: 'projects',
          subheader: 'Projects',
          path: paths.PMproject,
          icon: 'mingcute:folder-fill',
          active: true,
        },
        {
          id: 'taskManagment',
          subheader: 'Task Managment',
          path: paths.taskManagment,
          icon: 'mingcute:task-fill', // Changed icon
          active: true,
        },
        {
          id: 'projectStatus',
          subheader: 'Project Status',
          path: paths.projectStatus,
          icon: 'mingcute:chart-bar-fill', // Changed icon
          active: true,
        },
        {
          id: 'dailyupdates',
          subheader: 'Daily Updates',
          path: paths.dailyupdate,
          icon: 'mingcute:calendar-fill', // Changed icon
          active: true,
        }
      );
    }

    if (normalizedRole === 'client') {
      console.log('getRoleBasedItems: Adding client items');
      baseItems.push(
        {
          id: 'my-projects',
          subheader: 'Projects',
          path: paths.clientproject,
          icon: 'mingcute:folder-fill',
          active: true,
        },
        {
          id: 'invoices',
          subheader: 'Invoices',
          path: paths.clientinvoice,
          icon: 'mingcute:folder-fill', 
          active: true,
        }
      );
    }

    if (normalizedRole === 'employee') {
      console.log('getRoleBasedItems: Adding employee items');
      baseItems.push(
        {
          id: 'taskupdate',
          subheader: 'Daily Updates',
          path: paths.taskupdate,
          icon: 'mingcute:task-fill', // Changed icon
          active: true,
        },
        {
          id: 'project',
          subheader: 'Project',
          path: paths.employeeproject,
          icon: 'mingcute:folder-fill',
          active: true,
        }
      );
    }

     

    // Settings item
    baseItems.push(
      {
        id: 'settings',
        subheader: 'Settings',
        path: paths.accountSettings,
        icon: 'material-symbols:settings-rounded',
        active: true,
      }
    );

    // Logout item
    baseItems.push(
      {
        id: 'logout',
        subheader: 'Logout',
        path: paths.login,
        icon: 'mingcute:exit-fill',
        active: true,
        isLogout: true,
      }
    );

   

    return baseItems;
  };

  const sitemapItems = getRoleBasedItems();

  
  return sitemapItems;
};


const sitemap = [
  {
    id: 'dashboard',
    subheader: 'Dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    active: true,
  },
];

export default sitemap;