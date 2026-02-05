// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'https://crm-rx6f.onrender.com';

  // Function to get access token
  const getAccessToken = () => {
    return localStorage.getItem('accessToken');
  };

  // Clear authentication data
  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Memoize getUserRole to prevent recreating on every render
  const getUserRole = useCallback(() => {
    if (!user) return null;
    
    // Check roleName first (it's the most reliable)
    if (user.roleName) {
      const roleMap = {
        'Admin': 'admin',
        'Project Manager': 'project_manager',
        'Employee': 'employee',
        'Client': 'client'
      };
      return roleMap[user.roleName] || 'employee';
    }
    
    // Fallback to role number
    if (user.role) {
      const roleNumberMap = {
        1: 'admin',
        2: 'project_manager',
        3: 'employee',
        4: 'client'
      };
      return roleNumberMap[user.role] || 'employee';
    }
    
    return 'employee';
  }, [user]);

  // Check if user is authenticated on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        return { 
          success: false, 
          error: 'Server returned invalid response' 
        };
      }

      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Login failed' 
        };
      }

      // Store user data and token
      const userData = data.data.user;
      const accessToken = data.data.accessToken;
      
      console.log('User data to store:', userData);
      console.log('Access token:', accessToken);
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Network error. Please try again.' 
      };
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = getAccessToken();
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        // Verify token is still valid
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Auth check - User data:', data.data);
          setUser(data.data);
        } else {
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await fetch(`${API_BASE_URL}/user/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
    }
  };

  const signup = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Signup failed' };
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Update user profile
  const updateProfile = async (data) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log("Updating profile with data:", data);
      
      const response = await fetch(`${API_BASE_URL}/user/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Update profile response:", result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update user in context and localStorage
      setUser(result.data);
      localStorage.setItem('user', JSON.stringify(result.data));
      
      return result.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log("Changing password...");
      
      const response = await fetch(`${API_BASE_URL}/user/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      console.log("Change password response:", result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password');
      }

      return result;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const userRole = getUserRole();
  
  const value = {
    user,
    login,
    logout,
    signup,
    updateProfile,    // Add this
    changePassword,   // Add this
    loading,
    isAuthenticated: !!user,
    getAccessToken,   // Add this
    
    // Role checking methods
    isAdmin: userRole === 'admin',
    isProjectManager: userRole === 'project_manager',
    isEmployee: userRole === 'employee',
    isClient: userRole === 'client',
    
    // Helper to get role string (memoized)
    getUserRole,
    
    // Direct access to role properties
    userRole,
    roleNumber: user?.role,
    roleName: user?.roleName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};