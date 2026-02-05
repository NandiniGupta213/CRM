import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ScheduleIcon from '@mui/icons-material/Schedule';

const StyledCard = styled(Card)(({ theme, color = 'primary' }) => ({
  borderRadius: '12px',
  borderTop: `4px solid ${theme.palette[color].main}`,
  height: '100%',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const getIcon = (iconName) => {
  switch (iconName) {
    case 'check':
      return <CheckCircleIcon sx={{ fontSize: 40 }} />;
    case 'pending':
      return <PendingIcon sx={{ fontSize: 40 }} />;
    case 'time':
      return <ScheduleIcon sx={{ fontSize: 40 }} />;
    default:
      return <AssignmentIcon sx={{ fontSize: 40 }} />;
  }
};

const TaskCard = ({ title, count, icon = 'task', color = 'primary', unit = '' }) => {
  return (
    <StyledCard color={color}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div" color={`${color}.main`}>
              {count}
              {unit && <span style={{ fontSize: '1rem', marginLeft: '4px' }}>{unit}</span>}
            </Typography>
          </Box>
          <Box color={`${color}.main`}>
            {getIcon(icon)}
          </Box>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default TaskCard;