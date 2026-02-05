import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import AvatarImage from '../../../../assets/images/avater.png';

const ProfileListItem = ({ subheader, path, isActive = false }) => {
  return (
    <ListItemButton
      component={RouterLink}
      to={path}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        // Active state styles
        bgcolor: isActive ? 'primary.lighter' : 'transparent',
        '&:hover': {
          bgcolor: isActive ? 'primary.lighter' : 'action.hover',
        },
        py: 1.5,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" width="100%">
        <Avatar
          src={AvatarImage}
          sx={{ 
            height: 36, 
            width: 36, 
            bgcolor: isActive ? 'primary.main' : 'action.selected',
            border: isActive ? '2px solid' : 'none',
            borderColor: isActive ? 'primary.main' : 'transparent'
          }}
        />
        <Stack direction="column">
          <Typography 
            variant="subtitle2" 
            color={isActive ? 'primary.main' : 'text.primary'} 
            letterSpacing={0.5}
            fontWeight={isActive ? 600 : 400}
          >
            {subheader || 'User Name'}
          </Typography>
          <Typography 
            variant="caption" 
            color={isActive ? 'primary.dark' : 'text.secondary'} 
            fontWeight={400}
          >
            Account Settings
          </Typography>
        </Stack>
      </Stack>
    </ListItemButton>
  );
};

export default ProfileListItem;