// frontend/src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

// ============================================
// 🔑 SUPABASE CREDENTIALS
// ============================================
const supabaseUrl = 'https://oablorvlulbsdftexdmg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYmxvcnZsdWxic2RmdGV4ZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTc4ODQsImV4cCI6MjEwMTA3Mzg4NH0.mIU4gg0wtZifUk36vkhdMvnRPwum-bhH-hKXMVvBsrs'

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Connected')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// HELPER: Get Employee by Email (SIMPLIFIED)
// ============================================
const getEmployeeByEmail = async (email) => {
  try {
    console.log('🔍 Looking for employee with email:', email)
    
    // Direct query - this is the simplest way
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) {
      // If no employee found, .single() returns error with code 'PGRST116'
      if (error.code === 'PGRST116') {
        console.log('❌ No employee found with email:', email)
        return null
      }
      console.error('❌ Database error:', error)
      return null
    }
    
    console.log('✅ Employee found:', data.name)
    return data
  } catch (error) {
    console.error('❌ Error in getEmployeeByEmail:', error)
    return null
  }
}

// ============================================
// AUTH FUNCTIONS
// ============================================

export const loginUser = async (email, password) => {
  try {
    console.log('🔐 Attempting login for:', email)
    
    const employee = await getEmployeeByEmail(email)
    
    if (!employee) {
      return { ok: false, message: 'Invalid email or password' }
    }
    
    // Check password (plain text for demo)
    if (employee.password_hash !== password) {
      console.log('❌ Password mismatch for:', email)
      return { ok: false, message: 'Invalid email or password' }
    }
    
    console.log('✅ Login successful for:', email)
    
    return {
      ok: true,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role || 'Employee',
        department: employee.department || 'N/A',
        designation: employee.designation || 'N/A',
        reporting_location: employee.reporting_location || 'Head Office',
        phone: employee.phone || 'N/A'
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { ok: false, message: error.message }
  }
}

export const changePassword = async (email, oldPassword, newPassword) => {
  try {
    const employee = await getEmployeeByEmail(email)
    
    if (!employee) {
      return { ok: false, message: 'Employee not found' }
    }
    
    // ✅ FIX: verify the current password before allowing the change
    if (employee.password_hash !== oldPassword) {
      console.log('❌ Old password mismatch for:', email)
      return { ok: false, message: 'Current password is incorrect' }
    }
    
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password_hash: newPassword })
      .eq('id', employee.id)
    
    if (updateError) {
      return { ok: false, message: updateError.message }
    }
    
    return { ok: true, message: 'Password changed successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return { ok: false, message: error.message }
  }
}

// ============================================
// EMPLOYEE FUNCTIONS
// ============================================

export const getEmployeeData = async (email) => {
  const employee = await getEmployeeByEmail(email)
  if (!employee) throw new Error('Employee not found')
  return employee
}

export const getAllEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching all employees:', error)
    return []
  }
}

// ============================================
// ATTENDANCE FUNCTIONS
// ============================================

export const getEmployeeAttendance = async (email) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) return []
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .order('attendance_date', { ascending: false })
    
    if (error) {
      console.error('Attendance query error:', error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return []
  }
}

export const submitAttendance = async (data) => {
  try {
    const employee = await getEmployeeByEmail(data.email)
    if (!employee) throw new Error('Employee not found')
    
    const attendanceData = {
      employee_id: employee.id,
      attendance_date: data.attendanceDate || new Date().toISOString().split('T')[0],
      check_in_time: data.checkInTime || null,
      check_out_time: data.checkOutTime || null,
      status: data.status || 'P',
      reporting_location: data.reportingLocation || employee.reporting_location,
      project: data.project || null,
      remarks: data.remarks || null
    }
    
    const { data: result, error } = await supabase
      .from('attendance')
      .insert(attendanceData)
      .select()
      .single()
    
    if (error) throw error
    return result
  } catch (error) {
    console.error('Error submitting attendance:', error)
    throw error
  }
}

export const submitPreviousDayAttendance = async (data) => {
  try {
    const employee = await getEmployeeByEmail(data.email)
    if (!employee) throw new Error('Employee not found')
    
    const { data: existing, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('attendance_date', data.attendanceDate)
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }
    
    const attendanceData = {
      employee_id: employee.id,
      attendance_date: data.attendanceDate,
      status: data.status || 'P',
      reporting_location: data.reportingLocation || employee.reporting_location,
      project: data.project || null,
      remarks: data.remarks || null,
      check_in_time: data.checkInTime || null,
      check_out_time: data.checkOutTime || null
    }
    
    if (existing) {
      const { data: updated, error } = await supabase
        .from('attendance')
        .update(attendanceData)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return updated
    } else {
      const { data: inserted, error } = await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single()
      
      if (error) throw error
      return inserted
    }
  } catch (error) {
    console.error('Error submitting previous day attendance:', error)
    throw error
  }
}

// ============================================
// CHECK IN/OUT FUNCTIONS
// ============================================

export const checkIn = async (email, gps, ip, locationName) => {
  try {
    console.log('📍 Checking in for:', email)
    
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      console.log('❌ Employee not found for check-in')
      return { ok: false, message: 'Employee not found' }
    }
    
    console.log('✅ Employee found:', employee.name, 'ID:', employee.id)
    
    const now = new Date()
    // ✅ FIX: derive IST date and time directly from IST calendar
    const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // "YYYY-MM-DD"
    const istTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }) // "HH:MM:SS"
    
    // Insert into check_in_out
    const { data, error } = await supabase
      .from('check_in_out')
      .insert({
        employee_id: employee.id,
        check_in_time: now.toISOString(),
        check_in_gps: gps,
        check_in_ip: ip,
        check_in_address: locationName,
        status: 'Checked In'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Check-in insert error:', error)
      return { ok: false, message: error.message }
    }
    
    console.log('✅ Check-in record created')
    
    // Also create attendance record
    const { error: attError } = await supabase
      .from('attendance')
      .insert({
        employee_id: employee.id,
        attendance_date: istDate,
        check_in_time: istTime,
        check_in_location: locationName,
        check_in_gps: gps,
        status: 'P',
        reporting_location: employee.reporting_location || locationName
      })
    
    if (attError) {
      console.error('⚠️ Attendance creation error (non-critical):', attError)
    }
    
    return { 
      ok: true, 
      message: `Checked in at ${istTime}`,
      time: istTime,
      status: 'Checked In',
      employeeId: employee.employee_id,
      employeeName: employee.name,
      locationName: locationName
    }
  } catch (error) {
    console.error('❌ Check-in error:', error)
    return { ok: false, message: error.message }
  }
}

export const checkOut = async (email, gps, ip, locationName, attendanceData) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) return { ok: false, message: 'Employee not found' }
    
    // Find active check-in
    const { data: checkIn, error: findError } = await supabase
      .from('check_in_out')
      .select('*')
      .eq('employee_id', employee.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (findError) {
      console.error('Find active check-in error:', findError)
      return { ok: false, message: 'Error finding active check-in' }
    }
    
    if (!checkIn) {
      return { ok: false, message: 'No active check-in found' }
    }
    
    const now = new Date()
    const checkInTime = new Date(checkIn.check_in_time)
    const diffMs = now - checkInTime
    const diffHrs = Math.round((diffMs / 3600000) * 100) / 100
    
    // ✅ FIX: derive IST date and time
    const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const istTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
    
    // Update check_in_out record
    const { data, error } = await supabase
      .from('check_in_out')
      .update({
        check_out_time: now.toISOString(),
        check_out_gps: gps,
        check_out_ip: ip,
        check_out_address: locationName,
        working_hours: diffHrs,
        status: 'Checked Out'
      })
      .eq('id', checkIn.id)
      .select()
      .single()
    
    if (error) throw error
    
    // Update attendance record — ✅ FIX: use IST date for the WHERE clause
    await supabase
      .from('attendance')
      .update({
        check_out_time: istTime,
        check_out_location: locationName,
        check_out_gps: gps,
        working_hours: diffHrs,
        status: attendanceData?.status || 'P'
      })
      .eq('employee_id', employee.id)
      .eq('attendance_date', istDate)
    
    return { 
      ok: true, 
      message: `Checked out at ${istTime} - ${diffHrs} hrs`,
      time: istTime,
      totalHours: diffHrs,
      status: 'Checked Out'
    }
  } catch (error) {
    console.error('Check-out error:', error)
    return { ok: false, message: error.message }
  }
}

