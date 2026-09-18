// src/pages/employee/Attendance.jsx
//
// Vision Earth HRMS — Attendance Page (Enhanced)

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
  getStatusIcon,
  getMonthName,
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

// ============================================
// GLOBAL ANIMATION STYLES
// ============================================
const injectStyles = () => {
  if (document.getElementById('attendance-animations')) return;
  const style = document.createElement('style');
  style.id = 'attendance-animations';
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .att-fade-in {
      animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;
    }
    .att-tab-active::before {
      content: '';
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      animation: pulseDot 1.5s ease-in-out infinite;
      box-shadow: 0 0 8px #10B981;
    }
  `;
  document.head.appendChild(style);
};

export const Attendance = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  // Inject animations once
  useEffect(() => { injectStyles(); }, []);

  const [attendance, setAttendance] = useState([]);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [filteredCheckin, setFilteredCheckin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [viewMode, setViewMode] = useState('today');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ============================================
  // HELPERS
  // ============================================
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
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
      applyFilters(data || [], checkinHistory);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckinHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setCheckinHistory(data || []);
      applyFilters(attendance, data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const applyFilters = (attData = attendance, checkData = checkinHistory) => {
    let fAtt = [...attData];
    let fCheck = [...checkData];
    const today = getTodayIST();

    if (viewMode === 'today') {
      fAtt = fAtt.filter((a) => a.attendance_date === today);
      fCheck = fCheck.filter((c) => {
        if (!c.check_in_time) return false;
        const d = new Date(c.check_in_time).toISOString().split('T')[0];
        return d === today;
      });
    } else if (viewMode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      fAtt = fAtt.filter((a) => a.attendance_date?.startsWith(monthStr));
      fCheck = fCheck.filter((c) => {
        if (!c.check_in_time) return false;
        const d = new Date(c.check_in_time).toISOString().split('T')[0];
        return d?.startsWith(monthStr);
      });
    }

    if (filterDate) {
      fAtt = fAtt.filter((a) => a.attendance_date === filterDate);
      fCheck = fCheck.filter((c) => {
        if (!c.check_in_time) return false;
        const d = new Date(c.check_in_time).toISOString().split('T')[0];
        return d === filterDate;
      });
    }

    if (filterStatus !== 'all') {
      fAtt = fAtt.filter((a) => a.status === filterStatus);
    }

    setFilteredAttendance(fAtt);
    setFilteredCheckin(fCheck);
  };

  useEffect(() => {
    if (user?.id) {
      fetchAttendance();
      fetchCheckinHistory();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [viewMode, month, year, filterDate, filterStatus, attendance, checkinHistory]);

  // ============================================
  // HELPERS
  // ============================================
  const handleCardClick = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getProjects = (record) => {
    const out = [];
    for (let i = 1; i <= 6; i++) {
      if (record[`project${i}`]) {
        out.push({
          name: record[`project${i}`],
          details: record[`project${i}_details`] || '',
        });
      }
    }
    return out;
  };

  const formatTimeDisplay = (timeValue) => {
    if (!timeValue) return 'N/A';
    if (typeof timeValue === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue.slice(0, 5);
    }
    try {
      const d = new Date(timeValue);
      if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5);
    } catch {}
    return 'N/A';
  };

  // ============================================
  // STATS
  // ============================================
  const total = attendance.length;
  const present = attendance.filter(
    (a) => a.status === 'P' || a.status === 'Present'
  ).length;
  const absent = attendance.filter(
    (a) => a.status === 'A' || a.status === 'Absent'
  ).length;
  const leave = attendance.filter(
    (a) => a.status === 'L' || a.status === 'Leave'
  ).length;
  const delayed = attendance.filter(
    (a) => a.status === 'D' || a.status === 'Delayed'
  ).length;
  const beyondDelay = attendance.filter(
    (a) => a.status === 'B' || a.status === 'Beyond Delay'
  ).length;

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
                  HISTORY
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
            📍 Your check-in and attendance records
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ENHANCED STATS GRID */}
      {/* ============================================ */}
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
              value: total,
              label: 'Total',
              color: dark ? '#94A3B8' : '#475569',
              bg: dark ? '#1E293B' : '#FFFFFF',
              icon: '📊',
              glow: '#94A3B8',
            },
            {
              value: present,
              label: 'Present',
              color: THEME.primary,
              bg: dark ? '#1E293B' : THEME.primarySoft,
              icon: '✓',
              glow: THEME.primary,
            },
            {
              value: delayed,
              label: 'Delayed',
              color: THEME.amber,
              bg: dark ? '#1E293B' : THEME.amberSoft,
              icon: '⏳',
              glow: THEME.amber,
            },
            {
              value: beyondDelay,
              label: 'Beyond',
              color: THEME.red,
              bg: dark ? '#1E293B' : THEME.redSoft,
              icon: '🚫',
              glow: THEME.red,
            },
            {
              value: absent,
              label: 'Absent',
              color: THEME.red,
              bg: dark ? '#1E293B' : THEME.redSoft,
              icon: '✕',
              glow: THEME.red,
            },
            {
              value: leave,
              label: 'Leave',
              color: THEME.blue,
              bg: dark ? '#1E293B' : THEME.blueSoft,
              icon: '📅',
              glow: THEME.blue,
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="att-fade-in"
              style={{
                animationDelay: `${idx * 40}ms`,
                position: 'relative',
                background: dark ? '#1E293B' : stat.bg,
                borderRadius: THEME.radiusLg,
                padding: '14px 8px 12px',
                textAlign: 'center',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : stat.color + '25'}`,
                boxShadow: dark
                  ? THEME.shadowDarkSm
                  : `0 2px 10px ${stat.glow}10, 0 1px 3px rgba(0,0,0,0.03)`,
                overflow: 'hidden',
              }}
            >
              {/* Top gradient accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${stat.color}00, ${stat.color}, ${stat.color}00)`,
                  opacity: 0.7,
                }}
              />

              {/* Icon circle */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  margin: '0 auto 6px',
                  borderRadius: '50%',
                  background: `${stat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: stat.color,
                  boxShadow: `0 2px 6px ${stat.color}20`,
                }}
              >
                {stat.icon}
              </div>

              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '4px',
                  letterSpacing: '-0.5px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: dark ? '#94A3B8' : stat.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* VIEW MODE SEGMENTS (Enhanced) */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '5px',
            background: dark ? '#1E293B' : '#FFFFFF',
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
          }}
        >
          {[
            { key: 'today', label: 'Today', icon: '📅' },
            { key: 'month', label: 'Month', icon: '📊' },
            { key: 'all', label: 'All', icon: '📋' },
          ].map((v) => {
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => {
                  setViewMode(v.key);
                  setFilterDate('');
                }}
                className={active ? 'att-tab-active' : ''}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: active
                    ? `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`
                    : 'transparent',
                  color: active ? '#FFFFFF' : textSecondary,
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: active ? THEME.shadowGreen : 'none',
                  fontFamily: THEME.font,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ fontSize: '13px' }}>{v.icon}</span>
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* FILTERS (Enhanced) */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Month dropdown */}
          <div style={{ flex: 1, minWidth: '90px', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              📅
            </div>
            <select
              value={month}
              onChange={(e) => {
                setMonth(parseInt(e.target.value));
                if (viewMode !== 'month') setViewMode('custom');
              }}
              style={{
                width: '100%',
                padding: '11px 32px 11px 34px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                fontFamily: THEME.font,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} style={{ color: '#000', background: '#FFF' }}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Year dropdown */}
          <div style={{ flex: 1, minWidth: '80px', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              🗓️
            </div>
            <select
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                if (viewMode !== 'month') setViewMode('custom');
              }}
              style={{
                width: '100%',
                padding: '11px 32px 11px 34px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                fontFamily: THEME.font,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                (y) => (
                  <option key={y} value={y} style={{ color: '#000', background: '#FFF' }}>
                    {y}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN TABS (Enhanced with icons) */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '5px',
            background: dark ? '#1E293B' : '#FFFFFF',
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
          }}
        >
          {[
            { key: 'attendance', label: 'Attendance', icon: '📋' },
            { key: 'checkinout', label: 'Check In/Out', icon: '📍' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={active ? 'att-tab-active' : ''}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: active
                    ? `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`
                    : 'transparent',
                  color: active ? '#FFFFFF' : textSecondary,
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: active ? THEME.shadowGreen : 'none',
                  fontFamily: THEME.font,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ fontSize: '13px' }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div
        style={{
          padding: '0 16px 8px',
          fontSize: '11px',
          color: textMuted,
          fontWeight: 700,
          letterSpacing: '0.3px',
        }}
      >
        {activeTab === 'attendance'
          ? filteredAttendance.length
          : filteredCheckin.length}{' '}
        records found
      </div>

      {/* ============================================ */}
      {/* LIST (Enhanced Cards) */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        {activeTab === 'attendance' ? (
          <>
            {filteredAttendance.length === 0 ? (
              <EmptyState
                icon="📋"
                text="No attendance records found"
                subtitle="Try adjusting your filters"
                dark={dark}
                cardBg={cardBg}
                textSecondary={textSecondary}
                textMuted={textMuted}
              />
            ) : (
              filteredAttendance.map((att, idx) => {
                const statusColor = getStatusColor(att.status, theme);
                const statusLabel = getStatusLabel(att.status);
                const statusIcon = getStatusIcon(att.status);

                const projects = [];
                for (let i = 1; i <= 6; i++) {
                  if (att[`project${i}`]) projects.push(att[`project${i}`]);
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleCardClick(att)}
                    className="att-fade-in"
                    style={{
                      animationDelay: `${idx * 50}ms`,
                      position: 'relative',
                      marginBottom: '10px',
                      padding: '16px 16px 16px 18px',
                      background: cardBg,
                      borderRadius: THEME.radiusLg,
                      border: `1px solid ${border}`,
                      boxShadow: cardShadow,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${statusColor}25`;
                      e.currentTarget.style.borderColor = `${statusColor}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = cardShadow;
                      e.currentTarget.style.borderColor = border;
                    }}
                  >
                    {/* Left colored accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        background: `linear-gradient(180deg, ${statusColor}, ${statusColor}80)`,
                        borderRadius: '4px 0 0 4px',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: textPrimary,
                            letterSpacing: '-0.2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: statusColor,
                              boxShadow: `0 0 6px ${statusColor}`,
                            }}
                          />
                          {formatDate(att.attendance_date)}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: textSecondary,
                            marginTop: '4px',
                            fontWeight: 600,
                          }}
                        >
                          📍 {att.reporting_location || 'N/A'}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '5px 14px',
                          borderRadius: THEME.radiusPill,
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: statusColor + '18',
                          color: statusColor,
                          flexShrink: 0,
                          marginLeft: '10px',
                          letterSpacing: '0.3px',
                          border: `1px solid ${statusColor}40`,
                          boxShadow: `0 2px 6px ${statusColor}20`,
                        }}
                      >
                        {statusIcon} {statusLabel}
                      </span>
                    </div>

                    {projects.length > 0 && (
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        {projects.slice(0, 2).map((project, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '10px',
                              background: dark
                                ? 'rgba(16,185,129,0.1)'
                                : THEME.primarySoft,
                              padding: '4px 10px',
                              borderRadius: '8px',
                              color: THEME.primaryDark,
                              fontWeight: 700,
                              border: `1px solid ${THEME.primary}25`,
                            }}
                          >
                            📌 {project}
                          </span>
                        ))}
                        {projects.length > 2 && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: textMuted,
                              fontWeight: 700,
                              alignSelf: 'center',
                            }}
                          >
                            +{projects.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            {filteredCheckin.length === 0 ? (
              <EmptyState
                icon="📍"
                text="No check-in/out records found"
                subtitle="Check in to see your history"
                dark={dark}
                cardBg={cardBg}
                textSecondary={textSecondary}
                textMuted={textMuted}
              />
            ) : (
              filteredCheckin.map((item, idx) => {
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
                    className="att-fade-in"
                    style={{
                      animationDelay: `${idx * 50}ms`,
                      position: 'relative',
                      marginBottom: '10px',
                      padding: '16px 16px 16px 18px',
                      background: cardBg,
                      borderRadius: THEME.radiusLg,
                      border: `1px solid ${border}`,
                      boxShadow: cardShadow,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        background: `linear-gradient(180deg, ${statusColor}, ${statusColor}80)`,
                        borderRadius: '4px 0 0 4px',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        paddingBottom: '10px',
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: textPrimary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        📅 {formatDate(checkInDate)}
                      </div>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: THEME.radiusPill,
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: statusColor + '18',
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.status || 'Checked In'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <InfoBox
                        dark={dark}
                        color={THEME.primary}
                        icon="✓"
                        label="Check In"
                        time={formatTime(checkInDate)}
                        address={item.check_in_address}
                      />
                      <InfoBox
                        dark={dark}
                        color={THEME.red}
                        icon="↑"
                        label="Check Out"
                        time={formatTime(checkOutDate)}
                        address={item.check_out_address}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '10px',
                        borderTop: `1px solid ${border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: textSecondary,
                          fontWeight: 700,
                        }}
                      >
                        ⏱️ Working Hours
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
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
                          marginTop: '10px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: THEME.orangeSoft,
                          color: '#B45309',
                          fontSize: '10px',
                          fontWeight: 800,
                          display: 'inline-block',
                          border: `1px solid ${THEME.orange}40`,
                        }}
                      >
                        ⚠️ Forgotten check-out
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* DETAIL MODAL (unchanged structure) */}
      {/* ============================================ */}
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
                    fontSize: '18px',
                    fontWeight: 800,
                    color: textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  📋 Details
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textSecondary,
                    marginTop: '2px',
                  }}
                >
                  {formatDate(selectedRecord.attendance_date)}
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
                background: dark ? '#0F172A' : THEME.primarySoft,
                padding: '14px',
                borderRadius: THEME.radiusMd,
                marginBottom: '14px',
                border: `1px solid ${THEME.primary}30`,
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: THEME.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Status
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: getStatusColor(selectedRecord.status, theme),
                }}
              >
                {getStatusIcon(selectedRecord.status)}{' '}
                {getStatusLabel(selectedRecord.status)}
              </div>
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
                dark={dark}
                label="Date"
                value={formatDate(selectedRecord.attendance_date)}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Reporting Location"
                value={`📍 ${selectedRecord.reporting_location || 'N/A'}`}
                cardBg={cardBg}
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
                dark={dark}
                label="Check In"
                value={formatTimeDisplay(selectedRecord.check_in_time)}
                valueColor={THEME.primary}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Check Out"
                value={formatTimeDisplay(selectedRecord.check_out_time)}
                valueColor={THEME.red}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Hours"
                value={`${selectedRecord.working_hours || 0}h`}
                valueColor={THEME.blue}
                cardBg={cardBg}
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
                        fontWeight: 700,
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
                  marginBottom: '16px',
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

