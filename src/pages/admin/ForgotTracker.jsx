// src/pages/admin/ForgotTracker.jsx
//
// Vision Earth HRMS — Admin Forgot Check-Out Tracker
// Direct page — all logic inside. Includes warning email option.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName, formatDate } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const ForgotTracker = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

  // ✅ FIX: derive current month/year from IST calendar
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

  const [summary, setSummary] = useState({
    total: 0,
    uniqueEmployees: 0,
    unresolved: 0,
    resolved: 0,
  });
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [emailModal, setEmailModal] = useState({
    open: false,
    employee: null,
  });

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH ALL DATA
  // ============================================
  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ FIX: IST-anchored UTC bounds for the check_in_time filter
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const monthStartUTC = new Date(`${year}-${mm}-01T00:00:00+05:30`).toISOString();
      const monthEndUTC = new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`).toISOString();

      const { data, error } = await supabase
        .from('check_in_out')
        .select(`
          id,
          employee_id,
          check_in_time,
          check_out_time,
          forgotten_checkout,
          employees (
            id,
            name,
            employee_id,
            email,
            department,
            company
          )
        `)
        .eq('forgotten_checkout', true)
        .gte('check_in_time', monthStartUTC)
        .lte('check_in_time', monthEndUTC)
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      const total = data?.length || 0;
      const uniqueEmployees = new Set(data?.map((d) => d.employee_id)).size;
      const unresolved = data?.filter((d) => !d.check_out_time).length || 0;
      const resolved = total - unresolved;

      setSummary({ total, uniqueEmployees, unresolved, resolved });

      const map = new Map();
      (data || []).forEach((row) => {
        const id = row.employee_id;
        if (!map.has(id)) {
          map.set(id, {
            employee_id: id,
            name: row.employees?.name || 'Unknown',
            code: row.employees?.employee_id || '-',
            email: row.employees?.email || null,
            department: row.employees?.department || '-',
            company: row.employees?.company || '-',
            count: 0,
            pendingCount: 0,
            resolvedCount: 0,
            records: [],
          });
        }
        const entry = map.get(id);
        entry.count += 1;
        if (row.check_out_time) {
          entry.resolvedCount += 1;
        } else {
          entry.pendingCount += 1;
        }
        entry.records.push(row);
      });

      // ✅ FIX: deterministic tie-break by name (was returning 0)
      const sorted = Array.from(map.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return (a.name || '').localeCompare(b.name || '');
      });

      setOffenders(sorted);
    } catch (err) {
      console.error('Error fetching tracker data:', err);
      toast.error('Failed to load tracker data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  // ============================================
  // OPEN EMAIL MODAL
  // ============================================
  const handleSendWarning = (employee) => {
    if (!employee.email) {
      toast.error('No email address found for this employee');
      return;
    }

    // ✅ FIX: confirm before opening the email modal — prevents accidental
    //    multiple warnings to the same employee
    const confirmed = window.confirm(
      `Send a warning email to ${employee.name} (${employee.count} forgotten check-out${employee.count === 1 ? '' : 's'})?`
    );
    if (!confirmed) return;

    setEmailModal({
      open: true,
      employee,
    });
  };

  // ============================================
  // ACTUALLY SEND EMAIL
  // ============================================
  const sendWarningEmail = () => {
    const emp = emailModal.employee;
    if (!emp || !emp.email) return;

    const subject = `⚠️ Warning: Repeated Forgotten Check-Outs — ${getMonthName(month)} ${year}`;

    const body = `Dear ${emp.name},

This is an official warning from the Vision Earth HRMS team regarding your attendance compliance.

We have noticed that you have forgotten to check out from work on the following dates in ${getMonthName(
      month
    )} ${year}:

${emp.records
  .slice()
  .sort((a, b) => (a.check_in_time > b.check_in_time ? -1 : 1))
  .map((rec, i) => {
    const checkInDate = new Date(rec.check_in_time).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const checkOutDate = rec.check_out_time
      ? new Date(rec.check_out_time).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Not resolved';

    return `  ${i + 1}. Forgot on ${checkInDate} — ${
      rec.check_out_time ? `Resolved on ${checkOutDate}` : 'Still pending'
    }`;
  })
  .join('\n')}

Total Forgotten Check-Outs: ${emp.count}

⚠️ IMPORTANT NOTICE:
Repeated failure to check out may lead to:
  • Attendance irregularities in your records
  • Impact on your monthly attendance percentage
  • Potential salary deductions as per company policy
  • Disciplinary action after repeated violations

Please ensure you check out properly at the end of each working day using the HRMS app. If you are facing any issues with the check-out process, please contact the HR team immediately.

This warning is issued to help you correct your attendance behavior.

