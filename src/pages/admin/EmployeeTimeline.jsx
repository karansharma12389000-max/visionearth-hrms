// src/pages/admin/EmployeeTimeline.jsx
//
// Vision Earth HRMS — Employee Timeline (Google Maps style)
//
// ✅ Month picker + Searchable employee picker (NEW)
// ✅ Swipe left → next day, swipe right → previous day
// ✅ Tap day cell in calendar → jump to that day
// ✅ Map (LiveMapPreview) + event list: Check In / Pings / Check Out
// ✅ Any-language addresses preserved
// ✅ Day nav arrows and labels now unambiguous
// ✅ Monthly PDF download button in header
// ➕ Searchable employee dropdown

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getTodayIST, formatDate, getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';
import LiveMapPreview, { parseGps } from '../../components/LiveMapPreview';
import TimelinePDFExporter from '../../components/TimelinePDFExporter';

// ============================================
// HELPERS
// ============================================
const pad2 = (n) => String(n).padStart(2, '0');

const dateStrFrom = (year, month, day) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const toISTDate = (isoOrDate) => {
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const fmtTimeOnly = (d) => {
  if (!d) return '—';
  try {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const fmtDateLong = (dateStr) => {
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const addDays = (dateStr, delta) => {
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
};

const parseAttendanceTime = (dateStr, timeVal) => {
  if (!timeVal) return null;
  if (typeof timeVal === 'string' && timeVal.includes('T')) {
    const d = new Date(timeVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (
    typeof timeVal === 'string' &&
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal.trim())
  ) {
    if (!dateStr) return null;
    const t = timeVal.trim();
    const withSeconds = t.length === 5 ? `${t}:00` : t;
    const d = new Date(`${dateStr}T${withSeconds}+05:30`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const resolveLocationLabel = (address, gps) => {
  const trimmed = (address || '').trim();
  if (trimmed) return trimmed;
  const parsed = parseGps(gps);
  if (parsed) return `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`;
  return null;
};

// ============================================
// FETCHERS
// ============================================
const fetchEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, employee_id, company, designation, department')
    .order('name');
  if (error) throw error;
  return data || [];
};

const fetchDayEvents = async (employeeId, dateStr) => {
  if (!employeeId || !dateStr) return { events: [], pingCount: 0 };

  const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();

  const [pingsRes, cioRes, attRes] = await Promise.all([
    supabase
      .from('location_pings')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('ping_time', dayStart)
      .lte('ping_time', dayEnd)
      .order('ping_time', { ascending: true }),
    supabase
      .from('check_in_out')
      .select(
        'id, check_in_time, check_out_time, check_in_address, check_out_address, check_in_gps, check_out_gps, status'
      )
      .eq('employee_id', employeeId)
      .gte('check_in_time', dayStart)
      .lte('check_in_time', dayEnd)
      .order('check_in_time', { ascending: false })
      .limit(1),
    supabase
      .from('attendance')
      .select(
        'id, attendance_date, status, check_in_time, check_out_time, check_in_location, check_out_location, check_in_gps, check_out_gps, working_hours, remarks'
      )
      .eq('employee_id', employeeId)
      .eq('attendance_date', dateStr)
      .limit(1),
  ]);

  const pingsData = pingsRes.data || [];
  const cio = (cioRes.data && cioRes.data[0]) || null;
  const att = (attRes.data && attRes.data[0]) || null;

  const checkInAddress =
    (cio && cio.check_in_address) ||
    (att && att.check_in_location) ||
    null;
  const checkOutAddress =
    (cio && cio.check_out_address) ||
    (att && att.check_out_location) ||
    null;
  const checkInGps =
    (cio && cio.check_in_gps) || (att && att.check_in_gps) || null;
  const checkOutGps =
    (cio && cio.check_out_gps) || (att && att.check_out_gps) || null;

  const checkInTime =
    (cio && cio.check_in_time) ||
    (att && parseAttendanceTime(dateStr, att.check_in_time));
  const checkOutTime =
    (cio && cio.check_out_time) ||
    (att && parseAttendanceTime(dateStr, att.check_out_time));

  const events = [];

  const ciGps = parseGps(checkInGps);
  if (checkInTime && ciGps) {
    const dt = checkInTime instanceof Date ? checkInTime : new Date(checkInTime);
    if (!isNaN(dt.getTime())) {
      events.push({
        type: 'checkin',
        time: dt.toISOString(),
        lat: ciGps.lat,
        lng: ciGps.lng,
        location_name: resolveLocationLabel(checkInAddress, checkInGps),
      });
    }
  }

  pingsData.forEach((p) => {
    events.push({
      type: 'ping',
      time: p.ping_time,
      lat: p.lat,
      lng: p.lng,
      location_name: p.location_name || null,
    });
  });

  const coGps = parseGps(checkOutGps);
  if (checkOutTime && coGps) {
    const dt =
      checkOutTime instanceof Date ? checkOutTime : new Date(checkOutTime);
    if (!isNaN(dt.getTime())) {
      events.push({
        type: 'checkout',
        time: dt.toISOString(),
        lat: coGps.lat,
        lng: coGps.lng,
        location_name: resolveLocationLabel(checkOutAddress, checkOutGps),
      });
    }
  }

  events.sort((a, b) => new Date(a.time) - new Date(b.time));

  return {
    events,
    pingCount: pingsData.length,
    attendance: att,
    checkInOut: cio,
  };
};

const fetchMonthActivity = async (employeeId, year, month) => {
  if (!employeeId) return new Set();
  const mm = pad2(month);
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${pad2(lastDay)}`;
  const dayStart = new Date(`${startDate}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${endDate}T23:59:59.999+05:30`).toISOString();

  const set = new Set();

  try {
    const [pingsRes, cioRes, attRes] = await Promise.all([
      supabase
        .from('location_pings')
        .select('ping_time')
        .eq('employee_id', employeeId)
        .gte('ping_time', dayStart)
        .lte('ping_time', dayEnd),
      supabase
        .from('check_in_out')
        .select('check_in_time')
        .eq('employee_id', employeeId)
        .gte('check_in_time', dayStart)
        .lte('check_in_time', dayEnd),
      supabase
        .from('attendance')
        .select('attendance_date')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate),
    ]);

    const istDate = (iso) => {
      try {
        return new Date(iso).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata',
        });
      } catch {
        return null;
      }
    };

    (pingsRes.data || []).forEach((p) => {
      const d = istDate(p.ping_time);
      if (d) set.add(d);
    });
    (cioRes.data || []).forEach((c) => {
      const d = istDate(c.check_in_time);
      if (d) set.add(d);
    });
    (attRes.data || []).forEach((a) => {
      if (a.attendance_date) set.add(a.attendance_date);
    });
  } catch (err) {
    console.warn('fetchMonthActivity failed:', err);
  }

  return set;
};

// ============================================
// CALENDAR GRID
// ============================================
const buildCalendarDays = (year, month) => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// ============================================
// MAIN COMPONENT
// ============================================
export const AdminEmployeeTimeline = () => {
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

  const todayIST = getTodayIST();
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

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayIST);

  // ➕ Searchable dropdown state
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const empDropdownRef = useRef(null);

  const [calMonth, setCalMonth] = useState(_istMonth);
  const [calYear, setCalYear] = useState(_istYear);
  const [monthActivity, setMonthActivity] = useState(new Set());

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCalendar, setShowCalendar] = useState(true);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swiping = useRef(false);

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ➕ Filtered employee list for search
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 50);
    return employees
      .filter((e) => {
        const name = (e.name || '').toLowerCase();
        const empId = (e.employee_id || '').toLowerCase();
        const dept = (e.department || '').toLowerCase();
        return name.includes(q) || empId.includes(q) || dept.includes(q);
      })
      .slice(0, 50);
  }, [employees, empSearch]);

  // ➕ Selected employee object
  const selectedEmployeeObj = useMemo(
    () => employees.find((e) => e.id === selectedEmployee) || null,
    [employees, selectedEmployee]
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchEmployees();
        setEmployees(list);
        if (list.length > 0) {
          setSelectedEmployee((prev) => prev || list[0].id);
        }
      } catch (err) {
        console.error('fetchEmployees failed:', err);
        toast.error('Failed to load employees');
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;
    (async () => {
      const set = await fetchMonthActivity(
        selectedEmployee,
        calYear,
        calMonth
      );
      setMonthActivity(set);
    })();
  }, [selectedEmployee, calYear, calMonth]);

  const loadDay = useCallback(
    async (dateStr) => {
      if (!selectedEmployee || !dateStr) return;
      setLoading(true);
      try {
        const { events: evs } = await fetchDayEvents(selectedEmployee, dateStr);
        setEvents(evs);
      } catch (err) {
        console.error('loadDay failed:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedEmployee]
  );

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  // ➕ Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        empDropdownRef.current &&
        !empDropdownRef.current.contains(e.target)
      ) {
        setShowEmpDropdown(false);
      }
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swiping.current = false;
  };

  const onTouchMove = (e) => {
    if (touchStartX.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      swiping.current = true;
    }
  };

  const onTouchEnd = (e) => {
    if (!swiping.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - (touchStartX.current || 0);
    if (dx < -60) {
      const next = addDays(selectedDate, 1);
      if (next <= todayIST) {
        setSelectedDate(next);
      } else {
        toast('Already at today', { icon: '📅' });
      }
    } else if (dx > 60) {
      setSelectedDate(addDays(selectedDate, -1));
    }
    touchStartX.current = null;
    touchStartY.current = null;
    swiping.current = false;
  };

  const onCellClick = (day) => {
    if (!day) return;
    const ds = dateStrFrom(calYear, calMonth, day);
    if (ds > todayIST) return;
    setSelectedDate(ds);
  };

  const isToday = selectedDate === todayIST;
  const selectedDayEvents = events.length;
  const prevDay = addDays(selectedDate, -1);
  const nextDay = addDays(selectedDate, 1);
  const canGoNext = nextDay <= todayIST;

  const selectedEmployeeName = selectedEmployeeObj?.name || '';

  // ➕ Handle employee selection
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp.id);
    setShowEmpDropdown(false);
    setEmpSearch('');
  };

  // ➕ Handle dropdown toggle
  const toggleEmpDropdown = () => {
    setShowEmpDropdown((v) => {
      if (!v) setEmpSearch('');
      return !v;
    });
  };

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
            padding: '20px',
            boxShadow: dark ? THEME.shadowDark : THEME.shadowLg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
            position: 'relative',
            overflow: 'visible',
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
                'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
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
                  boxShadow: '0 4px 12px rgba(139,92,246,0.18)',
                  border: '1px solid #DDD6FE',
                  overflow: 'hidden',
                  fontSize: '22px',
                }}
              >
                🗺️
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
                  TIMELINE
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: THEME.purple,
                    letterSpacing: '3px',
                    marginTop: '3px',
                  }}
                >
                  EMPLOYEE MAP
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TimelinePDFExporter
                employeeId={selectedEmployee}
                employeeName={selectedEmployeeName}
              />

              <button
                type="button"
                onClick={toggleDark}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
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
          </div>

          {/* ➕ Searchable employee dropdown */}
          <div
            ref={empDropdownRef}
            style={{ position: 'relative', zIndex: 20 }}
          >
            <div
              onClick={toggleEmpDropdown}
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {selectedEmployeeObj
                  ? `${selectedEmployeeObj.name} (${selectedEmployeeObj.employee_id})`
                  : '👤 Select employee…'}
              </span>
              <span style={{ color: textMuted, fontSize: '12px' }}>
                {showEmpDropdown ? '▲' : '▼'}
              </span>
            </div>

            {showEmpDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: THEME.radiusMd,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  zIndex: 50,
                  maxHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px',
                    borderBottom: `1px solid ${border}`,
                  }}
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="🔍 Search name, ID, department…"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${border}`,
                      background: dark ? '#0F172A' : '#F8FAFC',
                      color: textPrimary,
                      fontSize: '12px',
                      fontWeight: 600,
                      outline: 'none',
                      fontFamily: THEME.font,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredEmployees.length === 0 ? (
                    <div
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: textMuted,
                        fontSize: '12px',
                      }}
                    >
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSel = selectedEmployee === emp.id;
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleSelectEmployee(emp)}
                          style={{
                            padding: '11px 14px',
                            cursor: 'pointer',
                            borderBottom: `1px solid ${border}`,
                            background: isSel
                              ? 'rgba(16,185,129,0.12)'
                              : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSel)
                              e.currentTarget.style.background = dark
                                ? 'rgba(255,255,255,0.04)'
                                : '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSel)
                              e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {emp.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
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
                              {emp.name}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: textMuted,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {emp.employee_id}
                              {emp.department ? ` · ${emp.department}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MONTH + CALENDAR */}
      {selectedEmployee && (
        <div style={{ padding: '0 16px 12px' }}>
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
              boxShadow: cardShadow,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <button
                onClick={() => {
                  let m = calMonth - 1;
                  let y = calYear;
                  if (m < 1) {
                    m = 12;
                    y -= 1;
                  }
                  setCalMonth(m);
                  setCalYear(y);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textPrimary,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                ‹
              </button>

              <button
                onClick={() => setShowCalendar((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: textPrimary,
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {getMonthName(calMonth)} {calYear}{' '}
                <span style={{ fontSize: '10px', color: textMuted }}>
                  {showCalendar ? '▲' : '▼'}
                </span>
              </button>

              <button
                onClick={() => {
                  let m = calMonth + 1;
                  let y = calYear;
                  if (m > 12) {
                    m = 1;
                    y += 1;
                  }
                  setCalMonth(m);
                  setCalYear(y);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textPrimary,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                ›
              </button>
            </div>

            {showCalendar && (
              <div style={{ padding: '10px 12px 14px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                    marginBottom: '6px',
                  }}
                >
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: 800,
                        color: textMuted,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                  }}
                >
                  {buildCalendarDays(calYear, calMonth).map((day, i) => {
                    if (day === null) {
                      return <div key={i} style={{ height: '34px' }} />;
                    }
                    const ds = dateStrFrom(calYear, calMonth, day);
                    const hasData = monthActivity.has(ds);
                    const isSelected = ds === selectedDate;
                    const isTodayCell = ds === todayIST;
                    const isFuture = ds > todayIST;

                    return (
                      <button
                        key={i}
                        onClick={() => onCellClick(day)}
                        disabled={isFuture}
                        style={{
                          height: '34px',
                          borderRadius: '10px',
                          border: isSelected
                            ? `1.5px solid ${THEME.purple}`
                            : isTodayCell
                            ? `1.5px solid ${THEME.primary}`
                            : `1px solid ${border}`,
                          background: isSelected
                            ? THEME.purple + '18'
                            : 'transparent',
                          color: isFuture
                            ? textMuted
                            : isSelected
                            ? THEME.purple
                            : textPrimary,
                          fontSize: '11px',
                          fontWeight: isSelected ? 900 : 600,
                          cursor: isFuture ? 'not-allowed' : 'pointer',
                          position: 'relative',
                          fontFamily: THEME.font,
                          padding: 0,
                          opacity: isFuture ? 0.4 : 1,
                        }}
                      >
                        {day}
                        {hasData && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 3,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              background: isSelected
                                ? THEME.purple
                                : THEME.primary,
                              boxShadow: `0 0 5px ${
                                isSelected ? THEME.purple : THEME.primary
                              }80`,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAY NAV + MAP (swipe target) */}
      {selectedEmployee && (
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            padding: '0 16px 12px',
            touchAction: 'pan-y',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: THEME.radiusMd,
              padding: '8px 12px',
              boxShadow: cardShadow,
            }}
          >
            <button
              onClick={() => setSelectedDate(prevDay)}
              title={`Previous day · ${formatDate(prevDay)}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: dark
                  ? 'rgba(255,255,255,0.05)'
                  : THEME.primarySoft,
                color: THEME.primary,
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              ‹
            </button>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  color: textPrimary,
                  letterSpacing: '0.2px',
                }}
              >
                {isToday ? '📅 Today' : fmtDateLong(selectedDate)}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: textMuted,
                  marginTop: 2,
                }}
              >
                ‹ {formatDate(prevDay)} · {formatDate(nextDay)} ›
              </div>
            </div>

            <button
              onClick={() => {
                if (canGoNext) setSelectedDate(nextDay);
                else toast('Already at today', { icon: '📅' });
              }}
              disabled={!canGoNext}
              title={
                canGoNext
                  ? `Next day · ${formatDate(nextDay)}`
                  : 'Already at today'
              }
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: canGoNext
                  ? dark
                    ? 'rgba(255,255,255,0.05)'
                    : THEME.primarySoft
                  : 'transparent',
                color: canGoNext ? THEME.primary : textMuted,
                fontSize: '15px',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                fontWeight: 800,
                opacity: canGoNext ? 1 : 0.4,
              }}
            >
              ›
            </button>
          </div>

          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: THEME.radiusLg,
              overflow: 'hidden',
              boxShadow: cardShadow,
              marginBottom: '12px',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '80px 20px',
                  textAlign: 'center',
                  color: textSecondary,
                  fontSize: '12px',
                }}
              >
                ⏳ Loading map…
              </div>
            ) : events.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>🗺️</div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: textSecondary,
                  }}
                >
                  No location data on this day
                </div>
                <div style={{ fontSize: '11px', color: textMuted, marginTop: 4 }}>
                  Use the arrows or swipe to explore other days
                </div>
              </div>
            ) : (
              <LiveMapPreview route={events} height={260} onPing={null} />
            )}
          </div>
        </div>
      )}

      {/* EVENT LIST */}
      {selectedEmployee && !loading && events.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 900,
              color: textPrimary,
              letterSpacing: '0.3px',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            📍 Route Events ({selectedDayEvents})
          </div>

          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: THEME.radiusLg,
              padding: '14px',
              boxShadow: cardShadow,
            }}
          >
            {events.map((e, i) => {
              const isCheckin = e.type === 'checkin';
              const isCheckout = e.type === 'checkout';
              const dotColor = isCheckin
                ? THEME.primary
                : isCheckout
                ? THEME.red
                : THEME.purple;
              const dotIcon = isCheckin ? '✓' : isCheckout ? '↑' : '•';
              const label = isCheckin
                ? 'Checked In'
                : isCheckout
                ? 'Checked Out'
                : 'Location Ping';
              const badgeLabel = isCheckin
                ? 'Check In'
                : isCheckout
                ? 'Check Out'
                : 'Ping';
              const timeDisplay = fmtTimeOnly(toISTDate(e.time));

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    paddingBottom: i < events.length - 1 ? 14 : 0,
                    position: 'relative',
                  }}
                >
                  {i < events.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 11,
                        top: 26,
                        bottom: 0,
                        width: 2,
                        background: dark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  )}

                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: dotColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                      zIndex: 1,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {dotIcon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{label}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: textMuted,
                        }}
                      >
                        {timeDisplay}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: dotColor + '18',
                          color: dotColor,
                          border: `1px solid ${dotColor}30`,
                        }}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    {e.location_name ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: textSecondary,
                          marginTop: 3,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        📍 {e.location_name}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 11,
                          color: textMuted,
                          marginTop: 3,
                          fontStyle: 'italic',
                        }}
                      >
                        📍 Address not available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminEmployeeTimeline;