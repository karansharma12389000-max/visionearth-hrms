// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('ve_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = useCallback((userData) => {
    setSession(userData);
    localStorage.setItem('ve_session', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('ve_session');
  }, []);

  const value = useMemo(() => ({
    session,
    login,
    logout,
    loading,
    isAuthenticated: !!session,
    isAdmin: session?.role === 'Admin' || session?.role === 'HR' || session?.role === 'admin',
    isEmployee: session?.role === 'Employee' || session?.role === 'employee',
    user: session,
  }), [session, login, logout, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};