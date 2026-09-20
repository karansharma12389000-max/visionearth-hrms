// src/pages/admin/SalaryCalculator.jsx
//
// Vision Earth HRMS — Admin Salary Calculator
// No pre-selection — user must tap a designation first.

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName, formatDate } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

// ============================================
// SALARY RULES
// ============================================
const PER_DAY_DIVISOR = 279;
const PER_DAY_MULTIPLIER = 12;

const getWeight = (status) => {
  if (!status) return 0;
  if (status === 'P' || status === 'Present') return 1.0;
  if (status === 'D' || status === 'Delayed') return 0.9;
  if (status === 'B' || status === 'Beyond Delay') return 0.8;
  if (status === 'A' || status === 'Absent') return 0;
  if (status === 'L' || status === 'Leave') return 0;
  return 0;
};

const getShortCode = (status) => {
  if (!status) return '—';
  if (status === 'P' || status === 'Present') return 'P';
  if (status === 'D' || status === 'Delayed') return 'D';
  if (status === 'B' || status === 'Beyond Delay') return 'B';
  if (status === 'A' || status === 'Absent') return 'A';
  if (status === 'L' || status === 'Leave') return 'L';
  return status;
};

const DESIG_COLORS = [
  { primary: '#10B981' },
  { primary: '#3B82F6' },
  { primary: '#8B5CF6' },
  { primary: '#F59E0B' },
  { primary: '#EC4899' },
  { primary: '#06B6D4' },
  { primary: '#EF4444' },
  { primary: '#84CC16' },
];

