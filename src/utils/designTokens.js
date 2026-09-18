// src/utils/designTokens.js
//
// Shared design tokens for Vision Earth HRMS.
// Every page imports from here to keep the UI consistent.

export const THEME = {
  // ─── Colors ─────────────────────────
  primary: '#10B981',
  primaryDark: '#059669',
  primaryDeep: '#047857',
  primaryLight: '#34D399',
  primarySoft: '#ECFDF5',
  primaryBorder: '#A7F3D0',

  // ─── Neutrals ───────────────────────
  greenBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // ─── Semantic ───────────────────────
  amber: '#F59E0B',
  amberSoft: '#FFFBEB',
  red: '#EF4444',
  redSoft: '#FEF2F2',
  purple: '#8B5CF6',
  purpleSoft: '#F5F3FF',
  blue: '#3B82F6',
  blueSoft: '#EFF6FF',
  orange: '#F97316',
  orangeSoft: '#FFF7ED',

  // ─── Dark mode variants ─────────────
  dark: {
    bg: '#0F172A',
    card: '#1E293B',
    cardAlt: 'rgba(30, 41, 59, 0.6)',
    border: 'rgba(255,255,255,0.05)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },

  // ─── Radii ──────────────────────────
  radiusSm: '10px',
  radiusMd: '14px',
  radiusLg: '16px',
  radiusXl: '20px',
  radius2xl: '24px',
  radiusPill: '9999px',

  // ─── Shadows ────────────────────────
  shadowSm: '0 2px 8px rgba(0,0,0,0.03)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.05)',
  shadowLg: '0 8px 32px rgba(16,185,129,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowGreen: '0 4px 14px rgba(16,185,129,0.35)',
  shadowDark: '0 4px 20px rgba(0,0,0,0.3)',
  shadowDarkSm: '0 2px 8px rgba(0,0,0,0.2)',

  // ─── Font ───────────────────────────
  font: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
};

// Quick helper to know if dark mode
export const isDark = (theme) => theme?.dark === true;

// Return the right bg color
export const pageBg = (theme) =>
  isDark(theme) ? THEME.dark.bg : THEME.greenBg;

// Return the right card bg
export const cardBg = (theme) =>
  isDark(theme) ? THEME.dark.card : THEME.cardBg;

// Return the right text color
export const textColor = (theme) =>
  isDark(theme) ? THEME.dark.text : THEME.text;

// Return the right secondary text
export const textSecondary = (theme) =>
  isDark(theme) ? THEME.dark.textSecondary : THEME.textSecondary;

// Return the right border
export const borderColor = (theme) =>
  isDark(theme) ? THEME.dark.border : THEME.border;

// Return the right card shadow
export const cardShadow = (theme) =>
  isDark(theme) ? THEME.shadowDarkSm : THEME.shadowSm;

export default THEME;