// src/components/BottomNavigation.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const BottomNavigation = ({ theme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { theme: themeContext } = useTheme();
  
  // Use passed theme or context theme
  const currentTheme = theme || themeContext;

  // Base items for all users
  const baseItems = [
    { 
      key: 'home', 
      label: 'Home', 
      icon: '🏠', 
      path: '/dashboard' 
    },
    { 
      key: 'attendance', 
      label: 'Attendance', 
      icon: '📍', 
      path: '/attendance' 
    },
    { 
      key: 'leave', 
      label: 'Leave', 
      icon: '📅', 
      path: '/leave' 
    },
    { 
      key: 'report', 
      label: 'Report', 
      icon: '📊', 
      path: '/report' 
    },
    { 
      key: 'profile', 
      label: 'Profile', 
      icon: '👤', 
      path: '/profile' 
    },
  ];

  // Admin only items
  const adminItems = [
    { 
      key: 'admin', 
      label: 'Admin', 
      icon: '🛠️', 
      path: '/admin' 
    },
  ];

  // Combine items based on role
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems;

  const isActive = (path) => {
    // Handle admin dashboard path
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path === '/admin' && location.pathname.startsWith('/admin/')) return true;
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname === path;
  };

  const getActiveColor = () => {
    return currentTheme?.colors?.primary || '#3B82F6';
  };

  const getTextColor = () => {
    return currentTheme?.colors?.textSecondary || '#64748B';
  };

  const getBgColor = () => {
    return currentTheme?.colors?.card || '#FFFFFF';
  };

  const getBorderColor = () => {
    return currentTheme?.colors?.border || '#E2E8F0';
  };

  return (
    <nav 
      className="bottom-nav"
      style={{
        backgroundColor: getBgColor(),
        borderTopColor: getBorderColor(),
      }}
    >
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-label={item.label}
            style={{
              color: active ? getActiveColor() : getTextColor(),
            }}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span 
              className="bottom-nav-label"
              style={{
                color: active ? getActiveColor() : getTextColor(),
                fontWeight: active ? 700 : 600,
              }}
            >
              {item.label}
            </span>
            {active && (
              <span 
                className="bottom-nav-indicator"
                style={{ backgroundColor: getActiveColor() }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;