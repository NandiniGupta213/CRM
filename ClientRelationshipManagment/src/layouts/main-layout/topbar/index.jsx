import { fontFamily } from '../../../theme/typography';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import IconifyIcon from '../../../components/base/IconifyIcon';
import Image from '../../../components/base/Image';
import LogoImg from '../../../assets/images/Logo.png';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const Topbar = ({ isClosing, mobileOpen, setMobileOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  // Get role-based page title
  const getPageTitle = () => {
    if (!user) return "Analytics";
    
    // Extract role from user (handle different formats)
    const userRole = user?.roleName?.toLowerCase() || 
                     (user?.role === 1 ? 'admin' : 
                      user?.role === 2 ? 'project_manager' : 
                      user?.role === 3 ? 'client' : 'employee');
    
    // Get current path
    const currentPath = location.pathname;
    
    // Define page titles based on path and role
    const pageTitles = {
      '/dashboard': 'Dashboard',
      '/admin/dashboard': 'Admin Dashboard',
      '/client/dashboard': 'Client Dashboard',
      '/employee/dashboard': 'Employee Dashboard',
      '/project-manager/dashboard': 'Project Manager Dashboard',
      '/projects': 'Projects',
      '/invoices': 'Invoices',
      '/clients': 'Clients',
      '/employees': 'Employees',
      '/tasks': 'My Tasks',
      '/timesheet': 'Timesheet',
      '/settings': 'Settings',
      '/account': 'Account Settings',
    };
    
    // Return specific page title or role-based default
    return pageTitles[currentPath] || 
           (userRole === 'admin' ? 'Admin Dashboard' :
            userRole === 'project_manager' ? 'Project Manager Dashboard' :
            userRole === 'client' ? 'Client Portal' : 'My Dashboard');
  };

  return (
    <Stack 
      alignItems="center" 
      justifyContent="space-between" 
      mb={{ xs: 0, lg: 1 }}
      direction="row"
      width="100%"
      px={{ xs: 2, lg: 0 }}
    >
      {/* Left section */}
      <Stack spacing={2} alignItems="center" direction="row">
        {/* Mobile menu button - Fixed typo from xm to xs */}
        <Toolbar sx={{ display: { xs: 'flex', lg: 'none' }, p: 0, minHeight: 'auto' }}>
          <IconButton
            size="medium"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
            sx={{ mr: 1 }}
          >
            <IconifyIcon icon="mingcute:menu-line" />
          </IconButton>
        </Toolbar>

        {/* Mobile logo - Fixed typo from xm to xs */}
        <ButtonBase
          component={Link}
          href="/"
          disableRipple
          sx={{ 
            display: { xs: 'flex', lg: 'none' }, 
            alignItems: 'center',
            textDecoration: 'none'
          }}
        >
          <Image src={LogoImg} alt="logo" height={24} width={24} sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            fontWeight={600}
            letterSpacing={0.5}
            fontFamily={fontFamily.workSans}
            color="text.primary"
          >
            CRM
          </Typography>
        </ButtonBase>

        {/* Desktop title */}
        <Typography
          variant="h5"
          fontWeight={600}
          letterSpacing={1}
          fontFamily={fontFamily.workSans}
          display={{ xs: 'none', lg: 'block' }}
          color="text.primary"
        >
          {getPageTitle()}
        </Typography>
      </Stack>

      {/* Right section */}
      <Stack spacing={1} alignItems="center" direction="row">


        <ProfileMenu />
      </Stack>
    </Stack>
  );
};

export default Topbar;