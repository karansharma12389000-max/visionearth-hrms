// src/pages/employee/Attendance.jsx
//
// Vision Earth HRMS — Premium Attendance Page
// Attractive stat cards with colored accent bars and glow dots.

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

export const Attendance = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

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
            Your check-in and attendance records
          </div>
        </div>
      </div>

      {/* STATS GRID — ATTRACTIVE */}
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
              color: textPrimary,
              accent: dark ? 'rgba(148,163,184,0.3)' : '#CBD5E1',
            },
            {
              value: present,
              label: 'Present',
              color: THEME.primary,
              accent: THEME.primary,
            },
            {
              value: delayed,
              label: 'Delayed',
              color: THEME.amber,
              accent: THEME.amber,
            },
            {
              value: beyondDelay,
              label: 'Beyond',
              color: THEME.red,
              accent: THEME.red,
            },
            {
              value: absent,
              label: 'Absent',
              color: THEME.red,
              accent: THEME.red,
            },
            {
              value: leave,
              label: 'Leave',
              color: THEME.blue,
              accent: THEME.blue,
            },
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
                border: `1px solid ${
                  dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'
                }`,
                boxShadow: dark
                  ? '0 4px 12px rgba(0,0,0,0.25)'
                  : `0 4px 12px ${stat.accent}10`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top accent bar */}
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

              {/* Corner dot */}
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

              {/* Number */}
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

              {/* Label */}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  lineHeight: 1,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIEW MODE SEGMENTS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: dark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
            borderRadius: THEME.radiusPill,
            border: `1px solid ${
              dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
            }`,
          }}
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' },
          ].map((v) => {
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => {
                  setViewMode(v.key);
                  setFilterDate('');
                }}
                style={{
                  flex: 1,
                  padding: '8px 6px',
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={month}
            onChange={(e) => {
              setMonth(parseInt(e.target.value));
              if (viewMode !== 'month') setViewMode('custom');
            }}
            style={{
              flex: 1,
              minWidth: '90px',
              padding: '11px 14px',
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
              <option
                key={m}
                value={m}
                style={{ color: '#000', background: '#FFF' }}
              >
                {getMonthName(m)}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              setYear(parseInt(e.target.value));
              if (viewMode !== 'month') setViewMode('custom');
            }}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '11px 14px',
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

      {/* TABS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: dark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
            borderRadius: THEME.radiusPill,
            border: `1px solid ${
              dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
            }`,
          }}
        >
          {[
            { key: 'attendance', label: 'Attendance' },
            { key: 'checkinout', label: 'Check In/Out' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
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
                }}
              >
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
          fontWeight: 600,
        }}
      >
        {activeTab === 'attendance'
          ? filteredAttendance.length
          : filteredCheckin.length}{' '}
        records found
      </div>

      {/* LIST */}
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
                    style={{
                      marginBottom: '10px',
                      padding: '16px',
                      background: cardBg,
                      borderRadius: THEME.radiusLg,
                      border: `1px solid ${border}`,
                      boxShadow: cardShadow,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${THEME.primary}20`;
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
                          }}
                        >
                          {formatDate(att.attendance_date)}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: textSecondary,
                            marginTop: '3px',
                            fontWeight: 500,
                          }}
                        >
                          {att.reporting_location || 'N/A'}
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
                          border: `1px solid ${statusColor}30`,
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
                              border: `1px solid ${THEME.primary}20`,
                            }}
                          >
                            {project}
                          </span>
                        ))}
                        {projects.length > 2 && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: textMuted,
                              fontWeight: 600,
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
                    style={{
                      marginBottom: '10px',
                      padding: '16px',
                      background: cardBg,
                      borderRadius: THEME.radiusLg,
                      border: `1px solid ${border}`,
                      boxShadow: cardShadow,
                    }}
                  >
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
                        }}
                      >
                        {formatDate(checkInDate)}
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
                        label="Check In"
                        time={formatTime(checkInDate)}
                        address={item.check_in_address}
                      />
                      <InfoBox
                        dark={dark}
                        color={THEME.red}
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
                          fontWeight: 600,
                        }}
                      >
                        Working Hours
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
                          fontWeight: 700,
                          display: 'inline-block',
                          border: `1px solid ${THEME.orange}30`,
                        }}
                      >
                        Forgotten check-out
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
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
                    fontSize: '18px',
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  Details
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
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Reporting Location"
                value={selectedRecord.reporting_location || 'N/A'}
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
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Check Out"
                value={formatTimeDisplay(selectedRecord.check_out_time)}
                valueColor={THEME.red}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                dark={dark}
                label="Hours"
                value={`${selectedRecord.working_hours || 0}h`}
                valueColor={THEME.blue}
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
                  Projects
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
                      {p.name}
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
                  Remarks
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
const EmptyState = ({
  icon,
  text,
  subtitle,
  dark,
  cardBg,
  textSecondary,
  textMuted,
}) => (
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

const InfoBox = ({ dark, color, label, time, address }) => (
  <div
    style={{
      background: dark ? '#0F172A' : '#F8FAFC',
      borderRadius: THEME.radiusMd,
      padding: '12px',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
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
      }}
    >
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
        {address.slice(0, 45)}
        {address.length > 45 ? '…' : ''}
      </div>
    )}
  </div>
);

const DetailBox = ({
  dark,
  label,
  value,
  valueColor,
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
        fontWeight: 700,
        color: valueColor || textPrimary,
      }}
    >
      {value}
    </div>
  </div>
);

export default Attendance;