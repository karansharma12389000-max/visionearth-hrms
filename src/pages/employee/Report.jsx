// src/pages/employee/Report.jsx
//
// Vision Earth HRMS — Premium Attendance Report
// Interactive pie chart — click a slice to see dates.
// Forgot entries show "forgot on X, resolved on Y".

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName, formatDate } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';
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
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [reportData, setReportData] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawCheckins, setRawCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('table');
  const [holidaysMap, setHolidaysMap] = useState({});

  const [sliceModal, setSliceModal] = useState({
    open: false,
    statusKey: null,
    statusCode: null,
    statusLabel: '',
    statusColor: '#000',
  });

  const COLORS = ['#10B981', '#F59E0B', '#DC2626', '#EF4444', '#3B82F6', '#F97316'];

  const statusColors = {
    P: '#10B981',
    Present: '#10B981',
    A: '#EF4444',
    Absent: '#EF4444',
    D: '#F59E0B',
    Delayed: '#F59E0B',
    B: '#DC2626',
    'Beyond Delay': '#DC2626',
    L: '#3B82F6',
    Leave: '#3B82F6',
    F: '#F97316',
    Forgotten: '#F97316',
  };

  const statusLabels = {
    P: 'P',
    Present: 'P',
    A: 'A',
    Absent: 'A',
    D: 'D',
    Delayed: 'D',
    B: 'B',
    'Beyond Delay': 'B',
    L: 'L',
    Leave: 'L',
    F: 'F',
    Forgotten: 'F',
  };

  const statusFullNames = {
    P: 'Present',
    Present: 'Present',
    A: 'Absent',
    Absent: 'Absent',
    D: 'Delayed',
    Delayed: 'Delayed',
    B: 'Beyond Delay',
    'Beyond Delay': 'Beyond Delay',
    L: 'Leave',
    Leave: 'Leave',
    F: 'Forgot Out',
    Forgotten: 'Forgot Out',
  };

  const ALL_STATUSES = [
    { name: 'Present', key: 'present', color: '#10B981', code: 'P' },
    { name: 'Delayed', key: 'delayed', color: '#F59E0B', code: 'D' },
    { name: 'Beyond Delay', key: 'beyondDelay', color: '#DC2626', code: 'B' },
    { name: 'Absent', key: 'absent', color: '#EF4444', code: 'A' },
    { name: 'Leave', key: 'leave', color: '#3B82F6', code: 'L' },
    { name: 'Forgot Out', key: 'forgotten', color: '#F97316', code: 'F' },
  ];

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  const getISTDay = (isoString) => {
    if (!isoString) return null;
    try {
      const istDateStr = new Date(isoString).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      return parseInt(istDateStr.split('-')[2], 10);
    } catch {
      return null;
    }
  };

  const getISTDate = (isoString) => {
    if (!isoString) return null;
    try {
      return new Date(isoString).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return null;
    }
  };

  // ============================================
  // FETCH REPORT DATA
  // ============================================
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(
        year,
        month,
        0
      ).getDate()}`;

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, department')
        .eq('id', user?.id);

      if (empError) throw empError;
      if (!empData || empData.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });

      if (attError) throw attError;

      // ✅ FIX: IST-anchored UTC bounds for the forgotten-records query
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const monthStartUTC = new Date(`${year}-${mm}-01T00:00:00+05:30`).toISOString();
      const monthEndUTC = new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`).toISOString();

      const { data: forgottenData, error: forgottenError } = await supabase
        .from('check_in_out')
        .select('id, employee_id, check_in_time, check_out_time, forgotten_checkout')
        .eq('employee_id', user?.id)
        .eq('forgotten_checkout', true)
        .gte('check_in_time', monthStartUTC)
        .lte('check_in_time', monthEndUTC);

      if (forgottenError) {
        console.warn('Forgotten column missing:', forgottenError.message);
      }

      setRawAttendance(attData || []);
      setRawCheckins(forgottenData || []);

      const report = empData.map((emp) => {
        const empAttendance = attData?.filter((a) => a.employee_id === emp.id) || [];
        const empForgotten = (forgottenData || []).filter((f) => f.employee_id === emp.id);

        const present = empAttendance.filter((a) => a.status === 'P' || a.status === 'Present').length;
        const absent = empAttendance.filter((a) => a.status === 'A' || a.status === 'Absent').length;
        const leave = empAttendance.filter((a) => a.status === 'L' || a.status === 'Leave').length;
        const delayed = empAttendance.filter((a) => a.status === 'D' || a.status === 'Delayed').length;
        const beyondDelay = empAttendance.filter((a) => a.status === 'B' || a.status === 'Beyond Delay').length;
        const forgotten = empForgotten.length;
        const forgottenPending = empForgotten.filter((f) => !f.check_out_time).length;
        const total = empAttendance.length;
        const daysInMonth = new Date(year, month, 0).getDate();

        const days = {};

        empAttendance.forEach((a) => {
          if (!a.attendance_date) return;
          const day = parseInt(a.attendance_date.split('-')[2], 10);
          if (day) days[day] = a.status;
        });

        empForgotten.forEach((f) => {
          const day = getISTDay(f.check_in_time);
          if (!day) return;
          const isResolved = !!f.check_out_time;
          if (!isResolved) {
            days[day] = 'F';
          } else if (!days[day]) {
            days[day] = 'F';
          }
        });

        return {
          ...emp,
          present,
          absent,
          leave,
          delayed,
          beyondDelay,
          forgotten,
          forgottenPending,
          total,
          totalDays: daysInMonth,
          days,
        };
      });

      setReportData(report);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchReportData();
  }, [month, year, user]);

  // ============================================
  // FETCH HOLIDAYS
  // ============================================
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('holidays')
        .select('holiday_date, name')
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`);

      const map = {};
      (data || []).forEach((h) => {
        map[h.holiday_date] = h.name;
      });
      setHolidaysMap(map);
    };
    load();
  }, [year]);

  // ============================================
  // STATS
  // ============================================
  const getStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      leave: 0,
      delayed: 0,
      beyondDelay: 0,
      forgotten: 0,
      total: 0,
    };
    reportData.forEach((emp) => {
      stats.present += emp.present;
      stats.absent += emp.absent;
      stats.leave += emp.leave;
      stats.delayed += emp.delayed;
      stats.beyondDelay += emp.beyondDelay;
      stats.forgotten += emp.forgotten || 0;
      stats.total += emp.total;
    });
    return stats;
  };

  const stats = getStats();
  const daysInMonth = new Date(year, month, 0).getDate();

  const barChartData = ALL_STATUSES.map((s) => ({
    name: s.name,
    count: stats[s.key] || 0,
    color: s.color,
  }));

  const pieChartData = ALL_STATUSES.map((s) => ({
    name: s.name,
    value: stats[s.key] || 0,
    color: s.color,
    key: s.key,
    code: s.code,
  })).filter((d) => d.value > 0);

  // ============================================
  // GET DATES FOR A STATUS
  // ============================================
  const getSliceDetails = (statusKey, statusCode) => {
    if (statusKey === 'forgotten') {
      return rawCheckins
        .map((f) => {
          const forgotDate = getISTDate(f.check_in_time);
          const resolvedDate = getISTDate(f.check_out_time);
          const resolved = !!f.check_out_time;

          let resolvedStatus = null;
          if (resolved && forgotDate) {
            const attRecord = rawAttendance.find(
              (a) => a.attendance_date === forgotDate
            );
            if (attRecord) resolvedStatus = attRecord.status;
          }

          return {
            forgotDate,
            resolvedDate,
            resolved,
            resolvedStatus,
          };
        })
        .filter((d) => d.forgotDate)
        .sort((a, b) => (a.forgotDate > b.forgotDate ? -1 : 1));
    }

    const matching = rawAttendance.filter((a) => {
      if (statusCode === 'P') return a.status === 'P' || a.status === 'Present';
      if (statusCode === 'D') return a.status === 'D' || a.status === 'Delayed';
      if (statusCode === 'B') return a.status === 'B' || a.status === 'Beyond Delay';
      if (statusCode === 'A') return a.status === 'A' || a.status === 'Absent';
      if (statusCode === 'L') return a.status === 'L' || a.status === 'Leave';
      return false;
    });

    return matching
      .map((a) => ({ date: a.attendance_date }))
      .filter((d) => d.date)
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  };

  const handleSliceClick = (data) => {
    // ✅ FIX: Recharts may pass either a flat payload or a wrapped one
    //    depending on version. Unwrap defensively.
    const p = data?.payload ?? data;
    if (!p) return;
    setSliceModal({
      open: true,
      statusKey: p.key,
      statusCode: p.code,
      statusLabel: p.name,
      statusColor: p.color,
    });
  };

  // ============================================
  // BADGE HELPER (with holiday support)
  // ============================================
  const getStatusBadge = (status, day) => {
    // Holiday overrides everything
    if (day) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidayName = holidaysMap[dateStr];
      if (holidayName) {
        return (
          <span
            title={holidayName}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: '#8B5CF618',
              color: '#8B5CF6',
              fontWeight: 800,
              fontSize: '10px',
              border: '1px solid #8B5CF630',
            }}
          >
            H
          </span>
        );
      }
    }

    if (!status || status === '-') {
      return (
        <span style={{ color: dark ? '#475569' : '#CBD5E1', fontSize: '13px' }}>
          •
        </span>
      );
    }

    const color = statusColors[status] || textMuted;
    const label = statusLabels[status] || status;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '7px',
          background: color + '18',
          color: color,
          fontWeight: 800,
          fontSize: '10px',
          border: `1px solid ${color}30`,
        }}
      >
        {label}
      </span>
    );
  };

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

  const sliceDetails = sliceModal.open
    ? getSliceDetails(sliceModal.statusKey, sliceModal.statusCode)
    : [];

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: pageBg,
        fontFamily: THEME.font,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                    REPORT
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
                    ANALYTICS
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
                letterSpacing: '0.8px',
                fontWeight: 500,
                position: 'relative',
                zIndex: 1,
              }}
            >
              Attendance analytics for {getMonthName(month)} {year}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '38px',
                boxSizing: 'border-box',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} style={{ color: '#000', background: '#FFF' }}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '38px',
                boxSizing: 'border-box',
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y} style={{ color: '#000', background: '#FFF' }}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STATS GRID */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {[
              { value: stats.present, label: 'Present', color: THEME.primary, accent: THEME.primary },
              { value: stats.delayed, label: 'Delayed', color: THEME.amber, accent: THEME.amber },
              { value: stats.beyondDelay, label: 'Beyond', color: THEME.red, accent: THEME.red },
              { value: stats.absent, label: 'Absent', color: THEME.red, accent: THEME.red },
              { value: stats.leave, label: 'Leave', color: THEME.blue, accent: THEME.blue },
              { value: stats.forgotten, label: 'Forgot Out', color: THEME.orange, accent: THEME.orange },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: dark
                    ? `linear-gradient(145deg, ${stat.accent}15 0%, #1E293B 60%)`
                    : `linear-gradient(145deg, ${stat.accent}10 0%, #FFFFFF 60%)`,
                  borderRadius: THEME.radiusMd,
                  padding: '18px 10px 16px',
                  textAlign: 'center',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'}`,
                  boxShadow: dark
                    ? '0 4px 12px rgba(0,0,0,0.25)'
                    : `0 4px 12px ${stat.accent}10`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}80)`,
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: stat.accent,
                    boxShadow: `0 0 8px ${stat.accent}80`,
                  }}
                />
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: stat.color,
                    lineHeight: 1,
                    marginBottom: '8px',
                    letterSpacing: '-1px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.7px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VIEW TOGGLE */}
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
              { key: 'table', label: 'Table View' },
              { key: 'chart', label: 'Chart View' },
            ].map((v) => {
              const active = view === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    borderRadius: THEME.radiusPill,
                    border: 'none',
                    background: active ? (dark ? '#1E293B' : '#FFFFFF') : 'transparent',
                    color: active ? THEME.primary : textSecondary,
                    fontWeight: active ? 800 : 600,
                    fontSize: '12px',
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

        {/* TABLE VIEW */}
        {view === 'table' && (
          <div style={{ padding: '0 16px 16px' }}>
            <div
              style={{
                background: cardBg,
                borderRadius: THEME.radiusLg,
                border: `1px solid ${border}`,
                overflow: 'hidden',
                boxShadow: cardShadow,
              }}
            >
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    minWidth: '700px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: dark ? '#0F172A' : '#F8FAFC',
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      <th
                        style={{
                          padding: '12px 10px',
                          textAlign: 'left',
                          fontWeight: 800,
                          color: textSecondary,
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'sticky',
                          left: 0,
                          background: dark ? '#0F172A' : '#F8FAFC',
                          minWidth: '110px',
                          zIndex: 2,
                          borderRight: `1px solid ${border}`,
                        }}
                      >
                        Employee
                      </th>
                      {[
                        { label: 'Total', color: textSecondary, min: '40px' },
                        { label: 'P', color: '#10B981', min: '28px' },
                        { label: 'A', color: '#EF4444', min: '28px' },
                        { label: 'F', color: '#F97316', min: '30px' },
                        { label: 'D', color: '#F59E0B', min: '28px' },
                        { label: 'B', color: '#DC2626', min: '28px' },
                        { label: 'L', color: '#3B82F6', min: '28px' },
                      ].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: '12px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: h.color,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            minWidth: h.min,
                          }}
                        >
                          {h.label}
                        </th>
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                        <th
                          key={day}
                          style={{
                            padding: '12px 4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: textMuted,
                            fontSize: '9px',
                            minWidth: '28px',
                            background: dark ? '#0F172A' : '#F8FAFC',
                          }}
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8 + daysInMonth}
                          style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: textSecondary,
                          }}
                        >
                          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📊</div>
                          <p style={{ fontWeight: 700 }}>No data available</p>
                        </td>
                      </tr>
                    ) : (
                      reportData.map((emp, idx) => (
                        <tr
                          key={emp.id || idx}
                          style={{
                            borderBottom:
                              idx < reportData.length - 1 ? `1px solid ${border}` : 'none',
                            background:
                              idx % 2 === 0
                                ? dark
                                  ? 'rgba(255,255,255,0.02)'
                                  : '#FAFAFA'
                                : 'transparent',
                          }}
                        >
                          <td
                            style={{
                              padding: '10px 10px',
                              position: 'sticky',
                              left: 0,
                              background:
                                idx % 2 === 0
                                  ? dark
                                    ? '#1E293B'
                                    : '#FAFAFA'
                                  : cardBg,
                              minWidth: '110px',
                              zIndex: 1,
                              borderRight: `1px solid ${border}`,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 800,
                                color: textPrimary,
                                fontSize: '12px',
                              }}
                            >
                              {emp.name}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: textMuted,
                                fontWeight: 500,
                              }}
                            >
                              {emp.employee_id}
                            </div>
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: textPrimary, fontSize: '12px' }}>
                            {emp.total}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#10B981', fontSize: '12px' }}>
                            {emp.present}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#EF4444', fontSize: '12px' }}>
                            {emp.absent}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#F97316', fontSize: '12px' }}>
                            {emp.forgotten || 0}
                            {emp.forgottenPending > 0 && (
                              <div style={{ fontSize: '7px', color: '#DC2626', fontWeight: 800, marginTop: '2px' }}>
                                {emp.forgottenPending} pd
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#F59E0B', fontSize: '12px' }}>
                            {emp.delayed}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#DC2626', fontSize: '12px' }}>
                            {emp.beyondDelay}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#3B82F6', fontSize: '12px' }}>
                            {emp.leave}
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                            <td
                              key={day}
                              style={{
                                padding: '6px 2px',
                                textAlign: 'center',
                                fontSize: '11px',
                              }}
                            >
                              {getStatusBadge(emp.days?.[day], day)}
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
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '14px 16px',
                marginTop: '12px',
                background: cardBg,
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                justifyContent: 'center',
                boxShadow: cardShadow,
              }}
            >
              {[
                { color: '#10B981', label: 'P - Present' },
                { color: '#EF4444', label: 'A - Absent' },
                { color: '#F97316', label: 'F - Forgot' },
                { color: '#F59E0B', label: 'D - Delayed' },
                { color: '#DC2626', label: 'B - Beyond' },
                { color: '#3B82F6', label: 'L - Leave' },
                { color: '#8B5CF6', label: 'H - Holiday' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '4px',
                      background: item.color,
                    }}
                  />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHART VIEW */}
        {view === 'chart' && (
          <div style={{ padding: '0 16px 16px' }}>
            {/* Bar Chart */}
            <div
              style={{
                background: cardBg,
                borderRadius: THEME.radiusLg,
                padding: '20px',
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: textPrimary,
                    margin: 0,
                  }}
                >
                  Monthly Summary
                </h4>
                <span style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>
                  {getMonthName(month)} {year}
                </span>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={textMuted}
                    fontSize={9}
                    axisLine={{
                      stroke: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={textMuted}
                    fontSize={10}
                    axisLine={{
                      stroke: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: dark ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${border}`,
                      borderRadius: '10px',
                      color: textPrimary,
                      fontSize: '12px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [`${value} days`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart — CLICKABLE */}
            {pieChartData.length > 0 && (
              <div
                style={{
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  padding: '20px',
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: textPrimary,
                      margin: 0,
                    }}
                  >
                    Distribution
                  </h4>
                  <span style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>
                    Total: {stats.total}
                  </span>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    background: dark ? 'rgba(16,185,129,0.08)' : THEME.primarySoft,
                    borderRadius: '10px',
                    border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
                    marginBottom: '12px',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: dark ? THEME.primaryLight : THEME.primaryDeep,
                      fontWeight: 700,
                    }}
                  >
                    👆 Tap any slice to see the dates
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
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      fontSize={11}
                      fontWeight={700}
                      onClick={handleSliceClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: dark ? '#1E293B' : '#FFFFFF',
                        border: `1px solid ${border}`,
                        borderRadius: '10px',
                        color: textPrimary,
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => [`${value} days`, name]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: '11px',
                        paddingTop: '8px',
                        color: textMuted,
                      }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieChartData.length === 0 && (
              <div
                style={{
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  padding: '40px 20px',
                  border: `1px solid ${border}`,
                  textAlign: 'center',
                  color: textSecondary,
                  boxShadow: cardShadow,
                }}
              >
                <span style={{ fontSize: '32px' }}>📊</span>
                <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700 }}>
                  No data available for charts
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, minHeight: '20px' }} />
      </div>

      <div style={{ height: '20px', flexShrink: 0 }} />

      {/* SLICE DETAIL MODAL */}
      {sliceModal.open && (
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
          onClick={() =>
            setSliceModal({
              open: false,
              statusKey: null,
              statusCode: null,
              statusLabel: '',
              statusColor: '#000',
            })
          }
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '80vh',
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '4px',
                      background: sliceModal.statusColor,
                    }}
                  />
                  <div
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: textPrimary,
                    }}
                  >
                    {sliceModal.statusLabel}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {getMonthName(month)} {year} · {sliceDetails.length}{' '}
                  {sliceDetails.length === 1 ? 'day' : 'days'}
                </div>
              </div>
              <button
                onClick={() =>
                  setSliceModal({
                    open: false,
                    statusKey: null,
                    statusCode: null,
                    statusLabel: '',
                    statusColor: '#000',
                  })
                }
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

            {sliceDetails.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: textSecondary,
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                  No dates available
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sliceDetails.map((item, idx) => {
                  const isForgot = sliceModal.statusKey === 'forgotten';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: dark ? '#0F172A' : '#F8FAFC',
                        borderRadius: THEME.radiusMd,
                        border: `1px solid ${border}`,
                      }}
                    >
                      {!isForgot ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: sliceModal.statusColor + '18',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                flexShrink: 0,
                              }}
                            >
                              📅
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: textPrimary,
                              }}
                            >
                              {formatDate(item.date)}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: sliceModal.statusColor + '18',
                              color: sliceModal.statusColor,
                              border: `1px solid ${sliceModal.statusColor}30`,
                              flexShrink: 0,
                            }}
                          >
                            {sliceModal.statusCode}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: THEME.orange + '18',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  flexShrink: 0,
                                }}
                              >
                                ⚠️
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: textMuted,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '2px',
                                  }}
                                >
                                  Forgot on
                                </div>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: textPrimary,
                                  }}
                                >
                                  {formatDate(item.forgotDate)}
                                </div>
                              </div>
                            </div>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: THEME.orange + '18',
                                color: THEME.orange,
                                border: `1px solid ${THEME.orange}30`,
                                flexShrink: 0,
                              }}
                            >
                              F
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              background: item.resolved
                                ? THEME.primary + '10'
                                : THEME.red + '10',
                              borderRadius: '10px',
                              border: `1px solid ${
                                item.resolved ? THEME.primary + '25' : THEME.red + '25'
                              }`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '14px',
                                flexShrink: 0,
                              }}
                            >
                              {item.resolved ? '✅' : '⏳'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {item.resolved ? (
                                <>
                                  <div
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Resolved on
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      color: dark ? THEME.primaryLight : THEME.primaryDeep,
                                    }}
                                  >
                                    {formatDate(item.resolvedDate)}
                                    {item.resolvedStatus && (
                                      <span
                                        style={{
                                          marginLeft: '6px',
                                          padding: '2px 8px',
                                          borderRadius: '8px',
                                          background: (statusColors[item.resolvedStatus] || THEME.primary) + '20',
                                          color: statusColors[item.resolvedStatus] || THEME.primary,
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          border: `1px solid ${
                                            (statusColors[item.resolvedStatus] || THEME.primary) + '30'
                                          }`,
                                        }}
                                      >
                                        {statusFullNames[item.resolvedStatus] || item.resolvedStatus}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Status
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      color: THEME.red,
                                    }}
                                  >
                                    Not resolved yet
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() =>
                setSliceModal({
                  open: false,
                  statusKey: null,
                  statusCode: null,
                  statusLabel: '',
                  statusColor: '#000',
                })
              }
              style={{
                width: '100%',
                padding: '13px',
                marginTop: '16px',
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14px',
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

export default Report;