// src/pages/admin/Dashboard.jsx
//
// Vision Earth HRMS — Premium Admin Dashboard
// Stats + Admin Tools grid + poster header
// Icons: soft-colored tiles with iOS-style 3D emoji
//
// FIXES (v3):
// ✅ Removed Check-Ins stat — now only 4 stats
// ✅ Stats grid → 2-column layout for 4 stats
// ✅ Renamed all admin tools to precise labels
// ✅ Focus refresh — stats reload when user returns to tab
// ➕ ADDED: Attendance Editor tool card

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    pendingLeaves: 0,
  });

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // ADMIN TOOLS — iOS-style 3D emoji icons
  // ============================================
  const adminTools = [
    // ➕ ADDED — Attendance Editor
    {
      icon: '✏️',
      label: 'Attendance Editor',
      desc: 'Edit or delete employee attendance records',
      path: '/admin/attendance-editor',
      color: '#0EA5E9',
    },
    {
      icon: '👥',
      label: 'Employee Details',
      desc: 'View and manage employee details',
      path: '/admin/employees',
      color: '#8B5CF6',
    },
    {
      icon: '📋',
      label: 'Leave Approval',
      desc: 'Approve and manage leave requests',
      path: '/admin/leaves',
      color: '#FB923C',
    },
    {
      icon: '📊',
      label: 'Attendance Report',
      desc: 'Track and manage attendance records',
      path: '/admin/attendance-report',
      color: '#10B981',
    },
    {
      icon: '📄',
      label: 'Attendance History',
      desc: 'View past attendance records',
      path: '/admin/attendance-history',
      color: '#A855F7',
    },
    {
      icon: '📍',
      label: 'Check-In/Out History',
      desc: 'Manage check-in and check-out logs',
      path: '/admin/checkin-history',
      color: '#EC4899',
    },
    {
      icon: '🗺️',
      label: 'Timeline Calendar',
      desc: 'View employee activity timeline',
      path: '/admin/timeline',
      color: '#3B82F6',
    },
    {
      icon: '⚠️',
      label: 'Forgot Tracker',
      desc: 'Track employees who forgot to check out',
      path: '/admin/forgot-tracker',
      color: '#F59E0B',
    },
    {
      icon: '💰',
      label: 'Salary Calculator',
      desc: 'Manage salary details and payroll',
      path: '/admin/salary-calculator',
      color: '#10B981',
    },
    {
      icon: '🎉',
      label: 'Holiday',
      desc: 'View and manage holiday calendar',
      path: '/admin/holidays',
      color: '#A855F7',
    },
    {
      icon: '📁',
      label: 'Project Code Editor',
      desc: 'Manage projects and code',
      path: '/admin/projects',
      color: '#3B82F6',
    },
  ];

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

      const [empRes, attRes, leaveRes] = await Promise.all([
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('attendance')
          .select('status')
          .eq('attendance_date', today),

        supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending'),
      ]);

      if (empRes.error) console.warn('emp fetch:', empRes.error.message);
      if (attRes.error) console.warn('att fetch:', attRes.error.message);
      if (leaveRes.error) console.warn('leave fetch:', leaveRes.error.message);

      const totalEmployees = empRes.count || 0;
      const todayAttendance = attRes.data || [];
      const todayPresent = todayAttendance.filter(
        (a) => a.status === 'P' || a.status === 'Present'
      ).length;
      const todayAbsent = todayAttendance.filter(
        (a) => a.status === 'A' || a.status === 'Absent'
      ).length;
      const pendingLeaves = leaveRes.count || 0;

      setStats({
        totalEmployees,
        todayPresent,
        todayAbsent,
        pendingLeaves,
      });
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh stats when tab regains focus
  useEffect(() => {
    const onFocus = () => fetchDashboardData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pageBg,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `4px solid ${THEME.primaryLight}33`,
              borderTopColor: THEME.primary,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }}
          />
          <p
            style={{
              marginTop: '16px',
              color: textSecondary,
              fontSize: '14px',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const firstName = (user?.name || 'Admin').split(' ')[0] || user?.name;

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: pageBg,
        fontFamily: THEME.font,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div
            style={{
              background: dark
                ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              borderRadius: THEME.radius2xl,
              padding: '22px 20px 20px',
              boxShadow: dark ? THEME.shadowDark : THEME.shadowLg,
              border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '14px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: THEME.radiusMd,
                    background: dark ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                    border: '1px solid #D1FAE5',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src="/vision-earth-logo.png"
                    alt="Vision Earth Care"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: textPrimary,
                      letterSpacing: '0.5px',
                      lineHeight: 1.1,
                    }}
                  >
                    ADMIN PANEL
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: THEME.primary,
                      letterSpacing: '3px',
                      marginTop: '3px',
                    }}
                  >
                    VISION EARTH CARE
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleDark}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: dark
                    ? 'rgba(255,255,255,0.08)'
                    : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
                }}
              >
                {dark ? '☀️' : '🌙'}
              </button>
            </div>

            <div style={{ marginBottom: '6px', position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  color: textSecondary,
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Welcome back,
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: textPrimary,
                  lineHeight: 1.1,
                  letterSpacing: '-0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {firstName}
                <span style={{ fontSize: '20px' }}>👋</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '11px',
                color: textMuted,
                fontWeight: 500,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {todayDate} · {user?.role || 'Admin'}
            </div>
          </div>
        </div>

        {/* STATS GRID — 4 stats, 2×2 layout */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            {[
              {
                value: stats.totalEmployees,
                label: 'Employees',
                color: THEME.blue,
                accent: THEME.blue,
              },
              {
                value: stats.todayPresent,
                label: 'Present',
                color: THEME.primary,
                accent: THEME.primary,
              },
              {
                value: stats.todayAbsent,
                label: 'Absent',
                color: THEME.red,
                accent: THEME.red,
              },
              {
                value: stats.pendingLeaves,
                label: 'Pending',
                color: THEME.amber,
                accent: THEME.amber,
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: dark
                    ? `linear-gradient(145deg, ${stat.accent}15 0%, #1E293B 60%)`
                    : `linear-gradient(145deg, ${stat.accent}10 0%, #FFFFFF 60%)`,
                  borderRadius: THEME.radiusMd,
                  padding: '14px 12px 12px',
                  textAlign: 'left',
                  border: `1px solid ${
                    dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'
                  }`,
                  boxShadow: dark
                    ? '0 4px 12px rgba(0,0,0,0.25)'
                    : `0 4px 12px ${stat.accent}10`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}80)`,
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: stat.accent,
                    boxShadow: `0 0 8px ${stat.accent}80`,
                  }}
                />
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 900,
                    color: stat.color,
                    lineHeight: 1,
                    marginBottom: '6px',
                    letterSpacing: '-1px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.7px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ADMIN TOOLS SECTION */}
        <div style={{ padding: '0 16px 16px' }}>
          {/* POSTER HEADER */}
          <div
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              marginBottom: '14px',
              background: dark
                ? 'linear-gradient(135deg, #1E3A8A 0%, #5B21B6 50%, #7C3AED 100%)'
                : 'linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 40%, #EDE9FE 100%)',
              border: `1px solid ${
                dark ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.15)'
              }`,
              boxShadow: dark
                ? '0 8px 24px rgba(0,0,0,0.35)'
                : '0 8px 24px rgba(99,102,241,0.12)',
              padding: '16px',
              minHeight: '96px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -30,
                left: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    color: dark ? '#FFFFFF' : '#1E293B',
                    margin: 0,
                    letterSpacing: '-0.3px',
                    lineHeight: 1.15,
                  }}
                >
                  Admin Tools
                </h3>
                <div
                  style={{
                    fontSize: '10.5px',
                    color: dark ? 'rgba(255,255,255,0.75)' : '#475569',
                    fontWeight: 500,
                    marginTop: '4px',
                    lineHeight: 1.35,
                    maxWidth: '180px',
                  }}
                >
                  Manage your organisation with ease
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: dark ? '#FFFFFF' : '#5B21B6',
                      background: dark
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.7)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      letterSpacing: '0.3px',
                      border: dark
                        ? '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    {adminTools.length} tools
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: dark ? 'rgba(255,255,255,0.85)' : '#6D28D9',
                      background: dark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.5)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      letterSpacing: '0.3px',
                      border: dark
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(255,255,255,0.7)',
                    }}
                  >
                    Fast
                  </span>
                </div>
              </div>

              {/* Illustration */}
              <div
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: 88,
                  height: 70,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 66,
                    height: 46,
                    borderRadius: 10,
                    background: dark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.75)',
                    border: dark
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid rgba(255,255,255,0.9)',
                    boxShadow: dark
                      ? '0 6px 14px rgba(0,0,0,0.35)'
                      : '0 6px 14px rgba(99,102,241,0.15)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    padding: 6,
                    gap: 3,
                  }}
                >
                  <div style={{ width: 8, height: 16, borderRadius: 3, background: '#60A5FA' }} />
                  <div style={{ width: 8, height: 24, borderRadius: 3, background: '#A78BFA' }} />
                  <div style={{ width: 8, height: 14, borderRadius: 3, background: '#34D399' }} />
                  <div style={{ width: 8, height: 20, borderRadius: 3, background: '#F472B6' }} />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 52,
                    height: 46,
                    borderRadius: 10,
                    background: dark
                      ? 'linear-gradient(135deg, #7C3AED, #A855F7)'
                      : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    boxShadow: dark
                      ? '0 6px 14px rgba(0,0,0,0.4)'
                      : '0 6px 14px rgba(139,92,246,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4.5" width="18" height="16" rx="3" />
                    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                  </svg>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: 20,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: dark ? '#FACC15' : '#FBBF24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(250,204,21,0.5)',
                    border: '1.5px solid #FFFFFF',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                  </svg>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: 0,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: dark ? '#0EA5E9' : '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(56,189,248,0.5)',
                    border: '1.5px solid #FFFFFF',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 3-column grid — iOS-style icon cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {adminTools.map((tool) => (
              <button
                key={tool.path}
                type="button"
                onClick={() => navigate(tool.path)}
                title={tool.label}
                aria-label={tool.label}
                style={{
                  background: dark ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${
                    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                  }`,
                  borderRadius: '16px',
                  padding: '12px 10px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: THEME.font,
                  transition: 'all 0.2s ease',
                  boxShadow: dark
                    ? '0 3px 10px rgba(0,0,0,0.25)'
                    : '0 3px 10px rgba(15,23,42,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '9px',
                  minHeight: '124px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = dark
                    ? `0 10px 22px rgba(0,0,0,0.4), 0 0 0 1px ${tool.color}45`
                    : `0 10px 22px ${tool.color}20, 0 0 0 1px ${tool.color}45`;
                  e.currentTarget.style.borderColor = tool.color + '50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = dark
                    ? '0 3px 10px rgba(0,0,0,0.25)'
                    : '0 3px 10px rgba(15,23,42,0.05)';
                  e.currentTarget.style.borderColor = dark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.05)';
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: tool.color,
                    opacity: 0.85,
                    lineHeight: 1,
                  }}
                >
                  ›
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: dark
                      ? `linear-gradient(180deg, ${tool.color}22 0%, ${tool.color}14 100%)`
                      : `linear-gradient(180deg, ${tool.color}20 0%, ${tool.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                    border: `1px solid ${tool.color}28`,
                    boxShadow: dark
                      ? `inset 0 1px 0 rgba(255,255,255,0.06)`
                      : `inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px ${tool.color}10`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: dark
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.6), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                  <span
                    style={{
                      lineHeight: 1,
                      position: 'relative',
                      zIndex: 1,
                      filter: dark
                        ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))'
                        : 'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
                    }}
                  >
                    {tool.icon}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    flex: 1,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: textPrimary,
                      lineHeight: 1.2,
                      letterSpacing: '0.1px',
                    }}
                  >
                    {tool.label}
                  </div>
                  <div
                    style={{
                      fontSize: '8.5px',
                      fontWeight: 500,
                      color: textMuted,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {tool.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FOOTER QUOTE */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              padding: '16px 18px',
              background: dark
                ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))'
                : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              borderRadius: THEME.radiusLg,
              border: `1px solid ${
                dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              🌿
            </div>
            <span
              style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: dark ? THEME.primaryLight : THEME.primaryDeep,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              "Smart Attendance for a Better Tomorrow"
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: '20px' }} />
      </div>

      <div style={{ height: '20px', flexShrink: 0 }} />

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminDashboard;