// src/utils/helpers.js

import { 
  getTodayIST, 
  formatISTTime, 
  formatISTDate,
  formatISTDateTime,
  getCurrentISTTime,
  getCurrentISTDate,
  getMonthRangeIST,
  isTodayIST
} from './timeUtils';

// ✅ Export IST utilities for easy access
export { 
  getTodayIST, 
  formatISTTime as formatUTCToIST,
  formatISTDate as formatUTCDateToIST,
  formatISTDateTime as formatUTCDateTimeToIST,
  getCurrentISTTime,
  getCurrentISTDate,
  getMonthRangeIST,
  isTodayIST
};

// ✅ Get today's date in IST (legacy compatibility)
export const getTodayStr = getTodayIST;

// ✅ Format date in IST (legacy)
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDate(dateString);
};

// ✅ Format time in IST (legacy)
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  return formatISTTime(timeString);
};

// ✅ Format date and time in IST (legacy)
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDateTime(dateString);
};

// ✅ Format date for display (alias)
export const formatDateDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDate(dateString);
};

// ✅ Format time for display (alias)
export const formatTimeDisplay = (timeString) => {
  if (!timeString) return 'N/A';
  return formatISTTime(timeString);
};

// ✅ Get status color
export const getStatusColor = (status, theme) => {
  const colors = {
    'P': '#10B981',
    'Present': '#10B981',
    'A': '#EF4444',
    'Absent': '#EF4444',
    'D': '#F59E0B',
    'Delayed': '#F59E0B',
    'B': '#DC2626',
    'Beyond Delay': '#DC2626',
    'L': '#3B82F6',
    'Leave': '#3B82F6',
    'ACO': '#8B5CF6',
    'Auto Check-Out': '#8B5CF6',
    'Pending': '#F59E0B',
    'Approved': '#10B981',
    'Rejected': '#EF4444',
  };
  return colors[status] || theme?.colors?.textSecondary || '#64748B';
};

// ✅ Get status label
export const getStatusLabel = (status) => {
  const labels = {
    'P': 'Present',
    'Present': 'Present',
    'A': 'Absent',
    'Absent': 'Absent',
    'D': 'Delayed',
    'Delayed': 'Delayed',
    'B': 'Beyond Delay',
    'Beyond Delay': 'Beyond Delay',
    'L': 'Leave',
    'Leave': 'Leave',
    'ACO': 'Auto Check-Out',
    'Auto Check-Out': 'Auto Check-Out',
    'Pending': 'Pending',
    'Approved': 'Approved',
    'Rejected': 'Rejected',
  };
  return labels[status] || status || 'N/A';
};

// ✅ Get status icon
export const getStatusIcon = (status) => {
  const icons = {
    'P': '✅',
    'Present': '✅',
    'A': '❌',
    'Absent': '❌',
    'D': '⏳',
    'Delayed': '⏳',
    'B': '🚫',
    'Beyond Delay': '🚫',
    'L': '📅',
    'Leave': '📅',
    'ACO': '🔄',
    'Auto Check-Out': '🔄',
    'Pending': '⏳',
    'Approved': '✅',
    'Rejected': '❌',
  };
  return icons[status] || '📌';
};

// ✅ Get month name
export const getMonthName = (month) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || month;
};

// ✅ Confirm message dialog
export const confirmMsg = (title, message, onConfirm) => {
  if (window.confirm(`${title}\n\n${message}`)) {
    onConfirm();
  }
};