import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
        setVolunteer(data.volunteer);
      } catch (error) {
        console.error('Session restoration failed:', error.message);
        localStorage.removeItem('token');
        setUser(null);
        setVolunteer(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password, rememberMe) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password, rememberMe });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setVolunteer(data.volunteer);
      return data;
    } catch (error) {
      setUser(null);
      setVolunteer(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const data = await api.postMultipart('/auth/register', formData);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setVolunteer(data.volunteer);
      return data;
    } catch (error) {
      setUser(null);
      setVolunteer(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setVolunteer(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const updateProfile = async (formData) => {
    try {
      const data = await api.putMultipart('/volunteer/profile', formData);
      setVolunteer(data.volunteer);
      if (data.volunteer.userId) {
        setUser(prev => ({ ...prev, name: data.volunteer.userId.name }));
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

  const refreshMe = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setVolunteer(data.volunteer);
    } catch (error) {
      console.error('Failed to refresh user profile:', error.message);
    }
  };

  const loginWithGoogle = async (googleData) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/google', googleData);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setVolunteer(data.volunteer);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        volunteer,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshMe,
        loginWithGoogle
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
