import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconifyIcon from '../../../components/base/IconifyIcon';
import AvatarImage from '../../../assets/images/avater.png';
import { useAuth } from '../../../contexts/AuthContext';
import paths from '../../../routes/paths';

const ProfileMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuClick = (itemId) => {
    handleProfileMenuClose();
    
    switch(itemId) {

      case 1: // Account Settings
        navigate(paths.accountSettings);
        break;
      case 2: // Logout
        if (logout) {
          logout();
        }
        navigate(paths.login);
        break;
      default:
        break;
    }
  };

  const menuItems = [
    { id: 1, title: 'Account Settings', icon: 'material-symbols:settings-account-box-rounded' },
    { id: 2, title: 'Logout', icon: 'material-symbols:logout', color: 'error.main' },
  ];

  // Get user display name
  const getUserName = () => {
    if (!user) return "Guest";
    return user.username || user.name || user.email?.split('@')[0] || "User";
  };

  // Get user role display name
  const getUserRoleDisplay = () => {
    if (!user) return "Guest";
    
    const roleMap = {
      'admin': 'Administrator',
      'project_manager': 'Project Manager',
      'client': 'Client',
      'employee': 'Employee',
      'Admin': 'Administrator',
      'Project Manager': 'Project Manager',
      'Client': 'Client',
      'Employee': 'Employee'
    };
    
    return roleMap[user.roleName] || roleMap[user.roleName?.toLowerCase()] || 'User';
  };

  return (
    <>
      <Tooltip title="Profile">
        <ButtonBase 
          onClick={handleProfileClick} 
          disableRipple
          sx={{ 
            borderRadius: 1,
            p: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Stack
            spacing={0.5}
            alignItems="center"
            direction="row"
            aria-controls={open ? 'account-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
          >
            <Avatar
              src={AvatarImage}
              alt={getUserName()}
              sx={(theme) => ({
                height: 36,
                width: 36,
                bgcolor: theme.palette.primary.main,
                border: `2px solid ${theme.palette.background.paper}`,
                boxShadow: theme.shadows[1],
              })}
            />
            <Stack direction="column" sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="subtitle2" color="text.primary" fontWeight={600} lineHeight={1}>
                {getUserName()}
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>
                {getUserRoleDisplay()}
              </Typography>
            </Stack>
            <IconifyIcon 
              icon={open ? "mingcute:up-line" : "mingcute:down-line"} 
              sx={{ 
                ml: 0.5, 
                color: 'text.secondary',
                fontSize: 20
              }} 
            />
          </Stack>
        </ButtonBase>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 4,
          sx: {
            mt: 1.5,
            width: 280,
            overflow: 'hidden',
            borderRadius: 1.5,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            '& .MuiMenuItem-root': {
              py: 1.25,
              px: 2,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Section */}
        <MenuItem 
          sx={{ 
            py: 2, 
            bgcolor: 'info.darker',
            '&:hover': { 
              bgcolor: 'info.darker' 
            },
            cursor: 'default'
          }}
        >
          <Avatar 
            src={AvatarImage} 
            alt={getUserName()}
            sx={{ 
              height: 48, 
              width: 48, 
              bgcolor: 'primary.main',
              mr: 2,
              border: `2px solid ${theme => theme.palette.background.paper}`
            }} 
          />
          <Stack direction="column">
            <Typography variant="body1" fontWeight={600} color="text.primary">
              {getUserName()}
            </Typography>
            <Typography variant="caption" fontWeight={500} color="text.secondary">
              {user?.email || 'No email'}
            </Typography>
            <Typography variant="caption" color="primary.main" fontWeight={500}>
              {getUserRoleDisplay()}
            </Typography>
          </Stack>
        </MenuItem>

        <Divider />

        {/* Menu Items */}
        {menuItems.map((item) => (
          <MenuItem 
            key={item.id} 
            onClick={() => handleMenuClick(item.id)}
            sx={{ 
              '&:hover': { 
                bgcolor: 'action.hover' 
              },
              ...(item.id === 6 && {
                mt: 1,
                borderTop: '1px solid',
                borderColor: 'divider'
              })
            }}
          >
            <ListItemIcon sx={{ mr: 2, minWidth: 36 }}>
              <IconifyIcon 
                icon={item.icon} 
                sx={{ 
                  fontSize: 20,
                  color: item.color || 'text.secondary'
                }} 
              />
            </ListItemIcon>
            <Typography 
              variant="body2" 
              sx={{ 
                color: item.color || 'text.secondary',
                fontWeight: item.color ? 600 : 400
              }}
            >
              {item.title}
            </Typography>
            {item.id === 3 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  ml: 'auto', 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  px: 1,
                  py: 0.25,
                  borderRadius: 10,
                  fontSize: '0.65rem',
                  fontWeight: 600
                }}
              >
                3
              </Typography>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ProfileMenu;