// src/utils/helpers.js
//
// Vision Earth HRMS — Utility helpers
// Wraps timeUtils.js for convenience + status formatting helpers.

import {
  getTodayIST,
  formatISTTime,
  formatISTDate,
  formatISTDateTime,
  getCurrentISTTime,
  getCurrentISTDate,
  getMonthRangeIST,
  isTodayIST,
} from './timeUtils';

// ============================================================
// RE-EXPORT IST UTILITIES (backward compatibility)
// ============================================================
export {
  getTodayIST,
  formatISTTime as formatUTCToIST,
  formatISTDate as formatUTCDateToIST,
  formatISTDateTime as formatUTCDateTimeToIST,
  getCurrentISTTime,
  getCurrentISTDate,
  getMonthRangeIST,
  isTodayIST,
};

// ============================================================
// LEGACY DATE/TIME FORMATTERS
// ============================================================

/**
 * Get today's date in IST (legacy alias)
 */
export const getTodayStr = getTodayIST;

/**
 * Format date in IST (legacy) — "18 Sep 2026"
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDate(dateString);
};

/**
 * Format time in IST (legacy) — "09:15:30 AM"
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  return formatISTTime(timeString);
};

/**
 * Format date and time in IST — "18 Sep 2026, 09:15:30 AM"
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDateTime(dateString);
};

/**
 * Alias for formatDate
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  return formatISTDate(dateString);
};

/**
 * Alias for formatTime
 */
export const formatTimeDisplay = (timeString) => {
  if (!timeString) return 'N/A';
  return formatISTTime(timeString);
};

// ============================================================
// STATUS HELPERS — P / D / B / A / L / F
// ============================================================
/**
 * Valid status codes used in the app:
 *   P  → Present
 *   D  → Delayed
 *   B  → Beyond Delay
 *   A  → Absent
 *   L  → Leave
 *   F  → Forgotten (didn't check out / unresolved)
 */

/**
 * Get status color
 * Returns a hex color that matches the app theme.
 */
export const getStatusColor = (status, theme) => {
  const colors = {
    // Present
    P: '#10B981',
    Present: '#10B981',

    // Absent
    A: '#EF4444',
    Absent: '#EF4444',

    // Delayed
    D: '#F59E0B',
    Delayed: '#F59E0B',

    // Beyond Delay
    B: '#DC2626',
    'Beyond Delay': '#DC2626',

    // Leave
    L: '#3B82F6',
    Leave: '#3B82F6',

    // Forgotten / Forgot Out
    F: '#F97316',
    Forgotten: '#F97316',
    'Forgot Out': '#F97316',

    // Leave request statuses
    Pending: '#F59E0B',
    Approved: '#10B981',
    Rejected: '#EF4444',

    // ✅ NEW: Revoke Requested
    'Revoke Requested': '#F97316',
  };
  return colors[status] || theme?.colors?.textSecondary || '#64748B';
};

/**
 * Get status label (full human-readable name)
 */
export const getStatusLabel = (status) => {
  const labels = {
    // Present
    P: 'Present',
    Present: 'Present',

    // Absent
    A: 'Absent',
    Absent: 'Absent',

    // Delayed
    D: 'Delayed',
    Delayed: 'Delayed',

    // Beyond Delay
    B: 'Beyond Delay',
    'Beyond Delay': 'Beyond Delay',

    // Leave
    L: 'Leave',
    Leave: 'Leave',

    // Forgotten / Forgot Out
    F: 'Forgot Out',
    Forgotten: 'Forgot Out',
    'Forgot Out': 'Forgot Out',

    // Leave request statuses
    Pending: 'Pending',
    Approved: 'Approved',
    Rejected: 'Rejected',

    // ✅ NEW: Revoke Requested
    'Revoke Requested': 'Revoke Req.',
  };
  return labels[status] || status || 'N/A';
};

/**
 * Get status icon (emoji)
 */
export const getStatusIcon = (status) => {
  const icons = {
    // Present
    P: '✅',
    Present: '✅',

    // Absent
    A: '❌',
    Absent: '❌',

    // Delayed
    D: '⏳',
    Delayed: '⏳',

    // Beyond Delay
    B: '🚫',
    'Beyond Delay': '🚫',

    // Leave
    L: '📅',
    Leave: '📅',

    // Forgotten / Forgot Out
    F: '⚠️',
    Forgotten: '⚠️',
    'Forgot Out': '⚠️',

    // Leave request statuses
    Pending: '⏳',
    Approved: '✅',
    Rejected: '❌',

    // ✅ NEW: Revoke Requested
    'Revoke Requested': '🚫',
  };
  return icons[status] || '📌';
};

/**
 * Get short label (single letter) for compact displays
 */
export const getStatusShortLabel = (status) => {
  const shorts = {
    P: 'P',
    Present: 'P',
    A: 'A',
    Absent: 'A',
    D: 'D',
    Delayed: 'D',
    B: 'B',
    'Beyond Delay': 'B',
    L: 'L',
    Leave: 'L',
    F: 'F',
    Forgotten: 'F',
    'Forgot Out': 'F',
  };
  return shorts[status] || status?.charAt(0) || '?';
};

// ============================================================
// MONTH HELPERS
// ============================================================

/**
 * Get month name from month number (1-12)
 */
export const getMonthName = (month) => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || month;
};

/**
 * Get short month name (3 letters)
 */
export const getShortMonthName = (month) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return months[month - 1] || month;
};

// ============================================================
// DIALOG HELPERS
// ============================================================

/**
 * Native confirm dialog
 */
export const confirmMsg = (title, message, onConfirm) => {
  if (window.confirm(`${title}\n\n${message}`)) {
    onConfirm();
  }
};

// ============================================================
// FORGOTTEN CHECK-OUT HELPERS
// ============================================================

/**
 * Check if a record has a forgotten check-out
 */
export const isForgottenCheckout = (record) => {
  if (!record) return false;
  return record.forgotten_checkout === true;
};

/**
 * Get forgotten check-out description
 */
export const getForgottenCheckoutText = (record) => {
  if (!record?.forgotten_checkout) return null;
  const hours = record.checkout_delay_hours || 0;
  if (hours >= 48) return `Beyond delay (${hours}h late)`;
  if (hours >= 24) return `Next-day resolve (${hours}h late)`;
  return `Late check-out (${hours}h delay)`;
};

// ============================================================
// SAFE PARSING HELPERS
// ============================================================

/**
 * Safely parse a boolean value from DB
 */
export const safeBool = (value) => {
  if (value === true || value === 'true' || value === 1) return true;
  return false;
};

/**
 * Safely parse a number
 */
export const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
};

// ============================================================
// DEFAULT EXPORT (optional, for convenience)
// ============================================================
export default {
  // Date/time
  getTodayIST,
  getTodayStr,
  formatDate,
  formatTime,
  formatDateTime,
  formatDateDisplay,
  formatTimeDisplay,

  // Status
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  getStatusShortLabel,

  // Month
  getMonthName,
  getShortMonthName,

  // Dialog
  confirmMsg,

  // Forgotten
  isForgottenCheckout,
  getForgottenCheckoutText,

  // Safe parsing
  safeBool,
  safeNumber,
  truncate,
};