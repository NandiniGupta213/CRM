import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

const teamMembers = [
  {
    name: 'John Smith',
    role: 'Lead Developer',
    tasksCompleted: 42,
    totalTasks: 50,
    productivity: 84,
    avatarColor: '#1976d2',
  },
  {
    name: 'Sarah Johnson',
    role: 'UI/UX Designer',
    tasksCompleted: 38,
    totalTasks: 45,
    productivity: 84,
    avatarColor: '#9c27b0',
  },
  {
    name: 'Mike Chen',
    role: 'Backend Developer',
    tasksCompleted: 48,
    totalTasks: 50,
    productivity: 96,
    avatarColor: '#2e7d32',
  },
  {
    name: 'Emma Wilson',
    role: 'QA Engineer',
    tasksCompleted: 35,
    totalTasks: 40,
    productivity: 88,
    avatarColor: '#ed6c02',
  },
];

const TeamPerformance = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Team Performance
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Team Member</TableCell>
                <TableCell align="right">Tasks</TableCell>
                <TableCell align="center">Productivity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.name}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: member.avatarColor }}>
                        {member.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{member.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {member.role}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {member.tasksCompleted}/{member.totalTasks}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box flex={1}>
                        <LinearProgress
                          variant="determinate"
                          value={member.productivity}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              backgroundColor:
                                member.productivity > 90
                                  ? '#4caf50'
                                  : member.productivity > 70
                                  ? '#2196f3'
                                  : '#ff9800',
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="body2" minWidth={40}>
                        {member.productivity}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default TeamPerformance;