// src/pages/admin/AttendanceReport.jsx
//
// Vision Earth HRMS — Premium Admin Attendance Report
// Company-wide monthly attendance, filterable by department/employee.
//
// ✅ Holiday pattern badge on Report tab (striped H when worked).
// ✅ Weekly Off pattern badge (striped WO when worked).
// ✅ Report / Working Hours tabs — same calendar layout.
// ✅ FULLSCREEN: Click ⛶ / double-click header / Esc to exit.
// ✅ IST-anchored initial month/year
// ✅ Division-by-zero guard on Avg hours
// ✅ Searchable Company, Department, Employee dropdowns
// ➕ Click-anywhere date picker

import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

// ============================================
// SEARCHABLE DROPDOWN
// ============================================
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  dark,
  cardBg,
  textPrimary,
  textMuted,
  border,
  icon,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options
      .filter((o) => {
        const label = String(o.label || '').toLowerCase();
        const sub = String(o.subLabel || '').toLowerCase();
        return label.includes(q) || sub.includes(q);
      })
      .slice(0, 100);
  }, [options, search]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleToggle = () => {
    setOpen((v) => {
      if (!v) setSearch('');
      return !v;
    });
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <div
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: THEME.radiusMd,
          border: `1px solid ${border}`,
          background: cardBg,
          color: textPrimary,
          fontSize: '12px',
          fontWeight: 600,
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ color: textMuted, fontSize: '12px', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
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
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px', borderBottom: `1px solid ${border}` }}>
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: textMuted,
                  fontSize: '12px',
                }}
              >
                No results found
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSel = opt.value === value;
                return (
                  <div
                    key={`${opt.value}-${i}`}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '11px 14px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${border}`,
                      background: isSel ? 'rgba(16,185,129,0.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel)
                        e.currentTarget.style.background = dark
                          ? 'rgba(255,255,255,0.04)'
                          : '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) e.currentTarget.style.background = 'transparent';
                    }}
                  >
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
                      {opt.label}
                    </div>
                    {opt.subLabel && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: textMuted,
                          fontWeight: 500,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const AdminAttendanceReport = () => {
  const { theme } = useTheme();
  const dark = isDark(theme);

  // IST-anchored initial month/year
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

  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(_istMonth);
  const [year, setYear] = useState(_istYear);
  const [filterDate, setFilterDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  // Store type in map
  const [holidaysMap, setHolidaysMap] = useState({});

  const [activeTab, setActiveTab] = useState('report');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Date picker ref
  const dateInputRef = useRef(null);

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

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

  const holidayStripeColors = {
    P: '#10B981',
    Present: '#10B981',
    D: '#F59E0B',
    Delayed: '#F59E0B',
    B: '#DC2626',
    'Beyond Delay': '#DC2626',
    L: '#3B82F6',
    Leave: '#3B82F6',
    F: '#F97316',
    Forgotten: '#F97316',
  };

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
  // FETCH EMPLOYEES / DEPARTMENTS / COMPANIES
  // ============================================
  const fetchEmployeesAndDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, employee_id, department, company');

      if (error) throw error;
      setEmployees(data || []);

      const uniqueDepts = [
        ...new Set(data?.map((emp) => emp.department).filter(Boolean)),
      ];
      setDepartments(uniqueDepts);

      const uniqueCompanies = [
        ...new Set(data?.map((emp) => emp.company).filter(Boolean)),
      ];
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees list');
    }
  };

  // ============================================
  // FETCH REPORT DATA
  // ============================================
  const fetchReportData = async () => {
    try {
      setLoading(true);

      let startDate;
      let endDate;

      // ➕ If a specific date is selected, use ONLY that date
      if (filterDate) {
        startDate = filterDate;
        endDate = filterDate;
      } else {
        const mm = String(month).padStart(2, '0');
        const lastDay = new Date(year, month, 0).getDate();
        const dd = String(lastDay).padStart(2, '0');
        startDate = `${year}-${mm}-01`;
        endDate = `${year}-${mm}-${dd}`;
      }

      let empQuery = supabase
        .from('employees')
        .select('id, name, employee_id, department, company');

      if (selectedDepartment !== 'all') {
        empQuery = empQuery.eq('department', selectedDepartment);
      }
      if (selectedCompany !== 'all') {
        empQuery = empQuery.eq('company', selectedCompany);
      }

      const { data: empData, error: empError } = await empQuery;
      if (empError) throw empError;

      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (attError) throw attError;

      const monthStartUTC = new Date(`${startDate}T00:00:00+05:30`).toISOString();
      const monthEndUTC = new Date(`${endDate}T23:59:59.999+05:30`).toISOString();

      const { data: forgottenData, error: forgottenError } = await supabase
        .from('check_in_out')
        .select('id, employee_id, check_in_time, check_out_time, forgotten_checkout')
        .eq('forgotten_checkout', true)
        .gte('check_in_time', monthStartUTC)
        .lte('check_in_time', monthEndUTC);

      if (forgottenError) {
        console.warn('Forgotten column missing:', forgottenError.message);
      }

      let report = (empData || []).map((emp) => {
        const empAttendance =
          attData?.filter((a) => a.employee_id === emp.id) || [];
        const empForgotten =
          (forgottenData || []).filter((f) => f.employee_id === emp.id);

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
        const dayHours = {};

        empAttendance.forEach((a) => {
          if (!a.attendance_date) return;
          const day = parseInt(a.attendance_date.split('-')[2], 10);
          if (!day) return;

          days[day] = a.status;

          const h = parseFloat(a.working_hours);
          if (!isNaN(h) && h > 0) {
            dayHours[day] = h;
          }
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

        const totalHours = Object.values(dayHours).reduce((s, h) => s + h, 0);

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
          dayHours,
          totalHours,
        };
      });

      if (selectedEmployee !== 'all') {
        report = report.filter((emp) => emp.id === selectedEmployee);
      }

      setReportData(report);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, filterDate, selectedEmployee, selectedDepartment, selectedCompany]);

  // ============================================
  // FETCH HOLIDAYS
  // ============================================
  useEffect(() => {
    const load = async () => {
      // Fetch type column
      const { data } = await supabase
        .from('holidays')
        .select('holiday_date, name, type')
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`);

      const map = {};
      (data || []).forEach((h) => {
        // Save type to map
        map[h.holiday_date] = { name: h.name, type: h.type || 'Holiday' };
      });
      setHolidaysMap(map);
    };
    load();
  }, [year]);

  // ============================================
  // FULLSCREEN: Esc to exit + body scroll lock
  // ============================================
  useEffect(() => {
    if (!isFullscreen) return;

    const onKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // ============================================
  // AGGREGATE STATS
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
      employees: reportData.length,
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

  // ============================================
  // DROPDOWN OPTIONS
  // ============================================
  const companyOptions = useMemo(
    () => [
      { value: 'all', label: 'All Companies' },
      ...companies.map((c) => ({ value: c, label: c })),
    ],
    [companies]
  );

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All Depts' },
      ...departments.map((d) => ({ value: d, label: d })),
    ],
    [departments]
  );

  const employeeOptions = useMemo(() => {
    const filtered = employees.filter(
      (emp) =>
        (selectedDepartment === 'all' || emp.department === selectedDepartment) &&
        (selectedCompany === 'all' || emp.company === selectedCompany)
    );
    return [
      { value: 'all', label: 'All Employees' },
      ...filtered.map((emp) => ({
        value: emp.id,
        label: emp.name,
        subLabel: `${emp.employee_id}${
          emp.department ? ` · ${emp.department}` : ''
        }`,
      })),
    ];
  }, [employees, selectedDepartment, selectedCompany]);

  // ============================================
  // DATE PICKER HANDLER
  // ============================================
  const handleDateBlockClick = () => {
    if (!dateInputRef.current) return;
    try {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    } catch {
      dateInputRef.current.focus();
    }
  };

  const handleClearDate = (e) => {
    e.stopPropagation();
    setFilterDate('');
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'dd-mm-yyyy';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    } catch {
      return dateStr;
    }
  };

  // ============================================
  // REPORT TAB BADGE
  // ============================================
  const getStatusBadge = (status, day) => {
    if (day) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidayData = holidaysMap[dateStr];

      if (holidayData) {
        const isWeeklyOff = holidayData.type === 'Weekly Off';
        const holidayName = holidayData.name;

        // Determine base colors based on type
        const baseColor = isWeeklyOff ? '#F59E0B' : '#8B5CF6';
        const baseBg = isWeeklyOff ? '#F59E0B18' : '#8B5CF618';
        const label = isWeeklyOff ? 'WO' : 'H';

        const stripeColor = status ? holidayStripeColors[status] || null : null;
        const hasPattern = !!stripeColor;

        const background = hasPattern
          ? `repeating-linear-gradient(
              45deg,
              ${stripeColor}55 0px,
              ${stripeColor}55 3px,
              transparent 3px,
              transparent 6px
            ), ${baseBg}`
          : baseBg;

        return (
          <span
            title={
              hasPattern
                ? `${holidayName} — worked (${statusFullNames[status] || status})`
                : `${holidayName} — ${isWeeklyOff ? 'weekly off' : 'holiday'}`
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background,
              color: baseColor,
              fontWeight: 800,
              fontSize: isWeeklyOff ? '9px' : '10px',
              border: hasPattern
                ? `1px solid ${stripeColor}80`
                : `1px solid ${baseColor}30`,
            }}
          >
            {label}
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

  // ============================================
  // WORKING HOURS TAB CELL
  // ============================================
  const getHoursCell = (hours, day) => {
    const dateStr = day
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null;
    const holidayData = dateStr ? holidaysMap[dateStr] : null;

    if (holidayData) {
      const isWeeklyOff = holidayData.type === 'Weekly Off';
      const holidayName = holidayData.name;
      
      // Base styling for the holiday type (H or WO)
      const baseColor = isWeeklyOff ? '#F59E0B' : '#8B5CF6';
      const baseBg = isWeeklyOff ? '#F59E0B18' : '#8B5CF618';
      const label = isWeeklyOff ? 'WO' : 'H';
      const typeText = isWeeklyOff ? 'weekly off' : 'holiday';

      if (!hours || hours <= 0) {
        return (
          <span
            title={`${holidayName} — ${typeText}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: baseBg,
              color: baseColor,
              fontWeight: 800,
              fontSize: isWeeklyOff ? '9px' : '10px',
              border: `1px solid ${baseColor}30`,
            }}
          >
            {label}
          </span>
        );
      }

      // ✅ UPDATED: If worked on Weekly Off, use Black text. If Holiday, keep Purple.
      const workedColor = isWeeklyOff ? '#000000' : baseColor;
      // Slightly stronger background for WO so black text is readable
      const workedBg = isWeeklyOff ? '#F59E0B30' : baseBg;
      const workedBorder = isWeeklyOff ? '#F59E0B60' : `${baseColor}80`;

      return (
        <span
          title={`${holidayName} — worked ${hours.toFixed(1)}h`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '26px',
            height: '26px',
            padding: '0 4px',
            borderRadius: '7px',
            background: workedBg,
            color: workedColor,
            fontWeight: 800,
            fontSize: '9px',
            border: `1px solid ${workedBorder}`,
          }}
        >
          {hours.toFixed(1)}
        </span>
      );
    }

    if (!hours || hours <= 0) {
      return (
        <span style={{ color: dark ? '#475569' : '#CBD5E1', fontSize: '13px' }}>
          •
        </span>
      );
    }

    const color = hours >= 8 ? '#10B981' : hours >= 4 ? '#F59E0B' : '#EF4444';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '26px',
          height: '26px',
          padding: '0 4px',
          borderRadius: '7px',
          background: color + '18',
          color: color,
          fontWeight: 800,
          fontSize: '9px',
          border: `1px solid ${color}30`,
        }}
      >
        {hours.toFixed(1)}
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
          <p style={{ marginTop: '16px', color: textSecondary, fontSize: '14px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // TABLE CARD
  // ============================================
  const tableCard = (
    <div
      style={{
        background: cardBg,
        borderRadius: THEME.radiusLg,
        border: `1px solid ${border}`,
        overflow: 'hidden',
        boxShadow: cardShadow,
        ...(isFullscreen
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
          : {}),
      }}
    >
      <div
        onDoubleClick={() => setIsFullscreen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
          borderBottom: `1px solid ${border}`,
          cursor: isFullscreen ? 'zoom-out' : 'zoom-in',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: textSecondary,
            letterSpacing: '0.3px',
          }}
        >
          {isFullscreen ? '📊 FULL VIEW' : '📊 Monthly Table'}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen((v) => !v);
          }}
          title={isFullscreen ? 'Exit full view (Esc)' : 'Expand full view'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: THEME.radiusPill,
            border: `1px solid ${border}`,
            background: cardBg,
            color: THEME.primary,
            fontWeight: 800,
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: THEME.font,
          }}
        >
          {isFullscreen ? '✕ Exit' : '⛶ Expand'}
        </button>
      </div>

      <div
        style={{
          overflowX: 'auto',
          overflowY: isFullscreen ? 'auto' : 'visible',
          maxWidth: '100%',
          maxHeight: isFullscreen ? '100%' : 'none',
          ...(isFullscreen ? { flex: 1, minHeight: 0 } : {}),
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            minWidth: isFullscreen ? '1100px' : '720px',
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
                  top: isFullscreen ? 0 : 'auto',
                  left: 0,
                  background: dark ? '#0F172A' : '#F8FAFC',
                  minWidth: '120px',
                  zIndex: 3,
                  borderRight: `1px solid ${border}`,
                }}
              >
                👤 Employee
              </th>

              {(activeTab === 'report'
                ? [
                    { label: 'Total', color: textSecondary, min: '40px' },
                    { label: 'P', color: '#10B981', min: '28px' },
                    { label: 'A', color: '#EF4444', min: '28px' },
                    { label: 'F', color: '#F97316', min: '30px' },
                    { label: 'D', color: '#F59E0B', min: '28px' },
                    { label: 'B', color: '#DC2626', min: '28px' },
                    { label: 'L', color: '#3B82F6', min: '28px' },
                  ]
                : [
                    { label: 'Hours', color: THEME.primary, min: '50px' },
                    { label: 'P', color: '#10B981', min: '28px' },
                    { label: 'A', color: '#EF4444', min: '28px' },
                    { label: 'Avg', color: '#F59E0B', min: '40px' },
                  ]
              ).map((h, i) => (
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
                    position: isFullscreen ? 'sticky' : 'static',
                    top: isFullscreen ? 0 : 'auto',
                    background: isFullscreen
                      ? dark
                        ? '#0F172A'
                        : '#F8FAFC'
                      : 'transparent',
                    zIndex: isFullscreen ? 2 : 'auto',
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
                    position: isFullscreen ? 'sticky' : 'static',
                    top: isFullscreen ? 0 : 'auto',
                    zIndex: isFullscreen ? 2 : 'auto',
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
                  colSpan={(activeTab === 'report' ? 8 : 5) + daysInMonth}
                  style={{ padding: '40px', textAlign: 'center', color: textSecondary }}
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
                      minWidth: '120px',
                      zIndex: 1,
                      borderRight: `1px solid ${border}`,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: textPrimary, fontSize: '12px' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: '9px', color: textMuted, fontWeight: 500 }}>
                      {emp.employee_id}
                    </div>
                    {emp.company && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: THEME.purple,
                          fontWeight: 800,
                          marginTop: '2px',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {emp.company}
                      </div>
                    )}
                  </td>

                  {activeTab === 'report' ? (
                    <>
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
                            {emp.forgottenPending}pd
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
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: THEME.primary, fontSize: '12px' }}>
                        {emp.totalHours > 0 ? `${emp.totalHours.toFixed(1)}h` : '—'}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#10B981', fontSize: '12px' }}>
                        {emp.present}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#EF4444', fontSize: '12px' }}>
                        {emp.absent}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: '#F59E0B', fontSize: '12px' }}>
                        {emp.present > 0 && emp.totalHours > 0
                          ? `${(emp.totalHours / emp.present).toFixed(1)}h`
                          : '—'}
                      </td>
                    </>
                  )}

                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <td
                      key={day}
                      style={{ padding: '6px 2px', textAlign: 'center', fontSize: '11px' }}
                    >
                      {activeTab === 'report'
                        ? getStatusBadge(emp.days?.[day], day)
                        : getHoursCell(emp.dayHours?.[day], day)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // LEGEND
  // ============================================
  const legend = (
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
      {activeTab === 'report' ? (
        <>
          {[
            { color: '#10B981', label: 'P - Present' },
            { color: '#EF4444', label: 'A - Absent' },
            { color: '#F97316', label: 'F - Forgot' },
            { color: '#F59E0B', label: 'D - Delayed' },
            { color: '#DC2626', label: 'B - Beyond' },
            { color: '#3B82F6', label: 'L - Leave' },
            { color: '#8B5CF6', label: 'H - Holiday' },
            { color: '#F59E0B', label: 'WO - Weekly Off' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: `repeating-linear-gradient(
                  45deg,
                  #10B98155 0px,
                  #10B98155 3px,
                  transparent 3px,
                  transparent 6px
                ), #8B5CF618`,
                border: '1px solid #10B98180',
              }}
            />
            <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary }}>
              H (striped) - Worked on holiday
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: `repeating-linear-gradient(
                  45deg,
                  #10B98155 0px,
                  #10B98155 3px,
                  transparent 3px,
                  transparent 6px
                ), #F59E0B18`,
                border: '1px solid #10B98180',
              }}
            />
            <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary }}>
              WO (striped) - Worked on weekly off
            </span>
          </div>
        </>
      ) : (
        <>
          {[
            { color: '#10B981', label: '≥ 8h — Full day' },
            { color: '#F59E0B', label: '4–8h — Half day' },
            { color: '#EF4444', label: '< 4h — Short' },
            { color: '#8B5CF6', label: 'H — Holiday (no work)' },
            { color: '#F59E0B', label: 'WO — Weekly Off (no work)' },
            { color: '#8B5CF680', label: 'Purple number — Worked on holiday' },
            { color: '#000000', label: 'Black number — Worked on weekly off' }, 
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
        </>
      )}
    </div>
  );

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
                  COMPANY WIDE
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
            📊 {filterDate ? formatDisplayDate(filterDate) : `${getMonthName(month)} ${year}`} · {stats.employees} employees
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ padding: '0 16px 12px' }}>
        {/* Month + Year */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* ➕ Click-anywhere date picker */}
        <div
          onClick={handleDateBlockClick}
          style={{
            width: '100%',
            position: 'relative',
            padding: '12px 14px',
            borderRadius: THEME.radiusMd,
            border: `1px solid ${filterDate ? THEME.primary : border}`,
            background: cardBg,
            color: filterDate ? textPrimary : textMuted,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: THEME.font,
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            userSelect: 'none',
            marginBottom: '8px',
            transition: 'border-color 0.2s',
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
            {formatDisplayDate(filterDate)}
          </span>
          {filterDate ? (
            <button
              type="button"
              onClick={handleClearDate}
              aria-label="Clear date"
              title="Clear date"
              style={{
                background: 'transparent',
                border: 'none',
                color: textMuted,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '6px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          ) : (
            <span style={{ fontSize: '16px', flexShrink: 0 }}>📅</span>
          )}

          {/* Hidden native input — receives showPicker() call */}
          <input
            ref={dateInputRef}
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              border: 'none',
              cursor: 'pointer',
              pointerEvents: 'none',
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {/* ➕ Searchable Company */}
        {companies.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <SearchableDropdown
              value={selectedCompany}
              onChange={(v) => {
                setSelectedCompany(v);
                setSelectedEmployee('all');
              }}
              options={companyOptions}
              placeholder="All Companies"
              searchPlaceholder="Search companies..."
              icon="🏛️"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />
          </div>
        )}

        {/* ➕ Searchable Department + Employee */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <SearchableDropdown
            value={selectedDepartment}
            onChange={(v) => {
              setSelectedDepartment(v);
              setSelectedEmployee('all');
            }}
            options={departmentOptions}
            placeholder="All Depts"
            searchPlaceholder="Search departments..."
            icon="🏢"
            dark={dark}
            cardBg={cardBg}
            textPrimary={textPrimary}
            textMuted={textMuted}
            border={border}
          />

          <SearchableDropdown
            value={selectedEmployee}
            onChange={(v) => setSelectedEmployee(v)}
            options={employeeOptions}
            placeholder="All Employees"
            searchPlaceholder="Search name, ID..."
            icon="👥"
            dark={dark}
            cardBg={cardBg}
            textPrimary={textPrimary}
            textMuted={textMuted}
            border={border}
          />
        </div>
      </div>

      {/* TAB SWITCHER */}
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
            { key: 'report', label: '📋 Report' },
            { key: 'hours', label: '⏱️ Working Hours' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
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
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* STATS GRID — Report tab only */}
      {activeTab === 'report' && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {[
              { value: stats.present, label: 'Present', color: THEME.primary, icon: '✓' },
              { value: stats.delayed, label: 'Delayed', color: THEME.amber, icon: '⏳' },
              { value: stats.beyondDelay, label: 'Beyond', color: THEME.red, icon: '🚫' },
              { value: stats.absent, label: 'Absent', color: THEME.red, icon: '✕' },
              { value: stats.leave, label: 'Leave', color: THEME.blue, icon: '📅' },
              { value: stats.forgotten, label: 'Forgot Out', color: THEME.orange, icon: '⚠️' },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: cardBg,
                  borderRadius: THEME.radiusMd,
                  padding: '12px 8px 10px',
                  textAlign: 'center',
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: '12px', marginBottom: '3px', opacity: 0.9 }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1,
                    letterSpacing: '-0.5px',
                    marginBottom: '3px',
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
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE — normal or fullscreen */}
      {isFullscreen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: pageBg,
            padding: '16px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: THEME.font,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: textPrimary }}>
              📊 {getMonthName(month)} {year} ·{' '}
              {activeTab === 'report' ? 'Report' : 'Working Hours'}
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                padding: '8px 14px',
                borderRadius: THEME.radiusPill,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: THEME.font,
              }}
            >
              ✕ Exit (Esc)
            </button>
          </div>

          {tableCard}
          {legend}
        </div>
      ) : (
        <div style={{ padding: '0 16px 16px' }}>
          {tableCard}
          {legend}
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminAttendanceReport;