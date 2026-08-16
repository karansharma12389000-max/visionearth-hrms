// src/utils/timeUtils.js

/**
 * IST Timezone utilities for HRMS application
 * Database is set to IST (Asia/Kolkata)
 * All times stored and displayed in IST
 */

// ============================================================
// 1. GET CURRENT IST TIME
// ============================================================

/**
 * Get current IST time as Date object
 */
export const getISTNow = () => {
  return new Date();
};

/**
 * Get current time in IST as ISO string for database storage
 */
export const getISTTimeForDB = () => {
  return new Date().toISOString();
};

/**
 * Get current time in IST as ISO string
 */
export const getISTTimeISO = () => {
  return new Date().toISOString();
};

/**
 * Get today's date in IST (YYYY-MM-DD)
 * Use for filtering and date comparisons
 */
export const getTodayIST = () => {
  return new Date().toISOString().split('T')[0];
};

// ============================================================
// 2. FORMAT DATES IN IST
// ============================================================

/**
 * Format date to IST date display (DD MMM YYYY)
 */
export const formatISTDate = (dateString) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date to IST:', error);
    return '—';
  }
};

/**
 * Format date to IST time display (HH:MM:SS AM/PM)
 */
export const formatISTTime = (timeString) => {
  if (!timeString) return '—';
  
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time to IST:', error);
    return '—';
  }
};

/**
 * Format date to IST date and time (DD MMM YYYY, HH:MM:SS AM/PM)
 */
export const formatISTDateTime = (dateString) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting datetime to IST:', error);
    return '—';
  }
};

/**
 * Format IST date for display (alias)
 */
export const formatIST = (dateString, format = 'date') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  const options = {};
  switch (format) {
    case 'date':
      options.day = '2-digit';
      options.month = 'short';
      options.year = 'numeric';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = true;
      break;
    case 'datetime':
      options.day = '2-digit';
      options.month = 'short';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = true;
      break;
    default:
      options.day = '2-digit';
      options.month = 'short';
      options.year = 'numeric';
  }
  
  return date.toLocaleString('en-IN', options);
};

// ============================================================
// 3. GET CURRENT DISPLAY VALUES
// ============================================================

/**
 * Get current IST time as string (HH:MM:SS AM/PM)
 */
export const getCurrentISTTime = () => {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Get current IST date as string (DD MMM YYYY)
 */
export const getCurrentISTDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Get current IST time as 24-hour format (HH:MM:SS)
 */
export const getISTTimeString = () => {
  return new Date().toTimeString().split(' ')[0];
};

// ============================================================
// 4. DATE RANGE HELPERS
// ============================================================

/**
 * Get IST date range for a month
 */
export const getMonthRangeIST = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString()
  };
};

/**
 * Get IST date range for today
 */
export const getTodayRangeIST = () => {
  const today = getTodayIST();
  return {
    start: today,
    end: today,
    startUTC: today + 'T00:00:00.000Z',
    endUTC: today + 'T23:59:59.999Z'
  };
};

/**
 * Check if a date is today in IST
 */
export const isTodayIST = (dateStr) => {
  if (!dateStr) return false;
  const today = getTodayIST();
  return dateStr === today;
};

/**
 * Check if a time is within IST business hours (9 AM - 6 PM)
 */
export const isWithinBusinessHours = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const hours = date.getHours();
    return hours >= 9 && hours < 18;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
};

// ============================================================
// 5. LEGACY COMPATIBILITY (For existing code)
// ============================================================

// These are aliases for backward compatibility
export const formatUTCDateToIST = formatISTDate;
export const formatUTCToIST = formatISTTime;
export const formatUTCDateTimeToIST = formatISTDateTime;
export const getISTDateFromUTC = (utcDateStr) => {
  if (!utcDateStr) return null;
  return new Date(utcDateStr).toISOString().split('T')[0];
};
export const getISTTimeFromUTC = (utcDateStr) => {
  if (!utcDateStr) return null;
  return new Date(utcDateStr).toTimeString().split(' ')[0];
};

export default {
  getISTNow,
  getISTTimeForDB,
  getISTTimeISO,
  getTodayIST,
  formatISTDate,
  formatISTTime,
  formatISTDateTime,
  formatIST,
  getCurrentISTTime,
  getCurrentISTDate,
  getISTTimeString,
  getMonthRangeIST,
  getTodayRangeIST,
  isTodayIST,
  isWithinBusinessHours
};