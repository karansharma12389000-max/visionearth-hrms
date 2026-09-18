// src/pages/employee/Report.jsx
//
// Vision Earth HRMS — Premium Attendance Report
// Month/Year selects, color-coded stats, table + chart view, ACO removed.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
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
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('table');

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

  const ALL_STATUSES = [
    { name: 'Present', key: 'present', color: '#10B981' },
    { name: 'Delayed', key: 'delayed', color: '#F59E0B' },
    { name: 'Beyond Delay', key: 'beyondDelay', color: '#DC2626' },
    { name: 'Absent', key: 'absent', color: '#EF4444' },
    { name: 'Leave', key: 'leave', color: '#3B82F6' },
    { name: 'Forgot Out', key: 'forgotten', color: '#F97316' },
  ];

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // IST-safe day
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
        .lte('attendance_date', endDate);

      if (attError) throw attError;

      const { data: forgottenData, error: forgottenError } = await supabase
        .from('check_in_out')
        .select('id, employee_id, check_in_time, check_out_time, forgotten_checkout')
        .eq('employee_id', user?.id)
        .eq('forgotten_checkout', true)
        .gte('check_in_time', startDate + 'T00:00:00.000Z')
        .lte('check_in_time', endDate + 'T23:59:59.999Z');

      if (forgottenError) {
        console.warn('Forgotten column missing:', forgottenError.message);
      }

      const report = empData.map((emp) => {
        const empAttendance =
          attData?.filter((a) => a.employee_id === emp.id) || [];
        const empForgotten = (forgottenData || []).filter(
          (f) => f.employee_id === emp.id
        );

        const present = empAttendance.filter(
          (a) => a.status === 'P' || a.status === 'Present'
        ).length;
        const absent = empAttendance.filter(
          (a) => a.status === 'A' || a.status === 'Absent'
        ).length;
        const leave = empAttendance.filter(
          (a) => a.status === 'L' || a.status === 'Leave'
        ).length;
        const delayed = empAttendance.filter(
          (a) => a.status === 'D' || a.status === 'Delayed'
        ).length;
        const beyondDelay = empAttendance.filter(
          (a) => a.status === 'B' || a.status === 'Beyond Delay'
        ).length;
        const forgotten = empForgotten.length;
        const forgottenPending = empForgotten.filter(
          (f) => !f.check_out_time
        ).length;
        const total = empAttendance.length;
        const daysInMonth = new Date(year, month, 0).getDate();

        const days = {};

        // Attendance → P/D/B/A/L
        empAttendance.forEach((a) => {
          if (!a.attendance_date) return;
          const day = parseInt(a.attendance_date.split('-')[2], 10);
          if (day) days[day] = a.status;
        });

        // Forgotten overlay
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
  })).filter((d) => d.value > 0);

  // ============================================
  // STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    if (!status || status === '-') {
      return (
        <span
          style={{
            color: dark ? '#475569' : '#CBD5E1',
            fontSize: '13px',
          }}
        >
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
            📊 Attendance analytics for {getMonthName(month)} {year}
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
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (y) => (
                <option
                  key={y}
                  value={y}
                  style={{ color: '#000', background: '#FFF' }}
                >
                  {y}
                </option>
              )
            )}
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
            {
              value: stats.present,
              label: 'Present',
              color: THEME.primary,
              bg: dark ? 'rgba(16,185,129,0.08)' : THEME.primarySoft,
              icon: '✓',
            },
            {
              value: stats.delayed,
              label: 'Delayed',
              color: THEME.amber,
              bg: dark ? 'rgba(245,158,11,0.08)' : THEME.amberSoft,
              icon: '⏳',
            },
            {
              value: stats.beyondDelay,
              label: 'Beyond',
              color: THEME.red,
              bg: dark ? 'rgba(239,68,68,0.08)' : THEME.redSoft,
              icon: '🚫',
            },
            {
              value: stats.absent,
              label: 'Absent',
              color: THEME.red,
              bg: dark ? 'rgba(239,68,68,0.08)' : THEME.redSoft,
              icon: '✕',
            },
            {
              value: stats.leave,
              label: 'Leave',
              color: THEME.blue,
              bg: dark ? 'rgba(59,130,246,0.08)' : THEME.blueSoft,
              icon: '📅',
            },
            {
              value: stats.forgotten,
              label: 'Forgot Out',
              color: THEME.orange,
              bg: dark ? 'rgba(249,115,22,0.08)' : THEME.orangeSoft,
              icon: '⚠️',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusLg,
                padding: '14px 10px',
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '3px',
                  height: '60%',
                  borderRadius: '4px',
                  background: `linear-gradient(180deg, ${stat.color}, ${stat.color}66)`,
                  position: 'absolute',
                  left: '10px',
                  top: '20%',
                }}
              />
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  color: stat.color,
                  flexShrink: 0,
                  marginLeft: '6px',
                  fontWeight: 800,
                }}
              >
                {stat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '20px',
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
                    fontSize: '9px',
                    fontWeight: 700,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '3px',
                  }}
                >
                  {stat.label}
                </div>
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
            { key: 'table', label: 'Table View', icon: '📋' },
            { key: 'chart', label: 'Chart View', icon: '📊' },
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
                  background: active
                    ? dark
                      ? '#1E293B'
                      : '#FFFFFF'
                    : 'transparent',
                  color: active ? THEME.primary : textSecondary,
                  fontWeight: active ? 800 : 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: THEME.font,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ fontSize: '12px' }}>{v.icon}</span>
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
                      👤 Employee
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
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => (
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
                      )
                    )}
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
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                          📊
                        </div>
                        <p style={{ fontWeight: 700 }}>No data available</p>
                      </td>
                    </tr>
                  ) : (
                    reportData.map((emp, idx) => (
                      <tr
                        key={emp.id || idx}
                        style={{
                          borderBottom:
                            idx < reportData.length - 1
                              ? `1px solid ${border}`
                              : 'none',
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
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: textPrimary,
                            fontSize: '12px',
                          }}
                        >
                          {emp.total}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#10B981',
                            fontSize: '12px',
                          }}
                        >
                          {emp.present}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#EF4444',
                            fontSize: '12px',
                          }}
                        >
                          {emp.absent}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#F97316',
                            fontSize: '12px',
                          }}
                        >
                          {emp.forgotten || 0}
                          {emp.forgottenPending > 0 && (
                            <div
                              style={{
                                fontSize: '7px',
                                color: '#DC2626',
                                fontWeight: 800,
                                marginTop: '2px',
                              }}
                            >
                              {emp.forgottenPending} pd
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#F59E0B',
                            fontSize: '12px',
                          }}
                        >
                          {emp.delayed}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#DC2626',
                            fontSize: '12px',
                          }}
                        >
                          {emp.beyondDelay}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#3B82F6',
                            fontSize: '12px',
                          }}
                        >
                          {emp.leave}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                          (day) => (
                            <td
                              key={day}
                              style={{
                                padding: '6px 2px',
                                textAlign: 'center',
                                fontSize: '11px',
                              }}
                            >
                              {getStatusBadge(emp.days?.[day])}
                            </td>
                          )
                        )}
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
            ].map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '4px',
                    background: item.color,
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: textSecondary,
                  }}
                >
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
                📊 Monthly Summary
              </h4>
              <span
                style={{
                  fontSize: '11px',
                  color: textMuted,
                  fontWeight: 600,
                }}
              >
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

          {/* Pie Chart */}
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
                  📊 Distribution
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    color: textMuted,
                    fontWeight: 600,
                  }}
                >
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
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    fontSize={11}
                    fontWeight={700}
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

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default Report;