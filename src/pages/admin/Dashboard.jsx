// src/pages/admin/Dashboard.jsx
//
// Vision Earth HRMS — Premium Admin Dashboard
// Welcome header, stats, admin tools list.

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
    totalCheckins: 0,
  });

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // ADMIN TOOLS
  // ============================================
  const adminTools = [
    {
      icon: '👥',
      label: 'Employee Management',
      path: '/admin/employees',
      color: '#3B82F6',
      desc: 'Add, edit, or remove employees',
    },
    {
      icon: '📋',
      label: 'Leave Approvals',
      path: '/admin/leaves',
      color: '#F59E0B',
      desc: 'Approve or reject leave requests',
    },
    {
      icon: '📊',
      label: 'Attendance Report',
      path: '/admin/attendance-report',
      color: '#10B981',
      desc: 'View monthly attendance analytics',
    },
    {
      icon: '📋',
      label: 'Attendance History',
      path: '/admin/attendance-history',
      color: '#EC4899',
      desc: 'All employee attendance records',
    },
    {
      icon: '📍',
      label: 'Check-In/Out History',
      path: '/admin/checkin-history',
      color: '#8B5CF6',
      desc: 'Track all check-ins and check-outs',
    },
  ];

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];

      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', today);

      const todayPresent =
        todayAttendance?.filter(
          (a) => a.status === 'P' || a.status === 'Present'
        ).length || 0;
      const todayAbsent =
        todayAttendance?.filter(
          (a) => a.status === 'A' || a.status === 'Absent'
        ).length || 0;

      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      const { data: todayCheckins } = await supabase
        .from('check_in_out')
        .select('*')
        .gte('check_in_time', today);

      setStats({
        totalEmployees: totalEmployees || 0,
        todayPresent,
        todayAbsent,
        pendingLeaves: pendingLeaves || 0,
        totalCheckins: todayCheckins?.length || 0,
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
  });

  const firstName = (user?.name || 'Admin').split(' ')[0] || user?.name;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: pageBg,
        paddingBottom: '120px',
        fontFamily: THEME.font,
      }}
    >
      {/* ============================================ */}
      {/* PREMIUM HEADER */}
      {/* ============================================ */}
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
              marginBottom: '16px',
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
                  alt="Vision Earth"
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
                  VISION EARTH
                </div>
              </div>
            </div>

            <button
              onClick={toggleDark}
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

          {/* Welcome */}
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
            📅 {todayDate} · {user?.role || 'Admin'}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STATS GRID (4 cards) */}
      {/* ============================================ */}
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
              label: 'Total Employees',
              color: THEME.blue,
              bg: dark ? 'rgba(59,130,246,0.08)' : THEME.blueSoft,
              icon: '👥',
            },
            {
              value: stats.todayPresent,
              label: 'Present Today',
              color: THEME.primary,
              bg: dark ? 'rgba(16,185,129,0.08)' : THEME.primarySoft,
              icon: '✓',
            },
            {
              value: stats.todayAbsent,
              label: 'Absent Today',
              color: THEME.red,
              bg: dark ? 'rgba(239,68,68,0.08)' : THEME.redSoft,
              icon: '✕',
            },
            {
              value: stats.pendingLeaves,
              label: 'Pending Leaves',
              color: THEME.amber,
              bg: dark ? 'rgba(245,158,11,0.08)' : THEME.amberSoft,
              icon: '⏳',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusLg,
                padding: '14px 14px',
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '3px',
                  height: '60%',
                  borderRadius: '4px',
                  background: `linear-gradient(180deg, ${stat.color}, ${stat.color}66)`,
                  position: 'absolute',
                  left: '10px',
                  top: '20%',
                }}
              />
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: stat.color,
                  flexShrink: 0,
                  marginLeft: '6px',
                  fontWeight: 800,
                }}
              >
                {stat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginTop: '3px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* ADMIN TOOLS */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: textPrimary,
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            🛠️ Admin Tools
          </h3>
          <span
            style={{
              fontSize: '10px',
              color: textMuted,
              fontWeight: 700,
              background: dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
              padding: '4px 12px',
              borderRadius: THEME.radiusPill,
              letterSpacing: '0.3px',
            }}
          >
            {adminTools.length} tools
          </span>
        </div>

        <div
          style={{
            background: cardBg,
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
            overflow: 'hidden',
          }}
        >
          {adminTools.map((tool, idx) => (
            <button
              key={tool.path}
              onClick={() => navigate(tool.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom:
                  idx < adminTools.length - 1 ? `1px solid ${border}` : 'none',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s ease',
                fontFamily: THEME.font,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(255,255,255,0.03)'
                  : '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: tool.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                {tool.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: textPrimary,
                    marginBottom: '2px',
                  }}
                >
                  {tool.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: textMuted,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tool.desc}
                </div>
              </div>
              <span
                style={{
                  fontSize: '18px',
                  color: textMuted,
                  flexShrink: 0,
                  fontWeight: 300,
                }}
              >
                ›
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* FOOTER QUOTE */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            padding: '14px 16px',
            background: dark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))'
              : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderRadius: THEME.radiusLg,
            border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '4px' }}>🌿</div>
          <div
            style={{
              fontSize: '11px',
              fontStyle: 'italic',
              color: dark ? THEME.primaryLight : THEME.primaryDeep,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            "Smart Attendance for a Better Tomorrow"
          </div>
        </div>
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminDashboard;