// src/services/checkInOutService.js
//
// Central service for all check-in/check-out logic.
// Handles:
//   - Pending check-out detection
//   - Approved-leave block on check-in           ✅ NEW
//   - Check-in (with blocking)
//   - Check-out via attendance form
//   - Status calculation (P / D / B) — IST-SAFE
//   - Working hours calculation
//
// ✅ checkOut() accepts and persists:
//      - formData.timelineScreenshotUrl      (string | null)
//      - formData.timelineScreenshotRequired (boolean)
//
// ✅ checkIn() now blocks when the employee is on an approved leave today.

import { supabase } from './supabase';
import { getTodayIST } from '../utils/timeUtils';

// ============================================
// HELPER: Get IST date string (YYYY-MM-DD) from any timestamp
// ============================================
const getISTDateString = (timestamp) => {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return null;
  }
};

// ============================================
// HELPER: Get IST hour (0-23) from any timestamp
// ============================================
const getISTHour = (timestamp) => {
  if (!timestamp) return 0;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 0;
    return parseInt(
      date.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false,
      })
    );
  } catch {
    return 0;
  }
};

// ============================================
// HELPER: Get difference in calendar days (IST) between two timestamps
// ============================================
const getISTDaysDiff = (fromTimestamp, toTimestamp) => {
  if (!fromTimestamp || !toTimestamp) return 0;
  try {
    const fromStr = getISTDateString(fromTimestamp);
    const toStr = getISTDateString(toTimestamp);
    if (!fromStr || !toStr) return 0;

    const from = new Date(fromStr + 'T00:00:00+05:30');
    const to = new Date(toStr + 'T00:00:00+05:30');

    return Math.round((to - from) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

// ============================================
// HELPER: Calculate status based on submission time (IST-SAFE)
// ============================================
/**
 * Rules (all in IST):
 *   - Same day submission          → P (Present)
 *   - Next day before 10:00 AM     → P (Present)
 *   - Next day after 10:00 AM      → D (Delayed)
 *   - Day after tomorrow or later  → B (Beyond Delay)
 */
export const calculateStatus = (
  attendanceDate,
  submissionTime = new Date()
) => {
  const attendanceDayStr = attendanceDate;
  const submissionISTDate = getISTDateString(submissionTime);
  const submissionISTHour = getISTHour(submissionTime);

  // Rule 1: Same IST day → P
  if (submissionISTDate === attendanceDayStr) {
    return 'P';
  }

  const attendanceDay00 = new Date(attendanceDayStr + 'T00:00:00+05:30');
  const nextDayStr = new Date(attendanceDay00.getTime() + 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Rule 2: Next day
  if (submissionISTDate === nextDayStr) {
    if (submissionISTHour < 10) return 'P';
    return 'D';
  }

  // Rule 3: Day after tomorrow or later → B
  return 'B';
};

// ============================================
// HELPER: Human-readable status label
// ============================================
export const getStatusDescription = (status) => {
  switch (status) {
    case 'P':
      return { label: 'Present', color: '#10B981', icon: '✅' };
    case 'D':
      return { label: 'Delayed', color: '#F59E0B', icon: '⏳' };
    case 'B':
      return { label: 'Beyond Delay', color: '#DC2626', icon: '🚫' };
    case 'A':
      return { label: 'Absent', color: '#EF4444', icon: '❌' };
    case 'L':
      return { label: 'Leave', color: '#3B82F6', icon: '📅' };
    default:
      return { label: status || 'N/A', color: '#64748B', icon: '📌' };
  }
};

// ============================================
// HELPER: Get current UTC ISO time (for DB storage)
// ============================================
const nowISO = () => new Date().toISOString();

// ============================================
// HELPER: Format time as HH:MM:SS in IST
// ============================================
const toTimeString = (date) => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
  } catch {
    return null;
  }
};

// ============================================
// ✅ NEW: Get approved leave covering a given date
// Returns the leave row if an Approved leave exists for that date, else null.
// ============================================
export const getApprovedLeaveForDate = async (userId, dateStr) => {
  if (!userId || !dateStr) return null;
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, leave_type, leave_start_date, leave_end_date, reason')
      .eq('employee_id', userId)
      .eq('status', 'Approved')
      .lte('leave_start_date', dateStr)
      .gte('leave_end_date', dateStr)
      .maybeSingle();

    if (error) {
      // Supabase returns PGRST116 when maybeSingle() finds 0 rows — not a real error
      if (error.code !== 'PGRST116') {
        console.error('Error fetching leave for date:', error);
      }
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('getApprovedLeaveForDate failed:', err);
    return null;
  }
};

// ============================================
// CORE: Get pending check-out (from any previous day)
// ============================================
export const getPendingCheckOut = async (userId) => {
  if (!userId) return null;

  const today = getTodayIST();
  const todayStartIST = new Date(`${today}T00:00:00+05:30`).toISOString();

  const { data, error } = await supabase
    .from('check_in_out')
    .select('*')
    .eq('employee_id', userId)
    .is('check_out_time', null)
    .lt('check_in_time', todayStartIST)
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching pending check-out:', error);
    }
    return null;
  }

  return data || null;
};

