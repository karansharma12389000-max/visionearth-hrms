// src/components/LiveMapPreview.jsx
//
// Two modes:
//   1. Single pin:  <LiveMapPreview lat={..} lng={..} accuracy={..} />
//   2. Route mode:  <LiveMapPreview route={[...points]} onPing={..} />
//
// Route mode:
//   ✅ Clickable pins (popup with time, location, coordinates)
//   ✅ Hover tooltips
//   ✅ Dashed line connecting all points
//   ✅ Neutral (white) Ping button with disabled state support

import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---------- Icon builders ----------

const blueIcon = new L.DivIcon({
  className: 'blue-pin',
  html: `
    <div style="
      width: 20px; height: 20px;
      background: #3B82F6;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 3px 10px rgba(59,130,246,0.6);
      position: relative;
    ">
      <div style="
        position: absolute; inset: -8px;
        border-radius: 50%;
        border: 2px solid rgba(59,130,246,0.4);
        animation: ping 1.5s infinite;
      "></div>
    </div>
    <style>
      @keyframes ping {
        0%   { transform: scale(0.6); opacity: 0.9; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const buildLabeledPin = ({ color, label, big = false }) =>
  new L.DivIcon({
    className: `pin-${color}`,
    html: `
      <div style="position: relative; width: ${big ? 28 : 24}px; height: ${big ? 28 : 24}px;">
        <div style="
          position: absolute;
          top: ${big ? '-30px' : '-28px'};
          left: 50%;
          transform: translateX(-50%);
          background: ${color};
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          pointer-events: none;
        ">${label}</div>
        <div style="
          width: ${big ? 24 : 20}px; height: ${big ? 24 : 20}px;
          background: ${color};
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 3px 10px ${color}99;
          cursor: pointer;
        "></div>
      </div>
    `,
    iconSize: [big ? 24 : 20, big ? 24 : 20],
    iconAnchor: [big ? 12 : 10, big ? 12 : 10],
    popupAnchor: [0, -14],
  });

// ---------- Helpers ----------

const FitBounds = ({ bounds, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    try {
      if (bounds.length === 1) {
        map.setView(bounds[0], 16);
      } else {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    } catch {}
  }, [bounds, trigger, map]);
  return null;
};

const Recenter = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

export const parseGps = (str) => {
  if (!str) return null;
  const parts = String(str).split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((n) => isNaN(n))) return null;
  return { lat: parts[0], lng: parts[1] };
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const shortLabel = (full) => {
  if (!full) return null;
  const parts = full.split(',').map((s) => s.trim());
  return parts.slice(0, 2).join(', ');
};

const getPinStyle = (p) => {
  if (p.type === 'checkin') {
    return { color: '#10B981', label: 'Check In', title: '✅ Checked In' };
  }
  if (p.type === 'checkout') {
    return { color: '#EF4444', label: 'Check Out', title: '↑ Checked Out' };
  }
  return {
    color: '#6366F1',
    label:
      shortLabel(p.location_name) ||
      `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`,
    title: '📍 Location Ping',
  };
};

// ==================================================
// MAIN COMPONENT
// ==================================================
export const LiveMapPreview = ({
  lat,
  lng,
  accuracy = 30,
  height = 220,
  route = null,
  onPing = null,
  pinging = false,
  cooldownActive = false,
  cooldownMinutes = 0,
  disabled = false,
  disabledLabel = 'Unavailable',
}) => {
  const [ready, setReady] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setFitTrigger((n) => n + 1);
  }, [route?.length]);

  // ---------- ROUTE MODE ----------
  if (route && route.length > 0) {
    const validPoints = route.filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
    const bounds = validPoints.map((p) => [p.lat, p.lng]);

    const isBlocked = pinging || cooldownActive || disabled;

    return (
      <div
        style={{
          position: 'relative',
          height,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}
      >
        {ready && (
          <MapContainer
            center={bounds[0] || [19.076, 72.8777]}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <FitBounds bounds={bounds} trigger={fitTrigger} />

            {bounds.length >= 2 && (
              <Polyline
                positions={bounds}
                pathOptions={{
                  color: '#6366F1',
                  weight: 3,
                  dashArray: '8 8',
                  opacity: 0.85,
                }}
              />
            )}

            {validPoints.map((p, i) => {
              const style = getPinStyle(p);
              const isEndpoint = p.type === 'checkin' || p.type === 'checkout';
              const icon = buildLabeledPin({
                color: style.color,
                label: style.label,
                big: isEndpoint,
              });

              return (
                <Marker key={i} position={[p.lat, p.lng]} icon={icon}>
                  <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      {style.title.replace(/^[^ ]+ /, '')} · {fmtTime(p.time)}
                    </div>
                  </Tooltip>

                  <Popup>
                    <div
                      style={{
                        minWidth: 180,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        padding: '2px 0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: style.color,
                          marginBottom: 6,
                        }}
                      >
                        {style.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#0F172A',
                          marginBottom: 4,
                        }}
                      >
                        🕐 {fmtTime(p.time)}
                      </div>
                      {p.location_name && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#334155',
                            lineHeight: 1.4,
                            marginBottom: 4,
                            wordBreak: 'break-word',
                          }}
                        >
                          📍 {p.location_name}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10,
                          color: '#64748B',
                          marginTop: 4,
                        }}
                      >
                        🌐 {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </div>
                      {p.accuracy != null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: '#64748B',
                            marginTop: 2,
                          }}
                        >
                          ±{Math.round(p.accuracy)}m accuracy
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 9,
                          color: '#94A3B8',
                          marginTop: 6,
                          fontWeight: 600,
                        }}
                      >
                        Event {i + 1} of {validPoints.length}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFFFFF',
            color: '#0F172A',
            padding: '7px 14px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 400,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#10B981' }}>●</span> In
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#6366F1' }}>●</span> Ping
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#EF4444' }}>●</span> Out
          </span>
          <span
            style={{
              marginLeft: 4,
              paddingLeft: 8,
              borderLeft: '1px solid rgba(0,0,0,0.1)',
              color: '#6B7280',
            }}
          >
            {validPoints.length}
          </span>
        </div>

        {/* Manual Ping button */}
        {onPing && (
          <button
            onClick={disabled ? undefined : onPing}
            disabled={isBlocked}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '999px',
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#FFFFFF',
              color: isBlocked ? '#94A3B8' : '#0F172A',
              fontSize: '12px',
              fontWeight: 800,
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              zIndex: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.3px',
              opacity: isBlocked ? 0.75 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            <span style={{ fontSize: 14 }}>
              {pinging
                ? '⏳'
                : disabled
                ? '🔒'
                : cooldownActive
                ? '🕐'
                : '📌'}
            </span>
            {pinging
              ? 'Pinging…'
              : disabled
              ? disabledLabel
              : cooldownActive
              ? `Next in ${cooldownMinutes}m`
              : 'Ping'}
          </button>
        )}
      </div>
    );
  }

  // ---------- SINGLE-PIN MODE ----------
  if (!lat || !lng) {
    return (
      <div
        style={{
          height,
          borderRadius: '16px',
          background: '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        📍 Waiting for location…
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      {ready && (
        <MapContainer
          center={[lat, lng]}
          zoom={17}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Recenter lat={lat} lng={lng} />
          <Circle
            center={[lat, lng]}
            radius={accuracy}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
          <Marker position={[lat, lng]} icon={blueIcon}>
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                You are here
              </div>
            </Tooltip>
            <Popup>
              <div
                style={{
                  minWidth: 160,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  padding: '2px 0',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#3B82F6',
                    marginBottom: 4,
                  }}
                >
                  📍 Current Location
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>
                  🌐 {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                  ±{Math.round(accuracy)}m accuracy
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FFFFFF',
          color: '#0F172A',
          padding: '8px 16px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 400,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#10B981', fontSize: '14px' }}>📍</span>
        Current Location
      </div>
    </div>
  );
};

export default LiveMapPreview;