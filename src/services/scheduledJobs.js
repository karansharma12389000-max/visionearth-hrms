// src/services/scheduledJobs.js

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws'; // Add this for Node.js

// Get Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Check if running in Node.js
const isNode = typeof window === 'undefined' || typeof window.document === 'undefined';

// Create Supabase client with WebSocket support for Node.js
let supabase;

if (isNode) {
  // Node.js environment - use ws package
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: WebSocket
    }
  });
  console.log('✅ Supabase client initialized for Node.js with WebSocket support');
} else {
  // Browser environment
  const { supabase: supabaseClient } = await import('./supabase');
  supabase = supabaseClient;
  console.log('✅ Supabase client initialized for browser');
}

// ============================================
// IST TIMEZONE HELPERS
// ============================================

// Get current date in IST
const getTodayIST = () => {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toISOString().split('T')[0];
};

// Get current time in IST (HH:MM:SS)
const getCurrentTimeIST = () => {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toTimeString().slice(0, 8);
};

// Get current hour in IST (24-hour format)
const getCurrentHourIST = () => {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return parseInt(istDate.toTimeString().slice(0, 2));
};

// Get current minute in IST
const getCurrentMinuteIST = () => {
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return parseInt(istDate.toTimeString().slice(3, 5));
};

// Format date in IST
const formatDateIST = (date) => {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toISOString().split('T')[0];
};

// Format time in IST (HH:MM:SS)
const formatTimeIST = (date) => {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toTimeString().slice(0, 8);
};

// Get IST datetime for any given date/time
const getISTDateTime = (date, hour = 23, minute = 59, second = 0) => {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  istDate.setHours(hour, minute, second, 0);
  return istDate;
};

// Check if current time is between 11:55 PM and 12:05 AM IST
const isProcessingWindow = () => {
  const hour = getCurrentHourIST();
  const minute = getCurrentMinuteIST();
  
  // 11:55 PM to 11:59 PM
  if (hour === 23 && minute >= 55) return true;
  // 12:00 AM to 12:05 AM
  if (hour === 0 && minute <= 5) return true;
  
  return false;
};

// ============================================
// MAIN FUNCTIONS
// ============================================

// Main ACO and Absent Scheduler
export const runAutoCheckOutAndAbsent = async () => {
  console.log('🔄 Running Auto Check-Out and Absent Scheduler...');
  console.log(`⏰ Current IST Time: ${getCurrentTimeIST()}`);
  console.log(`📅 Current IST Date: ${getTodayIST()}`);

  try {
    // Check if we're in the processing window
    if (!isProcessingWindow()) {
      console.log('⏰ Not in processing window (11:55 PM - 12:05 AM IST).');
      console.log(`⏰ Current time: ${getCurrentTimeIST()} IST`);
      console.log('⏰ Processing window: 11:55 PM - 12:05 AM IST');
      return;
    }

    const today = getTodayIST();
    console.log(`📅 Processing for date: ${today}`);

    // --- PART 1: Auto Check-Out ---
    await processAutoCheckOut(today);
    
    // --- PART 2: Mark Absent ---
    await processAbsent(today);
    
    console.log('✅ Auto Check-Out and Absent processing completed successfully!');
    console.log(`✅ Completed at: ${getCurrentTimeIST()} IST`);
    
  } catch (error) {
    console.error('❌ Error in Auto Check-Out and Absent scheduler:', error);
    throw error;
  }
};

// ============================================
// PART 1: Auto Check-Out Processing
// ============================================

