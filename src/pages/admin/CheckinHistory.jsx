// src/pages/admin/CheckinHistory.jsx
//
// Vision Earth HRMS — Premium Check-In/Out History
// All raw check-in and check-out records.

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
  getMonthName,
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminCheckinHistory = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
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
  const [checkins, setCheckins] = useState([]);
  const [filteredCheckins, setFilteredCheckins] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [viewMode, setViewMode] = useState('today');
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    late: 0,
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
  // FETCH
  // ============================================
  const fetchCheckinHistory = async (startDate, endDate) => {
    try {
      setLoading(true);

      let query = supabase
        .from('check_in_out')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (startDate && endDate) {
        query = query.gte('check_in_time', startDate).lte('check_in_time', endDate);
      }

      const { data: checkinData, error: checkinError } = await query;
      if (checkinError) throw checkinError;

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, email, department');

      if (empError) throw empError;

      const combinedData =
        checkinData?.map((item) => ({
          ...item,
          employee: empData?.find((emp) => emp.id === item.employee_id) || null,
        })) || [];

      setCheckins(combinedData);
      setFilteredCheckins(combinedData);

      const total = combinedData?.length || 0;
      const checkedIn =
        combinedData?.filter((c) => c.status === 'Checked In').length || 0;
      const checkedOut =
        combinedData?.filter(
          (c) => c.status === 'Checked Out' || c.status === 'Checked Out (Late)'
        ).length || 0;
      const late =
        combinedData?.filter((c) => c.status === 'Checked Out (Late)').length ||
        0;

      setStats({ total, checkedIn, checkedOut, late });
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      toast.error('Failed to load check-in history');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayData = () => {
    const today = getTodayIST();
    // ✅ FIX: IST-anchored UTC bounds for the full IST day
    const startDate = new Date(`${today}T00:00:00+05:30`).toISOString();
    const endDate = new Date(`${today}T23:59:59.999+05:30`).toISOString();
    setViewMode('today');
    setFilterDate(today);
    fetchCheckinHistory(startDate, endDate);
  };

  const loadMonthData = () => {
    // ✅ FIX: IST-anchored month range + zero-padded last day
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    const startDate = new Date(`${year}-${mm}-01T00:00:00+05:30`).toISOString();
    const endDate = new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`).toISOString();
    setViewMode('month');
    setFilterDate('');
    fetchCheckinHistory(startDate, endDate);
  };

  const loadCustomDate = () => {
    if (!filterDate) {
      toast.error('Please select a date');
      return;
    }
    // ✅ FIX: IST-anchored UTC bounds for the chosen IST day
    const startDate = new Date(`${filterDate}T00:00:00+05:30`).toISOString();
    const endDate = new Date(`${filterDate}T23:59:59.999+05:30`).toISOString();
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

  const getTodayStr = () => {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  };

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
                  CHECK-IN
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
                  HISTORY
                </div>
              </div>
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
            📍{' '}
            {viewMode === 'today' && `Today · ${getTodayStr()}`}
            {viewMode === 'month' && `${getMonthName(month)} ${year}`}
            {viewMode === 'custom' && filterDate && formatDate(filterDate)}
            {viewMode === 'all' && 'All Records'}
          </div>
        </div>
      </div>

      {/* VIEW MODE TABS */}
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
            { key: 'today', label: '📅 Today', onClick: loadTodayData },
            { key: 'month', label: '📊 Month', onClick: loadMonthData },
            { key: 'all', label: '📋 All', onClick: loadAllData },
          ].map((v) => {
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={v.onClick}
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
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
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
            onChange={(e) => setYear(parseInt(e.target.value))}
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

        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={loadCustomDate}
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
      </div>

      {/* STATS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {[
            { value: stats.total, label: 'Total', color: THEME.blue, icon: '📊' },
            { value: stats.checkedIn, label: 'In', color: THEME.primary, icon: '✓' },
            { value: stats.checkedOut, label: 'Out', color: THEME.purple, icon: '↑' },
            { value: stats.late, label: 'Late', color: THEME.amber, icon: '⏳' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusMd,
                padding: '10px 6px',
                textAlign: 'center',
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  marginBottom: '2px',
                  opacity: 0.9,
                }}
              >
                {stat.icon}
              </div>
              <div
                style={{
                  fontSize: '18px',
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
                  fontSize: '8px',
                  fontWeight: 700,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginTop: '3px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
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
        {filteredCheckins.length}{' '}
        {filteredCheckins.length === 1 ? 'record' : 'records'} found
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {filteredCheckins.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>📍</div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: textSecondary,
                margin: 0,
              }}
            >
              No check-in/out records
            </p>
          </div>
        ) : (
          filteredCheckins.map((item, idx) => {
            const statusColor =
              item.status === 'Checked In'
                ? THEME.primary
                : item.status === 'Checked Out (Late)'
                ? THEME.amber
                : THEME.purple;

            const checkInDate = item.check_in_time
              ? new Date(item.check_in_time)
              : null;
            const checkOutDate = item.check_out_time
              ? new Date(item.check_out_time)
              : null;

            return (
              <div
                key={idx}
                style={{
                  marginBottom: '10px',
                  padding: '14px',
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    paddingBottom: '10px',
                    borderBottom: `1px solid ${border}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0,
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
                          fontSize: '12px',
                          fontWeight: 800,
                          color: textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.employee?.name || 'Unknown'}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: textMuted,
                          fontWeight: 600,
                        }}
                      >
                        {item.employee?.employee_id} · {formatDate(checkInDate)}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: THEME.radiusPill,
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: statusColor + '18',
                      color: statusColor,
                      border: `1px solid ${statusColor}30`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.status || 'Checked In'}
                  </span>
                </div>

                {/* In/Out grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      background: dark ? '#0F172A' : '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px',
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: THEME.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>✓</span> Check In
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: textPrimary,
                      }}
                    >
                      {checkInDate ? formatTime(checkInDate) : '—'}
                    </div>
                    {item.check_in_address && (
                      <div
                        style={{
                          fontSize: '9px',
                          color: textMuted,
                          marginTop: '4px',
                          lineHeight: 1.3,
                          wordBreak: 'break-word',
                          fontWeight: 500,
                        }}
                      >
                        📍 {item.check_in_address.slice(0, 40)}
                        {item.check_in_address.length > 40 ? '…' : ''}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: dark ? '#0F172A' : '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px',
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: THEME.red,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>↑</span> Check Out
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: textPrimary,
                      }}
                    >
                      {checkOutDate ? formatTime(checkOutDate) : '—'}
                    </div>
                    {item.check_out_address && (
                      <div
                        style={{
                          fontSize: '9px',
                          color: textMuted,
                          marginTop: '4px',
                          lineHeight: 1.3,
                          wordBreak: 'break-word',
                          fontWeight: 500,
                        }}
                      >
                        📍 {item.check_out_address.slice(0, 40)}
                        {item.check_out_address.length > 40 ? '…' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: working hours */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: `1px solid ${border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    ⏱️ Working Hours
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color:
                        item.working_hours > 8
                          ? THEME.primary
                          : item.working_hours > 4
                          ? THEME.amber
                          : THEME.red,
                    }}
                  >
                    {item.working_hours ? `${item.working_hours}h` : '—'}
                  </div>
                </div>

                {item.forgotten_checkout && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: THEME.orangeSoft,
                      color: '#B45309',
                      fontSize: '9px',
                      fontWeight: 800,
                      display: 'inline-block',
                      border: `1px solid ${THEME.orange}30`,
                    }}
                  >
                    ⚠️ Forgotten check-out
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminCheckinHistory;