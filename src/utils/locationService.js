// src/utils/locationService.js
//
// Vision Earth HRMS — Location Service
//
// ✅ HIGH ACCURACY GPS (target ≤ 150m, HARD REJECT > 500m)
// ✅ Detailed street-level address
// ✅ Any language (Kannada, Telugu, Hindi, English, mixed)
// ✅ Nominatim timeout (8s) — no hanging
// ✅ GPS timeout (15s) — no hanging
// ✅ Used by both Check-In and Check-Out

// ============================================
// CONFIG
// ============================================
const GPS_TIMEOUT_MS = 15000;
const NOMINATIM_TIMEOUT_MS = 8000;
const MAX_ACCEPTABLE_ACCURACY_M = 150;   // target (retry if worse)
const MAX_ALLOWED_ACCURACY_M = 500;      // HARD LIMIT — reject if worse
const MAX_ADDRESS_DRIFT_M = 1000;        // Nominatim must be within 1km
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'VisionEarthHRMS/1.0 (contact@visionearth.com)';

// ============================================
// HAVERSINE — meters between two coords
// ============================================
const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ============================================
// FETCH WITH TIMEOUT
// ============================================
const fetchWithTimeout = (url, options = {}, ms = NOMINATIM_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
};

// ============================================
// IS THIS A PROPER ADDRESS?
// ============================================
export const isValidAddress = (str) => {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length < 4) return false;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s)) return false;
  return true;
};

// ============================================
// BUILD DETAILED ADDRESS
// ============================================
export const buildAddress = (nominatimData) => {
  if (!nominatimData) return '';
  const a = nominatimData.address || {};

  const ordered = [
    a.house_number,
    a.building || a.amenity || a.shop || a.office,
    a.road || a.pedestrian || a.footway || a.path || a.street,
    a.neighbourhood || a.quarter || a.block,
    a.suburb || a.hamlet || a.village,
    a.city_district,
    a.city || a.town || a.municipality,
    a.county,
    a.state_district,
    a.state,
    a.postcode,
    a.country,
  ];

  const seen = new Set();
  const parts = [];
  for (const raw of ordered) {
    if (!raw) continue;
    const p = String(raw).trim();
    if (!p) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(p);
  }

  if (parts.length >= 2) return parts.join(', ');

  const display = (nominatimData.display_name || '').trim();
  if (display) return display;

  return parts.join(', ');
};

// ============================================
// GET PRECISE GPS COORDS
// - Rejects if accuracy > 500m (hard)
// - Retries once if accuracy > 150m
// ============================================
const getPreciseCoords = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: 'Geolocation is not supported' });
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ error: 'Location request timed out' });
    }, GPS_TIMEOUT_MS);

    const failHard = (acc) => {
      settled = true;
      clearTimeout(timeoutId);
      resolve({
        error: `GPS accuracy too low (${Math.round(
          acc
        )}m) — max 500m allowed. Move to open area and tap refresh`,
      });
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        const acc = position.coords.accuracy;

        // HARD REJECT — beyond 500m
        if (acc && acc > MAX_ALLOWED_ACCURACY_M) {
          navigator.geolocation.getCurrentPosition(
            (p2) => {
              if (settled) return;
              const acc2 = p2.coords.accuracy;
              if (acc2 && acc2 > MAX_ALLOWED_ACCURACY_M) {
                failHard(acc2);
                return;
              }
              settled = true;
              clearTimeout(timeoutId);
              resolve({
                lat: p2.coords.latitude,
                lng: p2.coords.longitude,
                accuracy: acc2,
              });
            },
            () => {
              if (settled) return;
              failHard(acc);
            },
            {
              enableHighAccuracy: true,
              timeout: GPS_TIMEOUT_MS,
              maximumAge: 0,
            }
          );
          return;
        }

        // WARNING ZONE (150–500m) — retry once for better
        if (acc && acc > MAX_ACCEPTABLE_ACCURACY_M) {
          navigator.geolocation.getCurrentPosition(
            (p2) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              resolve({
                lat: p2.coords.latitude,
                lng: p2.coords.longitude,
                accuracy: p2.coords.accuracy,
              });
            },
            () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              // Accept first fix anyway — it's within 500m
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: acc,
              });
            },
            {
              enableHighAccuracy: true,
              timeout: GPS_TIMEOUT_MS,
              maximumAge: 0,
            }
          );
          return;
        }

        // Good fix (≤150m)
        settled = true;
        clearTimeout(timeoutId);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: acc,
        });
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        let msg = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED)
          msg = 'Location permission denied';
        else if (error.code === error.POSITION_UNAVAILABLE)
          msg = 'Location unavailable';
        else if (error.code === error.TIMEOUT) msg = 'Location timed out';
        resolve({ error: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  });
};

// ============================================
// REVERSE GEOCODE
// ============================================
const reverseGeocode = async (lat, lng) => {
  try {
    const url =
      `${NOMINATIM_URL}?` +
      `format=jsonv2` +
      `&lat=${lat}` +
      `&lon=${lng}` +
      `&zoom=18` +
      `&addressdetails=1` +
      `&namedetails=1`;

    const res = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': USER_AGENT } },
      NOMINATIM_TIMEOUT_MS
    );

    const data = await res.json();

    // Drift check
    const returnedLat = parseFloat(data.lat);
    const returnedLng = parseFloat(data.lon);
    if (!Number.isNaN(returnedLat) && !Number.isNaN(returnedLng)) {
      const drift = distanceMeters(lat, lng, returnedLat, returnedLng);
      if (drift > MAX_ADDRESS_DRIFT_M) {
        return {
          address: '',
          raw: data,
          error: `Address is too far from GPS (${Math.round(
            drift
          )}m off) — tap refresh to retry`,
        };
      }
    }

    return { address: buildAddress(data), raw: data, error: null };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return { address: '', raw: null, error: 'Could not fetch address' };
  }
};

// ============================================
// PUBLIC API
// ============================================
export const getCurrentLocationDetailed = async () => {
  const coords = await getPreciseCoords();

  if (coords.error) {
    return { error: coords.error };
  }

  const { lat, lng, accuracy } = coords;
  const { address, raw, error: geoError } = await reverseGeocode(lat, lng);

  const accuracyOk =
    typeof accuracy === 'number' && accuracy <= MAX_ACCEPTABLE_ACCURACY_M;

  if (geoError) {
    return {
      lat,
      lng,
      accuracy,
      accuracyOk,
      address: '',
      raw,
      error: geoError,
    };
  }

  if (!isValidAddress(address)) {
    return {
      lat,
      lng,
      accuracy,
      accuracyOk,
      address: '',
      raw,
      error: 'Address unavailable — tap refresh to retry',
    };
  }

  return {
    lat,
    lng,
    accuracy,
    accuracyOk,
    address,
    raw,
    error: null,
  };
};

// ============================================
// EXPORTS
// ============================================
export const LOCATION_CONFIG = {
  GPS_TIMEOUT_MS,
  NOMINATIM_TIMEOUT_MS,
  MAX_ACCEPTABLE_ACCURACY_M,
  MAX_ALLOWED_ACCURACY_M,
  MAX_ADDRESS_DRIFT_M,
};

export default {
  getCurrentLocationDetailed,
  isValidAddress,
  buildAddress,
  LOCATION_CONFIG,
};