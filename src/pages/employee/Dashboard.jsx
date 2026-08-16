// src/pages/employee/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { formatTime, getTodayIST } from '../../utils/helpers';
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
      const today = getTodayIST();
      
      const { data: statusData, error: statusError } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('check_in_time', today + 'T00:00:00.000Z')
        .lte('check_in_time', today + 'T23:59:59.999Z')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!statusError) {
        setCheckInStatus(statusData);
      }
      
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

  let statusText = '⚠️ Not Checked In';
  let statusSubtext = 'Check in to start your day';
  let statusColor = '#EF4444';
  let statusIcon = '⚠️';
  let statusBg = '#FEF2F2';
  
  if (isCheckedIn) {
    statusText = '✅ Checked In';
    statusSubtext = `Since ${formatTime(checkInStatus?.check_in_time)}`;
    statusColor = '#10B981';
    statusIcon = '✅';
    statusBg = '#ECFDF5';
  } else if (isCheckedOut && hasCheckedIn) {
    statusText = '📌 Checked Out';
    statusSubtext = `Out at ${formatTime(checkInStatus?.check_out_time)} • ${checkInStatus?.working_hours || 0}h worked`;
    statusColor = '#8B5CF6';
    statusIcon = '📌';
    statusBg = '#F5F3FF';
  }

  const monthlyTotal = (dashboardData?.present || 0) + (dashboardData?.delayed || 0) + (dashboardData?.absent || 0) + (dashboardData?.leave || 0) || 1;
  const attendancePercentage = Math.round(((dashboardData?.present || 0) / monthlyTotal) * 100);

  const quickActions = [
    { icon: '📋', label: 'Mark Attendance', path: '/attendance' },
    { icon: '📊', label: 'View Report', path: '/report' },
    { icon: '📅', label: 'Leave', path: '/leave' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  const todayDate = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC',
      padding: '16px 16px 100px',
    }}>
      
      {/* ============================================ */}
      {/* ✅ BLUE HEADER - Proper Block */}
      {/* ============================================ */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
        borderRadius: '20px',
        padding: '24px 20px 20px',
        marginBottom: '16px',
        border: 'none',
        boxShadow: '0 4px 24px rgba(59,130,246,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: -40,
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top Row: Welcome + Theme Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px',
          }}>
            <div>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '13px', 
                fontWeight: 500,
                marginBottom: '2px',
              }}>
                Welcome back,
              </p>
              <h2 style={{ 
                color: '#FFFFFF', 
                fontSize: '22px', 
                fontWeight: 700, 
                margin: 0,
                lineHeight: 1.2,
              }}>
                {user?.name || 'User'}
              </h2>
            </div>
            
            {/* Theme Toggle - White style */}
            <button
              onClick={toggleDark}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {theme.dark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* User Info - White text */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              {user?.department || 'N/A'}
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '14px',
            }}>
              •
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              {user?.role || 'Employee'}
            </span>
          </div>

          {/* Date - White */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
            }}>
              📅
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              fontWeight: 400,
            }}>
              {todayDate}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STATUS CARD - Uber Style */}
      {/* ============================================ */}
      <div style={{
        background: theme.dark 
          ? 'rgba(30, 41, 59, 0.8)' 
          : '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 18px',
        marginBottom: '20px',
        border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
        boxShadow: theme.dark 
          ? '0 4px 20px rgba(0,0,0,0.2)' 
          : '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: statusColor + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0,
        }}>
          {statusIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: statusColor,
            lineHeight: 1.3,
          }}>
            {statusText}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: theme.dark ? '#94A3B8' : '#64748B',
            marginTop: '2px',
            lineHeight: 1.3,
          }}>
            {statusSubtext}
          </div>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          animation: isCheckedIn ? 'pulse 2s infinite' : 'none',
          flexShrink: 0,
        }} />
      </div>

      {/* ============================================ */}
      {/* QUICK ACTIONS - Uber Style Grid */}
      {/* ============================================ */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          fontSize: '15px', 
          fontWeight: 600, 
          color: theme.dark ? '#F1F5F9' : '#0F172A',
          marginBottom: '12px',
        }}>
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
                background: theme.dark 
                  ? 'rgba(30, 41, 59, 0.8)' 
                  : '#FFFFFF',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                borderRadius: '14px',
                padding: '16px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme.dark 
                  ? '0 2px 12px rgba(0,0,0,0.2)' 
                  : '0 2px 12px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = theme.dark 
                  ? '0 8px 24px rgba(0,0,0,0.3)' 
                  : '0 8px 24px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.dark 
                  ? '0 2px 12px rgba(0,0,0,0.2)' 
                  : '0 2px 12px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ 
                fontSize: '28px', 
                display: 'block', 
                marginBottom: '6px' 
              }}>
                {action.icon}
              </div>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 600, 
                color: theme.dark ? '#E2E8F0' : '#334155',
              }}>
                {action.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* ATTENDANCE SUMMARY - Uber Style */}
      {/* ============================================ */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: theme.dark ? '#F1F5F9' : '#0F172A',
          }}>
            📊 This Month
          </h3>
          <div style={{
            background: attendancePercentage >= 80 
              ? theme.dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'
              : theme.dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            color: attendancePercentage >= 80 ? '#10B981' : '#F59E0B',
          }}>
            {attendancePercentage}%
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}>
          <div style={{
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.8)' 
              : '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 8px',
            textAlign: 'center',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#10B981',
            }}>
              {dashboardData?.present || 0}
            </div>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px', 
              color: theme.dark ? '#94A3B8' : '#94A3B8',
              marginTop: '2px',
            }}>
              Present
            </div>
          </div>
          <div style={{
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.8)' 
              : '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 8px',
            textAlign: 'center',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#F59E0B',
            }}>
              {dashboardData?.delayed || 0}
            </div>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px', 
              color: theme.dark ? '#94A3B8' : '#94A3B8',
              marginTop: '2px',
            }}>
              Delayed
            </div>
          </div>
          <div style={{
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.8)' 
              : '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 8px',
            textAlign: 'center',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#EF4444',
            }}>
              {dashboardData?.absent || 0}
            </div>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px', 
              color: theme.dark ? '#94A3B8' : '#94A3B8',
              marginTop: '2px',
            }}>
              Absent
            </div>
          </div>
          <div style={{
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.8)' 
              : '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 8px',
            textAlign: 'center',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#8B5CF6',
            }}>
              {dashboardData?.leave || 0}
            </div>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px', 
              color: theme.dark ? '#94A3B8' : '#94A3B8',
              marginTop: '2px',
            }}>
              Leave
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};