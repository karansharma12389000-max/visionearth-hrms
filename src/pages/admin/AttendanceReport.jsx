// src/pages/admin/AttendanceReport.jsx
//
// Vision Earth HRMS — Premium Admin Attendance Report
// Company-wide monthly attendance, filterable by department/employee.
//
// ✅ Holiday pattern badge on Report tab (striped H when worked).
// ✅ Report / Working Hours tabs — same calendar layout.
// ✅ Working Hours tab:
//      - Holiday + no work → plain purple "H"
//      - Holiday + worked  → purple badge with hours inside
//      - Regular day        → colored by amount (green/amber/red)
//      - No record          → "•"
//    Holiday hours ARE counted in the employee's monthly total.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminAttendanceReport = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [holidaysMap, setHolidaysMap] = useState({});

  // Which tab is active
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'hours'

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // Status colors
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
    }
  };

  // ============================================
  // FETCH REPORT DATA
  // ============================================
  const fetchReportData = async () => {
    try {
      setLoading(true);

      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      const endDate = `${year}-${mm}-${dd}`;

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

        // Total hours includes hours on holidays too
        const totalHours = Object.values(dayHours).reduce(
          (s, h) => s + h,
          0
        );

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
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [month, year, selectedEmployee, selectedDepartment, selectedCompany]);

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
  // REPORT TAB BADGE (status letter / striped H)
  // ============================================
  const getStatusBadge = (status, day) => {
    if (day) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidayName = holidaysMap[dateStr];

      if (holidayName) {
        const stripeColor = status ? holidayStripeColors[status] || null : null;
        const hasPattern = !!stripeColor;

        const background = hasPattern
          ? `repeating-linear-gradient(
              45deg,
              ${stripeColor}55 0px,
              ${stripeColor}55 3px,
              transparent 3px,
              transparent 6px
            ), #8B5CF618`
          : '#8B5CF618';

        return (
          <span
            title={
              hasPattern
                ? `${holidayName} — worked (${statusFullNames[status] || status})`
                : `${holidayName} — holiday`
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background,
              color: '#8B5CF6',
              fontWeight: 800,
              fontSize: '10px',
              border: hasPattern
                ? `1px solid ${stripeColor}80`
                : '1px solid #8B5CF630',
            }}
          >
            H
          </span>
        );
      }
    }

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
  // WORKING HOURS TAB CELL
  //   - Holiday + no work → purple "H"
  //   - Holiday + worked  → purple badge with hours
  //   - Regular day       → colored by amount
  // ============================================
  const getHoursCell = (hours, day, status) => {
    const dateStr = day
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null;
    const holidayName = dateStr ? holidaysMap[dateStr] : null;

    // Holiday + no work → plain purple "H"
    if (holidayName && (!hours || hours <= 0)) {
      return (
        <span
          title={`${holidayName} — holiday`}
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

    // Holiday + worked → purple badge with hours inside
    if (holidayName && hours > 0) {
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
            background: '#8B5CF618',
            color: '#8B5CF6',
            fontWeight: 800,
            fontSize: '9px',
            border: '1px solid #8B5CF680',
          }}
        >
          {hours.toFixed(1)}
        </span>
      );
    }

    // Regular day, no hours
    if (!hours || hours <= 0) {
      return (
        <span style={{ color: dark ? '#475569' : '#CBD5E1', fontSize: '13px' }}>
          •
        </span>
      );
    }

    // Regular day with hours → color by amount
    const color =
      hours >= 8
        ? '#10B981'
        : hours >= 4
        ? '#F59E0B'
        : '#EF4444';

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
            📊 {getMonthName(month)} {year} · {stats.employees} employees
          </div>
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
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>

        {companies.length > 0 && (
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setSelectedEmployee('all');
            }}
            style={{
              width: '100%',
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
              marginBottom: '8px',
            }}
          >
            <option value="all">🏛️ All Companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedEmployee('all');
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
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
              backgroundSize: '16px',
              paddingRight: '38px',
              boxSizing: 'border-box',
            }}
          >
            <option value="all">🏢 All Depts</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 14px',
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
              backgroundSize: '16px',
              paddingRight: '38px',
              boxSizing: 'border-box',
            }}
          >
            <option value="all">👥 All Employees</option>
            {employees
              .filter(
                (emp) =>
                  (selectedDepartment === 'all' ||
                    emp.department === selectedDepartment) &&
                  (selectedCompany === 'all' || emp.company === selectedCompany)
              )
              .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
          </select>
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
            border: `1px solid ${
              dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
            }`,
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
                <div
                  style={{
                    fontSize: '12px',
                    marginBottom: '3px',
                    opacity: 0.9,
                  }}
                >
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

      {/* TABLE */}
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
                minWidth: '720px',
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
                      minWidth: '120px',
                      zIndex: 2,
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
                      colSpan={12 + daysInMonth}
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
                          minWidth: '120px',
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
                            fontSize: '9px',
                            color: textMuted,
                            fontWeight: 500,
                          }}
                        >
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
                            {emp.present > 0
                              ? `${(emp.totalHours / emp.present).toFixed(1)}h`
                              : '—'}
                          </td>
                        </>
                      )}

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
                            {activeTab === 'report'
                              ? getStatusBadge(emp.days?.[day], day)
                              : getHoursCell(
                                  emp.dayHours?.[day],
                                  day,
                                  emp.days?.[day]
                                )}
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

        {/* LEGEND */}
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
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: textSecondary,
                  }}
                >
                  H (striped) - Worked on holiday
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
                { color: '#8B5CF680', label: 'Purple number — Worked on holiday' },
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
            </>
          )}
        </div>
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminAttendanceReport;