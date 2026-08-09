// src/services/scheduledJobs.js
import { supabase } from './supabase';

// ✅ Helper: Get current location for auto check-out
export const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: '0', lng: '0', address: 'Location unavailable' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: { 'User-Agent': 'VisionEarthHRMS/1.0' }
            }
          );
          const data = await response.json();
          const address = data?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          resolve({ lat: latitude, lng: longitude, address });
        } catch (err) {
          resolve({ lat: latitude, lng: longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
        }
      },
      (error) => {
        resolve({ lat: '0', lng: '0', address: 'Location unavailable' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// ✅ Check if employee has completed FULL attendance process
export const hasCompletedFullAttendance = async (employeeId, date) => {
  try {
    const { data: checkInData, error: checkInError } = await supabase
      .from('check_in_out')
      .select('id, check_in_time, check_out_time, check_in_address, check_out_address, working_hours')
      .eq('employee_id', employeeId)
      .gte('check_in_time', date)
      .lte('check_in_time', date + 'T23:59:59.999Z')
      .maybeSingle();

    if (checkInError || !checkInData) {
      return { completed: false, reason: 'No check-in found' };
    }

    if (!checkInData.check_out_time) {
      return { completed: false, reason: 'No check-out found' };
    }

    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('id, project1, project2, project3, reporting_location, status')
      .eq('employee_id', employeeId)
      .eq('attendance_date', date)
      .maybeSingle();

    if (attError || !attData) {
      return { completed: false, reason: 'Attendance form not submitted' };
    }

    const hasProject = attData.project1 || attData.project2 || attData.project3;
    if (!hasProject) {
      return { completed: false, reason: 'No projects added' };
    }

    return { 
      completed: true, 
      checkInData, 
      attData,
      reason: 'Full process completed' 
    };
  } catch (error) {
    console.error('Error checking full attendance:', error);
    return { completed: false, reason: 'Error checking' };
  }
};

// ✅ Process approved leaves - ONLY if full process NOT completed
export const processApprovedLeaves = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: approvedLeaves, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'Approved')
      .lte('leave_start_date', today)
      .gte('leave_end_date', today);
    
    if (leaveError) throw leaveError;
    
    if (approvedLeaves && approvedLeaves.length > 0) {
      console.log(`📅 Processing ${approvedLeaves.length} approved leaves for today`);
      
      for (const leave of approvedLeaves) {
        const fullAttendance = await hasCompletedFullAttendance(leave.employee_id, today);
        
        if (!fullAttendance.completed) {
          const { data: existingAtt } = await supabase
            .from('attendance')
            .select('id, status')
            .eq('employee_id', leave.employee_id)
            .eq('attendance_date', today)
            .maybeSingle();
          
          if (existingAtt) {
            await supabase
              .from('attendance')
              .update({
                status: 'L',
                remarks: `Approved leave: ${leave.leave_type}`
              })
              .eq('id', existingAtt.id);
            console.log(`📅 Marked Leave (L) for ${leave.employee_id}`);
          } else {
            const { data: empData } = await supabase
              .from('employees')
              .select('name')
              .eq('id', leave.employee_id)
              .single();
            
            await supabase
              .from('attendance')
              .insert({
                employee_id: leave.employee_id,
                employee_name: empData?.name || 'Employee',
                attendance_date: today,
                status: 'L',
                reporting_location: 'Leave',
                remarks: `Approved leave: ${leave.leave_type}`
              });
            console.log(`📅 Marked Leave (L) for ${empData?.name}`);
          }
        } else {
          console.log(`✅ Employee ${leave.employee_id} completed full process, keeping as Present (P)`);
        }
      }
    }
    
    return { success: true, processed: approvedLeaves?.length || 0 };
  } catch (error) {
    console.error('Error in processApprovedLeaves:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Auto Check-Out with current location and ACO flag
export const autoCheckOutEmployees = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const endOfDay = new Date(today + 'T23:59:59.999Z').toISOString();
    
    const currentLocation = await getCurrentLocation();
    const locationAddress = currentLocation.address;
    const locationGps = `${currentLocation.lat},${currentLocation.lng}`;
    
    const { data: checkIns, error } = await supabase
      .from('check_in_out')
      .select('*')
      .eq('status', 'Checked In')
      .gte('check_in_time', today)
      .is('check_out_time', null);
    
    if (error) throw error;
    
    if (checkIns && checkIns.length > 0) {
      console.log(`🔄 Auto check-out for ${checkIns.length} employees with current location`);
      
      for (const checkIn of checkIns) {
        const checkInTime = new Date(checkIn.check_in_time);
        const checkOutTime = new Date(endOfDay);
        const diffMs = checkOutTime - checkInTime;
        const diffHrs = Math.round((diffMs / 3600000) * 100) / 100;
        
        await supabase
          .from('check_in_out')
          .update({
            check_out_time: endOfDay,
            check_out_gps: locationGps,
            check_out_address: locationAddress || 'Auto checkout at EOD',
            working_hours: diffHrs,
            status: 'Checked Out (Auto)',
            aco_filled: false
          })
          .eq('id', checkIn.id);
        
        console.log(`🔄 Auto check-out completed for ${checkIn.employee_id} (ACO - Not filled yet)`);
      }
    }
    
    return { success: true, processed: checkIns?.length || 0 };
  } catch (error) {
    console.error('Error in autoCheckOutEmployees:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Auto Mark Present (P) when full process is completed
export const autoMarkPresent = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: checkIns, error } = await supabase
      .from('check_in_out')
      .select('employee_id, check_in_time, check_out_time, check_in_address, check_out_address, working_hours')
      .gte('check_in_time', today)
      .lte('check_in_time', today + 'T23:59:59.999Z');
    
    if (error) throw error;
    
    const processedEmployees = [];
    
    for (const checkIn of checkIns) {
      const fullAttendance = await hasCompletedFullAttendance(checkIn.employee_id, today);
      
      if (fullAttendance.completed) {
        const { data: existingAtt } = await supabase
          .from('attendance')
          .select('id, status')
          .eq('employee_id', checkIn.employee_id)
          .eq('attendance_date', today)
          .maybeSingle();
        
        if (existingAtt && existingAtt.status !== 'P' && existingAtt.status !== 'Present') {
          await supabase
            .from('attendance')
            .update({
              status: 'P',
              remarks: 'Full process completed'
            })
            .eq('id', existingAtt.id);
          processedEmployees.push(checkIn.employee_id);
          console.log(`✅ Marked Present (P) for employee ${checkIn.employee_id}`);
        }
      }
    }
    
    return { success: true, processed: processedEmployees.length };
  } catch (error) {
    console.error('Error in autoMarkPresent:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Auto Mark Absent or Leave
export const autoMarkAbsentOrLeave = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('status', 'active');
    
    if (empError) throw empError;
    
    const { data: existingAttendance, error: attError } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .eq('attendance_date', today);
    
    if (attError) throw attError;
    
    const existingMap = new Map();
    existingAttendance?.forEach(a => {
      existingMap.set(a.employee_id, a.status);
    });
    
    const employeesToProcess = employees?.filter(emp => !existingMap.has(emp.id)) || [];
    
    if (employeesToProcess.length > 0) {
      console.log(`❌ Processing ${employeesToProcess.length} employees without attendance`);
      
      for (const emp of employeesToProcess) {
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', emp.id)
          .eq('status', 'Approved')
          .lte('leave_start_date', today)
          .gte('leave_end_date', today);
        
        if (leaveData && leaveData.length > 0) {
          await supabase
            .from('attendance')
            .insert({
              employee_id: emp.id,
              employee_name: emp.name,
              attendance_date: today,
              status: 'L',
              reporting_location: 'Leave',
              remarks: 'Approved leave'
            });
          console.log(`📅 Marked Leave (L) for ${emp.name}`);
        } else {
          await supabase
            .from('attendance')
            .insert({
              employee_id: emp.id,
              employee_name: emp.name,
              attendance_date: today,
              status: 'A',
              reporting_location: 'N/A',
              remarks: 'Auto marked absent'
            });
          console.log(`❌ Marked Absent (A) for ${emp.name}`);
        }
      }
    }
    
    return { success: true, processed: employeesToProcess.length };
  } catch (error) {
    console.error('Error in autoMarkAbsentOrLeave:', error);
    return { success: false, error: error.message };
  }
};

// ✅ MAIN JOB
export const runEndOfDayJobs = async () => {
  console.log('🌙 Running end of day jobs...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  
  const results = {
    processLeaves: null,
    autoCheckOut: null,
    autoMarkPresent: null,
    autoMarkAbsentOrLeave: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    console.log('✅ Step 1: Marking Present (P) for full process...');
    results.autoMarkPresent = await autoMarkPresent();
    
    console.log('📅 Step 2: Processing approved leaves...');
    results.processLeaves = await processApprovedLeaves();
    
    console.log('🔄 Step 3: Auto check-out with current location...');
    results.autoCheckOut = await autoCheckOutEmployees();
    
    console.log('❌ Step 4: Marking absent/leave...');
    results.autoMarkAbsentOrLeave = await autoMarkAbsentOrLeave();
    
    console.log('✅ End of day jobs completed!');
    console.log('📊 Results:', results);
    
    return results;
  } catch (error) {
    console.error('Error in runEndOfDayJobs:', error);
    results.error = error.message;
    return results;
  }
};

// ✅ Schedule jobs
export const scheduleEndOfDayJob = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  console.log(`⏰ Scheduling end-of-day job in ${Math.round(timeUntilMidnight / 60000)} minutes`);
  
  setTimeout(() => {
    runEndOfDayJobs();
    scheduleEndOfDayJob();
  }, timeUntilMidnight);
  
  setInterval(async () => {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    if (currentHour >= 0 && currentHour <= 23) {
      console.log('🔄 Running periodic check for full process...');
      await autoMarkPresent();
    }
    
    if (currentHour >= 0 && currentHour <= 23) {
      console.log('🔄 Running periodic check for leaves...');
      await processApprovedLeaves();
    }
    
    if (currentHour >= 18 && currentHour < 23) {
      console.log('🔄 Running auto check-out check...');
      await autoCheckOutEmployees();
    }
    
    if (currentHour === 23 && currentMinute === 30) {
      console.log('🔄 Running final end-of-day check...');
      await runEndOfDayJobs();
    }
  }, 30000);
};