Regards,
HR Team
Vision Earth
People • Projects • A Greener Tomorrow`;

    // Open mail client
    const mailtoLink = `mailto:${encodeURIComponent(
      emp.email
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;

    // Close modal
    setEmailModal({ open: false, employee: null });
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
            Loading tracker...
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
              background: 'linear-gradient(135deg, #DC2626 0%, #F59E0B 100%)',
              borderRadius: THEME.radius2xl,
              padding: '22px 20px 20px',
              boxShadow: '0 8px 24px rgba(220,38,38,0.25)',
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
                background: 'rgba(255,255,255,0.1)',
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
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '0.5px',
                      lineHeight: 1.1,
                    }}
                  >
                    FORGOT TRACKER
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.8)',
                      letterSpacing: '3px',
                      marginTop: '3px',
                    }}
                  >
                    CHECK-OUT MONITOR
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
                  background: 'rgba(255,255,255,0.15)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {dark ? '☀️' : '🌙'}
              </button>
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.8px',
                fontWeight: 500,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {getMonthName(month)} {year} · Employees who didn't check out
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
              {Array.from({ length: 5 }, (_, i) => _istYear - i).map((y) => (
                <option key={y} value={y} style={{ color: '#000', background: '#FFF' }}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            {[
              {
                value: summary.total,
                label: 'Total Forgot',
                color: THEME.red,
                accent: THEME.red,
              },
              {
                value: summary.uniqueEmployees,
                label: 'Employees',
                color: THEME.amber,
                accent: THEME.amber,
              },
              {
                value: summary.unresolved,
                label: 'Still Pending',
                color: '#DC2626',
                accent: '#DC2626',
              },
              {
                value: summary.resolved,
                label: 'Resolved',
                color: THEME.primary,
                accent: THEME.primary,
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: dark
                    ? `linear-gradient(145deg, ${stat.accent}15 0%, #1E293B 60%)`
                    : `linear-gradient(145deg, ${stat.accent}10 0%, #FFFFFF 60%)`,
                  borderRadius: THEME.radiusMd,
                  padding: '16px 12px 14px',
                  textAlign: 'left',
                  border: `1px solid ${
                    dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'
                  }`,
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
                    marginBottom: '6px',
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

        {/* OFFENDERS LIST */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingLeft: '4px',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: textPrimary,
                margin: 0,
              }}
            >
              Top Offenders
            </h3>
            <span
              style={{
                fontSize: '11px',
                color: textMuted,
                fontWeight: 700,
              }}
            >
              {offenders.length} employees
            </span>
          </div>

          {offenders.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: cardBg,
                borderRadius: THEME.radiusLg,
                border: `1px solid ${border}`,
              }}
            >
              <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎉</div>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: textSecondary,
                  margin: 0,
                }}
              >
                No forgotten check-outs
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: textMuted,
                  marginTop: '6px',
                }}
              >
                Everyone is doing great this month!
              </p>
            </div>
          ) : (
            offenders.map((emp, idx) => {
              const isExpanded = expandedId === emp.employee_id;
              const rank =
                idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

              return (
                <div
                  key={emp.employee_id}
                  style={{
                    background: cardBg,
                    borderRadius: THEME.radiusLg,
                    border: `1px solid ${border}`,
                    boxShadow: cardShadow,
                    marginBottom: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header — clickable */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : emp.employee_id)
                    }
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: THEME.font,
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: idx < 3 ? '20px' : '13px',
                        fontWeight: 800,
                        flexShrink: 0,
                        background:
                          idx === 0
                            ? 'linear-gradient(135deg, #FCD34D, #F59E0B)'
                            : idx === 1
                            ? 'linear-gradient(135deg, #E5E7EB, #9CA3AF)'
                            : idx === 2
                            ? 'linear-gradient(135deg, #FBBF24, #D97706)'
                            : dark
                            ? 'rgba(255,255,255,0.05)'
                            : '#F1F5F9',
                        color:
                          idx < 3 ? '#FFFFFF' : dark ? '#94A3B8' : '#64748B',
                      }}
                    >
                      {rank}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: textPrimary,
                          marginBottom: '3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {emp.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: textMuted,
                          fontWeight: 600,
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{emp.code}</span>
                        {emp.department && emp.department !== '-' && (
                          <>
                            <span>·</span>
                            <span>{emp.department}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: THEME.red + '18',
                        color: THEME.red,
                        fontWeight: 800,
                        fontSize: '13px',
                        flexShrink: 0,
                        border: `1px solid ${THEME.red}30`,
                      }}
                    >
                      {emp.count}×
                    </div>

                    <span
                      style={{
                        fontSize: '16px',
                        color: textMuted,
                        flexShrink: 0,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      ›
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 16px 16px',
                        borderTop: `1px solid ${border}`,
                      }}
                    >
                      {/* Sub-stats */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '10px',
                            background: dark
                              ? 'rgba(245,158,11,0.1)'
                              : THEME.amberSoft,
                            border: `1px solid ${
                              dark ? 'rgba(245,158,11,0.2)' : '#FDE68A'
                            }`,
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: THEME.amber,
                            }}
                          >
                            {emp.pendingCount}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: textMuted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Pending
                          </div>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '10px',
                            background: dark
                              ? 'rgba(16,185,129,0.1)'
                              : THEME.primarySoft,
                            border: `1px solid ${
                              dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
                            }`,
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: THEME.primary,
                            }}
                          >
                            {emp.resolvedCount}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: textMuted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Resolved
                          </div>
                        </div>
                      </div>

                      {/* Send Warning Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendWarning(emp);
                        }}
                        disabled={!emp.email}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: THEME.radiusMd,
                          border: 'none',
                          background: emp.email
                            ? `linear-gradient(135deg, #DC2626, #EF4444)`
                            : '#94A3B8',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: emp.email ? 'pointer' : 'not-allowed',
                          marginBottom: '12px',
                          boxShadow: emp.email
                            ? '0 4px 14px rgba(239,68,68,0.35)'
                            : 'none',
                          fontFamily: THEME.font,
                          letterSpacing: '0.3px',
                          opacity: emp.email ? 1 : 0.6,
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>✉️</span>
                        {emp.email
                          ? 'Send Warning Email'
                          : 'No Email Available'}
                      </button>

                      {/* Records */}
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px',
                        }}
                      >
                        All Forgot Dates
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '240px',
                          overflowY: 'auto',
                        }}
                      >
                        {emp.records
                          .slice()
                          .sort((a, b) =>
                            a.check_in_time > b.check_in_time ? -1 : 1
                          )
                          .map((rec, i) => {
                            const checkInDate = new Date(
                              rec.check_in_time
                            ).toLocaleDateString('en-CA', {
                              timeZone: 'Asia/Kolkata',
                            });
                            const checkOutDate = rec.check_out_time
                              ? new Date(rec.check_out_time).toLocaleDateString(
                                  'en-CA',
                                  { timeZone: 'Asia/Kolkata' }
                                )
                              : null;

                            return (
                              <div
                                key={i}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  background: dark ? '#0F172A' : '#F8FAFC',
                                  border: `1px solid ${border}`,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '4px',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      color: textPrimary,
                                    }}
                                  >
                                    ⚠️ {formatDate(checkInDate)}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: rec.check_out_time
                                        ? THEME.primary + '18'
                                        : THEME.red + '18',
                                      color: rec.check_out_time
                                        ? THEME.primary
                                        : THEME.red,
                                      border: `1px solid ${
                                        rec.check_out_time
                                          ? THEME.primary + '30'
                                          : THEME.red + '30'
                                      }`,
                                    }}
                                  >
                                    {rec.check_out_time ? 'Resolved' : 'Pending'}
                                  </span>
                                </div>
                                {checkOutDate && (
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: textSecondary,
                                      fontWeight: 500,
                                    }}
                                  >
                                    ✅ Resolved on {formatDate(checkOutDate)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FLEXIBLE SPACER */}
        <div style={{ flex: 1, minHeight: '20px' }} />
      </div>

      <div style={{ height: '20px', flexShrink: 0 }} />

      {/* ============================================ */}
      {/* EMAIL PREVIEW MODAL */}
      {/* ============================================ */}
      {emailModal.open && emailModal.employee && (
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
          onClick={() => setEmailModal({ open: false, employee: null })}
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
            {/* Header */}
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
                    marginBottom: '4px',
                  }}
                >
                  ✉️ Send Warning Email
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textSecondary,
                    fontWeight: 500,
                  }}
                >
                  To: {emailModal.employee.name}
                </div>
              </div>
              <button
                onClick={() => setEmailModal({ open: false, employee: null })}
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

            {/* Recipient */}
            <div
              style={{
                padding: '12px 14px',
                background: dark ? '#0F172A' : '#F8FAFC',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                To
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                {emailModal.employee.email}
              </div>
            </div>

            {/* Subject */}
            <div
              style={{
                padding: '12px 14px',
                background: dark ? '#0F172A' : '#F8FAFC',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Subject
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: textPrimary,
                }}
              >
                ⚠️ Warning: Repeated Forgotten Check-Outs — {getMonthName(month)}{' '}
                {year}
              </div>
            </div>

            {/* Info banner */}
            <div
              style={{
                padding: '12px 14px',
                background: dark
                  ? 'rgba(245,158,11,0.1)'
                  : THEME.amberSoft,
                borderRadius: THEME.radiusMd,
                border: `1px solid ${
                  dark ? 'rgba(245,158,11,0.3)' : '#FDE68A'
                }`,
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: dark ? '#FCD34D' : '#78350F',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                📧 Clicking 'Open Email' will open your email app with a
                pre-written warning message. Review it and click Send.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setEmailModal({ open: false, employee: null })}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendWarningEmail}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: `linear-gradient(135deg, #DC2626, #EF4444)`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                ✉️ Open Email
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default ForgotTracker;