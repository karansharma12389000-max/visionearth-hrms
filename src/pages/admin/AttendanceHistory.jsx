// src/pages/admin/AttendanceHistory.jsx
//
// Vision Earth HRMS — Premium Admin Attendance History
// Premium header, refined tabs, filter row, beautiful empty state.
//
// ✅ 📸 Shows employee's Google Timeline screenshot (if uploaded)
// ✅ 📍 "View Route" timeline available for ALL employees
// ✅ 🕐 Smart time formatter
// ✅ ⬇ Download Report

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import {
  getTodayIST,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getMonthName,
} from '../../utils/helpers';
import { buildCSV, downloadCSV, timestamp } from '../../utils/csvExport';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';
import LiveMapPreview, { parseGps } from '../../components/LiveMapPreview';

// ============================================
// ✅ SMART TIME FORMATTER
// ============================================
const formatFlexTime = (value) => {
  if (value === null || value === undefined || value === '') return '—';

  if (
    typeof value === 'string' &&
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(value.trim())
  ) {
    const [hStr, mStr] = value.trim().split(':');
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
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

// ============================================
// ✅ ROBUST TIME PARSER
// ============================================
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

// ============================================
// ✅ LOCATION RESOLVER
// ============================================
const resolveLocationLabel = (address, gps) => {
  const trimmed = (address || '').trim();
  if (trimmed) return trimmed;

  const gpsParsed = parseGps(gps);
  if (gpsParsed) {
    return `${gpsParsed.lat.toFixed(5)}, ${gpsParsed.lng.toFixed(5)}`;
  }
  return null;
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

// ============================================
// PING COUNT HELPER
// ============================================
const fetchPingCount = async (employeeId, dateStr) => {
  if (!employeeId || !dateStr) return 0;
  try {
    const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
    const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
    const { count, error } = await supabase
      .from('location_pings')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .gte('ping_time', dayStart)
      .lte('ping_time', dayEnd);
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

// ============================================
// ✅ FETCH CHECK-IN/OUT ADDRESSES
// ============================================
const fetchCheckInOutForDay = async (employeeId, dateStr) => {
  if (!employeeId || !dateStr) return null;
  try {
    const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
    const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();

    const { data, error } = await supabase
      .from('check_in_out')
      .select(
        'id, check_in_time, check_out_time, check_in_address, check_out_address, check_in_gps, check_out_gps, status'
      )
      .eq('employee_id', employeeId)
      .gte('check_in_time', dayStart)
      .lte('check_in_time', dayEnd)
      .order('check_in_time', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('check_in_out fetch error:', error.message);
      return null;
    }
    return (data && data[0]) || null;
  } catch (err) {
    console.warn('fetchCheckInOutForDay failed:', err);
    return null;
  }
};

// ============================================
// ✅ Detect if a record has a route available
// ============================================
const hasRouteData = (record, pingCount) => {
  if (pingCount >= 2) return true;
  if (pingCount >= 1) return true;
  if (record?.check_in_gps || record?.check_out_gps) return true;
  return false;
};

export const AdminAttendanceHistory = () => {
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelinePings, setTimelinePings] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [recordPingCount, setRecordPingCount] = useState(0);

  // ✅ NEW: cache ping counts to avoid duplicate fetches
  const pingCountCacheRef = useRef({});

  const [viewMode, setViewMode] = useState('today');
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
  const [filterDate, setFilterDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlYear, setDlYear] = useState(_istYear);
  const [dlMonth, setDlMonth] = useState('all');
  const [dlCompany, setDlCompany] = useState('all');
  const [dlDesignation, setDlDesignation] = useState('all');
  const [dlEmployee, setDlEmployee] = useState('all');

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, employee_id, company, designation, department')
        .order('name');
      if (error) throw error;
      setEmployees(data || []);
      setCompanies([
        ...new Set((data || []).map((e) => e.company).filter(Boolean)),
      ]);
      setDesignations([
        ...new Set(
          (data || [])
            .map((e) => e.designation || e.department)
            .filter(Boolean)
        ),
      ]);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceHistory = async (startDate, endDate) => {
    try {
      setLoading(true);

      let query = supabase
        .from('attendance')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);
      }

      const { data: attData, error: attError } = await query;
      if (attError) throw attError;

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, employee_id, department');

      if (empError) throw empError;

      const combinedData =
        attData?.map((item) => ({
          ...item,
          employee: empData?.find((emp) => emp.id === item.employee_id) || null,
        })) || [];

      setAttendanceData(combinedData);
      applyFilters(combinedData);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data = attendanceData) => {
    let filtered = [...data];
    const today = getTodayIST();

    if (viewMode === 'today') {
      filtered = filtered.filter((a) => a.attendance_date === today);
    } else if (viewMode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      filtered = filtered.filter((a) =>
        a.attendance_date?.startsWith(monthStr)
      );
    }

    if (filterDate) {
      filtered = filtered.filter((a) => a.attendance_date === filterDate);
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter((a) => a.employee_id === selectedEmployee);
    }

    setFilteredData(filtered);
  };

  useEffect(() => {
    fetchEmployees();
    const today = getTodayIST();
    fetchAttendanceHistory(today, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, month, year, filterDate, selectedEmployee, attendanceData]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showTimelineModal) setShowTimelineModal(false);
        else if (showScreenshotModal) setShowScreenshotModal(false);
        else if (showDetailModal) setShowDetailModal(false);
        else if (showDownloadModal && !downloading) setShowDownloadModal(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    showDetailModal,
    showScreenshotModal,
    showTimelineModal,
    showDownloadModal,
    downloading,
  ]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const today = getTodayIST();

    if (mode === 'today') {
      fetchAttendanceHistory(today, today);
      setFilterDate('');
    } else if (mode === 'month') {
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      fetchAttendanceHistory(`${year}-${mm}-01`, `${year}-${mm}-${dd}`);
      setFilterDate('');
    } else if (mode === 'all') {
      fetchAttendanceHistory(null, null);
      setFilterDate('');
    }
  };

  const handleMonthYearChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    if (viewMode === 'month') {
      const mm = String(newMonth).padStart(2, '0');
      const lastDay = new Date(newYear, newMonth, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      fetchAttendanceHistory(`${newYear}-${mm}-01`, `${newYear}-${mm}-${dd}`);
    }
  };

  const handleDateSearch = () => {
    if (!filterDate) {
      toast.error('Please select a date');
      return;
    }
    setViewMode('custom');
    fetchAttendanceHistory(filterDate, filterDate);
  };

  const resetFilters = () => {
    setViewMode('today');
    setFilterDate('');
    setSelectedEmployee('all');
    const today = getTodayIST();
    fetchAttendanceHistory(today, today);
  };

  const getViewLabel = () => {
    if (viewMode === 'today') return `Today · ${formatDate(getTodayIST())}`;
    if (viewMode === 'month') return `${getMonthName(month)} ${year}`;
    if (viewMode === 'custom' && filterDate) return formatDate(filterDate);
    return 'All Records';
  };

  const handleCardClick = async (record) => {
    setSelectedRecord(record);
    setRecordPingCount(0);
    setTimelinePings([]);
    setShowDetailModal(true);

    if (record.attendance_date && record.employee_id) {
      // ✅ Check cache first
      const cacheKey = `${record.employee_id}_${record.attendance_date}`;
      const cached = pingCountCacheRef.current[cacheKey];
      if (cached !== undefined) {
        setRecordPingCount(cached);
        return;
      }

      const count = await fetchPingCount(
        record.employee_id,
        record.attendance_date
      );
      pingCountCacheRef.current[cacheKey] = count;
      setRecordPingCount(count);
    }
  };

  const handleViewTimeline = async () => {
    if (!selectedRecord) return;
    setShowTimelineModal(true);
    setTimelineLoading(true);
    setTimelinePings([]);

    try {
      const dateStr = selectedRecord.attendance_date;
      const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
      const dayEnd = new Date(
        `${dateStr}T23:59:59.999+05:30`
      ).toISOString();

      const [pingsRes, cioRes] = await Promise.all([
        supabase
          .from('location_pings')
          .select('*')
          .eq('employee_id', selectedRecord.employee_id)
          .gte('ping_time', dayStart)
          .lte('ping_time', dayEnd)
          .order('ping_time', { ascending: true }),
        fetchCheckInOutForDay(selectedRecord.employee_id, dateStr),
      ]);

      const pingsData = pingsRes.data || [];
      const cio = cioRes;

      const checkInAddress =
        (cio && cio.check_in_address) ||
        selectedRecord.check_in_address ||
        null;

      const checkOutAddress =
        (cio && cio.check_out_address) ||
        selectedRecord.check_out_address ||
        null;

      const checkInGps =
        (cio && cio.check_in_gps) || selectedRecord.check_in_gps || null;

      const checkOutGps =
        (cio && cio.check_out_gps) || selectedRecord.check_out_gps || null;

      const checkInTime =
        (cio && cio.check_in_time) ||
        parseAttendanceTime(dateStr, selectedRecord.check_in_time);
      const checkOutTime =
        (cio && cio.check_out_time) ||
        parseAttendanceTime(dateStr, selectedRecord.check_out_time);

      const events = [];

      const ciGps = parseGps(checkInGps);
      if (checkInTime && ciGps) {
        const dt =
          checkInTime instanceof Date ? checkInTime : new Date(checkInTime);
        if (!isNaN(dt.getTime())) {
          events.push({
            type: 'checkin',
            time: dt.toISOString(),
            lat: ciGps.lat,
            lng: ciGps.lng,
            accuracy: null,
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
          accuracy: p.accuracy,
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
            accuracy: null,
            location_name: resolveLocationLabel(checkOutAddress, checkOutGps),
          });
        }
      }

      events.sort((a, b) => new Date(a.time) - new Date(b.time));
      setTimelinePings(events);
    } catch (err) {
      console.error('Timeline fetch failed:', err);
      setTimelinePings([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const getProjects = (record) => {
    const projects = [];
    for (let i = 1; i <= 6; i++) {
      if (record[`project${i}`]) {
        projects.push({
          name: record[`project${i}`],
          details: record[`project${i}_details`] || '',
        });
      }
    }
    return projects;
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);

      let startDate = null;
      let endDate = null;

      if (dlMonth === 'all') {
        startDate = `${dlYear}-01-01`;
        endDate = `${dlYear}-12-31`;
      } else {
        const mm = String(dlMonth).padStart(2, '0');
        const lastDay = new Date(dlYear, dlMonth, 0).getDate();
        startDate = `${dlYear}-${mm}-01`;
        endDate = `${dlYear}-${mm}-${String(lastDay).padStart(2, '0')}`;
      }

      let empQ = supabase
        .from('employees')
        .select('id, name, employee_id, company, designation, department');

      if (dlCompany !== 'all') empQ = empQ.eq('company', dlCompany);
      if (dlDesignation !== 'all') {
        empQ = empQ.or(
          `designation.eq.${dlDesignation},department.eq.${dlDesignation}`
        );
      }
      if (dlEmployee !== 'all') empQ = empQ.eq('id', dlEmployee);

      const { data: empData, error: empErr } = await empQ;
      if (empErr) throw empErr;

      const empIds = (empData || []).map((e) => e.id);
      if (empIds.length === 0) {
        toast.error('No employees match the selected filters');
        setDownloading(false);
        return;
      }

      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .in('employee_id', empIds)
        .order('attendance_date', { ascending: false });

      if (attErr) throw attErr;

      const formatDateForCSV = (iso) => {
        if (!iso) return '';
        const s = String(iso).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-');
          return `${d}-${m}-${y}`;
        }
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
          const [y, m, d] = s.slice(0, 10).split('-');
          return `${d}-${m}-${y}`;
        }
        return s;
      };

      const rows = (attData || []).map((a) => {
        const emp = empData.find((e) => e.id === a.employee_id) || {};
        return {
          employee_name: emp.name || '',
          employee_id: emp.employee_id || '',
          company: emp.company || '',
          designation: emp.designation || emp.department || '',
          date: formatDateForCSV(a.attendance_date),
          status: a.status || '',
          check_in: a.check_in_time || '',
          check_out: a.check_out_time || '',
          working_hours: a.working_hours ?? '',
          reporting_location: a.reporting_location || '',
          project1: a.project1 || '',
          project1_details: a.project1_details || '',
          project2: a.project2 || '',
          project2_details: a.project2_details || '',
          project3: a.project3 || '',
          project3_details: a.project3_details || '',
          project4: a.project4 || '',
          project4_details: a.project4_details || '',
          project5: a.project5 || '',
          project5_details: a.project5_details || '',
          project6: a.project6 || '',
          project6_details: a.project6_details || '',
          remarks: a.remarks || '',
          timeline_screenshot_url: a.timeline_screenshot_url || '',
          timeline_screenshot_required: a.timeline_screenshot_required
            ? 'Yes'
            : 'No',
        };
      });

      if (rows.length === 0) {
        toast.error('No attendance records found for the selected filters');
        setDownloading(false);
        return;
      }

      const columns = [
        { key: 'employee_name', label: 'Employee Name' },
        { key: 'employee_id', label: 'Employee ID' },
        { key: 'company', label: 'Company' },
        { key: 'designation', label: 'Designation' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
        { key: 'check_in', label: 'Check In' },
        { key: 'check_out', label: 'Check Out' },
        { key: 'working_hours', label: 'Working Hours' },
        { key: 'reporting_location', label: 'Reporting Location' },
        { key: 'project1', label: 'Project 1' },
        { key: 'project1_details', label: 'Project 1 Details' },
        { key: 'project2', label: 'Project 2' },
        { key: 'project2_details', label: 'Project 2 Details' },
        { key: 'project3', label: 'Project 3' },
        { key: 'project3_details', label: 'Project 3 Details' },
        { key: 'project4', label: 'Project 4' },
        { key: 'project4_details', label: 'Project 4 Details' },
        { key: 'project5', label: 'Project 5' },
        { key: 'project5_details', label: 'Project 5 Details' },
        { key: 'project6', label: 'Project 6' },
        { key: 'project6_details', label: 'Project 6 Details' },
        { key: 'remarks', label: 'Remarks' },
        { key: 'timeline_screenshot_url', label: 'Timeline Screenshot' },
        {
          key: 'timeline_screenshot_required',
          label: 'Screenshot Required?',
        },
      ];

      const csv = buildCSV(rows, columns, {
        linkColumns: ['timeline_screenshot_url'],
        textColumns: ['date', 'check_in', 'check_out'],
      });

      const filename = `attendance-report-${dlYear}${
        dlMonth === 'all' ? '-all' : '-' + String(dlMonth).padStart(2, '0')
      }-${timestamp()}.csv`;

      downloadCSV(filename, csv);

      toast.success(`Downloaded ${rows.length} records`);
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
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
                  ALL RECORDS
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowDownloadModal(true)}
                title="Download report"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: dark
                    ? 'rgba(255,255,255,0.08)'
                    : 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                }}
              >
                ⬇
              </button>
              <button
                onClick={toggleDark}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
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

          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            📋 {getViewLabel()}
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
            border: `1px solid ${
              dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
            }`,
          }}
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All' },
          ].map((v) => {
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => handleViewModeChange(v.key)}
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
          <button
            onClick={resetFilters}
            style={{
              padding: '9px 12px',
              borderRadius: THEME.radiusPill,
              border: 'none',
              background: 'transparent',
              color: textSecondary,
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: THEME.font,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* FILTER ROW */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={month}
            onChange={(e) =>
              handleMonthYearChange(parseInt(e.target.value), year)
            }
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
            onChange={(e) =>
              handleMonthYearChange(month, parseInt(e.target.value))
            }
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
            {Array.from({ length: 5 }, (_, i) => _istYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
            onClick={handleDateSearch}
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

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{
            width: '100%',
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
            backgroundPosition: 'right 12px center',
            backgroundSize: '14px',
            paddingRight: '36px',
            boxSizing: 'border-box',
          }}
        >
          <option value="all">👥 All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.employee_id})
            </option>
          ))}
        </select>
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
        {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}{' '}
        found
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {filteredData.length === 0 ? (
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: textSecondary,
                margin: 0,
              }}
            >
              No attendance records found
            </p>
            <p
              style={{
                fontSize: '11px',
                color: textMuted,
                marginTop: '6px',
                margin: 0,
                fontWeight: 500,
              }}
            >
              Try adjusting your filters
            </p>
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const statusColor = getStatusColor(item.status, theme);
            const statusLabel = getStatusLabel(item.status);
            const projects = getProjects(item);

            // ✅ FIX: stable key
            const stableKey =
              item.id || `${item.employee_id}_${item.attendance_date}_${idx}`;

            return (
              <div
                key={stableKey}
                onClick={() => handleCardClick(item)}
                style={{
                  marginBottom: '10px',
                  padding: '14px',
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${THEME.primary}15`;
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
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
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
                            fontSize: '13px',
                            fontWeight: 800,
                            color: textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.employee?.name || 'Employee'}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: textMuted,
                            fontWeight: 600,
                          }}
                        >
                          {item.employee?.employee_id || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: textSecondary,
                        marginTop: '6px',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        fontWeight: 500,
                      }}
                    >
                      <span>📅 {formatDate(item.attendance_date)}</span>
                      {item.reporting_location && (
                        <span>📍 {item.reporting_location}</span>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: '8px',
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          background: dark
                            ? 'rgba(16,185,129,0.12)'
                            : THEME.primarySoft,
                          color: THEME.primary,
                          padding: '3px 8px',
                          borderRadius: '7px',
                          fontWeight: 800,
                          border: `1px solid ${THEME.primary}30`,
                        }}
                      >
                        ✓ {formatFlexTime(item.check_in_time)}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          background: dark
                            ? 'rgba(239,68,68,0.12)'
                            : THEME.redSoft,
                          color: THEME.red,
                          padding: '3px 8px',
                          borderRadius: '7px',
                          fontWeight: 800,
                          border: `1px solid ${THEME.red}30`,
                        }}
                      >
                        ↑ {formatFlexTime(item.check_out_time)}
                      </span>
                      {item.working_hours != null && (
                        <span
                          style={{
                            fontSize: '9px',
                            background: dark
                              ? 'rgba(59,130,246,0.12)'
                              : THEME.blueSoft,
                            color: THEME.blue,
                            padding: '3px 8px',
                            borderRadius: '7px',
                            fontWeight: 800,
                            border: `1px solid ${THEME.blue}30`,
                          }}
                        >
                          ⏱ {item.working_hours}h
                        </span>
                      )}
                    </div>

                    {projects.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '5px',
                        }}
                      >
                        {projects.slice(0, 2).map((p, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '9px',
                              background: dark
                                ? 'rgba(16,185,129,0.1)'
                                : THEME.primarySoft,
                              padding: '3px 8px',
                              borderRadius: '7px',
                              color: THEME.primaryDark,
                              fontWeight: 700,
                              border: `1px solid ${THEME.primary}20`,
                            }}
                          >
                            📌 {p.name}
                          </span>
                        ))}
                        {projects.length > 2 && (
                          <span
                            style={{
                              fontSize: '9px',
                              color: textMuted,
                              fontWeight: 700,
                              alignSelf: 'center',
                            }}
                          >
                            +{projects.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {item.timeline_screenshot_url && (
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'inline-block',
                          fontSize: '9px',
                          background: THEME.primary + '12',
                          color: THEME.primary,
                          padding: '3px 8px',
                          borderRadius: '7px',
                          fontWeight: 800,
                          border: `1px solid ${THEME.primary}30`,
                        }}
                      >
                        📸 Screenshot
                      </div>
                    )}
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
                      marginLeft: '8px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })
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
                    fontSize: '17px',
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  📋 Details
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: textSecondary,
                    marginTop: '2px',
                    fontWeight: 600,
                  }}
                >
                  {selectedRecord.employee?.name} ·{' '}
                  {selectedRecord.employee?.employee_id}
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
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <DetailBox
                label="Date"
                value={formatDate(selectedRecord.attendance_date)}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Status"
                value={getStatusLabel(selectedRecord.status)}
                valueColor={getStatusColor(selectedRecord.status, theme)}
                dark={dark}
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
                label="Check In"
                value={formatFlexTime(selectedRecord.check_in_time)}
                valueColor={THEME.primary}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Check Out"
                value={formatFlexTime(selectedRecord.check_out_time)}
                valueColor={THEME.red}
                dark={dark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <DetailBox
                label="Hours"
                value={`${selectedRecord.working_hours || 0}h`}
                valueColor={THEME.blue}
                dark={dark}
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
                        fontWeight: 800,
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
                          lineHeight: 1.4,
                        }}
                      >
                        {p.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedRecord.timeline_screenshot_url && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '14px',
                  background: dark ? '#0F172A' : '#F8FAFC',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${THEME.primary}40`,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: THEME.primary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>📸 Google Timeline Screenshot</span>
                  <button
                    type="button"
                    onClick={() => setShowScreenshotModal(true)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${THEME.primary}40`,
                      background: THEME.primary + '12',
                      color: THEME.primary,
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: THEME.font,
                      letterSpacing: '0.2px',
                    }}
                  >
                    🔍 View Full
                  </button>
                </div>
                <img
                  src={selectedRecord.timeline_screenshot_url}
                  alt="Timeline screenshot"
                  onClick={() => setShowScreenshotModal(true)}
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: `1px solid ${border}`,
                    cursor: 'zoom-in',
                  }}
                />
              </div>
            )}

            {hasRouteData(selectedRecord, recordPingCount) ? (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '14px',
                  background: dark ? '#0F172A' : '#F8FAFC',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${THEME.purple}40`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: THEME.purple + '18',
                        color: THEME.purple,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      📍
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: textPrimary,
                        }}
                      >
                        Location Timeline
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: textMuted,
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {recordPingCount > 0
                          ? `${recordPingCount} ping${
                              recordPingCount === 1 ? '' : 's'
                            } recorded`
                          : 'Check-in/out route available'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleViewTimeline}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${THEME.purple}, #6D28D9)`,
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: THEME.font,
                      letterSpacing: '0.3px',
                      boxShadow: '0 4px 12px rgba(139,92,246,0.35)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View Route →
                  </button>
                </div>
              </div>
            ) : null}

            {selectedRecord.remarks && (
              <div
                style={{
                  marginBottom: '14px',
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
                fontSize: '13px',
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

      {/* FULL SCREENSHOT VIEWER */}
      {showScreenshotModal && selectedRecord?.timeline_screenshot_url && (
        <div
          onClick={() => setShowScreenshotModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1800,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '20px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              fontFamily: THEME.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  📸 Timeline Screenshot
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: textMuted,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {selectedRecord.employee?.name || 'Employee'} ·{' '}
                  {formatDate(selectedRecord.attendance_date)}
                </div>
              </div>
              <button
                onClick={() => setShowScreenshotModal(false)}
                style={{
                  fontSize: 22,
                  color: textMuted,
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <img
              src={selectedRecord.timeline_screenshot_url}
              alt="Timeline screenshot"
              style={{
                width: '100%',
                borderRadius: 12,
                border: `1px solid ${border}`,
                display: 'block',
              }}
            />

            <a
              href={selectedRecord.timeline_screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 12,
                fontSize: 11,
                fontWeight: 700,
                color: THEME.primary,
                textDecoration: 'none',
              }}
            >
              🔗 Open original in new tab
            </a>

            <button
              onClick={() => setShowScreenshotModal(false)}
              style={{
                width: '100%',
                padding: 13,
                marginTop: 14,
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: THEME.font,
                letterSpacing: 0.3,
                boxShadow: THEME.shadowGreen,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* LOCATION TIMELINE MODAL */}
      {showTimelineModal && selectedRecord && (
        <div
          onClick={() => setShowTimelineModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1900,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '20px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              fontFamily: THEME.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  📍 Location Timeline
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: textMuted,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {selectedRecord.employee?.name || 'Employee'} ·{' '}
                  {formatDate(selectedRecord.attendance_date)}
                </div>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                style={{
                  fontSize: 22,
                  color: textMuted,
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {timelineLoading ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: textSecondary,
                  fontSize: 12,
                }}
              >
                Loading route…
              </div>
            ) : timelinePings.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: textMuted,
                  fontSize: 12,
                }}
              >
                📍 No location data available for this day
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <LiveMapPreview
                    route={timelinePings}
                    height={240}
                    onPing={null}
                  />
                </div>

                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 10,
                  }}
                >
                  Route Events
                </div>

                <div style={{ marginBottom: 16 }}>
                  {timelinePings.map((e, i) => {
                    const isCheckin = e.type === 'checkin';
                    const isCheckout = e.type === 'checkout';
                    const isEndpoint = isCheckin || isCheckout;

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

                    const timeDisplay = fmtTimeOnly(new Date(e.time));
                    const showTime = timeDisplay !== '—';

                    const isCoordsFallback =
                      e.location_name &&
                      /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(
                        e.location_name.trim()
                      );

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 12,
                          paddingBottom:
                            i < timelinePings.length - 1 ? 14 : 0,
                          position: 'relative',
                        }}
                      >
                        {i < timelinePings.length - 1 && (
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
                            {showTime ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: textMuted,
                                }}
                              >
                                {timeDisplay}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: textMuted,
                                  fontStyle: 'italic',
                                }}
                              >
                                time unavailable
                              </span>
                            )}
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
                              {isCoordsFallback && isEndpoint && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginLeft: 6,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: THEME.amber + '18',
                                    color: '#B45309',
                                    border: `1px solid ${THEME.amber}40`,
                                  }}
                                >
                                  GPS only
                                </span>
                              )}
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
              </>
            )}

            <button
              onClick={() => setShowTimelineModal(false)}
              style={{
                width: '100%',
                padding: 13,
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.purple}, #6D28D9)`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: THEME.font,
                letterSpacing: 0.3,
                boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOAD REPORT MODAL */}
      {showDownloadModal && (
        <div
          onClick={() => !downloading && setShowDownloadModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '22px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: THEME.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
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
                  }}
                >
                  ⬇ Download Report
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: textMuted,
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  Choose filters → export CSV
                </div>
              </div>
              <button
                onClick={() => !downloading && setShowDownloadModal(false)}
                style={{
                  fontSize: '22px',
                  color: textMuted,
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Year
              </label>
              <select
                value={dlYear}
                onChange={(e) => setDlYear(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: THEME.font,
                  cursor: 'pointer',
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

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Month
              </label>
              <select
                value={dlMonth}
                onChange={(e) =>
                  setDlMonth(
                    e.target.value === 'all' ? 'all' : parseInt(e.target.value)
                  )
                }
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: THEME.font,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="all">📅 Full Year</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            {companies.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Company
                </label>
                <select
                  value={dlCompany}
                  onChange={(e) => setDlCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: THEME.font,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">🏛️ All Companies</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {designations.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Designation
                </label>
                <select
                  value={dlDesignation}
                  onChange={(e) => setDlDesignation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: THEME.font,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">💼 All Designations</option>
                  {designations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Employee
              </label>
              <select
                value={dlEmployee}
                onChange={(e) => setDlEmployee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: THEME.font,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="all">👥 All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: downloading
                  ? textMuted
                  : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14px',
                cursor: downloading ? 'wait' : 'pointer',
                boxShadow: downloading ? 'none' : THEME.shadowGreen,
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
              }}
            >
              {downloading ? '⏳ Generating...' : '⬇ Download CSV'}
            </button>

            <div
              style={{
                fontSize: '10px',
                color: textMuted,
                textAlign: 'center',
                marginTop: '10px',
                fontWeight: 500,
              }}
            >
              Opens directly in Google Sheets, Excel, or Numbers
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

// ============================================
// DETAIL BOX
// ============================================
const DetailBox = ({
  label,
  value,
  valueColor,
  dark,
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
        fontWeight: 800,
        color: valueColor || textPrimary,
      }}
    >
      {value}
    </div>
  </div>
);

export default AdminAttendanceHistory;