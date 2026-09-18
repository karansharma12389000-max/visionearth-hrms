// src/utils/timeUtils.js
//
// IST Timezone utilities for HRMS application.
// Database is set to IST (Asia/Kolkata).
// All times stored and displayed in IST.

// ============================================================
// 1. GET CURRENT IST TIME
// ============================================================

/**
 * Get current time as Date object
 */
export const getISTNow = () => {
  return new Date();
};

/**
 * Get current time in IST as ISO string for database storage
 * (Stored as UTC ISO — display layer converts to IST)
 */
export const getISTTimeForDB = () => {
  return new Date().toISOString();
};

/**
 * Alias for getISTTimeForDB()
 */
export const getISTTimeISO = () => {
  return new Date().toISOString();
};

/**
 * Get today's date in IST (YYYY-MM-DD)
 * ✅ FIXED: Uses Asia/Kolkata timezone, not UTC
 * Use for filtering and date comparisons
 */
export const getTodayIST = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  // 'en-CA' gives YYYY-MM-DD format
};

/**
 * Get yesterday's date in IST (YYYY-MM-DD)
 */
export const getYesterdayIST = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Get tomorrow's date in IST (YYYY-MM-DD)
 */
export const getTomorrowIST = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
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
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
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
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting datetime to IST:', error);
    return '—';
  }
};

/**
 * Format IST date for display (alias) with format options
 */
export const formatIST = (dateString, format = 'date') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  const base = { timeZone: 'Asia/Kolkata' };
  const options = { ...base };

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
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Get current IST date as string (DD MMM YYYY)
 */
export const getCurrentISTDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Get current IST time as 24-hour format (HH:MM:SS)
 */
export const getISTTimeString = () => {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });
};

/**
 * Get current IST hour (0-23)
 */
export const getCurrentISTHour = () => {
  return parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    })
  );
};

/**
 * Get current IST minute (0-59)
 */
export const getCurrentISTMinute = () => {
  return parseInt(
    new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      minute: '2-digit',
    })
  );
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
    startDate: startDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    endDate: endDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString(),
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
    endUTC: today + 'T23:59:59.999Z',
  };
};

/**
 * Get IST date range for the current month
 */
export const getCurrentMonthRangeIST = () => {
  const now = new Date();
  return getMonthRangeIST(now.getMonth() + 1, now.getFullYear());
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

    const hour = parseInt(
      date.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false,
      })
    );
    return hour >= 9 && hour < 18;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
};

// ============================================================
// 5. COMPARISON HELPERS
// ============================================================

/**
 * Get the IST calendar day (YYYY-MM-DD) for a given UTC timestamp
 */
export const getISTDateFromTimestamp = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return null;
  }
};

/**
 * Get the IST time (HH:MM:SS) for a given UTC timestamp
 */
export const getISTTimeFromTimestamp = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
  } catch {
    return null;
  }
};

/**
 * Check if two timestamps are on the same IST calendar day
 */
export const isSameISTDay = (dateA, dateB) => {
  if (!dateA || !dateB) return false;
  const a = getISTDateFromTimestamp(dateA);
  const b = getISTDateFromTimestamp(dateB);
  return a !== null && a === b;
};

/**
 * Get how many days have passed (in IST) between two timestamps
 * Returns a positive number (dateB - dateA)
 */
export const getDaysDiffIST = (dateA, dateB = new Date()) => {
  if (!dateA) return 0;
  try {
    const a = new Date(getISTDateFromTimestamp(dateA) + 'T00:00:00+05:30');
    const b = new Date(getISTDateFromTimestamp(dateB) + 'T00:00:00+05:30');
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

/**
 * Get how many hours have passed between two timestamps
 * Returns a positive number (dateB - dateA)
 */
export const getHoursDiff = (dateA, dateB = new Date()) => {
  if (!dateA) return 0;
  try {
    const a = new Date(dateA);
    const b = new Date(dateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    return Math.round(((b - a) / (1000 * 60 * 60)) * 100) / 100;
  } catch {
    return 0;
  }
};

// ============================================================
// 6. LEGACY COMPATIBILITY (kept for existing code)
// ============================================================

export const formatUTCDateToIST = formatISTDate;
export const formatUTCToIST = formatISTTime;
export const formatUTCDateTimeToIST = formatISTDateTime;

export const getISTDateFromUTC = (utcDateStr) =>
  getISTDateFromTimestamp(utcDateStr);

export const getISTTimeFromUTC = (utcDateStr) =>
  getISTTimeFromTimestamp(utcDateStr);

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  // Current time
  getISTNow,
  getISTTimeForDB,
  getISTTimeISO,
  getTodayIST,
  getYesterdayIST,
  getTomorrowIST,

  // Formatting
  formatISTDate,
  formatISTTime,
  formatISTDateTime,
  formatIST,

  // Display helpers
  getCurrentISTTime,
  getCurrentISTDate,
  getISTTimeString,
  getCurrentISTHour,
  getCurrentISTMinute,

  // Ranges
  getMonthRangeIST,
  getTodayRangeIST,
  getCurrentMonthRangeIST,

  // Checks
  isTodayIST,
  isWithinBusinessHours,

  // Comparison
  getISTDateFromTimestamp,
  getISTTimeFromTimestamp,
  isSameISTDay,
  getDaysDiffIST,
  getHoursDiff,

  // Legacy
  formatUTCDateToIST,
  formatUTCToIST,
  formatUTCDateTimeToIST,
  getISTDateFromUTC,
  getISTTimeFromUTC,
};