// src/services/scheduledJobs.js
//
// Nightly scheduler — marks absentees only. NO auto-checkout.
// Runs at 11:55 PM IST and marks absent ONLY for TODAY (IST).
//
// Safeguards:
//    ✅ Skips ENTIRE run if TODAY is a holiday (holidays table).
//    ✅ Excludes employees on APPROVED LEAVE (leave_requests table).
//    ✅ Fail-loud on DB errors (never silently marks everyone absent).
//    ✅ Idempotent (re-runs won't duplicate rows).
//    ✅ IST-safe date boundaries for check_in_time.
//
// Schema assumptions (verified against your DB):
//    holidays(id uuid, holiday_date date, name text)
//    leave_requests(id uuid, employee_id uuid, leave_start_date date,
//                   leave_end_date date, status text)
//    employees(id uuid, name text, reporting_location text)
//    check_in_out(employee_id uuid, check_in_time timestamptz, ...)
//    attendance(employee_id uuid, attendance_date date, status text, ...)

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// ============================================
// SUPABASE CLIENT INIT
// ============================================
const supabaseUrl =
  process.env.SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY;

const isNode =
  typeof window === 'undefined' || typeof window.document === 'undefined';

let supabase;
if (isNode) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: WebSocket },
  });
  console.log('✅ Supabase client initialized for Node.js with WebSocket support');
} else {
  const { supabase: supabaseClient } = await import('./supabase');
  supabase = supabaseClient;
  console.log('✅ Supabase client initialized for browser');
}

// ============================================
// IST TIME HELPERS
// ============================================
const getTodayIST = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const getYesterdayIST = () => {
  // Use IST now → subtract 24h → format back in IST
  const now = new Date();
  const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return y.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const getCurrentTimeIST = () =>
  new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const getCurrentHourIST = () =>
  parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    })
  );

const getCurrentMinuteIST = () =>
  parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      minute: '2-digit',
    })
  );

// ============================================
// HOLIDAY CHECK
// Table: holidays(holiday_date date, name text)
// ============================================
const isHoliday = async (today) => {
  const { data, error } = await supabase
    .from('holidays')
    .select('id, name')
    .eq('holiday_date', today)
    .limit(1);

  if (error) {
    console.error('❌ Holiday check failed:', error);
    throw error; // fail loudly — do NOT silently mark everyone absent
  }

  const hol = data?.[0] || null;
  if (hol) console.log(`🎉 ${today} is a holiday (${hol.name})`);
  return !!hol;
};

// ============================================
// APPROVED LEAVE CHECK
// Table: leave_requests(employee_id, leave_start_date,
//                        leave_end_date, status)
// Status: 'Approved' (capital A — matches CHECK constraint)
// ============================================
const getEmployeesOnApprovedLeave = async (today) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('employee_id')
    .lte('leave_start_date', today) // leave started on/before today
    .gte('leave_end_date', today)   // leave ends on/after today
    .eq('status', 'Approved');      // exact casing from CHECK constraint

  if (error) {
    console.error('❌ Leave check failed:', error);
    throw error;
  }

  return new Set((data || []).map((l) => l.employee_id));
};

// ============================================
// MAIN SCHEDULER
// ============================================
export const runNightlyScheduler = async () => {
  console.log('🌙 Nightly scheduler starting...');
  console.log(`⏰ IST Time: ${getCurrentTimeIST()}`);
  console.log(`📅 IST Date: ${getTodayIST()}`);

  const hour = getCurrentHourIST();
  const minute = getCurrentMinuteIST();

  // Only run 11:55 PM – 11:59 PM IST.
  // Why not midnight? Because getTodayIST() would return the NEXT day.
  const inWindow = hour === 23 && minute >= 55;
  if (!inWindow) {
    console.log('⏰ Not in processing window (11:55 PM - 11:59 PM IST)');
    return { ran: false, reason: 'outside_window' };
  }

  try {
    const today = getTodayIST();
    const result = await markAbsentees(today);
    console.log('✅ Nightly scheduler completed');
    return { ran: true, ...result };
  } catch (error) {
    console.error('❌ Nightly scheduler failed:', error);
    throw error; // surface the failure
  }
};

