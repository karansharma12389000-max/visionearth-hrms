// src/pages/admin/AttendanceHistory.jsx
//
// Vision Earth HRMS — Premium Admin Attendance History
// Premium header, refined tabs, filter row, beautiful empty state.

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
  getMonthName,
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminAttendanceHistory = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [viewMode, setViewMode] = useState('today');
  // ✅ FIX: derive initial month/year from IST calendar
  const _istNow = new Date();
  const _istMonth = parseInt(
    _istNow.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      month: '2-digit',
    })
  );
  const _istYear = parseInt(
    _istNow.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    })
  );
  const [month, setMonth] = useState(_istMonth);
  const [year, setYear] = useState(_istYear);
  const [filterDate, setFilterDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);

  // ============================================
  // THEME HELPERS
  // ============================================
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH EMPLOYEES
  // ============================================
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

  // ============================================
  // FETCH ATTENDANCE
  // ============================================
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

      const combinedData =
        attData?.map((item) => ({
          ...item,
          employee: empData?.find((emp) => emp.id === item.employee_id) || null,
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
      filtered = filtered.filter((a) => a.attendance_date === today);
    } else if (viewMode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      filtered = filtered.filter((a) =>
        a.attendance_date?.startsWith(monthStr)
      );
    }

    if (filterDate) {
      filtered = filtered.filter((a) => a.attendance_date === filterDate);
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter((a) => a.employee_id === selectedEmployee);
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

  // ============================================
  // HANDLERS
  // ============================================
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const today = getTodayIST();

    if (mode === 'today') {
      fetchAttendanceHistory(today, today);
      setFilterDate('');
    } else if (mode === 'month') {
      // ✅ FIX: zero-padded last day
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      const endDate = `${year}-${mm}-${dd}`;
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
      // ✅ FIX: zero-padded last day
      const mm = String(newMonth).padStart(2, '0');
      const lastDay = new Date(newYear, newMonth, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${newYear}-${mm}-01`;
      const endDate = `${newYear}-${mm}-${dd}`;
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
    if (viewMode === 'today') return `Today · ${formatDate(getTodayIST())}`;
    if (viewMode === 'month') return `${getMonthName(month)} ${year}`;
    if (viewMode === 'custom' && filterDate) return formatDate(filterDate);
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
          details: record[`project${i}_details`] || '',
        });
      }
    }
    return projects;
  };

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
          <p style={{ marginTop: '16px', color: textSecondary, fontSize: '14px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

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
                  ATTENDANCE
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
                  ALL RECORDS
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

          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            📋 {getViewLabel()}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* VIEW MODE TABS */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: dark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
            borderRadius: THEME.radiusPill,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
          }}
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All' },
          ].map((v) => {
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => handleViewModeChange(v.key)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: THEME.radiusPill,
                  border: 'none',
                  background: active
                    ? dark
                      ? '#1E293B'
                      : '#FFFFFF'
                    : 'transparent',
                  color: active ? THEME.primary : textSecondary,
                  fontWeight: active ? 800 : 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: THEME.font,
                }}
              >
                {v.label}
              </button>
            );
          })}
          <button
            onClick={resetFilters}
            style={{
              padding: '9px 12px',
              borderRadius: THEME.radiusPill,
              border: 'none',
              background: 'transparent',
              color: textSecondary,
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: THEME.font,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* FILTER ROW */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={month}
            onChange={(e) => handleMonthYearChange(parseInt(e.target.value), year)}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '14px',
              paddingRight: '32px',
              boxSizing: 'border-box',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => handleMonthYearChange(month, parseInt(e.target.value))}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '14px',
              paddingRight: '32px',
              boxSizing: 'border-box',
            }}
          >
            {Array.from({ length: 5 }, (_, i) => _istYear - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleDateSearch}
            style={{
              padding: '11px 18px',
              borderRadius: THEME.radiusMd,
              border: 'none',
              background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: THEME.shadowGreen,
              fontFamily: THEME.font,
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            🔍 Search
          </button>
        </div>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 12px',
            borderRadius: THEME.radiusMd,
            border: `1px solid ${border}`,
            background: cardBg,
            color: textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            outline: 'none',
            fontFamily: THEME.font,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '14px',
            paddingRight: '36px',
            boxSizing: 'border-box',
          }}
        >
          <option value="all">👥 All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.employee_id})
            </option>
          ))}
        </select>
      </div>

      {/* RESULTS COUNT */}
      <div
        style={{
          padding: '0 16px 8px',
          fontSize: '11px',
          color: textMuted,
          fontWeight: 600,
        }}
      >
        {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}{' '}
        found
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {filteredData.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
              boxShadow: cardShadow,
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: textSecondary,
                margin: 0,
              }}
            >
              No attendance records found
            </p>
            <p
              style={{
                fontSize: '11px',
                color: textMuted,
                marginTop: '6px',
                margin: 0,
                fontWeight: 500,
              }}
            >
              Try adjusting your filters
            </p>
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
                  marginBottom: '10px',
                  padding: '14px',
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${THEME.primary}15`;
                  e.currentTarget.style.borderColor = `${THEME.primary}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = cardShadow;
                  e.currentTarget.style.borderColor = border;
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          flexShrink: 0,
                          boxShadow: '0 3px 8px rgba(16,185,129,0.25)',
                        }}
                      >
                        {item.employee?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.employee?.name || 'Employee'}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: textMuted,
                            fontWeight: 600,
                          }}
                        >
                          {item.employee?.employee_id || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: textSecondary,
                        marginTop: '6px',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        fontWeight: 500,
                      }}
                    >
                      <span>📅 {formatDate(item.attendance_date)}</span>
                      {item.reporting_location && (
                        <span>📍 {item.reporting_location}</span>
                      )}
                    </div>

                    {projects.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '5px',
                        }}
                      >
                        {projects.slice(0, 2).map((p, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '9px',
                              background: dark
                                ? 'rgba(16,185,129,0.1)'
                                : THEME.primarySoft,
                              padding: '3px 8px',
                              borderRadius: '7px',
                              color: THEME.primaryDark,
                              fontWeight: 700,
                              border: `1px solid ${THEME.primary}20`,
                            }}
                          >
                            📌 {p.name}
                          </span>
                        ))}
                        {projects.length > 2 && (
                          <span
                            style={{
                              fontSize: '9px',
                              color: textMuted,
                              fontWeight: 700,
                              alignSelf: 'center',
                            }}
                          >
                            +{projects.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: THEME.radiusPill,
                      fontSize: '10px',
                      fontWeight: 800,
                      backgroundColor: statusColor + '18',
                      color: statusColor,
                      border: `1px solid ${statusColor}30`,
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAIL MODAL */}
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
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  📋 Details
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: textSecondary,
                    marginTop: '2px',
                    fontWeight: 600,
                  }}
                >
                  {selectedRecord.employee?.name} ·{' '}
                  {selectedRecord.employee?.employee_id}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  fontSize: '22px',
                  color: textMuted,
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <DetailBox
                label="Date"
                value={formatDate(selectedRecord.attendance_date)}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Status"
                value={getStatusLabel(selectedRecord.status)}
                valueColor={getStatusColor(selectedRecord.status, theme)}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <DetailBox
                label="Check In"
                value={
                  selectedRecord.check_in_time
                    ? formatTime(selectedRecord.check_in_time)
                    : '—'
                }
                valueColor={THEME.primary}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Check Out"
                value={
                  selectedRecord.check_out_time
                    ? formatTime(selectedRecord.check_out_time)
                    : '—'
                }
                valueColor={THEME.red}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Hours"
                value={`${selectedRecord.working_hours || 0}h`}
                valueColor={THEME.blue}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
            </div>

            {getProjects(selectedRecord).length > 0 && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '14px',
                  background: dark ? '#0F172A' : '#F8FAFC',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '10px',
                  }}
                >
                  📋 Projects
                </div>
                {getProjects(selectedRecord).map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      background: cardBg,
                      borderRadius: '10px',
                      marginBottom:
                        i < getProjects(selectedRecord).length - 1 ? '6px' : 0,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: textPrimary,
                        fontSize: '12px',
                      }}
                    >
                      📌 {p.name}
                    </div>
                    {p.details && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: textSecondary,
                          marginTop: '3px',
                          lineHeight: 1.4,
                        }}
                      >
                        {p.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedRecord.remarks && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '12px',
                  background: dark ? '#0F172A' : '#F8FAFC',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                  }}
                >
                  📝 Remarks
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textPrimary,
                    lineHeight: 1.4,
                  }}
                >
                  {selectedRecord.remarks}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: THEME.shadowGreen,
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
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

// ============================================
// DETAIL BOX
// ============================================
const DetailBox = ({
  label,
  value,
  valueColor,
  dark,
  textPrimary,
  textMuted,
  border,
}) => (
  <div
    style={{
      background: dark ? '#0F172A' : '#F8FAFC',
      padding: '10px 12px',
      borderRadius: THEME.radiusMd,
      border: `1px solid ${border}`,
    }}
  >
    <div
      style={{
        fontSize: '9px',
        fontWeight: 800,
        color: textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '12px',
        fontWeight: 800,
        color: valueColor || textPrimary,
      }}
    >
      {value}
    </div>
  </div>
);

export default AdminAttendanceHistory;