// ============================================
// CORE: Get today's check-in status
// ============================================
export const getTodayCheckIn = async (userId) => {
  if (!userId) return null;

  const today = getTodayIST();
  const dayStartUTC = new Date(`${today}T00:00:00+05:30`).toISOString();
  const dayEndUTC = new Date(`${today}T23:59:59.999+05:30`).toISOString();

  const { data, error } = await supabase
    .from('check_in_out')
    .select('*')
    .eq('employee_id', userId)
    .gte('check_in_time', dayStartUTC)
    .lte('check_in_time', dayEndUTC)
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching today check-in:', error);
    }
    return null;
  }

  return data || null;
};

// ============================================
// CORE: Check-in (blocks on pending checkout OR approved leave today)
// ✅ NEW: blocks if employee is on an approved leave today
// ============================================
export const checkIn = async (userId, location, address) => {
  if (!userId) throw new Error('User ID required');

  // ✅ NEW: Check if employee is on approved leave today
  const today = getTodayIST();
  const onLeaveToday = await getApprovedLeaveForDate(userId, today);

  if (onLeaveToday) {
    return {
      blocked: true,
      onLeave: true,
      leave: onLeaveToday,
      message: `You're on approved ${onLeaveToday.leave_type} today (${onLeaveToday.leave_start_date} → ${onLeaveToday.leave_end_date}). Revoke or edit your leave first, then check in.`,
    };
  }

  // 1. Check if there's a pending check-out
  const pending = await getPendingCheckOut(userId);
  if (pending) {
    return {
      blocked: true,
      pendingRecord: pending,
      message: 'You must resolve your previous check-out first',
    };
  }

  // 2. Check if already checked in today
  const todayCheckIn = await getTodayCheckIn(userId);
  if (todayCheckIn && !todayCheckIn.check_out_time) {
    return {
      blocked: true,
      alreadyCheckedIn: true,
      record: todayCheckIn,
      message: 'You are already checked in today',
    };
  }

  // 3. Create new check-in
  const checkInTime = nowISO();
  const gps = location ? `${location.lat},${location.lng}` : null;

  const { data, error } = await supabase
    .from('check_in_out')
    .insert({
      employee_id: userId,
      check_in_time: checkInTime,
      check_in_gps: gps,
      check_in_address: address || 'Location captured',
      status: 'Checked In',
      forgotten_checkout: false,
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, record: data };
};

// ============================================
// CORE: Check-out (creates attendance record) — IST-SAFE
//
// Accepts and persists:
//    - formData.timelineScreenshotUrl      (string | null)
//    - formData.timelineScreenshotRequired (boolean)
// ============================================
export const checkOut = async (
  userId,
  recordId,
  formData,
  location,
  address,
  employeeName
) => {
  if (!userId || !recordId) throw new Error('User ID and record ID required');

  // 1. Load the check-in record
  const { data: record, error: fetchError } = await supabase
    .from('check_in_out')
    .select('*')
    .eq('id', recordId)
    .eq('employee_id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!record) throw new Error('Check-in record not found');
  if (record.check_out_time) throw new Error('Already checked out');

  // 2. Compute times
  const checkOutTime = nowISO();
  const checkInDate = new Date(record.check_in_time);
  const checkOutDate = new Date(checkOutTime);

  const diffMs = checkOutDate - checkInDate;
  const workingHours =
    Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);

  // 3. Determine attendance date (IST)
  const attendanceDate = getISTDateString(record.check_in_time);

  // 4. Was this a forgotten check-out? (different IST days)
  const checkInDayStr = getISTDateString(record.check_in_time);
  const checkOutDayStr = getISTDateString(checkOutTime);
  const forgottenCheckout = checkInDayStr !== checkOutDayStr;

  const checkoutDelayHours =
    Math.round(((checkOutDate - checkInDate) / 3600000) * 100) / 100;

  // 6. Calculate status (IST-safe)
  const status = calculateStatus(attendanceDate, checkOutTime);

  // 7. Update check_in_out
  const gps = location ? `${location.lat},${location.lng}` : record.check_in_gps;

  const { error: updateError } = await supabase
    .from('check_in_out')
    .update({
      check_out_time: checkOutTime,
      check_out_gps: gps,
      check_out_address: address || 'Location captured',
      working_hours: workingHours,
      status: forgottenCheckout ? 'Checked Out (Late)' : 'Checked Out',
      forgotten_checkout: forgottenCheckout,
      checkout_delay_hours: checkoutDelayHours,
      resolved_at: forgottenCheckout ? nowISO() : null,
    })
    .eq('id', recordId);

  if (updateError) throw updateError;

  // 8. Build projects payload
  const projects = formData.projects || [];
  const projectsPayload = {};
  for (let i = 0; i < 6; i++) {
    projectsPayload[`project${i + 1}`] = projects[i]?.project || null;
    projectsPayload[`project${i + 1}_details`] = projects[i]?.workDone || null;
  }

  // 9. Build attendance record
  const attendanceData = {
    employee_id: userId,
    employee_name: employeeName || 'Unknown',
    attendance_date: attendanceDate,
    reporting_location: formData.reportingLocation || 'Not specified',
    check_in_time: toTimeString(record.check_in_time),
    check_in_location: record.check_in_address || null,
    check_in_gps: record.check_in_gps || null,
    check_out_time: toTimeString(checkOutTime),
    check_out_location: address || record.check_out_address || null,
    check_out_gps: gps || null,
    working_hours: workingHours,
    status: status,
    remarks:
      formData.remarks ||
      (forgottenCheckout
        ? `Late check-out resolved (${checkoutDelayHours}h delay)`
        : ''),
    timeline_screenshot_url: formData.timelineScreenshotUrl || null,
    timeline_screenshot_required: !!formData.timelineScreenshotRequired,
    ...projectsPayload,
  };

  // ✅ Upsert on (employee_id, attendance_date) — requires UNIQUE constraint
  const { data: attendanceRecord, error: upsertError } = await supabase
    .from('attendance')
    .upsert(attendanceData, {
      onConflict: 'employee_id,attendance_date',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (upsertError) throw upsertError;

  return {
    success: true,
    attendance: attendanceRecord,
    status,
    forgottenCheckout,
    workingHours,
    checkoutDelayHours,
  };
};

// ============================================
// CORE: Get forgotten check-out count for an employee
// ============================================
export const getForgottenCount = async (userId, month, year) => {
  if (!userId) return 0;

  let query = supabase
    .from('check_in_out')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', userId)
    .eq('forgotten_checkout', true);

  if (month && year) {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    const monthStartUTC = new Date(
      `${year}-${mm}-01T00:00:00+05:30`
    ).toISOString();
    const monthEndUTC = new Date(
      `${year}-${mm}-${dd}T23:59:59.999+05:30`
    ).toISOString();
    query = query
      .gte('check_in_time', monthStartUTC)
      .lte('check_in_time', monthEndUTC);
  }

  const { count, error } = await query;
  if (error) {
    console.error('Error fetching forgotten count:', error);
    return 0;
  }
  return count || 0;
};

// ============================================
// EXPORT ALL
// ============================================
export default {
  calculateStatus,
  getStatusDescription,
  getApprovedLeaveForDate,
  getPendingCheckOut,
  getTodayCheckIn,
  checkIn,
  checkOut,
  getForgottenCount,
};