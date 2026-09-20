// src/services/scheduledJobs.js
//
// Nightly scheduler — marks absentees only.
// NO auto-checkout.
//
// Runs at 11:55 PM IST and marks absent only for TODAY.

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

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
const getTodayIST = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const getCurrentTimeIST = () => {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const getCurrentHourIST = () => {
  return parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    })
  );
};

const getCurrentMinuteIST = () => {
  return parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      minute: '2-digit',
    })
  );
};

// ============================================
// MAIN SCHEDULER
// ============================================
/**
 * ✅ FIXED: Only runs at exactly 11:55 PM IST.
 *
 * Why only 11:55 PM?
 *   - At 11:55 PM IST, `getTodayIST()` returns the correct current day
 *   - At 12:00 AM IST, `getTodayIST()` returns the NEXT day → bug
 *
 * What it does:
 *   1. ✅ Marks absent for employees who never checked in TODAY
 *   2. ❌ No auto check-out
 */
export const runNightlyScheduler = async () => {
  console.log('🌙 Nightly scheduler starting...');
  console.log(`⏰ IST Time: ${getCurrentTimeIST()}`);
  console.log(`📅 IST Date: ${getTodayIST()}`);

  try {
    // ✅ Only run at exactly 11:55 PM IST (not at 12:00 AM)
    const hour = getCurrentHourIST();
    const minute = getCurrentMinuteIST();

    const inWindow = hour === 23 && minute >= 55;

    if (!inWindow) {
      console.log('⏰ Not in processing window (11:55 PM - 11:59 PM IST)');
      return;
    }

    const today = getTodayIST();

    // ✅ Marks absent for TODAY (Nov 18 at 11:55 PM → marks Nov 18)
    await markAbsentees(today);

    console.log('✅ Nightly scheduler completed');
  } catch (error) {
    console.error('❌ Nightly scheduler failed:', error);
    throw error;
  }
};

// ============================================
// MARK ABSENTEES
// ============================================
const markAbsentees = async (today) => {
  console.log(`📝 Marking absentees for ${today}...`);

  try {
    // 1. Get all employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, reporting_location');
    if (empErr) throw empErr;
    if (!employees?.length) {
      console.log('No employees found');
      return;
    }

    // 2. Get employees who checked in today (any status) — ✅ IST-safe bounds
    //    Compute UTC boundaries that cover the full IST day (00:00 – 23:59:59.999 IST)
    const dayStartUTC = new Date(`${today}T00:00:00+05:30`).toISOString();
    const dayEndUTC = new Date(`${today}T23:59:59.999+05:30`).toISOString();

    const { data: checkIns, error: ciErr } = await supabase
      .from('check_in_out')
      .select('employee_id')
      .gte('check_in_time', dayStartUTC)
      .lte('check_in_time', dayEndUTC);
    if (ciErr) throw ciErr;

    const checkedInIds = new Set((checkIns || []).map((c) => c.employee_id));

    // 3. Get employees who already have attendance records today
    const { data: attRecords, error: attErr } = await supabase
      .from('attendance')
      .select('employee_id')
      .eq('attendance_date', today);
    if (attErr) throw attErr;

    const attendanceIds = new Set((attRecords || []).map((a) => a.employee_id));

    // 4. Find employees who never checked in AND have no attendance
    const absentees = employees.filter(
      (emp) => !checkedInIds.has(emp.id) && !attendanceIds.has(emp.id)
    );

    if (!absentees.length) {
      console.log('✅ No absentees to mark');
      return;
    }

    console.log(`📋 Marking ${absentees.length} employees as absent`);

    // 5. Build records
    const records = absentees.map((emp) => ({
      employee_id: emp.id,
      employee_name: emp.name || 'Unknown',
      attendance_date: today,
      reporting_location: emp.reporting_location || 'Not specified',
      status: 'A',
      remarks: `Auto marked absent at ${getCurrentTimeIST()} IST - No check-in`,
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

    // 6. Insert in batches
    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await supabase.from('attendance').insert(batch);
      if (error) {
        console.error('Batch insert error:', error);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`✅ Marked ${inserted} employees absent`);
  } catch (error) {
    console.error('❌ markAbsentees error:', error);
  }
};

// ============================================
// MANUAL TRIGGER (for testing)
// ============================================
export const triggerManually = async () => {
  console.log('🔄 Manual trigger...');
  await markAbsentees(getTodayIST());
};

// ============================================
// LEGACY EXPORTS
// ============================================
export const runAutoCheckOutAndAbsent = runNightlyScheduler;
export const setupScheduledJobs = () => {
  console.log('🕐 Scheduled jobs configured:');
  console.log('  - 11:55 PM IST: Mark absentees (NO auto check-out)');
  console.log(`  - Current IST: ${getCurrentTimeIST()}`);
};

export default {
  runNightlyScheduler,
  triggerManually,
  setupScheduledJobs,
};