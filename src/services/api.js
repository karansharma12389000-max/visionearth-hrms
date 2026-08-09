// frontend/src/services/api.js
import * as supabaseFunctions from './supabase'

// Export individual functions for direct import
export const login = supabaseFunctions.loginUser
export const changePassword = supabaseFunctions.changePassword
export const getEmployeeData = supabaseFunctions.getEmployeeData
export const getAllEmployees = supabaseFunctions.getAllEmployees
export const getEmployeeAttendance = supabaseFunctions.getEmployeeAttendance
export const submitAttendance = supabaseFunctions.submitAttendance
export const submitPreviousDayAttendance = supabaseFunctions.submitPreviousDayAttendance
export const checkIn = supabaseFunctions.checkIn
export const checkOut = supabaseFunctions.checkOut
export const getTodayCheckinStatus = supabaseFunctions.getTodayCheckinStatus
export const getCheckInHistory = supabaseFunctions.getCheckInHistory
export const submitLeave = supabaseFunctions.submitLeave
export const getLeaveRequests = supabaseFunctions.getLeaveRequests
export const updateLeaveStatus = supabaseFunctions.updateLeaveStatus
export const getDashboardData = supabaseFunctions.getDashboardData
export const getReportData = supabaseFunctions.getReportData
export const getProjects = supabaseFunctions.getProjects
export const getLocations = supabaseFunctions.getLocations

// Also export as api object
export const api = {
  login: supabaseFunctions.loginUser,
  changePassword: supabaseFunctions.changePassword,
  getEmployeeData: supabaseFunctions.getEmployeeData,
  getAllEmployees: supabaseFunctions.getAllEmployees,
  getEmployeeAttendance: supabaseFunctions.getEmployeeAttendance,
  submitAttendance: supabaseFunctions.submitAttendance,
  submitPreviousDayAttendance: supabaseFunctions.submitPreviousDayAttendance,
  checkIn: supabaseFunctions.checkIn,
  checkOut: supabaseFunctions.checkOut,
  getTodayCheckinStatus: supabaseFunctions.getTodayCheckinStatus,
  getCheckInHistory: supabaseFunctions.getCheckInHistory,
  submitLeave: supabaseFunctions.submitLeave,
  getLeaveRequests: supabaseFunctions.getLeaveRequests,
  updateLeaveStatus: supabaseFunctions.updateLeaveStatus,
  getDashboardData: supabaseFunctions.getDashboardData,
  getReportData: supabaseFunctions.getReportData,
  getProjects: supabaseFunctions.getProjects,
  getLocations: supabaseFunctions.getLocations,
}

// Keep DEMO_EMPLOYEES for fallback
export const DEMO_EMPLOYEES = [
  { 
    id: 'demo-admin-001', 
    employee_id: 'EMP001', 
    email: 'admin@visionearth.com', 
    name: 'Admin User', 
    department: 'IT', 
    designation: 'System Administrator', 
    reporting_location: 'Head Office', 
    role: 'Admin', 
    phone: '9000000001', 
    is_active: true, 
    password: 'admin123' 
  },
  { 
    id: 'demo-emp-002', 
    employee_id: 'EMP002', 
    email: 'john.doe@visionearth.com', 
    name: 'John Doe', 
    department: 'Engineering', 
    designation: 'Software Engineer', 
    reporting_location: 'Head Office', 
    role: 'Employee', 
    phone: '9000000002', 
    is_active: true, 
    password: 'emp123' 
  }
]