export const getTodayCheckinStatus = async (email) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) return { status: 'Not Checked In' }
    
    // ✅ FIX: IST-anchored UTC bounds
    const now = new Date()
    const istDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const dayStartUTC = new Date(`${istDate}T00:00:00+05:30`).toISOString()
    const dayEndUTC = new Date(`${istDate}T23:59:59.999+05:30`).toISOString()
    
    const { data, error } = await supabase
      .from('check_in_out')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('check_in_time', dayStartUTC)
      .lte('check_in_time', dayEndUTC)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Check-in status error:', error)
      return { status: 'Not Checked In' }
    }
    
    if (!data) {
      return { status: 'Not Checked In' }
    }
    
    if (!data.check_out_time) {
      return { 
        status: 'Checked In',
        checkIn: data.check_in_time,
        checkInLocation: data.check_in_address
      }
    }
    
    return { 
      status: 'Checked Out',
      checkIn: data.check_in_time,
      checkOut: data.check_out_time,
      totalHours: data.working_hours
    }
  } catch (error) {
    console.error('Error getting check-in status:', error)
    return { status: 'Not Checked In' }
  }
}

export const getCheckInHistory = async (email, month, year) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) return []
    
    // ✅ FIX: IST-anchored month range + zero-padded last day
    const mm = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const dd = String(lastDay).padStart(2, '0')
    const monthStartUTC = new Date(`${year}-${mm}-01T00:00:00+05:30`).toISOString()
    const monthEndUTC = new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`).toISOString()
    
    const { data, error } = await supabase
      .from('check_in_out')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('check_in_time', monthStartUTC)
      .lte('check_in_time', monthEndUTC)
      .order('check_in_time', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching check-in history:', error)
    return []
  }
}

// ============================================
// LEAVE FUNCTIONS
// ============================================

export const submitLeave = async (leaveData) => {
  try {
    const employee = await getEmployeeByEmail(leaveData.email)
    if (!employee) return { ok: false, message: 'Employee not found' }
    
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employee.id,
        leave_type: leaveData.leaveType,
        leave_start_date: leaveData.fromDate,
        leave_end_date: leaveData.toDate,
        reason: leaveData.reason,
        status: 'Pending'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { ok: true, message: 'Leave request submitted successfully!', data }
  } catch (error) {
    console.error('Error submitting leave:', error)
    return { ok: false, message: error.message }
  }
}

export const getLeaveRequests = async (email, isAdmin) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) return []
    
    let query = supabase.from('leave_requests').select('*')
    
    if (!isAdmin) {
      query = query.eq('employee_id', employee.id)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return []
  }
}

export const updateLeaveStatus = async (leaveId, status, approvedBy, rejectionReason) => {
  try {
    const updateData = { status }
    
    if (status === 'Approved') {
      updateData.approved_by = approvedBy
    }
    
    if (status === 'Rejected') {
      updateData.rejection_reason = rejectionReason
    }
    
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', leaveId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating leave status:', error)
    throw error
  }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

export const getDashboardData = async (email) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      return { present: 0, delayed: 0, absent: 0, leave: 0, beyondDelay: 0, total: 0, recent: [] }
    }
    
    // ✅ FIX: derive current IST month/year
    const now = new Date()
    const istMonth = parseInt(
      now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', month: '2-digit' })
    )
    const istYear = parseInt(
      now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric' })
    )
    
    // ✅ FIX: zero-padded last day
    const mm = String(istMonth).padStart(2, '0')
    const lastDay = new Date(istYear, istMonth, 0).getDate()
    const dd = String(lastDay).padStart(2, '0')
    const startDate = `${istYear}-${mm}-01`
    const endDate = `${istYear}-${mm}-${dd}`
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
    
    if (error) throw error
    
    const stats = {
      present: data.filter(d => d.status === 'P' || d.status === 'Present').length,
      delayed: data.filter(d => d.status === 'D' || d.status === 'Delayed').length,
      absent: data.filter(d => d.status === 'A' || d.status === 'Absent').length,
      leave: data.filter(d => d.status === 'L' || d.status === 'Leave').length,
      beyondDelay: data.filter(d => d.status === 'B' || d.status === 'Beyond Delay').length,
      total: data.length
    }
    
    // Get recent attendance
    const { data: recent, error: recentError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .order('attendance_date', { ascending: false })
      .limit(5)
    
    if (recentError) throw recentError
    
    return {
      ...stats,
      recent: recent || []
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return { present: 0, delayed: 0, absent: 0, leave: 0, beyondDelay: 0, total: 0, recent: [] }
  }
}

// ============================================
// REPORT FUNCTIONS
// ============================================

export const getReportData = async (month, year, email, isAdmin) => {
  try {
    const employee = await getEmployeeByEmail(email)
    if (!employee) {
      return { rows: [], daysInMonth: 30, monthName: 'Unknown', year, userStats: { present: 0, absent: 0, leave: 0, delayed: 0, beyondDelay: 0 }, userTotal: 0 }
    }
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    
    let query = supabase
      .from('attendance')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
    
    if (!isAdmin) {
      query = query.eq('employee_id', employee.id)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    let rows = []
    let userStats = { present: 0, absent: 0, leave: 0, delayed: 0, beyondDelay: 0 }
    
    if (isAdmin) {
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.employee_id]) {
          acc[item.employee_id] = {
            Employee: item.employee_name || 'Employee',
            Present: 0,
            Absent: 0,
            Leave: 0,
            Delayed: 0,
            'Beyond Delay': 0,
            Total: 0
          }
        }
        
        const status = item.status
        if (status === 'P' || status === 'Present') acc[item.employee_id].Present++
        else if (status === 'A' || status === 'Absent') acc[item.employee_id].Absent++
        else if (status === 'L' || status === 'Leave') acc[item.employee_id].Leave++
        else if (status === 'D' || status === 'Delayed') acc[item.employee_id].Delayed++
        else if (status === 'B' || status === 'Beyond Delay') acc[item.employee_id]['Beyond Delay']++
        acc[item.employee_id].Total++
        
        return acc
      }, {})
      
      rows = Object.values(grouped)
      
      const userData = data.filter(d => d.employee_id === employee.id)
      userStats = {
        present: userData.filter(d => d.status === 'P' || d.status === 'Present').length,
        absent: userData.filter(d => d.status === 'A' || d.status === 'Absent').length,
        leave: userData.filter(d => d.status === 'L' || d.status === 'Leave').length,
        delayed: userData.filter(d => d.status === 'D' || d.status === 'Delayed').length,
        beyondDelay: userData.filter(d => d.status === 'B' || d.status === 'Beyond Delay').length
      }
    } else {
      const userData = data
      userStats = {
        present: userData.filter(d => d.status === 'P' || d.status === 'Present').length,
        absent: userData.filter(d => d.status === 'A' || d.status === 'Absent').length,
        leave: userData.filter(d => d.status === 'L' || d.status === 'Leave').length,
        delayed: userData.filter(d => d.status === 'D' || d.status === 'Delayed').length,
        beyondDelay: userData.filter(d => d.status === 'B' || d.status === 'Beyond Delay').length
      }
      
      rows = [{
        Employee: employee.name || 'You',
        Present: userStats.present,
        Absent: userStats.absent,
        Leave: userStats.leave,
        Delayed: userStats.delayed,
        'Beyond Delay': userStats.beyondDelay,
        Total: userStats.present + userStats.absent + userStats.leave + userStats.delayed + userStats.beyondDelay
      }]
    }
    
    return {
      rows,
      daysInMonth: new Date(year, month, 0).getDate(),
      monthName: ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'][month - 1],
      year,
      userStats,
      userTotal: userStats.present + userStats.absent + userStats.leave + userStats.delayed + userStats.beyondDelay
    }
  } catch (error) {
    console.error('Error fetching report data:', error)
    return {
      rows: [],
      daysInMonth: 30,
      monthName: 'Unknown',
      year: year,
      userStats: { present: 0, absent: 0, leave: 0, delayed: 0, beyondDelay: 0 },
      userTotal: 0
    }
  }
}

// ============================================
// PROJECTS & LOCATIONS FUNCTIONS
// ============================================

export const getProjects = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

export const getLocations = async () => {
  try {
    const { data, error } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching locations:', error)
    return []
  }
}