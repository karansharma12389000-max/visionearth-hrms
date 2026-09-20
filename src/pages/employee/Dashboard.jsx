// src/pages/employee/Dashboard.jsx
//
// Vision Earth HRMS — Premium Dashboard
// Attractive stat cards with colored accent bars and glow dots.
// Cool & clean quick action icons.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { formatTime } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import AttendanceFormModal from '../../components/AttendanceFormModal';
import ForgotCheckoutBanner from '../../components/ForgotCheckoutBanner';
import useCheckInOut from '../../hooks/useCheckInOut';
import { getTopQuote, getBottomQuote } from '../../utils/quotes';
import { THEME, isDark } from '../../utils/designTokens';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const {
    todayRecord,
    pendingRecord,
    forgottenCount,
    loading: checkInLoading,
    hasPendingCheckout,
    isCheckedIn,
    isCheckedOut,
    refetch: refetchCheckIn,
  } = useCheckInOut();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [formMode, setFormMode] = useState('normal');
  const [formRecord, setFormRecord] = useState(null);

  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationFetched, setLocationFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const topQuote = getTopQuote();
  const bottomQuote = getBottomQuote();

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // ✅ FIX: derive current IST month and year
      const now = new Date();
      const currentMonth = parseInt(
        now.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          month: '2-digit',
        })
      );
      const currentYear = parseInt(
        now.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
        })
      );
      const mm = String(currentMonth).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${currentYear}-${mm}-01`;
      const endDate = `${currentYear}-${mm}-${dd}`;

      const { data: attData, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (!error) {
        setDashboardData({
          present:
            attData?.filter((a) => a.status === 'P' || a.status === 'Present')
              .length || 0,
          delayed:
            attData?.filter((a) => a.status === 'D' || a.status === 'Delayed')
              .length || 0,
          beyondDelay:
            attData?.filter(
              (a) => a.status === 'B' || a.status === 'Beyond Delay'
            ).length || 0,
          absent:
            attData?.filter((a) => a.status === 'A' || a.status === 'Absent')
              .length || 0,
          leave:
            attData?.filter((a) => a.status === 'L' || a.status === 'Leave')
              .length || 0,
          total: attData?.length || 0,
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: avoid the duplicate fetch on mount.
  //    The original two effects both fired their callback on initial render,
  //    producing two identical API calls. We keep both triggers but skip the
  //    very first invocation of the check-in effect, since the user effect
  //    already covers it. Subsequent check-in state changes still refetch.
  const hasInitialFetchedRef = useRef(false);

  useEffect(() => {
    if (user?.id) fetchDashboardStats();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    if (!hasInitialFetchedRef.current) {
      hasInitialFetchedRef.current = true;
      return; // skip the initial trigger — user effect already fetched
    }
    fetchDashboardStats();
  }, [isCheckedIn, isCheckedOut]);

  // ============================================
  // LOCATION FUNCTIONS
  // ============================================
  const openCheckInModal = () => {
    setShowCheckInModal(true);
    setLocationFetched(false);
    setLocation(null);
    setAddress('');
    setLocationError('');
    getCurrentLocation();
  };

  const openAttendanceForm = (record, mode) => {
    setFormRecord(record);
    setFormMode(mode);
    setShowAttendanceForm(true);
    getCurrentLocation();
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (locationFetched && location && !locationError) {
        resolve(location);
        return;
      }
      setFetchingLocation(true);
      setLocationError('');

      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported');
        setFetchingLocation(false);
        resolve(null);
        return;
      }

      const timeoutId = setTimeout(() => {
        setFetchingLocation(false);
        setLocationError('Location request timed out');
        resolve(null);
      }, 15000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          const loc = { lat: latitude, lng: longitude };
          setLocation(loc);
          setLocationFetched(true);
          setFetchingLocation(false);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'VisionEarthHRMS/1.0' } }
            );
            const data = await res.json();
            setAddress(
              data?.display_name ||
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            );
          } catch {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
          resolve(loc);
        },
        (error) => {
          clearTimeout(timeoutId);
          let msg = 'Unable to get location';
          if (error.code === error.PERMISSION_DENIED)
            msg = 'Location permission denied';
          else if (error.code === error.POSITION_UNAVAILABLE)
            msg = 'Location unavailable';
          else if (error.code === error.TIMEOUT) msg = 'Location timed out';
          setLocationError(msg);
          setFetchingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    });
  };

  const refreshLocation = async () => {
    setLocationFetched(false);
    setLocation(null);
    setAddress('');
    setLocationError('');
    await getCurrentLocation();
  };

  // ============================================
  // CHECK-IN
  // ============================================
  const handleCheckIn = async () => {
    if (!locationFetched || !location) {
      toast.error('Please wait for location');
      return;
    }
    try {
      setSubmitting(true);
      const { checkIn } = await import('../../services/checkInOutService');
      const result = await checkIn(user?.id, location, address);

      if (result.blocked) {
        toast.error(result.message || 'Check-in blocked');
        if (result.pendingRecord) {
          setShowCheckInModal(false);
          refetchCheckIn();
        }
        return;
      }

      toast.success(`✅ Checked in at ${formatTime(new Date().toISOString())}`);
      setShowCheckInModal(false);
      setLocationFetched(false);
      setLocation(null);
      await refetchCheckIn();
      await fetchDashboardStats();
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error(err.message || 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolvePending = () => {
    if (!pendingRecord) return;
    openAttendanceForm(pendingRecord, 'forgotten');
  };

  const handleNormalCheckOut = () => {
    if (!todayRecord) return;
    openAttendanceForm(todayRecord, 'normal');
  };

  const handleAttendanceSuccess = async () => {
    await refetchCheckIn();
    await fetchDashboardStats();
    setLocationFetched(false);
    setLocation(null);
    setAddress('');
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading || checkInLoading) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pageBg,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `4px solid ${THEME.primaryLight}33`,
              borderTopColor: THEME.primary,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }}
          />
          <p
            style={{
              marginTop: '16px',
              color: textSecondary,
              fontSize: '14px',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // STATUS DISPLAY
  // ============================================
  let statusText = 'Not Checked In';
  let statusSubtext = 'Check in to start your day';
  let statusColor = THEME.red;
  let statusIcon = '⚠️';

  if (hasPendingCheckout) {
    statusText = 'Blocked — Resolve Pending';
    statusSubtext = "Complete yesterday's check-out to continue";
    statusColor = THEME.amber;
    statusIcon = '🚫';
  } else if (isCheckedIn) {
    statusText = 'Checked In';
    statusSubtext = `Since ${formatTime(todayRecord?.check_in_time)}`;
    statusColor = THEME.primary;
    statusIcon = '✓';
  } else if (isCheckedOut) {
    statusText = 'Checked Out';
    statusSubtext = `Out at ${formatTime(todayRecord?.check_out_time)} • ${
      todayRecord?.working_hours || 0
    }h worked`;
    statusColor = THEME.purple;
    statusIcon = '📌';
  }

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const firstName = (user?.name || 'User').split(' ')[0] || user?.name;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: pageBg,
        paddingBottom: '120px',
        fontFamily: THEME.font,
      }}
    >
      {/* ============================================ */}
      {/* PREMIUM HEADER CARD */}
      {/* ============================================ */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: THEME.radius2xl,
            padding: '22px 20px 20px',
            boxShadow: dark ? THEME.shadowDark : THEME.shadowLg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: THEME.radiusMd,
                  background: dark ? '#0F172A' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                  border: '1px solid #D1FAE5',
                  overflow: 'hidden',
                }}
              >
                <img
                  src="/vision-earth-logo.png"
                  alt="Vision Earth"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: textPrimary,
                    letterSpacing: '0.5px',
                    lineHeight: 1.1,
                  }}
                >
                  VISION EARTH
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: THEME.primary,
                    letterSpacing: '3px',
                    marginTop: '3px',
                  }}
                >
                  H R M S
                </div>
              </div>
            </div>

            <button
              onClick={toggleDark}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: dark
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
              }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              letterSpacing: '0.8px',
              fontWeight: 500,
              marginBottom: '18px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            People · Projects · A Greener Tomorrow
          </div>

          {/* Welcome */}
          <div style={{ marginBottom: '14px', position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                color: textSecondary,
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Welcome back,
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: textPrimary,
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {firstName}
              <span style={{ fontSize: '22px' }}>👋</span>
            </div>
          </div>

          {/* Quote */}
          <div
            style={{
              padding: '10px 14px',
              background: dark
                ? 'rgba(16,185,129,0.08)'
                : 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
              borderRadius: '12px',
              border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: '14px' }}>💬</span>
            <span
              style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: dark ? THEME.primaryLight : THEME.primaryDeep,
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              "{topQuote}"
            </span>
          </div>

          {/* Date chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderRadius: '20px',
              border: `1px solid ${
                dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
              }`,
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '11px' }}>📅</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: dark ? '#CBD5E1' : THEME.text,
                letterSpacing: '0.2px',
              }}
            >
              {todayDate}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FORGOT BANNER */}
      {/* ============================================ */}
      {hasPendingCheckout && (
        <div style={{ padding: '0 16px' }}>
          <ForgotCheckoutBanner
            record={pendingRecord}
            onResolve={handleResolvePending}
          />
        </div>
      )}

      {/* ============================================ */}
      {/* PREMIUM STATUS CARD */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            padding: '18px 18px',
            background: isCheckedIn
              ? dark
                ? 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : dark
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: THEME.radiusXl,
            border: isCheckedIn
              ? 'none'
              : `1px solid ${dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
            boxShadow: isCheckedIn
              ? '0 8px 24px rgba(16,185,129,0.35)'
              : dark
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isCheckedIn
                ? 'rgba(255,255,255,0.2)'
                : statusColor + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
              color: isCheckedIn ? '#FFFFFF' : statusColor,
              fontWeight: 900,
            }}
          >
            {statusIcon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '11px',
                color: isCheckedIn
                  ? 'rgba(255,255,255,0.75)'
                  : textSecondary,
                marginBottom: '2px',
                fontWeight: 600,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              {isCheckedIn
                ? 'You are'
                : hasPendingCheckout
                ? 'Action Required'
                : isCheckedOut
                ? 'Today'
                : 'Status'}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: isCheckedIn ? '#FFFFFF' : textPrimary,
                lineHeight: 1.2,
                letterSpacing: '-0.3px',
              }}
            >
              {statusText}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: isCheckedIn
                  ? 'rgba(255,255,255,0.85)'
                  : textSecondary,
                marginTop: '3px',
                fontWeight: 500,
              }}
            >
              {statusSubtext}
            </div>
          </div>

          {!hasPendingCheckout && !isCheckedIn && !isCheckedOut && (
            <button
              onClick={openCheckInModal}
              style={{
                padding: '11px 20px',
                borderRadius: '14px',
                border: 'none',
                background:
                  'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                whiteSpace: 'nowrap',
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
              }}
            >
              Check In
            </button>
          )}

          {isCheckedIn && (
            <button
              onClick={handleNormalCheckOut}
              style={{
                padding: '11px 20px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
                whiteSpace: 'nowrap',
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
              }}
            >
              Check Out
            </button>
          )}

          {isCheckedOut && (
            <div
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: 'rgba(139,92,246,0.15)',
                color: THEME.purple,
                fontWeight: 700,
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              ✅ Done
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* QUICK ACTIONS — CLEAN & COOL */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: textPrimary,
            marginBottom: '12px',
            letterSpacing: '-0.2px',
          }}
        >
          Quick Actions
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          {[
            {
              label: 'Attendance',
              path: '/attendance',
              gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              tint: 'rgba(16, 185, 129, 0.25)',
              accent: '#10B981',
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4.5" width="16" height="16" rx="3.5" />
                  <path d="M8.5 2.5v4M15.5 2.5v4M4 10h16" />
                  <path d="M9 15l2 2 4-4" strokeWidth="2.4" />
                </svg>
              ),
            },
            {
              label: 'Report',
              path: '/report',
              gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              tint: 'rgba(59, 130, 246, 0.25)',
              accent: '#3B82F6',
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 20V11" />
                  <path d="M10 20V5" />
                  <path d="M16 20v-6" />
                  <path d="M22 20H2" />
                </svg>
              ),
            },
            {
              label: 'Leave',
              path: '/leave',
              gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              tint: 'rgba(245, 158, 11, 0.25)',
              accent: '#F59E0B',
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18M8 2.5v4M16 2.5v4" />
                  <circle cx="12" cy="15.5" r="2" fill="#FFFFFF" stroke="none" />
                </svg>
              ),
            },
            {
              label: 'Profile',
              path: '/profile',
              gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              tint: 'rgba(139, 92, 246, 0.25)',
              accent: '#8B5CF6',
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4.2" />
                  <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" />
                </svg>
              ),
            },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: '16px',
                padding: '14px 6px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: cardShadow,
                fontFamily: THEME.font,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = dark
                  ? '0 8px 20px rgba(0,0,0,0.35)'
                  : '0 8px 20px rgba(15,23,42,0.08)';
                e.currentTarget.style.borderColor = action.accent + '40';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = cardShadow;
                e.currentTarget.style.borderColor = border;
              }}
            >
              {/* Icon chip — clean flat gradient */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: action.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: dark
                    ? '0 4px 10px rgba(0,0,0,0.3)'
                    : `0 4px 10px ${action.tint}`,
                }}
              >
                {action.icon}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: dark ? '#E2E8F0' : THEME.text,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}
              >
                {action.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* THIS MONTH — ATTRACTIVE STAT CARDS */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: textPrimary,
              letterSpacing: '-0.2px',
            }}
          >
            This Month
          </h3>
          <button
            onClick={() => navigate('/report')}
            style={{
              background: 'none',
              border: 'none',
              color: THEME.primary,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: THEME.font,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View All →
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {[
            {
              value: dashboardData?.present || 0,
              label: 'Present',
              color: THEME.primary,
              accent: THEME.primary,
            },
            {
              value: dashboardData?.delayed || 0,
              label: 'Delayed',
              color: THEME.amber,
              accent: THEME.amber,
            },
            {
              value: dashboardData?.beyondDelay || 0,
              label: 'Beyond',
              color: THEME.red,
              accent: THEME.red,
            },
            {
              value: dashboardData?.leave || 0,
              label: 'Leave',
              color: THEME.blue,
              accent: THEME.blue,
            },
            {
              value: dashboardData?.absent || 0,
              label: 'Absent',
              color: THEME.red,
              accent: THEME.red,
            },
            {
              value: forgottenCount || 0,
              label: 'Forgot',
              color: THEME.orange,
              accent: THEME.orange,
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: dark
                  ? `linear-gradient(145deg, ${stat.accent}15 0%, #1E293B 60%)`
                  : `linear-gradient(145deg, ${stat.accent}10 0%, #FFFFFF 60%)`,
                borderRadius: THEME.radiusMd,
                padding: '18px 10px 16px',
                textAlign: 'center',
                border: `1px solid ${
                  dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'
                }`,
                boxShadow: dark
                  ? '0 4px 12px rgba(0,0,0,0.25)'
                  : `0 4px 12px ${stat.accent}10`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}80)`,
                  opacity: 0.9,
                }}
              />

              {/* Corner dot */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: stat.accent,
                  boxShadow: `0 0 8px ${stat.accent}80`,
                }}
              />

              {/* Number */}
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '8px',
                  letterSpacing: '-1px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value}
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  lineHeight: 1,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM QUOTE */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            padding: '16px 18px',
            background: dark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))'
              : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderRadius: THEME.radiusLg,
            border: `1px solid ${
              dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
            }`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            🌿
          </div>
          <span
            style={{
              fontSize: '12px',
              fontStyle: 'italic',
              color: dark ? THEME.primaryLight : THEME.primaryDeep,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            "{bottomQuote}"
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* CHECK-IN MODAL */}
      {/* ============================================ */}
      {showCheckInModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowCheckInModal(false);
            setLocationFetched(false);
            setLocation(null);
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: textPrimary,
                }}
              >
                Check In
              </h3>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setLocationFetched(false);
                  setLocation(null);
                }}
                style={{
                  fontSize: '24px',
                  color: textMuted,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                borderRadius: THEME.radiusMd,
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '16px' }}>📍</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: textPrimary,
                  }}
                >
                  Current Location
                </span>
              </div>

              {fetchingLocation ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(16,185,129,0.1)',
                    color: THEME.primaryDark,
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ⏳ Fetching location...
                </div>
              ) : locationError ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    color: THEME.red,
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {locationError}
                </div>
              ) : location ? (
                <>
                  <div
                    style={{
                      padding: '10px 12px',
                      background: dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: textPrimary,
                      wordBreak: 'break-word',
                      border: `1px solid ${border}`,
                    }}
                  >
                    📍 {address || 'Location captured'}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: textMuted,
                      marginTop: '6px',
                      fontWeight: 500,
                    }}
                  >
                    Lat: {location.lat.toFixed(6)}, Lng:{' '}
                    {location.lng.toFixed(6)}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    color: THEME.red,
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Click refresh to get location
                </div>
              )}

              <button
                onClick={refreshLocation}
                disabled={fetchingLocation}
                style={{
                  marginTop: '12px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textPrimary,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                {fetchingLocation ? '⏳ Fetching...' : '🔄 Refresh Location'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setLocationFetched(false);
                  setLocation(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                disabled={
                  submitting || !locationFetched || !location || fetchingLocation
                }
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor:
                    submitting ||
                    !locationFetched ||
                    !location ||
                    fetchingLocation
                      ? 'not-allowed'
                      : 'pointer',
                  background:
                    submitting ||
                    !locationFetched ||
                    !location ||
                    fetchingLocation
                      ? '#94A3B8'
                      : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  opacity:
                    submitting ||
                    !locationFetched ||
                    !location ||
                    fetchingLocation
                      ? 0.6
                      : 1,
                  fontFamily: THEME.font,
                  boxShadow:
                    submitting ||
                    !locationFetched ||
                    !location ||
                    fetchingLocation
                      ? 'none'
                      : '0 4px 14px rgba(16,185,129,0.4)',
                }}
              >
                {fetchingLocation
                  ? 'Fetching…'
                  : submitting
                  ? 'Processing…'
                  : !locationFetched || !location
                  ? 'Wait for Location'
                  : 'Confirm Check In'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AttendanceFormModal
        isOpen={showAttendanceForm}
        onClose={() => {
          setShowAttendanceForm(false);
          setFormRecord(null);
        }}
        mode={formMode}
        record={formRecord}
        location={location}
        address={address}
        onSuccess={handleAttendanceSuccess}
      />

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default Dashboard;