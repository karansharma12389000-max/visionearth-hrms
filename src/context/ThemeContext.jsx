import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('ve_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('ve_dark_mode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.body.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const toggleDark = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const theme = useMemo(() => {
    const colors = {
      primary: darkMode ? '#3B82F6' : '#1E40AF',
      primaryLight: darkMode ? '#60A5FA' : '#3B82F6',
      primaryDark: darkMode ? '#1E40AF' : '#1E3A8A',
      accent: '#06B6D4',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
    };

    return {
      dark: darkMode,
      colors: {
        ...colors,
        background: darkMode ? '#0F172A' : '#F1F5F9',
        card: darkMode ? '#1E293B' : '#FFFFFF',
        textPrimary: darkMode ? '#F8FAFC' : '#0F172A',
        textSecondary: darkMode ? '#94A3B8' : '#64748B',
        border: darkMode ? '#334155' : '#E2E8F0',
        inputBg: darkMode ? '#334155' : '#F8FAFC',
        badgeBg: darkMode ? '#1E293B' : '#EFF6FF',
        tabBar: darkMode ? '#1E293B' : '#FFFFFF',
        headerBg: darkMode ? '#1E3A8A' : '#1E40AF',
      },
    };
  }, [darkMode]);

  const value = useMemo(() => ({
    theme,
    darkMode,
    toggleDark,
  }), [theme, darkMode, toggleDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};