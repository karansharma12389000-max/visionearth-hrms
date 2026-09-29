// src/utils/reverseGeocode.js
//
// Free reverse-geocoding via OpenStreetMap Nominatim.
// Returns { full, short }:
//   - full:  complete display_name
//   - short: compact label for pin bubbles
// Caches results.

const CACHE = new Map();

export const reverseGeocode = async (lat, lng) => {
  if (lat == null || lng == null) return { full: null, short: null };

  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (CACHE.has(key)) return CACHE.get(key);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      CACHE.set(key, { full: null, short: null });
      return { full: null, short: null };
    }

    const data = await res.json();
    const a = data.address || {};

    const full =
      data.display_name ||
      [
        a.house_number,
        a.road,
        a.suburb || a.neighbourhood || a.village || a.town,
        a.city || a.state_district || a.county,
        a.state,
        a.postcode,
        a.country,
      ]
        .filter(Boolean)
        .join(', ');

    const short =
      [
        a.suburb || a.neighbourhood || a.village || a.town,
        a.city || a.state_district || a.county,
      ]
        .filter(Boolean)
        .join(', ') ||
      data.display_name?.split(',').slice(0, 2).join(', ') ||
      null;

    const result = { full, short };
    CACHE.set(key, result);
    return result;
  } catch (err) {
    console.warn('Reverse geocode failed:', err.message);
    CACHE.set(key, { full: null, short: null });
    return { full: null, short: null };
  }
};

export default reverseGeocode;