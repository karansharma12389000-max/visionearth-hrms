// src/services/checkInOutService.js
//
// Central service for all check-in/check-out logic.
// Handles:
//   - Pending check-out detection
//   - Check-in (with blocking)
//   - Check-out via attendance form
//   - Status calculation (P / D / B) — IST-SAFE
//   - Working hours calculation

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

    // Parse both as IST midnight
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
  attendanceDate,      // "YYYY-MM-DD" (the check-in day)
  submissionTime = new Date()
) => {
  // ✅ Everything in IST terms
  const attendanceDayStr = attendanceDate;                       // "2026-09-18"
  const submissionISTDate = getISTDateString(submissionTime);    // "2026-09-19"
  const submissionISTHour = getISTHour(submissionTime);          // 0-23

  // Rule 1: Same IST day → P
  if (submissionISTDate === attendanceDayStr) {
    return 'P';
  }

  // Compute the IST date string of "next day"
  const attendanceDay00 = new Date(attendanceDayStr + 'T00:00:00+05:30');
  const nextDayStr = new Date(attendanceDay00.getTime() + 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Rule 2: Next day
  if (submissionISTDate === nextDayStr) {
    if (submissionISTHour < 10) return 'P';  // Before 10 AM IST
    return 'D';                               // 10 AM or later IST
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
    }); // Returns "HH:MM:SS" in IST
  } catch {
    return null;
  }
};

// ============================================
// CORE: Get pending check-out (from any previous day)
// ============================================
export const getPendingCheckOut = async (userId) => {
  if (!userId) return null;

  const today = getTodayIST();
  // ✅ FIX: pending = check-in BEFORE today's IST midnight
  //    today 00:00 IST in UTC = previous day 18:30 UTC
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
    console.error('Error fetching pending check-out:', error);
    return null;
  }

  return data;
};

// ============================================
// CORE: Get today's check-in status
// ============================================
export const getTodayCheckIn = async (userId) => {
  if (!userId) return null;

  const today = getTodayIST();
  // ✅ FIX: use IST-anchored UTC bounds covering the full IST day
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
    console.error('Error fetching today check-in:', error);
    return null;
  }

  return data;
};

// ============================================
// CORE: Check-in (blocks if pending checkout exists)
// ============================================
export const checkIn = async (userId, location, address) => {
  if (!userId) throw new Error('User ID required');

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

  // ✅ FIX: use real hours (ms diff), not whole-day multiples
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
    ...projectsPayload,
  };

  const { data: attendanceRecord, error: insertError } = await supabase
    .from('attendance')
    .insert(attendanceData)
    .select()
    .single();

  if (insertError) throw insertError;

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
    // ✅ FIX: IST-anchored month range
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    const monthStartUTC = new Date(`${year}-${mm}-01T00:00:00+05:30`).toISOString();
    const monthEndUTC = new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`).toISOString();
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
  getPendingCheckOut,
  getTodayCheckIn,
  checkIn,
  checkOut,
  getForgottenCount,
};