const processAutoCheckOut = async (today) => {
  console.log('📤 Processing Auto Check-Out...');
  console.log(`📤 Processing for date: ${today}`);

  try {
    // Find all employees who checked in today but haven't checked out
    const { data: activeCheckIns, error } = await supabase
      .from('check_in_out')
      .select(`
        id,
        employee_id,
        check_in_time,
        check_in_gps,
        check_in_address,
        employees (
          name,
          reporting_location
        )
      `)
      .gte('check_in_time', today + 'T00:00:00.000Z')
      .lte('check_in_time', today + 'T23:59:59.999Z')
      .is('check_out_time', null)
      .neq('status', 'Checked Out (Auto)');

    if (error) {
      console.error('❌ Error fetching active check-ins:', error);
      return;
    }

    if (!activeCheckIns || activeCheckIns.length === 0) {
      console.log('✅ No active check-ins found for auto check-out');
      return;
    }

    console.log(`📋 Found ${activeCheckIns.length} active check-ins to auto check-out`);

    let successCount = 0;
    let errorCount = 0;

    // Process each active check-in
    for (const checkIn of activeCheckIns) {
      try {
        const checkInDate = new Date(checkIn.check_in_time);
        
        // Set auto check-out time to 11:59 PM IST on the same day
        const autoCheckOutTime = getISTDateTime(checkInDate, 23, 59, 0);

        // Calculate working hours (from check-in to 11:59 PM IST)
        const diffMs = autoCheckOutTime.getTime() - checkInDate.getTime();
        const workingHours = Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);

        // Auto check-out the employee
        const { error: updateError } = await supabase
          .from('check_in_out')
          .update({
            check_out_time: autoCheckOutTime.toISOString(),
            check_out_gps: checkIn.check_in_gps || 'Auto captured',
            check_out_address: checkIn.check_in_address || 'Auto check-out at 11:59 PM IST',
            working_hours: workingHours,
            status: 'Checked Out (Auto)',
            aco_filled: false
          })
          .eq('id', checkIn.id);

        if (updateError) {
          console.error(`❌ Error auto checking out employee ${checkIn.employee_id}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`✅ Auto checked out employee ${checkIn.employee_id} at ${formatTimeIST(autoCheckOutTime)} IST with ${workingHours}h`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing check-in ${checkIn.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Auto Check-Out completed: ${successCount} successful, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in processAutoCheckOut:', error);
  }
};

// ============================================
// PART 2: Mark Absent
// ============================================

const processAbsent = async (today) => {
  console.log('📝 Processing Absent marking...');
  console.log(`📝 Processing for date: ${today}`);

  try {
    // Get all employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, reporting_location');

    if (empError) {
      console.error('❌ Error fetching employees:', empError);
      return;
    }

    if (!employees || employees.length === 0) {
      console.log('✅ No employees found');
      return;
    }

    console.log(`📋 Found ${employees.length} employees`);

    // Get employees who checked in today (including auto check-outs)
    const { data: checkedInEmployees, error: checkError } = await supabase
      .from('check_in_out')
      .select('employee_id')
      .gte('check_in_time', today + 'T00:00:00.000Z')
      .lte('check_in_time', today + 'T23:59:59.999Z');

    if (checkError) {
      console.error('❌ Error fetching checked-in employees:', checkError);
      return;
    }

    const checkedInIds = new Set(checkedInEmployees?.map(c => c.employee_id) || []);
    console.log(`📋 ${checkedInIds.size} employees checked in today`);

    // Get employees who already have attendance marked
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance')
      .select('employee_id')
      .eq('attendance_date', today);

    if (attError) {
      console.error('❌ Error fetching attendance records:', attError);
      return;
    }

    const attendanceIds = new Set(attendanceRecords?.map(a => a.employee_id) || []);
    console.log(`📋 ${attendanceIds.size} employees already have attendance`);

    // Find employees who need to be marked absent
    const absentEmployees = employees?.filter(emp => 
      !checkedInIds.has(emp.id) && !attendanceIds.has(emp.id)
    ) || [];

    if (absentEmployees.length === 0) {
      console.log('✅ No employees to mark absent');
      return;
    }

    console.log(`📋 Found ${absentEmployees.length} employees to mark absent`);

    // Mark absent for each employee
    const absentRecords = absentEmployees.map(emp => ({
      employee_id: emp.id,
      employee_name: emp.name || 'Unknown',
      attendance_date: today,
      reporting_location: emp.reporting_location || 'Not specified',
      status: 'A',
      remarks: `Auto marked absent at ${getCurrentTimeIST()} IST - No check-in recorded`,
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
      project6_details: null
    }));

    // Insert absent records in batches
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < absentRecords.length; i += batchSize) {
      const batch = absentRecords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(batch);

      if (insertError) {
        console.error('❌ Error marking absent records:', insertError);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Marked ${batch.length} employees as absent`);
      }
    }

    console.log(`✅ Absent marking completed: ${insertedCount} employees marked absent`);

  } catch (error) {
    console.error('❌ Error in processAbsent:', error);
  }
};

