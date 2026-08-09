// src/pages/admin/AdminAttendanceHistory.jsx

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
  getStatusColor, 
  getStatusLabel, 
  getMonthName 
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const AdminAttendanceHistory = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter states
  const [viewMode, setViewMode] = useState('today');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, employee_id')
        .order('name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceHistory = async (startDate, endDate) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('attendance')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);
      }

      const { data: attData, error: attError } = await query;
      
      if (attError) throw attError;
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, department');
      
      if (empError) throw empError;
      
      const combinedData = attData?.map(item => ({
        ...item,
        employee: empData?.find(emp => emp.id === item.employee_id) || null
      })) || [];
      
      setAttendanceData(combinedData);
      applyFilters(combinedData);
      
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data = attendanceData) => {
    let filtered = [...data];
    
    const today = getTodayIST();
    
    if (viewMode === 'today') {
      filtered = filtered.filter(a => a.attendance_date === today);
    } else if (viewMode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      filtered = filtered.filter(a => a.attendance_date?.startsWith(monthStr));
    }
    
    if (filterDate) {
      filtered = filtered.filter(a => a.attendance_date === filterDate);
    }
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(a => a.employee_id === selectedEmployee);
    }
    
    setFilteredData(filtered);
  };

  useEffect(() => {
    fetchEmployees();
    const today = getTodayIST();
    fetchAttendanceHistory(today, today);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [viewMode, month, year, filterDate, selectedEmployee, attendanceData]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const today = getTodayIST();
    
    if (mode === 'today') {
      fetchAttendanceHistory(today, today);
      setFilterDate('');
    } else if (mode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const startDate = monthStr + '-01';
      const endDate = monthStr + '-' + new Date(year, month, 0).getDate();
      fetchAttendanceHistory(startDate, endDate);
      setFilterDate('');
    } else if (mode === 'all') {
      fetchAttendanceHistory(null, null);
      setFilterDate('');
    }
  };

  const handleMonthYearChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    if (viewMode === 'month') {
      const monthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      const startDate = monthStr + '-01';
      const endDate = monthStr + '-' + new Date(newYear, newMonth, 0).getDate();
      fetchAttendanceHistory(startDate, endDate);
    }
  };

  const handleDateSearch = () => {
    if (!filterDate) {
      toast.error('Please select a date');
      return;
    }
    setViewMode('custom');
    fetchAttendanceHistory(filterDate, filterDate);
  };

  const resetFilters = () => {
    setViewMode('today');
    setFilterDate('');
    setSelectedEmployee('all');
    const today = getTodayIST();
    fetchAttendanceHistory(today, today);
  };

  const getViewLabel = () => {
    if (viewMode === 'today') return `Today • ${formatDate(getTodayIST())}`;
    if (viewMode === 'month') return `${getMonthName(month)} ${year}`;
    if (viewMode === 'custom' && filterDate) {
      return formatDate(filterDate);
    }
    return 'All Records';
  };

  const handleCardClick = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getProjects = (record) => {
    const projects = [];
    for (let i = 1; i <= 6; i++) {
      if (record[`project${i}`]) {
        projects.push({
          name: record[`project${i}`],
          details: record[`project${i}_details`] || ''
        });
      }
    }
    return projects;
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
            Loading attendance history...
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
        <h1>📋 Attendance History</h1>
        <p>{getViewLabel()}</p>
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
          onClick={() => handleViewModeChange('today')}
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
          onClick={() => handleViewModeChange('month')}
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
          onClick={() => handleViewModeChange('all')}
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
        <button
          onClick={resetFilters}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: `1px solid ${theme.colors.border}`,
            background: 'transparent',
            color: theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🔄 Reset
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '10px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <select
          value={month}
          onChange={(e) => handleMonthYearChange(parseInt(e.target.value), year)}
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
          onChange={(e) => handleMonthYearChange(month, parseInt(e.target.value))}
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
          onClick={handleDateSearch}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🔍 Search
        </button>
      </div>

      <div style={{
        padding: '8px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="form-control"
          style={{
            width: '100%',
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
          <option value="all">👥 All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
          ))}
        </select>
      </div>

      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        color: theme.colors.textMuted,
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {filteredData.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: theme.colors.textSecondary,
            background: theme.colors.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontWeight: 600 }}>No attendance records found</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>Try adjusting your filters</p>
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const statusColor = getStatusColor(item.status, theme);
            const statusLabel = getStatusLabel(item.status);
            const projects = getProjects(item);
            
            return (
              <div
                key={idx}
                onClick={() => handleCardClick(item)}
                style={{
                  marginBottom: '8px',
                  padding: '14px 16px',
                  background: theme.colors.card,
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: theme.colors.textPrimary,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      {item.employee?.name || 'Employee'}
                      <span style={{
                        fontSize: '11px',
                        color: theme.colors.textMuted,
                        fontWeight: 400,
                      }}>
                        • {item.employee?.employee_id || 'N/A'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: theme.colors.textSecondary,
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}>
                      <span>📅 {formatDate(item.attendance_date)}</span>
                      {item.reporting_location && (
                        <span>📍 {item.reporting_location}</span>
                      )}
                    </div>
                    {projects.length > 0 && (
                      <div style={{
                        marginTop: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                      }}>
                        {projects.slice(0, 2).map((p, i) => (
                          <span key={i} style={{
                            fontSize: '10px',
                            background: theme.colors.inputBg,
                            padding: '2px 10px',
                            borderRadius: '12px',
                            color: theme.colors.textSecondary,
                            border: `1px solid ${theme.colors.border}`,
                          }}>
                            📌 {p.name}
                          </span>
                        ))}
                        {projects.length > 2 && (
                          <span style={{
                            fontSize: '10px',
                            color: theme.colors.textMuted,
                          }}>
                            +{projects.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '4px 14px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: statusColor + '22',
                      color: statusColor,
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                      flexShrink: 0,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: theme.colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>👆 Click to view details</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showDetailModal && selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: theme.colors.card,
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  📋 Attendance Details
                </div>
                <div style={{
                  fontSize: '13px',
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}>
                  {selectedRecord.employee?.name} • {selectedRecord.employee?.employee_id}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Employee</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: theme.colors.textPrimary }}>{selectedRecord.employee?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>{selectedRecord.employee?.employee_id || 'N/A'}</div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Status</div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: getStatusColor(selectedRecord.status, theme),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: getStatusColor(selectedRecord.status, theme),
                  }} />
                  {getStatusLabel(selectedRecord.status)}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                  {formatDate(selectedRecord.attendance_date)}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Reporting Location</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                  📍 {selectedRecord.reporting_location || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Check In</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#10B981' }}>
                  {selectedRecord.check_in_time ? formatTime(selectedRecord.check_in_time) : '—'}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Check Out</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>
                  {selectedRecord.check_out_time ? formatTime(selectedRecord.check_out_time) : '—'}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Working Hours</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: selectedRecord.working_hours > 8 ? '#10B981' : selectedRecord.working_hours > 4 ? '#F59E0B' : '#EF4444',
                }}>
                  {selectedRecord.working_hours || 0}h
                </div>
              </div>
            </div>

            {getProjects(selectedRecord).length > 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: theme.colors.inputBg,
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginBottom: '8px',
                }}>
                  📋 Projects
                </div>
                {getProjects(selectedRecord).map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    background: theme.colors.card,
                    borderRadius: '6px',
                    marginBottom: i < getProjects(selectedRecord).length - 1 ? '6px' : 0,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <div style={{ fontWeight: 600, color: theme.colors.textPrimary, fontSize: '13px' }}>
                      📌 {p.name}
                    </div>
                    {p.details && (
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                        {p.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedRecord.remarks && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: theme.colors.inputBg,
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginBottom: '4px',
                }}>
                  📝 Remarks
                </div>
                <div style={{ fontSize: '13px', color: theme.colors.textPrimary }}>
                  {selectedRecord.remarks}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}DD)`,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};