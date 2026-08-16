// src/components/BottomNavigation.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNavigation = ({ theme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/attendance', icon: '📍', label: 'Attendance' },
    { path: '/leave', icon: '📅', label: 'Leave' },
    { path: '/report', icon: '📊', label: 'Report' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: '⚙️', label: 'Admin' });
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // Check if any item is active
  const hasActive = navItems.some(item => isActive(item.path));

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      borderRadius: '50px',
      background: theme.dark 
        ? 'rgba(15, 23, 42, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      zIndex: 999,
      maxWidth: 'calc(100% - 32px)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      // ✅ OUTER BORDER HIGHLIGHT - No glow
      border: hasActive 
        ? '2px solid #3B82F6' 
        : `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
      boxShadow: hasActive 
        ? '0 4px 16px rgba(0,0,0,0.08)' 
        : '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
    }}>
      {/* ✅ Active indicator bar - subtle underline */}
      {hasActive && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          left: '30%',
          right: '30%',
          height: '3px',
          borderRadius: '3px',
          background: '#3B82F6',
        }} />
      )}

      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 14px',
              borderRadius: '30px',
              border: 'none',
              background: active 
                ? 'linear-gradient(135deg, #3B82F6, #6366F1)' 
                : 'transparent',
              color: active 
                ? '#FFFFFF' 
                : theme.dark 
                  ? '#94A3B8' 
                  : '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: '44px',
              position: 'relative',
              boxShadow: active 
                ? '0 4px 12px rgba(59,130,246,0.3)' 
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = theme.dark 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.03)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <span style={{
              fontSize: '20px',
              lineHeight: 1.2,
              transform: active ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: '8px',
              fontWeight: active ? 700 : 400,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              opacity: active ? 1 : 0.5,
              marginTop: '2px',
              color: active ? '#FFFFFF' : 'inherit',
            }}>
              {item.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                bottom: '2px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#FFFFFF',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNavigation;