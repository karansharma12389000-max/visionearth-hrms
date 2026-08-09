// src/pages/employee/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { 
  formatDate, 
  formatTime, 
  getTodayStr, 
  getStatusColor, 
  getStatusLabel,
  getStatusIcon
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's check-in status
      const { data: statusData, error: statusError } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('check_in_time', today)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!statusError) {
        setCheckInStatus(statusData);
      }
      
      // Get monthly attendance stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      
      if (!attError) {
        const stats = {
          present: attData?.filter(a => a.status === 'P' || a.status === 'Present').length || 0,
          delayed: attData?.filter(a => a.status === 'D' || a.status === 'Delayed').length || 0,
          absent: attData?.filter(a => a.status === 'A' || a.status === 'Absent').length || 0,
          leave: attData?.filter(a => a.status === 'L' || a.status === 'Leave').length || 0,
          total: attData?.length || 0
        };
        setDashboardData(stats);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ 
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: theme.colors.background 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: `4px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.primary,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '16px', color: theme.colors.textSecondary, fontSize: '14px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const isCheckedIn = checkInStatus?.status === 'Checked In' && !checkInStatus?.check_out_time;
  const isCheckedOut = checkInStatus?.status === 'Checked Out' || checkInStatus?.check_out_time;
  const hasCheckedIn = checkInStatus !== null && checkInStatus !== undefined && checkInStatus.status !== 'Not Checked In';

  // Status message for check-in card
  let statusText = '⭕ Not Checked In';
  let statusSubtext = 'Check in to start your day';
  let statusColor = '#EF4444';
  
  if (isCheckedIn) {
    statusText = '✅ Currently Checked In';
    statusSubtext = `Since ${formatTime(checkInStatus?.check_in_time)}`;
    statusColor = '#10B981';
  } else if (isCheckedOut && hasCheckedIn) {
    statusText = '⏳ Checked Out';
    statusSubtext = `Out at ${formatTime(checkInStatus?.check_out_time)} • ${checkInStatus?.working_hours || 0}h worked`;
    statusColor = '#8B5CF6';
  }

  const monthlyTotal = (dashboardData?.present || 0) + (dashboardData?.delayed || 0) + (dashboardData?.absent || 0) + (dashboardData?.leave || 0) || 1;
  const attendancePercentage = Math.round(((dashboardData?.present || 0) / monthlyTotal) * 100);

  const quickActions = [
    { icon: '📋', label: 'Mark Attendance', path: '/attendance' },
    { icon: '📊', label: 'View Report', path: '/report' },
    { icon: '📅', label: 'Leave', path: '/leave' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      paddingBottom: '80px',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
        padding: '20px 24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500 }}>Welcome back,</p>
            <h2 style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>
              {user?.name || 'User'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>
              {user?.department} • {user?.role}
            </p>
          </div>
          <button
            onClick={toggleDark}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            {theme.dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Check-in Status Card - WITHOUT BUTTON */}
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginTop: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              animation: isCheckedIn ? 'pulse 2s infinite' : 'none',
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                {statusText}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                {statusSubtext}
              </div>
            </div>
          </div>
          {/* BUTTON REMOVED - Only showing status */}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Quick Actions */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '14px' }}>
            Quick Actions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '14px',
                  padding: '16px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = theme.dark 
                    ? '0 8px 24px rgba(0,0,0,0.3)' 
                    : '0 8px 24px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = theme.dark 
                    ? '0 2px 8px rgba(0,0,0,0.2)' 
                    : '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>{action.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textPrimary }}>
                  {action.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Attendance Summary */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.textPrimary }}>
              📊 This Month
            </h3>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: attendancePercentage >= 80 ? '#10B981' : '#F59E0B',
            }}>
              {attendancePercentage}% Attendance
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}>
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                {dashboardData?.present || 0}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.colors.textSecondary }}>
                Present
              </div>
            </div>
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>
                {dashboardData?.delayed || 0}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.colors.textSecondary }}>
                Delayed
              </div>
            </div>
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>
                {dashboardData?.absent || 0}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.colors.textSecondary }}>
                Absent
              </div>
            </div>
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#8B5CF6' }}>
                {dashboardData?.leave || 0}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.colors.textSecondary }}>
                Leave
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};