// ============================================
// ACO Fill Function
// ============================================

export const fillACOAttendance = async (employeeId, acoDate, formData) => {
  try {
    console.log(`📝 Filling ACO attendance for employee ${employeeId} on ${acoDate}`);
    
    // Get the auto check-out record
    const { data: checkInData, error: checkError } = await supabase
      .from('check_in_out')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'Checked Out (Auto)')
      .eq('aco_filled', false)
      .gte('check_in_time', acoDate + 'T00:00:00.000Z')
      .lte('check_in_time', acoDate + 'T23:59:59.999Z')
      .maybeSingle();

    if (checkError || !checkInData) {
      throw new Error('No ACO record found for this date');
    }

    // Determine status based on submission time (IST)
    const now = new Date();
    const checkInDate = new Date(checkInData.check_in_time);
    const nextDay10AM = new Date(checkInDate);
    nextDay10AM.setDate(checkInDate.getDate() + 1);
    nextDay10AM.setHours(10, 0, 0, 0);
    
    const hoursDiff = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
    
    let status = '';
    let statusLabel = '';
    
    if (now <= nextDay10AM) {
      status = 'P';
      statusLabel = 'Present';
    } else if (hoursDiff <= 72) {
      status = 'D';
      statusLabel = 'Delayed';
    } else {
      status = 'B';
      statusLabel = 'Beyond Delay';
    }

    console.log(`📝 ACO status: ${statusLabel} (${status})`);

    // Create attendance record
    const attendanceData = {
      employee_id: employeeId,
      employee_name: formData.employeeName || 'Unknown',
      attendance_date: acoDate,
      reporting_location: formData.reportingLocation,
      check_in_time: new Date(checkInData.check_in_time).toTimeString().slice(0, 8),
      check_in_location: checkInData.check_in_address || null,
      check_in_gps: checkInData.check_in_gps || null,
      check_out_time: checkInData.check_out_time ? new Date(checkInData.check_out_time).toTimeString().slice(0, 8) : null,
      check_out_location: checkInData.check_out_address || null,
      check_out_gps: checkInData.check_out_gps || null,
      working_hours: checkInData.working_hours || 0,
      status: status,
      remarks: formData.remarks || `ACO attendance - ${statusLabel} (filled at ${getCurrentTimeIST()} IST)`,
      project1: formData.project1 || null,
      project1_details: formData.project1_details || null,
      project2: formData.project2 || null,
      project2_details: formData.project2_details || null,
      project3: formData.project3 || null,
      project3_details: formData.project3_details || null,
      project4: formData.project4 || null,
      project4_details: formData.project4_details || null,
      project5: formData.project5 || null,
      project5_details: formData.project5_details || null,
      project6: formData.project6 || null,
      project6_details: formData.project6_details || null
    };

    // Save attendance record
    const { error: insertError } = await supabase
      .from('attendance')
      .insert(attendanceData);

    if (insertError) throw insertError;

    // Mark ACO as filled
    await supabase
      .from('check_in_out')
      .update({ aco_filled: true })
      .eq('id', checkInData.id);

    console.log(`✅ ACO attendance filled successfully: ${statusLabel}`);
    return { success: true, status, statusLabel };

  } catch (error) {
    console.error('❌ Error filling ACO attendance:', error);
    throw error;
  }
};

// ============================================
// Manual Trigger Function (for testing)
// ============================================

export const triggerManually = async () => {
  console.log('🔄 Manual trigger initiated...');
  console.log(`⏰ Current IST Time: ${getCurrentTimeIST()}`);
  console.log(`📅 Current IST Date: ${getTodayIST()}`);
  
  await runAutoCheckOutAndAbsent();
};

// ============================================
// Setup Logging
// ============================================

export const setupScheduledJobs = () => {
  console.log('🕐 Setting up scheduled jobs...');
  console.log('⏰ Scheduled jobs configured (IST Timezone):');
  console.log('  - 11:55 PM IST: Auto Check-Out & Absent marking');
  console.log('  - 12:05 AM IST: Finalize attendance');
  console.log(`⏰ Current IST Time: ${getCurrentTimeIST()}`);
};