// ============================================
// MARK ABSENTEES
// ============================================
const markAbsentees = async (today) => {
  console.log(`📝 Marking absentees for ${today}...`);

  // -------- 0a. HOLIDAY SHORT-CIRCUIT --------
  const holiday = await isHoliday(today);
  if (holiday) {
    console.log(`🎉 ${today} is a HOLIDAY — nobody will be marked absent.`);
    return { marked: 0, reason: 'holiday' };
  }

  // -------- 0b. EMPLOYEES ON APPROVED LEAVE --------
  const onLeaveIds = await getEmployeesOnApprovedLeave(today);
  console.log(`🏖️  Employees on approved leave today: ${onLeaveIds.size}`);

  // -------- 1. ALL EMPLOYEES --------
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, reporting_location');
  if (empErr) throw empErr;

  if (!employees?.length) {
    console.log('ℹ️  No employees found');
    return { marked: 0, reason: 'no_employees' };
  }

  // -------- 2. CHECK-INS TODAY (IST-safe UTC bounds) --------
  const dayStartUTC = new Date(`${today}T00:00:00+05:30`).toISOString();
  const dayEndUTC   = new Date(`${today}T23:59:59.999+05:30`).toISOString();

  const { data: checkIns, error: ciErr } = await supabase
    .from('check_in_out')
    .select('employee_id')
    .gte('check_in_time', dayStartUTC)
    .lte('check_in_time', dayEndUTC);
  if (ciErr) throw ciErr;

  const checkedInIds = new Set((checkIns || []).map((c) => c.employee_id));

  // -------- 3. EXISTING ATTENDANCE TODAY (idempotency) --------
  const { data: attRecords, error: attErr } = await supabase
    .from('attendance')
    .select('employee_id')
    .eq('attendance_date', today);
  if (attErr) throw attErr;

  const attendanceIds = new Set((attRecords || []).map((a) => a.employee_id));

  // -------- 4. COMPUTE ABSENTEES --------
  // Absent = NO check-in today
  //        + NO attendance row today
  //        + NOT on approved leave today
  const absentees = employees.filter(
    (emp) =>
      !checkedInIds.has(emp.id) &&
      !attendanceIds.has(emp.id) &&
      !onLeaveIds.has(emp.id)
  );

  if (!absentees.length) {
    console.log('✅ No absentees to mark');
    return { marked: 0, reason: 'none_absent' };
  }

  console.log(`📋 Marking ${absentees.length} employees as absent`);

  // -------- 5. BUILD RECORDS --------
  const stamp = getCurrentTimeIST();
  const records = absentees.map((emp) => ({
    employee_id: emp.id,
    employee_name: emp.name || 'Unknown',
    attendance_date: today,
    reporting_location: emp.reporting_location || 'Not specified',
    status: 'A',
    remarks: `Auto marked absent at ${stamp} IST - No check-in`,
    check_in_time: null,
    check_in_location: null,
    check_in_gps: null,
    check_out_time: null,
    check_out_location: null,
    check_out_gps: null,
    working_hours: 0,
    project1: null,
    project1_details: null,
    project2: null,
    project2_details: null,
    project3: null,
    project3_details: null,
    project4: null,
    project4_details: null,
    project5: null,
    project5_details: null,
    project6: null,
    project6_details: null,
  }));

  // -------- 6. BATCH INSERT (50 at a time) --------
  const BATCH = 50;
  let inserted = 0;
  const failures = [];

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);

    const { error } = await supabase.from('attendance').insert(batch);

    if (error) {
      // Tolerate duplicate key errors if a UNIQUE(employee_id, attendance_date)
      // constraint exists — they simply mean the row was already marked.
      if (error.code === '23505') {
        console.warn(`⚠️  Duplicate rows in batch ${i / BATCH + 1} — skipping`);
      } else {
        console.error(`❌ Batch ${i / BATCH + 1} insert error:`, error);
        failures.push(error.message);
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`✅ Marked ${inserted}/${records.length} employees absent`);

  if (failures.length) {
    throw new Error(
      `Partial failure: ${failures.length} batch(es) failed — ${failures.join('; ')}`
    );
  }

  return { marked: inserted, reason: 'ok' };
};

// ============================================
// MANUAL TRIGGER (for testing)
// Bypasses the 11:55 PM window.
// ============================================
export const triggerManually = async () => {
  console.log('🔄 Manual trigger...');
  return markAbsentees(getTodayIST());
};

// ============================================
// LEGACY EXPORTS
// ============================================
export const runAutoCheckOutAndAbsent = runNightlyScheduler;

export const setupScheduledJobs = () => {
  console.log('🕐 Scheduled jobs configured:');
  console.log('  - 11:55 PM IST: Mark absentees (NO auto check-out)');
  console.log('  - Holidays (holidays table): ENTIRE RUN SKIPPED');
  console.log('  - Approved leaves (leave_requests): employees EXCLUDED');
  console.log(`  - Current IST: ${getCurrentTimeIST()}`);
};

export default {
  runNightlyScheduler,
  triggerManually,
  setupScheduledJobs,
};