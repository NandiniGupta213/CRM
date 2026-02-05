import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import SupportIcon from '@mui/icons-material/Support';
import FolderIcon from '@mui/icons-material/Folder';

const StyledCard = styled(Card)(({ theme, status }) => {
  let color;
  switch (status) {
    case 'completed':
      color = theme.palette.success.main;
      break;
    case 'pending':
      color = theme.palette.warning.main;
      break;
    case 'support':
      color = theme.palette.info.main;
      break;
    default:
      color = theme.palette.primary.main;
  }

  return {
    borderRadius: '12px',
    borderTop: `4px solid ${color}`,
    height: '100%',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
    },
  };
});

const getIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 40 }} />;
    case 'pending':
      return <PendingIcon sx={{ color: 'warning.main', fontSize: 40 }} />;
    case 'support':
      return <SupportIcon sx={{ color: 'info.main', fontSize: 40 }} />;
    default:
      return <FolderIcon sx={{ color: 'primary.main', fontSize: 40 }} />;
  }
};

const ProjectStatusCard = ({ title, count, status = 'active' }) => {
  return (
    <StyledCard status={status}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div">
              {count}
            </Typography>
          </Box>
          <Box>{getIcon(status)}</Box>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default ProjectStatusCard;