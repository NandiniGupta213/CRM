import { Link as RouterLink } from 'react-router-dom';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from '../../../../components/base/IconifyIcon';

const ListItem = ({ title, path, icon, isActive = false, isLogout = false, sx = {}, ...other }) => {
  // Determine styles based on whether it's a logout button
  const getStyles = () => {
    if (isLogout) {
      return {
        bgcolor: 'transparent',
        color: 'error.main',
        '&:hover': {
          bgcolor: 'error.lighter',
        },
        '& .MuiListItemIcon-root': {
          color: 'error.main',
        },
        '& .MuiListItemText-primary': {
          fontWeight: 400,
          color: 'error.main',
        },
      };
    }
    
    if (isActive) {
      return {
        bgcolor: 'primary.lighter',
        color: 'primary.main',
        '&:hover': {
          bgcolor: 'primary.lighter',
        },
        '& .MuiListItemIcon-root': {
          color: 'primary.main',
        },
        '& .MuiListItemText-primary': {
          fontWeight: 600,
        },
      };
    }
    
    return {
      bgcolor: 'transparent',
      color: 'text.primary',
      '&:hover': {
        bgcolor: 'action.hover',
      },
      '& .MuiListItemIcon-root': {
        color: 'text.secondary',
      },
      '& .MuiListItemText-primary': {
        fontWeight: 400,
      },
    };
  };

  return (
    <ListItemButton
      component={RouterLink}
      to={path}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        ...getStyles(),
        ...sx,
      }}
      {...other}
    >
      {icon && (
        <ListItemIcon sx={{ minWidth: 40 }}>
          <IconifyIcon icon={icon} fontSize={20} />
        </ListItemIcon>
      )}
      <ListItemText
        primary={title}
        primaryTypographyProps={{
          fontSize: '0.9375rem',
        }}
      />
    </ListItemButton>
  );
};

export default ListItem;