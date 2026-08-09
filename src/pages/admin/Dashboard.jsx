// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    pendingLeaves: 0,
    totalCheckins: 0
  });

  const adminTools = [
    { icon: '👥', label: 'Employee Management', path: '/admin/employees', color: '#3B82F6', desc: 'Add, edit, or remove employees' },
    { icon: '📋', label: 'Leave Approvals', path: '/admin/leaves', color: '#F59E0B', desc: 'Approve or reject leave requests' },
    { icon: '📊', label: 'Attendance Report', path: '/admin/attendance-report', color: '#10B981', desc: 'View attendance history & reports' },
    { icon: '📋', label: 'Attendance History', path: '/admin/attendance-history', color: '#EC4899', desc: 'View all employee attendance records' },
    { icon: '📍', label: 'Check-In/Out History', path: '/admin/checkin-history', color: '#8B5CF6', desc: 'Track all employee check-ins' },
  ];

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
      
      const todayPresent = todayAttendance?.filter(a => a.status === 'P' || a.status === 'Present').length || 0;
      const todayAbsent = todayAttendance?.filter(a => a.status === 'A' || a.status === 'Absent').length || 0;
      
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
        totalCheckins: todayCheckins?.length || 0
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

  if (loading) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `3px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.primary,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '12px', color: theme.colors.textSecondary, fontSize: '13px' }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      paddingBottom: '80px',
    }}>
      {/* Header */}
      <div className="page-header">
        <h1>🛠️ Admin Dashboard</h1>
        <p>Welcome back, {user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-row" style={{ padding: '12px 16px' }}>
        <div className="stat-box">
          <div className="label">Employees</div>
          <div className="value" style={{ color: '#3B82F6' }}>{stats.totalEmployees}</div>
        </div>
        <div className="stat-box">
          <div className="label">Present Today</div>
          <div className="value" style={{ color: '#10B981' }}>{stats.todayPresent}</div>
        </div>
        <div className="stat-box">
          <div className="label">Absent Today</div>
          <div className="value" style={{ color: '#EF4444' }}>{stats.todayAbsent}</div>
        </div>
        <div className="stat-box">
          <div className="label">Pending Leaves</div>
          <div className="value" style={{ color: '#F59E0B' }}>{stats.pendingLeaves}</div>
        </div>
      </div>

      {/* Admin Tools */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '17px',
            fontWeight: 700,
            color: theme.colors.textPrimary,
          }}>
            🛠️ Admin Tools
          </h3>
          <span style={{
            fontSize: '11px',
            color: theme.colors.textSecondary,
            background: theme.colors.inputBg,
            padding: '4px 12px',
            borderRadius: '12px',
          }}>
            {adminTools.length} tools
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {adminTools.map((tool) => (
            <button
              key={tool.path}
              onClick={() => navigate(tool.path)}
              style={{
                background: theme.colors.card,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(6px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                background: tool.color + '15',
                flexShrink: 0,
              }}>
                {tool.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                }}>
                  {tool.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {tool.desc}
                </div>
              </div>
              <div style={{
                color: theme.colors.textMuted,
                fontSize: '18px',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.color = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.color = theme.colors.textMuted;
              }}
              >
                →
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};