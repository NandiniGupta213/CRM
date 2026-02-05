import { Box } from '@mui/material';
import { Icon } from '@iconify/react';

const IconifyIcon = ({ icon, ...rest }) => {
  return <Box component={Icon} icon={icon} {...rest} />;
};

export default IconifyIcon;