export const SalaryCalculator = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

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

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});

  // ✅ No pre-selection
  const [designationFilter, setDesignationFilter] = useState(null);

  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalReal: 0,
    totalDeferred: 0,
    totalFull: 0,
  });

  const [detailModal, setDetailModal] = useState({
    open: false,
    employee: null,
    monthlySalary: '',
  });

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ FIX: zero-padded last day
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      const endDate = `${year}-${mm}-${dd}`;

      const [empRes, attRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, name, employee_id, department, designation, company')
          .order('name'),
        supabase
          .from('attendance')
          .select('*')
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate),
      ]);

      if (empRes.error) throw empRes.error;
      if (attRes.error) throw attRes.error;

      const emps = empRes.data || [];
      const atts = attRes.data || [];

      const map = {};
      emps.forEach((e) => {
        map[e.id] = atts.filter((a) => a.employee_id === e.id);
      });

      setEmployees(emps);
      setAttendanceMap(map);

      const totalReal = atts.reduce((sum, a) => sum + getWeight(a.status), 0);
      const totalDeferred = atts.reduce((sum, a) => {
        const code = getShortCode(a.status);
        if (code === 'D') return sum + 0.1;
        if (code === 'B') return sum + 0.2;
        return sum;
      }, 0);

      const totalFull = atts.filter((a) => {
        const code = getShortCode(a.status);
        return code === 'P' || code === 'D' || code === 'B';
      }).length;

      setSummary({
        totalEmployees: emps.length,
        totalReal: Math.round(totalReal * 100) / 100,
        totalDeferred: Math.round(totalDeferred * 100) / 100,
        totalFull,
      });
    } catch (err) {
      console.error('Error fetching salary data:', err);
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  // ============================================
  // DESIGNATIONS LIST
  // ============================================
  const designations = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      const desig =
        emp.designation && emp.designation !== 'N/A'
          ? emp.designation
          : 'Unassigned';
      map.set(desig, (map.get(desig) || 0) + 1);
    });

    const arr = Array.from(map.entries()).map(([name, count], i) => ({
      name,
      count,
      color: DESIG_COLORS[i % DESIG_COLORS.length],
    }));

    arr.sort((a, b) => a.name.localeCompare(b.name));

    return [
      { name: 'all', count: employees.length, color: { primary: '#10B981' } },
      ...arr,
    ];
  }, [employees]);

  // ============================================
  // FILTERED EMPLOYEES — handle null
  // ============================================
  const filteredEmployees = useMemo(() => {
    if (designationFilter === null) return [];
    if (designationFilter === 'all') return employees;
    return employees.filter((emp) => {
      const desig =
        emp.designation && emp.designation !== 'N/A'
          ? emp.designation
          : 'Unassigned';
      return desig === designationFilter;
    });
  }, [employees, designationFilter]);

  // ============================================
  // SUMMARY STATS — handle null
  // ============================================
  const designationSummary = useMemo(() => {
    const counts = { P: 0, D: 0, B: 0, A: 0, L: 0 };
    let totalDays = 0;

    if (designationFilter === null) {
      return { counts, totalDays: 0, employees: 0 };
    }

    filteredEmployees.forEach((emp) => {
      const records = attendanceMap[emp.id] || [];
      records.forEach((r) => {
        const code = getShortCode(r.status);
        if (counts[code] !== undefined) {
          counts[code] += 1;
          totalDays += 1;
        }
      });
    });

    return {
      counts,
      totalDays,
      employees: filteredEmployees.length,
    };
  }, [filteredEmployees, attendanceMap, designationFilter]);

  // ============================================
  // COMPUTE STATS (for detail modal)
  // ============================================
  const computeStats = (empId, monthlySalary) => {
    const records = attendanceMap[empId] || [];
    // ✅ FIX: use Number() for strict parsing and explicit finite check
    //    Rejects "1.2.3", "abc", Infinity, NaN, and negative salaries.
    const rawSalary = String(monthlySalary ?? '').trim();
    const parsed = rawSalary === '' ? 0 : Number(rawSalary);
    const salary = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    const perDay =
      salary > 0
        ? Math.round(((PER_DAY_MULTIPLIER * salary) / PER_DAY_DIVISOR) * 100) /
          100
        : 0;

    const counts = { P: 0, D: 0, B: 0, A: 0, L: 0 };
    records.forEach((r) => {
      const code = getShortCode(r.status);
      if (counts[code] !== undefined) counts[code] += 1;
    });

    const totalDaysWeighted =
      counts.P * 1.0 + counts.D * 0.9 + counts.B * 0.8;
    const totalDaysFull = counts.P + counts.D + counts.B;
    const totalDaysC = counts.P * 1.0 + counts.B * 0.8;

    const realAmount = Math.round(totalDaysWeighted * perDay * 100) / 100;
    const fullAmount = Math.round(totalDaysFull * perDay * 100) / 100;
    const cAmount = Math.round(totalDaysC * perDay * 100) / 100;
    const deferredAmount = Math.round((fullAmount - realAmount) * 100) / 100;
    const deferredDays =
      Math.round((totalDaysFull - totalDaysWeighted) * 100) / 100;

    return {
      perDay,
      counts,
      totalDaysWeighted: Math.round(totalDaysWeighted * 100) / 100,
      totalDaysFull,
      totalDaysC: Math.round(totalDaysC * 100) / 100,
      deferredDays,
      realAmount,
      fullAmount,
      cAmount,
      deferredAmount,
      records: records.sort((a, b) =>
        a.attendance_date > b.attendance_date ? -1 : 1
      ),
    };
  };

  const openDetail = (emp) => {
    setDetailModal({
      open: true,
      employee: emp,
      monthlySalary: '',
    });
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

  const stats = detailModal.employee
    ? computeStats(detailModal.employee.id, detailModal.monthlySalary)
    : null;

  // Selected designation's accent color
  const selectedAccent =
    designationFilter === null
      ? null
      : designationFilter === 'all'
      ? '#10B981'
      : designations.find((d) => d.name === designationFilter)?.color.primary ||
        '#10B981';

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
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              borderRadius: THEME.radius2xl,
              padding: '22px 20px 20px',
              boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
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
                  💰
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
                    SALARY CALCULATOR
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
                    MONTHLY PAYOUT
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
              Per Day = (12 × Monthly) / 279 · P=1.0, D=0.9, B=0.8, A/L=0
            </div>
          </div>
        </div>

        {/* MONTH/YEAR */}
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
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i
              ).map((y) => (
                <option
                  key={y}
                  value={y}
                  style={{ color: '#000', background: '#FFF' }}
                >
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DESIGNATION GRID */}
        <div style={{ padding: '0 16px 12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '8px',
              paddingLeft: '4px',
            }}
          >
            Select Designation
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {designations.map((d) => {
              const isActive = designationFilter === d.name;
              const accent = d.color.primary;

              return (
                <button
                  key={d.name}
                  onClick={() => setDesignationFilter(d.name)}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: isActive
                      ? `linear-gradient(145deg, ${accent}30 0%, ${accent}15 100%)`
                      : cardBg,
                    border: isActive
                      ? `1.5px solid ${accent}`
                      : `1px solid ${border}`,
                    borderRadius: '12px',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: THEME.font,
                    boxShadow: isActive
                      ? `0 4px 12px ${accent}30`
                      : cardShadow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = accent + '60';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = border;
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isActive ? accent : textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {d.name === 'all' ? 'All' : d.name}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: accent,
                      background: accent + '20',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      border: `1px solid ${accent}30`,
                      flexShrink: 0,
                      minWidth: '22px',
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {d.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ EMPTY STATE — No selection */}
        {designationFilter === null ? (
          <div style={{ padding: '0 16px 16px' }}>
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👆</div>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: textPrimary,
                  margin: 0,
                  marginBottom: '6px',
                }}
              >
                Select a designation
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: textMuted,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Tap any designation above to view employees and calculate salary
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div style={{ padding: '0 16px 12px' }}>
              <div                style={{
                  padding: '14px',
                  background: dark
                    ? `linear-gradient(145deg, ${selectedAccent}15 0%, #1E293B 60%)`
                    : `linear-gradient(145deg, ${selectedAccent}10 0%, #FFFFFF 60%)`,
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${
                    dark ? 'rgba(255,255,255,0.05)' : selectedAccent + '25'
                  }`,
                  boxShadow: cardShadow,
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
                    background: `linear-gradient(90deg, ${selectedAccent}, transparent)`,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {designationFilter === 'all'
                      ? 'All Employees Summary'
                      : `${designationFilter} Summary`}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: selectedAccent,
                    }}
                  >
                    {designationSummary.employees} empl ·{' '}
                    {designationSummary.totalDays} days
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '8px',
                  }}
                >
                  {[
                    {
                      key: 'P',
                      label: 'Present',
                      count: designationSummary.counts.P,
                      color: THEME.primary,
                    },
                    {
                      key: 'D',
                      label: 'Delayed',
                      count: designationSummary.counts.D,
                      color: THEME.amber,
                    },
                    {
                      key: 'B',
                      label: 'Beyond',
                      count: designationSummary.counts.B,
                      color: THEME.red,
                    },
                    {
                      key: 'A',
                      label: 'Absent',
                      count: designationSummary.counts.A,
                      color: THEME.red,
                    },
                    {
                      key: 'L',
                      label: 'Leave',
                      count: designationSummary.counts.L,
                      color: THEME.blue,
                    },
                  ].map((s) => (
                    <div
                      key={s.key}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        background: s.color + '12',
                        border: `1px solid ${s.color}25`,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: s.color,
                          marginBottom: '2px',
                        }}
                      >
                        {s.key}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 900,
                          color: s.color,
                          lineHeight: 1,
                          letterSpacing: '-0.5px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {s.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* EMPLOYEES LIST */}
            <div style={{ padding: '0 16px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingLeft: '4px',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: textPrimary,
                    margin: 0,
                  }}
                >
                  Employees{' '}
                  <span
                    style={{
                      fontSize: '12px',
                      color: textMuted,
                      fontWeight: 700,
                    }}
                  >
                    ({filteredEmployees.length})
                  </span>
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    color: textMuted,
                    fontWeight: 700,
                  }}
                >
                  Tap to calculate
                </span>
              </div>

              {filteredEmployees.length === 0 ? (
                <div
                  style={{
                    padding: '40px 24px',
                    textAlign: 'center',
                    background: cardBg,
                    borderRadius: THEME.radiusLg,
                    border: `1px solid ${border}`,
                  }}
                >
                  <div
                    style={{ fontSize: '40px', marginBottom: '10px' }}
                  >
                    👥
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: textSecondary,
                      margin: 0,
                    }}
                  >
                    No employees in this designation
                  </p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const records = attendanceMap[emp.id] || [];
                  const counts = { P: 0, D: 0, B: 0, A: 0, L: 0 };
                  records.forEach((r) => {
                    const code = getShortCode(r.status);
                    if (counts[code] !== undefined) counts[code] += 1;
                  });
                  const totalDays =
                    counts.P + counts.D + counts.B + counts.A + counts.L;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => openDetail(emp)}
                      style={{
                        width: '100%',
                        background: cardBg,
                        borderRadius: THEME.radiusLg,
                        border: `1px solid ${border}`,
                        boxShadow: cardShadow,
                        marginBottom: '10px',
                        padding: '14px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontFamily: THEME.font,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = dark
                          ? '0 8px 20px rgba(0,0,0,0.35)'
                          : '0 8px 20px rgba(15,23,42,0.08)';
                        e.currentTarget.style.borderColor =
                          THEME.primary + '40';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = cardShadow;
                        e.currentTarget.style.borderColor = border;
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          flexShrink: 0,
                          boxShadow: '0 3px 8px rgba(16,185,129,0.25)',
                        }}
                      >
                        {emp.name?.charAt(0).toUpperCase() || '?'}
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
                          <span>{emp.employee_id}</span>
                          {emp.designation && emp.designation !== 'N/A' && (
                            <>
                              <span>·</span>
                              <span>{emp.designation}</span>
                            </>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            marginTop: '6px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {[
                            {
                              key: 'P',
                              count: counts.P,
                              color: THEME.primary,
                            },
                            {
                              key: 'D',
                              count: counts.D,
                              color: THEME.amber,
                            },
                            {
                              key: 'B',
                              count: counts.B,
                              color: THEME.red,
                            },
                            {
                              key: 'A',
                              count: counts.A,
                              color: THEME.red,
                            },
                            {
                              key: 'L',
                              count: counts.L,
                              color: THEME.blue,
                            },
                          ]
                            .filter((s) => s.count > 0)
                            .map((s) => (
                              <span
                                key={s.key}
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: s.color + '18',
                                  color: s.color,
                                  border: `1px solid ${s.color}30`,
                                }}
                              >
                                {s.key}: {s.count}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: textPrimary,
                            lineHeight: 1,
                            letterSpacing: '-0.5px',
                          }}
                        >
                          {totalDays}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: textMuted,
                            textTransform: 'uppercase',
                            marginTop: '2px',
                          }}
                        >
                          days
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '16px',
                          color: textMuted,
                          flexShrink: 0,
                          fontWeight: 300,
                        }}
                      >
                        ›
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div style={{ flex: 1, minHeight: '20px' }} />
      </div>

      <div style={{ height: '20px', flexShrink: 0 }} />

      {/* ============================================ */}
      {/* DETAIL MODAL */}
      {/* ============================================ */}
      {detailModal.open && detailModal.employee && (
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
            setDetailModal({
              open: false,
              employee: null,
              monthlySalary: '',
            })
          }
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
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
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  {detailModal.employee.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: textPrimary,
                      lineHeight: 1.2,
                    }}
                  >
                    {detailModal.employee.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: textSecondary,
                      fontWeight: 600,
                      marginTop: '2px',
                    }}
                  >
                    {detailModal.employee.employee_id}
                    {detailModal.employee.designation &&
                      detailModal.employee.designation !== 'N/A' && (
                        <> · {detailModal.employee.designation}</>
                      )}
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  setDetailModal({
                    open: false,
                    employee: null,
                    monthlySalary: '',
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

            {/* Month */}
            <div
              style={{
                padding: '10px 14px',
                background: dark
                  ? 'rgba(16,185,129,0.08)'
                  : THEME.primarySoft,
                borderRadius: THEME.radiusMd,
                border: `1px solid ${
                  dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
                }`,
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: dark ? THEME.primaryLight : THEME.primaryDeep,
                }}
              >
                📅 {getMonthName(month)} {year}
              </span>
            </div>

            {/* Monthly Salary Input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                Monthly Salary (₹) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={detailModal.monthlySalary}
                onChange={(e) =>
                  setDetailModal({
                    ...detailModal,
                    monthlySalary: e.target.value,
                  })
                }
                placeholder="Enter monthly salary"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: THEME.radiusMd,
                  border: `2px solid ${
                    detailModal.monthlySalary
                      ? THEME.primary + '60'
                      : border
                  }`,
                  background: dark ? '#0F172A' : '#F8FAFC',
                  color: textPrimary,
                  fontSize: '18px',
                  fontWeight: 800,
                  outline: 'none',
                  fontFamily: THEME.font,
                  boxSizing: 'border-box',
                  letterSpacing: '-0.3px',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                  appearance: 'none',
                }}
              />
            </div>

            {stats && stats.perDay > 0 && (
              <>
                {/* Per Day Salary */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: dark
                      ? 'rgba(59,130,246,0.08)'
                      : THEME.blueSoft,
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${
                      dark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'
                    }`,
                    marginBottom: '16px',
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
                    Per Day Salary
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: textSecondary,
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    (12 × ₹
                    {parseFloat(
                      detailModal.monthlySalary
                    ).toLocaleString('en-IN')}
                    ) / 279
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: THEME.blue,
                      letterSpacing: '-0.5px',
                    }}
                  >
                    ₹{stats.perDay.toFixed(2)}
                  </div>
                </div>

                {/* VIEW A */}
                <ViewCard
                  title="View A — With D & B (Real Payout)"
                  accentColor={THEME.primary}
                  dark={dark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  border={border}
                  rows={[
                    {
                      label: 'Present (P)',
                      count: stats.counts.P,
                      weight: '× 1.0',
                      days: stats.counts.P * 1.0,
                      color: THEME.primary,
                    },
                    {
                      label: 'Delayed (D)',
                      count: stats.counts.D,
                      weight: '× 0.9',
                      days: stats.counts.D * 0.9,
                      color: THEME.amber,
                    },
                    {
                      label: 'Beyond (B)',
                      count: stats.counts.B,
                      weight: '× 0.8',
                      days: stats.counts.B * 0.8,
                      color: THEME.red,
                    },
                    {
                      label: 'Absent (A)',
                      count: stats.counts.A,
                      weight: '× 0',
                      days: 0,
                      color: THEME.red,
                    },
                    {
                      label: 'Leave (L)',
                      count: stats.counts.L,
                      weight: '× 0',
                      days: 0,
                      color: THEME.blue,
                    },
                  ]}
                  totalDays={stats.totalDaysWeighted}
                  totalAmount={stats.realAmount}
                  totalColor={THEME.primary}
                />

                {/* VIEW B */}
                <ViewCard
                  title="View B — Ignoring D & B (Max Payout)"
                  accentColor={THEME.purple}
                  dark={dark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  border={border}
                  rows={[
                    {
                      label: 'Only P + D + B counted (excludes L, A)',
                      count: stats.totalDaysFull,
                      weight: '× 1.0',
                      days: stats.totalDaysFull,
                      color: THEME.purple,
                    },
                  ]}
                  totalDays={stats.totalDaysFull}
                  totalAmount={stats.fullAmount}
                  totalColor={THEME.purple}
                />

                {/* VIEW C */}
                <ViewCard
                  title="View C — Ignoring D (P + B only)"
                  accentColor="#06B6D4"
                  dark={dark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  border={border}
                  rows={[
                    {
                      label: 'Present (P)',
                      count: stats.counts.P,
                      weight: '× 1.0',
                      days: stats.counts.P * 1.0,
                      color: THEME.primary,
                    },
                    {
                      label: 'Beyond (B)',
                      count: stats.counts.B,
                      weight: '× 0.8',
                      days: stats.counts.B * 0.8,
                      color: THEME.red,
                    },
                    {
                      label: 'Delayed (D)',
                      count: stats.counts.D,
                      weight: '× 0 (excluded)',
                      days: 0,
                      color: textMuted,
                    },
                    {
                      label: 'Absent (A)',
                      count: stats.counts.A,
                      weight: '× 0',
                      days: 0,
                      color: THEME.red,
                    },
                    {
                      label: 'Leave (L)',
                      count: stats.counts.L,
                      weight: '× 0',
                      days: 0,
                      color: THEME.blue,
                    },
                  ]}
                  totalDays={stats.totalDaysC}
                  totalAmount={stats.cAmount}
                  totalColor="#06B6D4"
                />

                {/* Day-by-Day */}
                <div
                  style={{
                    marginTop: '16px',
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
                    📅 Day-by-Day Breakdown
                  </div>
                  {stats.records.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: textMuted,
                        fontSize: '12px',
                      }}
                    >
                      No records for this month
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      {stats.records.map((rec, i) => {
                        const code = getShortCode(rec.status);
                        const weight = getWeight(rec.status);
                        const amount =
                          Math.round(stats.perDay * weight * 100) / 100;
                        const colorMap = {
                          P: THEME.primary,
                          D: THEME.amber,
                          B: THEME.red,
                          A: THEME.red,
                          L: THEME.blue,
                        };
                        const color = colorMap[code] || textMuted;

                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              background: cardBg,
                              borderRadius: '8px',
                              border: `1px solid ${border}`,
                              gap: '8px',
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
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: color + '20',
                                  color: color,
                                  border: `1px solid ${color}30`,
                                  flexShrink: 0,
                                }}
                              >
                                {code}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: textPrimary,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatDate(rec.attendance_date)}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                color: color,
                                flexShrink: 0,
                              }}
                            >
                              ₹{amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close */}
            <button
              onClick={() =>
                setDetailModal({
                  open: false,
                  employee: null,
                  monthlySalary: '',
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

// ============================================
// VIEW CARD HELPER
// ============================================
const ViewCard = ({
  title,
  accentColor,
  dark,
  textPrimary,
  textSecondary,
  textMuted,
  border,
  rows,
  totalDays,
  totalAmount,
  totalColor,
  note,
}) => (
  <div
    style={{
      marginBottom: '12px',
      padding: '14px',
      background: dark
        ? `linear-gradient(145deg, ${accentColor}15 0%, #1E293B 60%)`
        : `linear-gradient(145deg, ${accentColor}10 0%, #FFFFFF 60%)`,
      borderRadius: THEME.radiusMd,
      border: `1px solid ${
        dark ? 'rgba(255,255,255,0.05)' : accentColor + '30'
      }`,
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
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
      }}
    />
    <div
      style={{
        fontSize: '11px',
        fontWeight: 800,
        color: accentColor,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '10px',
      }}
    >
      {title}
    </div>

    {rows.map((row, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 0',
          borderBottom:
            i < rows.length - 1 ? `1px dashed ${border}` : 'none',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: textPrimary,
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
          }}
        >
          {row.label}{' '}
          <span style={{ color: textMuted, fontSize: '10px' }}>
            {row.weight}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: row.color,
            flexShrink: 0,
          }}
        >
          {row.count} → {row.days.toFixed(2)}d
        </div>
      </div>
    ))}

    <div
      style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: `1px solid ${border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}
      >
        Total: {totalDays.toFixed(2)} days
      </div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: totalColor,
          letterSpacing: '-0.3px',
        }}
      >
        ₹
        {totalAmount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>

    {note && (
      <div
        style={{
          marginTop: '8px',
          padding: '6px 10px',
          background: accentColor + '10',
          borderRadius: '8px',
          fontSize: '10px',
          color: accentColor,
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        ⏳ {note}
      </div>
    )}
  </div>
);

export default SalaryCalculator;