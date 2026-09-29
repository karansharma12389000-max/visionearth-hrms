// src/components/LocationTimeline.jsx
//
// Route map + 📌 Ping button.
//
// ✅ 15-minute cooldown (only on today)
// ✅ Fast optimistic UI
// ✅ Ping disabled after check-out
// ✅ Can display any date via `date` prop
// ✅ Read-only mode when viewing a past date

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { useTheme } from '../context/ThemeContext';
import { THEME, isDark } from '../utils/designTokens';
import { reverseGeocode } from '../utils/reverseGeocode';
import LiveMapPreview, { parseGps } from './LiveMapPreview';

const PING_COOLDOWN_MS = 15 * 60 * 1000;
const MIN_INSERT_GAP_MS = 60 * 1000;

const getTodayIST = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const LocationTimeline = ({
  employeeId,
  date = null,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pinging, setPinging] = useState(false);

  const lastPingAtRef = useRef(0);
  const submittingRef = useRef(false);
  const lastInsertRef = useRef(0);

  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);

  const targetDate = date || getTodayIST();
  const isToday = targetDate === getTodayIST();

  // ---------------- Load ----------------
  const loadData = useCallback(async () => {
    if (!employeeId) return;
    const dayStart = new Date(`${targetDate}T00:00:00+05:30`).toISOString();
    const dayEnd = new Date(`${targetDate}T23:59:59.999+05:30`).toISOString();

    const [pingRes, checkRes] = await Promise.all([
      supabase
        .from('location_pings')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('ping_time', dayStart)
        .lte('ping_time', dayEnd)
        .order('ping_time', { ascending: true }),
      supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('check_in_time', dayStart)
        .lte('check_in_time', dayEnd)
        .order('check_in_time', { ascending: false })
        .limit(1),
    ]);

    const fetchedPings = pingRes.data || [];
    setPings(fetchedPings);
    setCheckin((checkRes.data && checkRes.data[0]) || null);

    if (isToday && fetchedPings.length > 0) {
      const latest = fetchedPings[fetchedPings.length - 1];
      lastPingAtRef.current = new Date(latest.ping_time).getTime();
    } else {
      lastPingAtRef.current = 0;
    }
  }, [employeeId, targetDate, isToday]);

  useEffect(() => {
    if (!employeeId) return;
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [employeeId, loadData]);

  // ---------------- Cooldown ticker ----------------
  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const since = Date.now() - lastPingAtRef.current;
      const remaining = Math.max(0, PING_COOLDOWN_MS - since);
      setCooldownRemainingMs(remaining);
    };
    tick();
    const t = setInterval(tick, 15 * 1000);
    return () => clearInterval(t);
  }, [pings.length, isToday]);

  // ---------------- Merge events ----------------
  const events = useMemo(() => {
    const out = [];

    if (checkin?.check_in_time) {
      const ci = parseGps(checkin.check_in_gps);
      if (ci) {
        out.push({
          type: 'checkin',
          time: checkin.check_in_time,
          lat: ci.lat,
          lng: ci.lng,
          address: checkin.check_in_address,
          location_name: checkin.check_in_address || 'Check In',
        });
      }
    }

    pings.forEach((p) => {
      out.push({
        type: 'ping',
        time: p.ping_time,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        location_name: p.location_name,
      });
    });

    if (checkin?.check_out_time) {
      const co = parseGps(checkin.check_out_gps);
      if (co) {
        out.push({
          type: 'checkout',
          time: checkin.check_out_time,
          lat: co.lat,
          lng: co.lng,
          address: checkin.check_out_address,
          location_name: checkin.check_out_address || 'Check Out',
        });
      }
    }

    return out.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [pings, checkin]);

  // ---------------- Cooldown / disabled state ----------------
  const cooldownActive = isToday && cooldownRemainingMs > 0;
  const cooldownMinutes = Math.ceil(cooldownRemainingMs / 60000);

  const hasCheckedOut = !!(checkin && checkin.check_out_time);
  const notCheckedIn = !checkin;

  let pingDisabled = false;
  let pingDisabledLabel = '';
  if (!isToday || readOnly) {
    pingDisabled = true;
    pingDisabledLabel = 'Past date';
  } else if (hasCheckedOut) {
    pingDisabled = true;
    pingDisabledLabel = 'Checked out';
  } else if (notCheckedIn) {
    pingDisabled = true;
    pingDisabledLabel = 'Not checked in';
  }

  // ---------------- Manual Ping ----------------
  const handlePing = () => {
    if (!isToday || readOnly) return;
    if (submittingRef.current) return;
    if (!employeeId) {
      toast.error('Not signed in');
      return;
    }
    if (hasCheckedOut) {
      toast.error('You have checked out — pinging is disabled');
      return;
    }
    if (notCheckedIn) {
      toast.error('Check in first to ping your location');
      return;
    }
    if (cooldownActive) {
      toast.error(`Please wait ${cooldownMinutes}m before the next ping`);
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    submittingRef.current = true;
    setPinging(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastInsertRef.current < MIN_INSERT_GAP_MS) return;
        lastInsertRef.current = now;

        const { latitude, longitude, accuracy } = pos.coords;
        const pingTime = new Date().toISOString();

        const tempId = `temp-${now}`;
        const optimisticPing = {
          id: tempId,
          employee_id: employeeId,
          ping_time: pingTime,
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          location_name: null,
        };

        setPings((prev) => [...prev, optimisticPing]);

        submittingRef.current = false;
        setPinging(false);
        lastPingAtRef.current = now;
        setCooldownRemainingMs(PING_COOLDOWN_MS);

        toast.success('📍 Location captured');

        const { data: inserted, error: insertErr } = await supabase
          .from('location_pings')
          .insert({
            employee_id: employeeId,
            ping_time: pingTime,
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || null,
            location_name: null,
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Ping insert failed:', insertErr);
          toast.error(insertErr.message || 'Failed to save ping');
          setPings((prev) => prev.filter((p) => p.id !== tempId));
          return;
        }

        setPings((prev) =>
          prev.map((p) => (p.id === tempId ? inserted : p))
        );

        try {
          const result = await reverseGeocode(latitude, longitude);
          const fullAddress = result?.full || null;
          const shortName = result?.short || null;

          if (fullAddress) {
            const { error: updateErr } = await supabase
              .from('location_pings')
              .update({ location_name: fullAddress })
              .eq('id', inserted.id);

            if (updateErr) console.error('Address update failed:', updateErr);

            setPings((prev) =>
              prev.map((p) =>
                p.id === inserted.id
                  ? { ...p, location_name: fullAddress }
                  : p
              )
            );

            if (shortName) {
              toast.success(`📍 ${shortName}`, { duration: 2000 });
            }
          }
        } catch (err) {
          console.warn('Reverse geocode failed:', err);
        }
      },
      (err) => {
        submittingRef.current = false;
        setPinging(false);
        console.warn('Geolocation error:', err);
        toast.error(
          err.code === 1
            ? 'Location permission denied'
            : 'Could not get your location'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      }
    );
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '30px 0',
          color: dark ? THEME.dark.textMuted : THEME.textMuted,
          fontSize: '12px',
        }}
      >
        Loading timeline…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: '30px 20px',
          textAlign: 'center',
          background: dark ? THEME.dark.card : THEME.cardBg,
          borderRadius: THEME.radiusLg,
          border: `1px solid ${dark ? THEME.dark.border : THEME.border}`,
          color: dark ? THEME.dark.textMuted : THEME.textMuted,
          fontSize: '12px',
        }}
      >
        📍 No location data for this day.
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <LiveMapPreview
          route={events}
          height={240}
          onPing={readOnly ? null : handlePing}
          pinging={pinging}
          cooldownActive={cooldownActive}
          cooldownMinutes={cooldownMinutes}
          disabled={pingDisabled}
          disabledLabel={pingDisabledLabel}
        />
      </div>

      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: THEME.radiusLg,
          border: `1px solid ${dark ? THEME.dark.border : THEME.border}`,
          background: dark ? THEME.dark.card : THEME.cardBg,
          cursor: 'pointer',
          fontFamily: THEME.font,
          boxShadow: dark ? THEME.shadowDarkSm : THEME.shadowSm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#6366F118',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🕐
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: dark ? THEME.dark.text : THEME.text,
              }}
            >
              View Timeline
            </div>
            <div
              style={{
                fontSize: 10,
                color: dark ? THEME.dark.textMuted : THEME.textMuted,
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {events.length} event{events.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 18,
            color: dark ? THEME.dark.textMuted : THEME.textMuted,
          }}
        >
          ›
        </span>
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: dark ? THEME.dark.card : THEME.cardBg,
              borderRadius: THEME.radiusXl,
              padding: '22px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              fontFamily: THEME.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: `1px solid ${
                  dark ? THEME.dark.border : THEME.border
                }`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: dark ? THEME.dark.text : THEME.text,
                  }}
                >
                  📍 Location Timeline
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: dark ? THEME.dark.textMuted : THEME.textMuted,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {fmtDate(new Date(targetDate + 'T12:00:00+05:30').toISOString())}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  fontSize: 22,
                  color: dark ? THEME.dark.textMuted : THEME.textMuted,
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  paddingBottom: i < events.length - 1 ? 16 : 0,
                  position: 'relative',
                }}
              >
                {i < events.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: 26,
                      bottom: 0,
                      width: 2,
                      background: dark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                    }}
                  />
                )}

                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background:
                      e.type === 'checkin'
                        ? '#10B981'
                        : e.type === 'checkout'
                        ? '#EF4444'
                        : '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                    zIndex: 1,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  {e.type === 'checkin'
                    ? '✓'
                    : e.type === 'checkout'
                    ? '↑'
                    : '•'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: dark ? THEME.dark.text : THEME.text,
                    }}
                  >
                    {e.type === 'checkin'
                      ? 'Checked In'
                      : e.type === 'checkout'
                      ? 'Checked Out'
                      : 'Location Ping'}
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: dark
                          ? THEME.dark.textMuted
                          : THEME.textMuted,
                      }}
                    >
                      {fmtTime(e.time)}
                    </span>
                  </div>

                  {e.location_name ? (
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                        color: dark
                          ? THEME.dark.textSecondary
                          : THEME.textSecondary,
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      📍 {e.location_name}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                        color: dark
                          ? THEME.dark.textMuted
                          : THEME.textMuted,
                        fontStyle: 'italic',
                      }}
                    >
                      📍 Fetching address…
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: 13,
                marginTop: 18,
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: THEME.font,
                letterSpacing: 0.3,
                boxShadow: THEME.shadowGreen,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationTimeline;