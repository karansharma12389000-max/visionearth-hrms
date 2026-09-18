// src/pages/employee/Dashboard.jsx
//
// Vision Earth HRMS — Premium Dashboard
// (Recent Activity removed)

import React, { useState, useEffect } from 'react';
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

// ============================================
// THEME TOKENS
// ============================================
const THEME = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryDeep: '#047857',
  primaryLight: '#34D399',
  greenBg: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  amber: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  border: '#E2E8F0',
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();

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

  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(
        currentYear,
        currentMonth,
        0
      ).getDate()}`;

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

  useEffect(() => {
    if (user?.id) fetchDashboardStats();
  }, [user]);

  useEffect(() => {
    if (user?.id) fetchDashboardStats();
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
          backgroundColor: theme.dark ? '#0F172A' : THEME.greenBg,
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
              color: THEME.textSecondary,
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

  const quickActions = [
    { icon: '📋', label: 'Attendance', path: '/attendance', color: '#10B981' },
    { icon: '📊', label: 'Report', path: '/report', color: '#3B82F6' },
    { icon: '📅', label: 'Leave', path: '/leave', color: '#F59E0B' },
    { icon: '👤', label: 'Profile', path: '/profile', color: '#8B5CF6' },
  ];

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const firstName = (user?.name || 'User').split(' ')[0] || user?.name;

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: theme.dark ? '#0F172A' : THEME.greenBg,
        paddingBottom: '100px',
      }}
    >
      {/* ============================================ */}
      {/* PREMIUM HEADER CARD */}
      {/* ============================================ */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div
          style={{
            background:
              theme.dark
                ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: '24px',
            padding: '22px 20px 20px',
            boxShadow:
              theme.dark
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(16,185,129,0.08), 0 1px 2px rgba(0,0,0,0.04)',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
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

          {/* Top row: Logo + Theme toggle */}
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
                  borderRadius: '14px',
                  background: theme.dark ? '#0F172A' : '#FFFFFF',
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
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: theme.dark ? '#F1F5F9' : THEME.text,
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
                background:
                  theme.dark
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
              {theme.dark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '11px',
              color: theme.dark ? '#64748B' : THEME.textMuted,
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
                color: theme.dark ? '#94A3B8' : THEME.textSecondary,
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
                color: theme.dark ? '#F1F5F9' : THEME.text,
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
              background:
                theme.dark
                  ? 'rgba(16,185,129,0.08)'
                  : 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
              borderRadius: '12px',
              border: `1px solid ${theme.dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
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
                color: theme.dark ? THEME.primaryLight : THEME.primaryDeep,
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
              background: theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderRadius: '20px',
              border: `1px solid ${
                theme.dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
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
                color: theme.dark ? '#CBD5E1' : THEME.text,
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
            background:
              isCheckedIn
                ? theme.dark
                  ? 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : theme.dark
                ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: '20px',
            border: isCheckedIn
              ? 'none'
              : `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
            boxShadow: isCheckedIn
              ? '0 8px 24px rgba(16,185,129,0.35)'
              : theme.dark
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
                  : theme.dark
                  ? '#94A3B8'
                  : THEME.textSecondary,
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
                color: isCheckedIn
                  ? '#FFFFFF'
                  : theme.dark
                  ? '#F1F5F9'
                  : THEME.text,
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
                  : theme.dark
                  ? '#94A3B8'
                  : THEME.textSecondary,
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
                fontFamily: 'Inter, sans-serif',
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
                fontFamily: 'Inter, sans-serif',
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
      {/* QUICK ACTIONS */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: theme.dark ? '#F1F5F9' : THEME.text,
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
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              style={{
                background: theme.dark ? '#1E293B' : '#FFFFFF',
                border: `1px solid ${
                  theme.dark ? 'rgba(255,255,255,0.05)' : THEME.border
                }`,
                borderRadius: '16px',
                padding: '14px 6px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme.dark
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 20px ${action.color}25`;
                e.currentTarget.style.borderColor = action.color + '40';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.dark
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.03)';
                e.currentTarget.style.borderColor = theme.dark
                  ? 'rgba(255,255,255,0.05)'
                  : THEME.border;
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  margin: '0 auto 8px',
                  borderRadius: '12px',
                  background: `${action.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                {action.icon}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: theme.dark ? '#E2E8F0' : THEME.text,
                  letterSpacing: '0.2px',
                }}
              >
                {action.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* THIS MONTH */}
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
              color: theme.dark ? '#F1F5F9' : THEME.text,
              letterSpacing: '-0.2px',
            }}
          >
            📊 This Month
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
              fontFamily: 'Inter, sans-serif',
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
              bg: '#ECFDF5',
              icon: '✓',
            },
            {
              value: dashboardData?.delayed || 0,
              label: 'Delayed',
              color: THEME.amber,
              bg: '#FFFBEB',
              icon: '⏳',
            },
            {
              value: dashboardData?.beyondDelay || 0,
              label: 'Beyond',
              color: THEME.red,
              bg: '#FEF2F2',
              icon: '🚫',
            },
            {
              value: dashboardData?.leave || 0,
              label: 'Leave',
              color: THEME.blue,
              bg: '#EFF6FF',
              icon: '📅',
            },
            {
              value: dashboardData?.absent || 0,
              label: 'Absent',
              color: THEME.red,
              bg: '#FEF2F2',
              icon: '✕',
            },
            {
              value: forgottenCount || 0,
              label: 'Forgot',
              color: '#F97316',
              bg: '#FFF7ED',
              icon: '⚠️',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: theme.dark ? '#1E293B' : stat.bg,
                borderRadius: '14px',
                padding: '14px 8px 12px',
                textAlign: 'center',
                border: `1px solid ${
                  theme.dark ? 'rgba(255,255,255,0.05)' : stat.color + '20'
                }`,
                boxShadow: theme.dark
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  marginBottom: '4px',
                  opacity: 0.9,
                }}
              >
                {stat.icon}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '4px',
                  letterSpacing: '-0.5px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: theme.dark ? '#94A3B8' : stat.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
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
            background:
              theme.dark
                ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))'
                : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderRadius: '16px',
            border: `1px solid ${
              theme.dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
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
              color: theme.dark ? THEME.primaryLight : THEME.primaryDeep,
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
              background: theme.dark ? '#1E293B' : '#FFFFFF',
              borderRadius: '20px',
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
                  color: theme.dark ? '#F1F5F9' : THEME.text,
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
                  color: THEME.textMuted,
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
                background: theme.dark
                  ? 'rgba(255,255,255,0.03)'
                  : '#F8FAFC',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
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
                    color: theme.dark ? '#F1F5F9' : THEME.text,
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
                      background: theme.dark
                        ? 'rgba(255,255,255,0.05)'
                        : '#FFFFFF',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: theme.dark ? '#F1F5F9' : THEME.text,
                      wordBreak: 'break-word',
                      border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
                    }}
                  >
                    📍 {address || 'Location captured'}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: THEME.textMuted,
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
                  border: `1px solid ${
                    theme.dark ? 'rgba(255,255,255,0.1)' : THEME.border
                  }`,
                  background: 'transparent',
                  color: theme.dark ? '#F1F5F9' : THEME.text,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: fetchingLocation ? 'not-allowed' : 'pointer',
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
                  borderRadius: '12px',
                  border: `1px solid ${
                    theme.dark ? 'rgba(255,255,255,0.1)' : THEME.border
                  }`,
                  background: 'transparent',
                  color: theme.dark ? '#94A3B8' : THEME.textSecondary,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
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
                  borderRadius: '12px',
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
                  fontFamily: 'Inter, sans-serif',
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