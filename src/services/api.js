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
// src/services/api.js

// Demo employees — only available in demo mode (VITE_DEMO_MODE=true)
export const DEMO_EMPLOYEES =
  import.meta.env.VITE_DEMO_MODE === 'true'
    ? [
        // ⬇️ PASTE YOUR DEMO USER OBJECTS HERE
        {
          id: 'demo-1',
          email: 'admin@visionearth.com',
          password: 'admin123',
          name: 'Demo Admin',
          employee_id: 'EMP001',
          role: 'Admin',
          department: 'Management',
        },
        {
          id: 'demo-2',
          email: 'employee@visionearth.com',
          password: 'emp123',
          name: 'Demo Employee',
          employee_id: 'EMP002',
          role: 'Employee',
          department: 'Operations',
        },
        // Add more demo users as needed
      ]
    : [];