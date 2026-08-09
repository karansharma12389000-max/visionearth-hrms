// src/utils/timeUtils.js

/**
 * IST Timezone utilities for HRMS application
 * All times are stored in UTC in database, displayed in IST
 */

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Get current time in IST as ISO string with +05:30 offset
 * Use this when storing times in the database
 */
export const getISTTimeForDB = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + IST_OFFSET);
  return istTime.toISOString().replace('Z', '+05:30');
};

/**
 * Get current time in IST as UTC string
 * Use this for database storage (Supabase expects ISO format)
 */
export const getISTTimeISO = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + IST_OFFSET);
  return istTime.toISOString();
};

/**
 * Get today's date in IST (YYYY-MM-DD)
 * Use this for filtering and date comparisons
 */
export const getTodayIST = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + IST_OFFSET);
  return istTime.toISOString().split('T')[0];
};

/**
 * Format UTC date to IST time display (HH:MM:SS AM/PM)
 * Use this to display times in IST format
 */
export const formatUTCToIST = (utcDateString) => {
  if (!utcDateString) return '—';
  
  try {
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return '—';
    
    const istDate = new Date(date.getTime() + IST_OFFSET);
    
    let hours = istDate.getUTCHours();
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time to IST:', error);
    return '—';
  }
};

/**
 * Format UTC date to IST date display (DD MMM YYYY)
 * Use this to display dates in IST format
 */
export const formatUTCDateToIST = (utcDateString) => {
  if (!utcDateString) return '—';
  
  try {
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return '—';
    
    const istDate = new Date(date.getTime() + IST_OFFSET);
    
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][istDate.getUTCMonth()];
    const year = istDate.getUTCFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting date to IST:', error);
    return '—';
  }
};

/**
 * Format UTC date to IST date and time (DD MMM YYYY, HH:MM:SS AM/PM)
 * Use this for full datetime display
 */
export const formatUTCDateTimeToIST = (utcDateString) => {
  if (!utcDateString) return '—';
  
  try {
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return '—';
    
    const istDate = new Date(date.getTime() + IST_OFFSET);
    
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][istDate.getUTCMonth()];
    const year = istDate.getUTCFullYear();
    
    let hours = istDate.getUTCHours();
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  } catch (error) {
    console.error('Error formatting datetime to IST:', error);
    return '—';
  }
};

/**
 * Get current IST time as string (HH:MM:SS AM/PM)
 * Use this for real-time clock display
 */
export const getCurrentISTTime = () => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET);
  
  let hours = istDate.getUTCHours();
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Get current IST date as string (DD MMM YYYY)
 * Use this for date display
 */
export const getCurrentISTDate = () => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET);
  
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  
  return `${day} ${month} ${year}`;
};

/**
 * Get current IST time as 24-hour format (HH:MM:SS)
 * Use this for database queries or comparisons
 */
export const getISTTimeString = () => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET);
  
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format date to IST date string for database (YYYY-MM-DD)
 * Use this when formatting dates for database queries
 */
export const formatDateToIST = (date) => {
  if (!date) return null;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    const istDate = new Date(d.getTime() + IST_OFFSET);
    return istDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date to IST:', error);
    return null;
  }
};

/**
 * Convert UTC time to IST time object
 * Use this when you need to work with IST time objects
 */
export const convertUTCToIST = (utcDate) => {
  if (!utcDate) return null;
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return null;
    
    return new Date(date.getTime() + IST_OFFSET);
  } catch (error) {
    console.error('Error converting to IST:', error);
    return null;
  }
};

/**
 * Check if a time is within IST business hours (9 AM - 6 PM)
 * Use this for validation
 */
export const isWithinBusinessHours = (utcDateString) => {
  if (!utcDateString) return false;
  
  try {
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return false;
    
    const istDate = new Date(date.getTime() + IST_OFFSET);
    const hours = istDate.getUTCHours();
    
    return hours >= 9 && hours < 18;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
};

/**
 * Get IST time for a specific date and time components
 * Use this to construct specific IST times
 */
export const createISTDateTime = (year, month, day, hours = 0, minutes = 0, seconds = 0) => {
  // Create date in UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30, seconds));
  return utcDate.toISOString();
};

/**
 * Get the start of day in IST (00:00:00)
 * Use this for daily report generation
 */
export const getStartOfDayIST = (date) => {
  if (!date) {
    date = new Date();
  }
  
  const d = new Date(date);
  const istDate = new Date(d.getTime() + IST_OFFSET);
  istDate.setUTCHours(0, 0, 0, 0);
  
  return new Date(istDate.getTime() - IST_OFFSET).toISOString();
};

/**
 * Get the end of day in IST (23:59:59)
 * Use this for daily report generation
 */
export const getEndOfDayIST = (date) => {
  if (!date) {
    date = new Date();
  }
  
  const d = new Date(date);
  const istDate = new Date(d.getTime() + IST_OFFSET);
  istDate.setUTCHours(23, 59, 59, 999);
  
  return new Date(istDate.getTime() - IST_OFFSET).toISOString();
};

/**
 * Get month range in IST
 * Use this for monthly reports
 */
export const getMonthRangeIST = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const startIST = new Date(startDate.getTime() + IST_OFFSET);
  const endIST = new Date(endDate.getTime() + IST_OFFSET);
  
  return {
    startDate: startIST.toISOString().split('T')[0],
    endDate: endIST.toISOString().split('T')[0],
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString()
  };
};

/**
 * Convert IST date string to UTC for database queries
 */
export const istDateToUTC = (istDateStr) => {
  if (!istDateStr) return null;
  const date = new Date(istDateStr + 'T00:00:00.000Z');
  return new Date(date.getTime() - IST_OFFSET).toISOString();
};

/**
 * Get IST date from UTC timestamp
 */
export const getISTDateFromUTC = (utcDateStr) => {
  if (!utcDateStr) return null;
  const date = new Date(utcDateStr);
  const istDate = new Date(date.getTime() + IST_OFFSET);
  return istDate.toISOString().split('T')[0];
};

/**
 * Get IST time from UTC timestamp
 */
export const getISTTimeFromUTC = (utcDateStr) => {
  if (!utcDateStr) return null;
  const date = new Date(utcDateStr);
  const istDate = new Date(date.getTime() + IST_OFFSET);
  return istDate.toTimeString().split(' ')[0];
};

/**
 * Check if a date is today in IST
 */
export const isTodayIST = (dateStr) => {
  if (!dateStr) return false;
  const today = getTodayIST();
  return dateStr === today;
};