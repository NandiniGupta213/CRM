import { Box } from '@mui/material';

const Image = ({ sx, ...rest }) => {
  return <Box component="img" sx={sx} {...rest} />;
};

export default Image;
