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
  const { theme, toggleDark } = useTheme();
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
        backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC',
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
      {/* ✅ BLUE HEADER - Same as Employee Dashboard */}
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
                {user?.name || 'Admin'}
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
              {user?.role || 'Admin'}
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

      {/* Stats Cards - Grid style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '20px',
      }}>
        <div style={{
          background: theme.dark 
            ? 'rgba(30, 41, 59, 0.6)' 
            : '#FFFFFF',
          borderRadius: '12px',
          padding: '14px 8px',
          textAlign: 'center',
          border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6' }}>
            {stats.totalEmployees}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.dark ? '#94A3B8' : '#94A3B8' }}>
            Employees
          </div>
        </div>

        <div style={{
          background: theme.dark 
            ? 'rgba(30, 41, 59, 0.6)' 
            : '#FFFFFF',
          borderRadius: '12px',
          padding: '14px 8px',
          textAlign: 'center',
          border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>
            {stats.todayPresent}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.dark ? '#94A3B8' : '#94A3B8' }}>
            Present Today
          </div>
        </div>

        <div style={{
          background: theme.dark 
            ? 'rgba(30, 41, 59, 0.6)' 
            : '#FFFFFF',
          borderRadius: '12px',
          padding: '14px 8px',
          textAlign: 'center',
          border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444' }}>
            {stats.todayAbsent}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.dark ? '#94A3B8' : '#94A3B8' }}>
            Absent Today
          </div>
        </div>

        <div style={{
          background: theme.dark 
            ? 'rgba(30, 41, 59, 0.6)' 
            : '#FFFFFF',
          borderRadius: '12px',
          padding: '14px 8px',
          textAlign: 'center',
          border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: theme.dark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B' }}>
            {stats.pendingLeaves}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: theme.dark ? '#94A3B8' : '#94A3B8' }}>
            Pending Leaves
          </div>
        </div>
      </div>

      {/* Admin Tools */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: theme.dark ? '#F1F5F9' : '#0F172A',
          }}>
            🛠️ Admin Tools
          </h3>
          <span style={{
            fontSize: '11px',
            color: theme.dark ? '#94A3B8' : '#94A3B8',
            background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: 500,
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
                background: theme.dark 
                  ? 'rgba(30, 41, 59, 0.6)' 
                  : '#FFFFFF',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme.dark 
                  ? '0 2px 12px rgba(0,0,0,0.2)' 
                  : '0 2px 12px rgba(0,0,0,0.04)',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(6px)';
                e.currentTarget.style.boxShadow = theme.dark 
                  ? '0 4px 20px rgba(0,0,0,0.3)' 
                  : '0 4px 16px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = theme.dark 
                  ? '0 2px 12px rgba(0,0,0,0.2)' 
                  : '0 2px 12px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
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
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                }}>
                  {tool.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.dark ? '#94A3B8' : '#64748B',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {tool.desc}
                </div>
              </div>
              <div style={{
                color: theme.dark ? '#64748B' : '#94A3B8',
                fontSize: '18px',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.color = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.color = theme.dark ? '#64748B' : '#94A3B8';
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