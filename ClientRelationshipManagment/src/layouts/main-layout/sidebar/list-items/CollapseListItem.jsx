import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import List from '@mui/material/List';
import Collapse from '@mui/material/Collapse';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from '../../../../components/base/IconifyIcon';

const CollapseListItem = ({ title, icon, items = [], isActive = false }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  // Check if any child item is active
  const hasActiveChild = items.some(item => item.active);

  return (
    <>
      <ListItemButton 
        onClick={handleClick}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          // Active state styles
          bgcolor: (isActive || hasActiveChild) ? 'primary.lighter' : 'transparent',
          color: (isActive || hasActiveChild) ? 'primary.main' : 'text.primary',
          '&:hover': {
            bgcolor: (isActive || hasActiveChild) ? 'primary.lighter' : 'action.hover',
          },
          '& .MuiListItemIcon-root': {
            color: (isActive || hasActiveChild) ? 'primary.main' : 'text.secondary',
          },
          '& .MuiListItemText-primary': {
            fontWeight: (isActive || hasActiveChild) ? 600 : 400,
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          {icon && (
            <IconifyIcon icon={icon} fontSize={20} />
          )}
        </ListItemIcon>

        <ListItemText
          primary={title}
          primaryTypographyProps={{
            fontSize: '0.9375rem',
          }}
        />

        <IconifyIcon
          icon="mingcute:down-line"
          sx={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
            fontSize: 16,
            color: (isActive || hasActiveChild) ? 'primary.main' : 'text.secondary',
          }}
        />
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2.5 }}>
          {items.map((item) => (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                pl: 3,
                // Active state for child items
                bgcolor: item.active ? 'primary.lighter' : 'transparent',
                borderLeft: item.active ? '3px solid' : 'none',
                borderColor: item.active ? 'primary.main' : 'transparent',
                color: item.active ? 'primary.main' : 'text.primary',
                '&:hover': {
                  bgcolor: item.active ? 'primary.lighter' : 'action.hover',
                },
                '& .MuiListItemText-primary': {
                  fontWeight: item.active ? 600 : 400,
                },
              }}
            >
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </>
  );
};

export default CollapseListItem;