// ============================================
// HELPERS
// ============================================
const EmptyState = ({ icon, text, subtitle, dark, cardBg, textSecondary, textMuted }) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      background: cardBg,
      borderRadius: THEME.radiusLg,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
    }}
  >
    <div style={{ fontSize: '44px', marginBottom: '12px' }}>{icon}</div>
    <p
      style={{
        fontSize: '14px',
        fontWeight: 700,
        color: textSecondary,
        margin: 0,
      }}
    >
      {text}
    </p>
    {subtitle && (
      <p
        style={{
          fontSize: '12px',
          color: textMuted,
          marginTop: '6px',
          margin: 0,
        }}
      >
        {subtitle}
      </p>
    )}
  </div>
);

const InfoBox = ({ dark, color, icon, label, time, address }) => (
  <div
    style={{
      background: dark ? '#0F172A' : '#F8FAFC',
      borderRadius: THEME.radiusMd,
      padding: '12px',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
      position: 'relative',
    }}
  >
    <div
      style={{
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        color: color,
        marginBottom: '6px',
        letterSpacing: '0.4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 900,
          color: color,
        }}
      >
        {icon}
      </span>
      {label}
    </div>
    <div
      style={{
        fontSize: '15px',
        fontWeight: 800,
        color: dark ? '#F1F5F9' : THEME.text,
        letterSpacing: '-0.2px',
      }}
    >
      {time}
    </div>
    {address && (
      <div
        style={{
          fontSize: '10px',
          color: dark ? '#94A3B8' : THEME.textMuted,
          marginTop: '6px',
          lineHeight: 1.4,
          wordBreak: 'break-word',
          fontWeight: 500,
        }}
      >
        📍 {address.slice(0, 45)}
        {address.length > 45 ? '…' : ''}
      </div>
    )}
  </div>
);

const DetailBox = ({ dark, label, value, valueColor, cardBg, textPrimary, textMuted, border }) => (
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
        fontWeight: 700,
        color: valueColor || textPrimary,
      }}
    >
      {value}
    </div>
  </div>
);

export default Attendance;