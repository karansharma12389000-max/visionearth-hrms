// src/components/ForgotCheckoutBanner.jsx
//
// Vision Earth HRMS — Premium Forgot Check-Out Banner
// Shown on Dashboard when there's a pending check-out.

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatDate, formatTime } from '../utils/helpers';
import { THEME, isDark } from '../utils/designTokens';

export const ForgotCheckoutBanner = ({ record, onResolve }) => {
  const { theme } = useTheme();
  const dark = isDark(theme);

  if (!record) return null;

  const checkInDate = new Date(record.check_in_time);
  const hoursSinceCheckIn = (
    (new Date() - checkInDate) /
    3600000
  ).toFixed(1);

  return (
    <div
      style={{
        marginBottom: '16px',
        borderRadius: THEME.radiusLg,
        overflow: 'hidden',
        boxShadow: dark
          ? '0 8px 24px rgba(245,158,11,0.25)'
          : '0 8px 24px rgba(245,158,11,0.2)',
        border: `1.5px solid ${dark ? 'rgba(245,158,11,0.4)' : '#FBBF24'}`,
      }}
    >
      {/* Top accent strip */}
      <div
        style={{
          height: '4px',
          background: `linear-gradient(90deg, ${THEME.amber}, #FBBF24, ${THEME.amber})`,
        }}
      />

      {/* Body */}
      <div
        style={{
          background: dark
            ? 'linear-gradient(135deg, rgba(120,53,15,0.4) 0%, rgba(69,26,3,0.6) 100%)'
            : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          padding: '16px 18px',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          {/* Warning icon in circle */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: dark
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
              boxShadow: dark
                ? '0 4px 10px rgba(245,158,11,0.3)'
                : '0 4px 10px rgba(245,158,11,0.25)',
            }}
          >
            ⚠️
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: dark ? '#FDE68A' : '#92400E',
                marginBottom: '4px',
                letterSpacing: '-0.2px',
              }}
            >
              You forgot to check out
            </div>
            <div
              style={{
                fontSize: '12px',
                color: dark ? '#FCD34D' : '#78350F',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              <strong>{formatDate(checkInDate)}</strong>
            </div>
          </div>
        </div>

        {/* Info row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: dark
              ? 'rgba(0,0,0,0.2)'
              : 'rgba(255,255,255,0.5)',
            borderRadius: THEME.radiusMd,
            marginBottom: '12px',
            border: `1px solid ${
              dark ? 'rgba(255,255,255,0.05)' : 'rgba(146,64,14,0.1)'
            }`,
          }}
        >
          <span style={{ fontSize: '14px' }}>🕒</span>
          <span
            style={{
              fontSize: '11px',
              color: dark ? '#FCD34D' : '#78350F',
              fontWeight: 700,
            }}
          >
            Checked in at {formatTime(record.check_in_time)}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: dark ? '#FBBF24' : '#B45309',
              fontWeight: 700,
              marginLeft: 'auto',
              padding: '2px 8px',
              background: dark
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(255,255,255,0.6)',
              borderRadius: '8px',
            }}
          >
            {hoursSinceCheckIn}h ago
          </span>
        </div>

        {/* Info hint */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: dark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.4)',
            borderRadius: '10px',
            marginBottom: '14px',
          }}
        >
          <span style={{ fontSize: '12px' }}>💡</span>
          <span
            style={{
              fontSize: '10px',
              color: dark ? '#FCD34D' : '#78350F',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            You must complete this before starting today's session.
          </span>
        </div>

        {/* Resolve button */}
        <button
          onClick={onResolve}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: THEME.radiusMd,
            border: 'none',
            background: `linear-gradient(135deg, ${THEME.amber}, #D97706)`,
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(217,119,6,0.4)',
            fontFamily: THEME.font,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(217,119,6,0.4)';
          }}
        >
          <span style={{ fontSize: '14px' }}>⚡</span>
          Resolve Now
        </button>
      </div>
    </div>
  );
};

export default ForgotCheckoutBanner;