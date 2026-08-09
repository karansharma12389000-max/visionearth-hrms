// src/pages/employee/Report.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const Report = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth(); // Get logged-in user
  
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('table');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);

  const COLORS = ['#10B981', '#F59E0B', '#DC2626', '#EF4444', '#3B82F6', '#8B5CF6'];

  // Status color mapping
  const statusColors = {
    'P': '#10B981',
    'Present': '#10B981',
    'A': '#EF4444',
    'Absent': '#EF4444',
    'D': '#F59E0B',
    'Delayed': '#F59E0B',
    'B': '#DC2626',
    'Beyond Delay': '#DC2626',
    'L': '#3B82F6',
    'Leave': '#3B82F6',
    'ACO': '#8B5CF6',
    'Auto Check-Out': '#8B5CF6',
  };

  const statusLabels = {
    'P': 'P',
    'Present': 'P',
    'A': 'A',
    'Absent': 'A',
    'D': 'D',
    'Delayed': 'D',
    'B': 'B',
    'Beyond Delay': 'B',
    'L': 'L',
    'Leave': 'L',
    'ACO': 'ACO',
    'Auto Check-Out': 'ACO',
  };

  // All status categories with icons and colors
  const STATUS_CARDS = [
    { key: 'present', label: 'Present', icon: '✅', color: '#10B981', bg: '#10B98115', border: '#10B98130' },
    { key: 'delayed', label: 'Delayed', icon: '⏳', color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B30' },
    { key: 'beyondDelay', label: 'Beyond Delay', icon: '🚫', color: '#DC2626', bg: '#DC262615', border: '#DC262630' },
    { key: 'absent', label: 'Absent', icon: '❌', color: '#EF4444', bg: '#EF444415', border: '#EF444430' },
    { key: 'leave', label: 'Leave', icon: '📅', color: '#3B82F6', bg: '#3B82F615', border: '#3B82F630' },
    { key: 'autoCheckout', label: 'Auto Check-Out', icon: '🔄', color: '#8B5CF6', bg: '#8B5CF615', border: '#8B5CF630' },
  ];

  // All status categories for charts
  const ALL_STATUSES = [
    { name: 'Present', key: 'present', color: '#10B981' },
    { name: 'Delayed', key: 'delayed', color: '#F59E0B' },
    { name: 'Beyond Delay', key: 'beyondDelay', color: '#DC2626' },
    { name: 'Absent', key: 'absent', color: '#EF4444' },
    { name: 'Leave', key: 'leave', color: '#3B82F6' },
    { name: 'Auto Check-Out', key: 'autoCheckout', color: '#8B5CF6' },
  ];

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      // ✅ IMPORTANT: Get the logged-in employee's data
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, department')
        .eq('id', user?.id); // Filter by logged-in user ID
      
      if (empError) throw empError;
      
      // If no employee found, return empty
      if (!empData || empData.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }
      
      // Get attendance for the logged-in employee
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id) // Filter by logged-in user ID
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      
      if (attError) throw attError;
      
      // Build report for the logged-in employee
      const report = empData.map(emp => {
        const empAttendance = attData?.filter(a => a.employee_id === emp.id) || [];
        const present = empAttendance.filter(a => a.status === 'P' || a.status === 'Present').length;
        const absent = empAttendance.filter(a => a.status === 'A' || a.status === 'Absent').length;
        const leave = empAttendance.filter(a => a.status === 'L' || a.status === 'Leave').length;
        const delayed = empAttendance.filter(a => a.status === 'D' || a.status === 'Delayed').length;
        const beyondDelay = empAttendance.filter(a => a.status === 'B' || a.status === 'Beyond Delay').length;
        const autoCheckout = empAttendance.filter(a => a.status === 'ACO' || a.status === 'Auto Check-Out').length;
        const total = empAttendance.length;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Build days object for day-wise status
        const days = {};
        empAttendance.forEach(a => {
          const day = new Date(a.attendance_date).getDate();
          days[day] = a.status;
        });
        
        return {
          ...emp,
          present,
          absent,
          leave,
          delayed,
          beyondDelay,
          autoCheckout,
          total,
          totalDays: daysInMonth,
          days
        };
      });
      
      setReportData(report);
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchReportData();
    }
  }, [month, year, user]);

  const getStats = () => {
    const stats = { 
      present: 0, 
      absent: 0, 
      leave: 0, 
      delayed: 0, 
      beyondDelay: 0, 
      autoCheckout: 0,
      total: 0,
      employees: reportData.length 
    };
    reportData.forEach(emp => {
      stats.present += emp.present;
      stats.absent += emp.absent;
      stats.leave += emp.leave;
      stats.delayed += emp.delayed;
      stats.beyondDelay += emp.beyondDelay;
      stats.autoCheckout += emp.autoCheckout || 0;
      stats.total += emp.total;
    });
    return stats;
  };

  const stats = getStats();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Chart data - include all categories even with 0 values
  const barChartData = ALL_STATUSES.map(s => ({
    name: s.name,
    count: stats[s.key] || 0,
    color: s.color,
  }));

  const pieChartData = ALL_STATUSES
    .map(s => ({
      name: s.name,
      value: stats[s.key] || 0,
      color: s.color,
    }))
    .filter(d => d.value > 0);

  const getStatusBadge = (status) => {
    if (!status || status === '-') {
      return <span style={{ color: theme.colors.textMuted, fontSize: '14px' }}>•</span>;
    }
    
    const color = statusColors[status] || theme.colors.textMuted;
    const label = statusLabels[status] || status;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        background: color + '20',
        color: color,
        fontWeight: 700,
        fontSize: '11px',
        border: `1px solid ${color}40`,
      }}>
        {label}
      </span>
    );
  };

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
            Loading...
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
        <h1>📊 Attendance Report</h1>
        <p>{getMonthName(month)} {year}</p>
      </div>

      {/* Filters Card */}
      <div style={{
        margin: '12px 16px',
        padding: '16px',
        background: theme.colors.card,
        borderRadius: '12px',
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="form-control"
            style={{ 
              flex: 1, 
              minWidth: '80px', 
              padding: '10px 14px', 
              fontSize: '13px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.inputBg,
              color: theme.colors.textPrimary,
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="form-control"
            style={{ 
              flex: 1, 
              minWidth: '70px', 
              padding: '10px 14px', 
              fontSize: '13px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.inputBg,
              color: theme.colors.textPrimary,
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards - All 6 Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        padding: '0 16px',
        marginBottom: '12px',
      }}>
        {STATUS_CARDS.map((card) => (
          <div
            key={card.key}
            style={{
              padding: '12px 8px',
              background: card.bg,
              borderRadius: '10px',
              border: `1px solid ${card.border}`,
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              color: card.color,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}>
              <span>{card.icon}</span>
              {card.label}
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              color: card.color,
            }}>
              {stats[card.key] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ padding: '0 16px', marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          background: theme.colors.card,
          padding: '4px',
          borderRadius: '12px',
          border: `1px solid ${theme.colors.border}`,
        }}>
          <button
            onClick={() => setView('table')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: view === 'table' ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}DD)` : 'transparent',
              color: view === 'table' ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'Inter, sans-serif',
              boxShadow: view === 'table' ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
            }}
          >
            📋 Table
          </button>
          <button
            onClick={() => setView('chart')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: view === 'chart' ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}DD)` : 'transparent',
              color: view === 'chart' ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'Inter, sans-serif',
              boxShadow: view === 'chart' ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
            }}
          >
            📊 Chart
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: theme.colors.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
            overflow: 'hidden',
            boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                minWidth: '750px',
              }}>
                <thead>
                  <tr style={{
                    background: theme.colors.inputBg,
                    borderBottom: `2px solid ${theme.colors.border}`,
                  }}>
                    <th style={{
                      padding: '12px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      position: 'sticky',
                      left: 0,
                      background: theme.colors.inputBg,
                      minWidth: '120px',
                      zIndex: 2,
                      borderRight: `1px solid ${theme.colors.border}`,
                    }}>
                      👤 Employee
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '40px',
                    }}>
                      Total
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#10B981',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '30px',
                    }}>
                      P
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#EF4444',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '30px',
                    }}>
                      A
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#8B5CF6',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '35px',
                    }}>
                      ACO
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#F59E0B',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '30px',
                    }}>
                      D
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#DC2626',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '30px',
                    }}>
                      B
                    </th>
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#3B82F6',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      minWidth: '30px',
                    }}>
                      L
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <th key={day} style={{
                        padding: '12px 4px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: theme.colors.textMuted,
                        fontSize: '10px',
                        minWidth: '28px',
                        background: theme.colors.inputBg,
                      }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={8 + daysInMonth} style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: theme.colors.textSecondary,
                      }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📊</div>
                        <p style={{ fontWeight: 600 }}>No data available</p>
                      </td>
                    </tr>
                  ) : (
                    reportData.map((emp, idx) => (
                      <tr 
                        key={emp.id || idx}
                        style={{
                          borderBottom: idx < reportData.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                          transition: 'background 0.2s ease',
                          background: idx % 2 === 0 ? theme.colors.background : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = theme.colors.inputBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = idx % 2 === 0 ? theme.colors.background : 'transparent';
                        }}
                      >
                        <td style={{
                          padding: '10px 10px',
                          position: 'sticky',
                          left: 0,
                          background: idx % 2 === 0 ? theme.colors.background : 'transparent',
                          minWidth: '120px',
                          zIndex: 1,
                          borderRight: `1px solid ${theme.colors.border}`,
                        }}>
                          <div style={{
                            fontWeight: 700,
                            color: theme.colors.textPrimary,
                            fontSize: '13px',
                          }}>
                            {emp.name}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: theme.colors.textMuted,
                            fontWeight: 400,
                          }}>
                            {emp.employee_id}
                          </div>
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: theme.colors.textPrimary,
                          fontSize: '13px',
                        }}>
                          {emp.total}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#10B981',
                          fontSize: '13px',
                        }}>
                          {emp.present}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#EF4444',
                          fontSize: '13px',
                        }}>
                          {emp.absent}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#8B5CF6',
                          fontSize: '13px',
                        }}>
                          {emp.autoCheckout || 0}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#F59E0B',
                          fontSize: '13px',
                        }}>
                          {emp.delayed}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#DC2626',
                          fontSize: '13px',
                        }}>
                          {emp.beyondDelay}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#3B82F6',
                          fontSize: '13px',
                        }}>
                          {emp.leave}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                          <td key={day} style={{
                            padding: '6px 2px',
                            textAlign: 'center',
                            fontSize: '11px',
                          }}>
                            {getStatusBadge(emp.days?.[day])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '14px 16px',
            marginTop: '12px',
            background: theme.colors.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#10B981' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>P - Present</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#EF4444' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>A - Absent</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#8B5CF6' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>ACO - Auto Check-Out</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#F59E0B' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>D - Delayed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#DC2626' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>B - Beyond Delay</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#3B82F6' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary }}>L - Leave</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart View */}
      {view === 'chart' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Bar Chart Card */}
          <div style={{
            background: theme.colors.card,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h4 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: theme.colors.textPrimary,
                margin: 0,
              }}>
                📊 Attendance Summary
              </h4>
              <span style={{
                fontSize: '11px',
                color: theme.colors.textMuted,
                fontWeight: 500,
              }}>
                {getMonthName(month)} {year}
              </span>
            </div>
            
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme.colors.textSecondary} 
                  fontSize={10} 
                  axisLine={{ stroke: theme.colors.border }}
                  tickLine={{ stroke: theme.colors.border }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke={theme.colors.textSecondary} 
                  fontSize={10}
                  axisLine={{ stroke: theme.colors.border }}
                  tickLine={{ stroke: theme.colors.border }}
                  allowDecimals={false}
                  domain={[0, Math.max(...barChartData.map(d => d.count)) + 1 || 5]}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: theme.colors.card, 
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '10px',
                    color: theme.colors.textPrimary,
                    fontSize: '12px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [`${value} days`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={35}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '8px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              {barChartData.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: theme.colors.textSecondary,
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: item.color,
                  }} />
                  <span>{item.name}: <strong style={{ color: item.color }}>{item.count}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie Chart Card */}
          {pieChartData.length > 0 && (
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <h4 style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  margin: 0,
                }}>
                  📊 Distribution
                </h4>
                <span style={{
                  fontSize: '11px',
                  color: theme.colors.textMuted,
                  fontWeight: 500,
                }}>
                  Total: {stats.total}
                </span>
              </div>
              
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: theme.colors.border, strokeWidth: 1 }}
                    fontSize={11}
                    fontWeight={600}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: theme.colors.card, 
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '10px',
                      color: theme.colors.textPrimary,
                      fontSize: '12px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value, name) => [`${value} days`, name]}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      fontSize: '11px', 
                      paddingTop: '8px',
                      color: theme.colors.textSecondary,
                    }}
                    iconType="circle"
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieChartData.length === 0 && (
            <div style={{
              background: theme.colors.card,
              borderRadius: '12px',
              padding: '40px 20px',
              border: `1px solid ${theme.colors.border}`,
              textAlign: 'center',
              color: theme.colors.textMuted,
            }}>
              <span style={{ fontSize: '32px' }}>📊</span>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>No data available for pie chart</p>
            </div>
          )}
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};