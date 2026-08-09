// src/pages/admin/CheckinHistory.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { 
  getTodayIST, 
  formatDate, 
  formatTime, 
  getMonthName 
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const AdminCheckinHistory = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [checkins, setCheckins] = useState([]);
  const [filteredCheckins, setFilteredCheckins] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [viewMode, setViewMode] = useState('today');
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    autoCheckedOut: 0
  });

  const fetchCheckinHistory = async (startDate, endDate) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('check_in_out')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('check_in_time', startDate)
          .lte('check_in_time', endDate);
      }

      const { data: checkinData, error: checkinError } = await query;
      
      if (checkinError) throw checkinError;
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, email, department');
      
      if (empError) throw empError;
      
      const combinedData = checkinData?.map(item => ({
        ...item,
        employee: empData?.find(emp => emp.id === item.employee_id) || null
      })) || [];
      
      setCheckins(combinedData);
      setFilteredCheckins(combinedData);
      
      const total = combinedData?.length || 0;
      const checkedIn = combinedData?.filter(c => c.status === 'Checked In').length || 0;
      const checkedOut = combinedData?.filter(c => c.status === 'Checked Out').length || 0;
      const autoCheckedOut = combinedData?.filter(c => c.status === 'Checked Out (Auto)').length || 0;
      
      setStats({ total, checkedIn, checkedOut, autoCheckedOut });
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      toast.error('Failed to load check-in history');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayData = () => {
    const today = getTodayIST();
    const startDate = today + 'T00:00:00.000Z';
    const endDate = today + 'T23:59:59.999Z';
    setViewMode('today');
    setFilterDate(today);
    fetchCheckinHistory(startDate, endDate);
  };

  const loadMonthData = () => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}T23:59:59.999Z`;
    setViewMode('month');
    setFilterDate('');
    fetchCheckinHistory(startDate, endDate);
  };

  const loadCustomDate = () => {
    if (!filterDate) {
      toast.error('Please select a date');
      return;
    }
    const startDate = filterDate + 'T00:00:00.000Z';
    const endDate = filterDate + 'T23:59:59.999Z';
    setViewMode('custom');
    fetchCheckinHistory(startDate, endDate);
  };

  const loadAllData = () => {
    setViewMode('all');
    setFilterDate('');
    fetchCheckinHistory(null, null);
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    if (viewMode === 'month') {
      loadMonthData();
    }
  }, [month, year]);

  const formatTimeDisplay = (date) => {
    if (!date) return 'N/A';
    return formatTime(date);
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'N/A';
    return formatDate(date);
  };

  const getTodayStr = () => {
    const today = new Date();
    return today.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
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
            Loading check-in history...
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
      <div className="page-header">
        <h1>📍 Check-In/Out History</h1>
        <p>
          {viewMode === 'today' && `Today • ${getTodayStr()}`}
          {viewMode === 'month' && `${getMonthName(month)} ${year}`}
          {viewMode === 'custom' && filterDate && formatDate(filterDate)}
          {viewMode === 'all' && 'All Records'}
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={loadTodayData}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'today' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'today' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'today' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📅 Today
        </button>
        <button
          onClick={loadMonthData}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'month' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'month' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'month' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📊 This Month
        </button>
        <button
          onClick={loadAllData}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'all' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'all' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'all' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📋 All
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
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
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            fontSize: '12px',
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
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="form-control"
          style={{ 
            flex: 1,
            minWidth: '120px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
          }}
        />
        
        <button
          onClick={loadCustomDate}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #059669, #10B981)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
          }}
        >
          🔍 Search
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        padding: '12px 16px',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '10px 8px',
          background: '#3B82F615',
          borderRadius: '8px',
          border: '1px solid #3B82F630',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B82F6' }}>{stats.total}</div>
          <div style={{ fontSize: '8px', fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '10px 8px',
          background: '#10B98115',
          borderRadius: '8px',
          border: '1px solid #10B98130',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>{stats.checkedIn}</div>
          <div style={{ fontSize: '8px', fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase' }}>✅ In</div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '10px 8px',
          background: '#8B5CF615',
          borderRadius: '8px',
          border: '1px solid #8B5CF630',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#8B5CF6' }}>{stats.checkedOut}</div>
          <div style={{ fontSize: '8px', fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase' }}>📤 Out</div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '10px 8px',
          background: '#F59E0B15',
          borderRadius: '8px',
          border: '1px solid #F59E0B30',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>{stats.autoCheckedOut}</div>
          <div style={{ fontSize: '8px', fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase' }}>🔄 Auto</div>
        </div>
      </div>

      <div style={{
        padding: '0 16px 8px',
        fontSize: '12px',
        color: theme.colors.textMuted,
      }}>
        {filteredCheckins.length} {filteredCheckins.length === 1 ? 'record' : 'records'} found
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        {filteredCheckins.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: theme.colors.textSecondary,
            background: theme.colors.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📍</div>
            <p style={{ fontWeight: 600 }}>No check-in/out records found</p>
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
              {viewMode === 'today' && 'No check-ins or check-outs for today'}
              {viewMode === 'month' && `No records for ${getMonthName(month)} ${year}`}
              {viewMode === 'custom' && filterDate && `No records for ${formatDate(filterDate)}`}
              {viewMode === 'all' && 'No records available'}
            </p>
          </div>
        ) : (
          filteredCheckins.map((item, idx) => {
            const statusColor = item.status === 'Checked In' ? '#10B981' : 
                               item.status === 'Checked Out (Auto)' ? '#F59E0B' : '#8B5CF6';
            
            const checkInDate = item.check_in_time ? new Date(item.check_in_time) : null;
            const checkOutDate = item.check_out_time ? new Date(item.check_out_time) : null;
            
            return (
              <div
                key={idx}
                style={{ 
                  marginBottom: '12px',
                  padding: '14px',
                  background: theme.colors.card,
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.border}`,
                  boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span>👤</span>
                      {item.employee?.name || 'Unknown Employee'}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: theme.colors.textMuted,
                      marginTop: '1px',
                    }}>
                      {item.employee?.employee_id} • {formatDateDisplay(checkInDate)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 12px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: statusColor + '22',
                      color: statusColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.status || 'Checked In'}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    background: theme.colors.inputBg,
                    borderRadius: '8px',
                    padding: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#10B981',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>✅</span> Check In
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                    }}>
                      {formatTimeDisplay(checkInDate)}
                    </div>
                    {item.check_in_address && (
                      <div style={{
                        fontSize: '9px',
                        color: theme.colors.textMuted,
                        marginTop: '4px',
                        lineHeight: '1.3',
                        wordBreak: 'break-word',
                      }}>
                        📍 {item.check_in_address}
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: theme.colors.inputBg,
                    borderRadius: '8px',
                    padding: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#EF4444',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>📤</span> Check Out
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: theme.colors.textPrimary,
                    }}>
                      {item.check_out_time ? formatTimeDisplay(checkOutDate) : '—'}
                    </div>
                    {item.check_out_address && (
                      <div style={{
                        fontSize: '9px',
                        color: theme.colors.textMuted,
                        marginTop: '4px',
                        lineHeight: '1.3',
                        wordBreak: 'break-word',
                      }}>
                        📍 {item.check_out_address}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: `1px solid ${theme.colors.border}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: theme.colors.textSecondary,
                    }}>
                      ⏱️ Working Hours:
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: item.working_hours > 8 ? '#10B981' : item.working_hours > 4 ? '#F59E0B' : '#EF4444',
                    }}>
                      {item.working_hours ? `${item.working_hours}h` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};