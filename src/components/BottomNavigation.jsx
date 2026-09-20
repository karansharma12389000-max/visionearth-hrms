// src/components/BottomNavigation.jsx
//
// Vision Earth HRMS — Premium Bottom Navigation
// Frosted glass bar, SVG icons, pill-shaped active state.

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { THEME, isDark } from '../utils/designTokens';

// ============================================
// SVG ICONS (line-art style)
// ============================================
const Icons = {
  home: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  attendance: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  leave: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  report: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="1" fill={color} stroke="none" />
      <rect x="12" y="8" width="3" height="10" rx="1" fill={color} stroke="none" />
      <rect x="17" y="14" width="3" height="4" rx="1" fill={color} stroke="none" />
    </svg>
  ),
  profile: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  ),
  admin: ({ active, color }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export const BottomNavigation = ({ theme: themeProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { theme: themeFromContext } = useTheme();

  // ✅ FIX: prefer the context theme (guaranteed source of truth);
  //    fall back to the passed prop for backwards compatibility.
  const theme = themeFromContext || themeProp;
  const dark = isDark(theme);

  const tabs = [
    { key: 'home', label: 'Home', path: '/' },
    { key: 'attendance', label: 'Attendance', path: '/attendance' },
    { key: 'leave', label: 'Leave', path: '/leave' },
    { key: 'report', label: 'Report', path: '/report' },
    { key: 'profile', label: 'Profile', path: '/profile' },
  ];

  if (isAdmin) {
    tabs.push({ key: 'admin', label: 'Admin', path: '/admin' });
  }

  const isActive = (path) => {
    if (path === '/')
      return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Floating bar wrapper */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '480px',
          margin: '0 auto',
          padding: '0 12px max(12px, env(safe-area-inset-bottom))',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            background: dark
              ? 'rgba(30, 41, 59, 0.92)'
              : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: '24px',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: dark
              ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)'
              : '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
            padding: '8px 6px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const IconComponent = Icons[tab.key];
            const iconColor = active
              ? '#FFFFFF'
              : dark
              ? '#94A3B8'
              : '#94A3B8';

            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '6px 4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '16px',
                  fontFamily: THEME.font,
                  position: 'relative',
                }}
              >
                {/* Active pill background */}
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '44px',
                      height: '44px',
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                      boxShadow: `0 4px 14px rgba(16,185,129,0.5), 0 0 0 3px ${
                        dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)'
                      }`,
                      zIndex: 0,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '22px',
                    transition: 'transform 0.25s ease',
                    transform: active ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  {IconComponent && (
                    <IconComponent active={active} color={iconColor} />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: '9px',
                    fontWeight: active ? 800 : 600,
                    color: active
                      ? THEME.primary
                      : dark
                      ? '#64748B'
                      : '#94A3B8',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                    marginTop: active ? '22px' : '2px',
                    height: active ? '12px' : 'auto',
                  }}
                >
                  {tab.label}
                </span>

                {/* Active indicator dot (small) */}
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: THEME.primary,
                      opacity: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default BottomNavigation;