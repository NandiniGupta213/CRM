import { useState } from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import IconifyIcon from '../../components/base/IconifyIcon';
import paths from '../../routes/paths';

const Signup = () => {
  const [user, setUser] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: '3' // Default to Employee
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Project Manager' },
    { id: 3, name: 'Employee' },
    { id: 4, name: 'Client' },
  ];

  const handleInputChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (user.password !== user.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (user.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // API call to signup
      const response = await fetch('https://crm-rx6f.onrender.com/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          password: user.password,
          confirmPassword: user.confirmPassword,
          role: parseInt(user.role),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      setSuccess('Signup successful! You can now login.');
      setUser({ username: '', email: '', password: '', confirmPassword: '', role: '3' });
      
      // Optional: Auto-login or redirect
      // navigate(paths.login);
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Sign Up
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      
      <Divider sx={{ my: 3 }}></Divider>

      <Stack component="form" onSubmit={handleSubmit} direction="column" gap={2}>
        <TextField
          id="username"
          name="username"
          type="text"
          value={user.username}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Enter your username"
          autoComplete="username"
          fullWidth
          autoFocus
          required
        />

        <TextField
          id="email"
          name="email"
          type="email"
          value={user.email}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Enter your email"
          autoComplete="email"
          fullWidth
          required
        />

        <FormControl fullWidth variant="filled" required>
          <Select
            labelId="role-label"
            id="role"
            name="role"
            value={user.role}
            onChange={handleInputChange}
            label="Role"
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={user.password}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Enter your password"
          autoComplete="new-password"
          fullWidth
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          value={user.confirmPassword}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Confirm your password"
          autoComplete="new-password"
          fullWidth
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  <IconifyIcon icon={showConfirmPassword ? 'ion:eye' : 'ion:eye-off'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button 
          type="submit" 
          variant="contained" 
          size="medium" 
          fullWidth 
          sx={{ mt: 1.5 }}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>

        <Typography
          my={3}
          color="text.secondary"
          variant="body2"
          align="center"
          letterSpacing={0.5}
        >
          Already have an account? <Link href={paths.login}>Login</Link>
        </Typography>
      </Stack>
    </>
  );
};

export default Signup;