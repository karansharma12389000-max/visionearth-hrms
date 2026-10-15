// src/components/TimelinePDFExporter.jsx
//
// Vision Earth HRMS — Timeline Monthly PDF Exporter (v9 — Full Address)
//
// ✅ Full location addresses (no truncation) with word wrap
// ✅ Bold, high-contrast text in the dark table
// ✅ Dynamic row height based on address length
// ✅ Full dark theme PDF
// ✅ No map images, no dead code
//
// REQUIRES: jspdf

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabase';
import { getMonthName } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import { THEME, isDark } from '../utils/designTokens';

// ============================================
// DARK THEME PALETTE
// ============================================
const DARK = {
  bg: [10, 15, 20],
  cardBg: [20, 27, 38],
  cardBgAlt: [25, 33, 45],
  border: [45, 55, 72],
  text: [245, 250, 255],
  textDim: [210, 220, 235],
  textMuted: [150, 165, 185],
  accent: [16, 185, 129],
  accentDark: [5, 150, 105],
  accentLight: [52, 211, 153],
  red: [248, 113, 113],
  amber: [251, 191, 36],
  blue: [96, 165, 250],
  purple: [167, 139, 250],
};

// ============================================
// HELPERS
// ============================================
const pad2 = (n) => String(n).padStart(2, '0');

const resolveLocationLabel = (address, gps) => {
  const trimmed = (address || '').trim();
  if (trimmed) return trimmed;
  if (typeof gps === 'string' && gps.trim()) {
    const parts = gps.split(',').map((s) => parseFloat(s.trim()));
    if (
      parts.length === 2 &&
      Number.isFinite(parts[0]) &&
      Number.isFinite(parts[1])
    ) {
      return `${parts[0].toFixed(5)}, ${parts[1].toFixed(5)}`;
    }
  }
  return null;
};

const parseAttendanceTime = (dateStr, timeVal) => {
  if (!timeVal) return null;
  if (typeof timeVal === 'string' && timeVal.includes('T')) {
    const d = new Date(timeVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (
    typeof timeVal === 'string' &&
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal.trim())
  ) {
    if (!dateStr) return null;
    const t = timeVal.trim();
    const withSeconds = t.length === 5 ? `${t}:00` : t;
    const d = new Date(`${dateStr}T${withSeconds}+05:30`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const fmtTimeOnly = (d) => {
  if (!d) return '—';
  try {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const fmtDateLong = (dateStr) => {
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const statusInfo = (s) => {
  const map = {
    P: { label: 'Present', color: DARK.accent },
    A: { label: 'Absent', color: DARK.red },
    D: { label: 'Delayed', color: DARK.amber },
    B: { label: 'Beyond Delay', color: DARK.red },
    L: { label: 'Leave', color: DARK.blue },
    F: { label: 'Forgot Out', color: [249, 115, 22] },
  };
  return map[s] || { label: s || '—', color: DARK.textMuted };
};

// ============================================
// FETCH EVENTS FOR A SINGLE DAY
// ============================================
const fetchDayEvents = async (employeeId, dateStr) => {
  if (!employeeId || !dateStr) return { events: [], summary: null };

  const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();

  const [pingsRes, cioRes, attRes] = await Promise.all([
    supabase
      .from('location_pings')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('ping_time', dayStart)
      .lte('ping_time', dayEnd)
      .order('ping_time', { ascending: true }),

    supabase
      .from('check_in_out')
      .select(
        'id, check_in_time, check_out_time, check_in_address, check_out_address, check_in_gps, check_out_gps, status'
      )
      .eq('employee_id', employeeId)
      .gte('check_in_time', dayStart)
      .lte('check_in_time', dayEnd)
      .order('check_in_time', { ascending: false })
      .limit(1),

    supabase
      .from('attendance')
      .select(
        'id, attendance_date, status, check_in_time, check_out_time, check_in_location, check_out_location, check_in_gps, check_out_gps, working_hours, remarks'
      )
      .eq('employee_id', employeeId)
      .eq('attendance_date', dateStr)
      .limit(1),
  ]);

  const pingsData = pingsRes.data || [];
  const cio = (cioRes.data && cioRes.data[0]) || null;
  const att = (attRes.data && attRes.data[0]) || null;

  const checkInAddress =
    (cio && cio.check_in_address) ||
    (att && att.check_in_location) ||
    null;
  const checkOutAddress =
    (cio && cio.check_out_address) ||
    (att && att.check_out_location) ||
    null;
  const checkInGps =
    (cio && cio.check_in_gps) || (att && att.check_in_gps) || null;
  const checkOutGps =
    (cio && cio.check_out_gps) || (att && att.check_out_gps) || null;

  const checkInTime =
    (cio && cio.check_in_time) ||
    (att && parseAttendanceTime(dateStr, att.check_in_time));
  const checkOutTime =
    (cio && cio.check_out_time) ||
    (att && parseAttendanceTime(dateStr, att.check_out_time));

  const events = [];

  if (checkInTime && checkInGps) {
    const dt = checkInTime instanceof Date ? checkInTime : new Date(checkInTime);
    if (!isNaN(dt.getTime())) {
      events.push({
        type: 'checkin',
        time: dt.toISOString(),
        location_name: resolveLocationLabel(checkInAddress, checkInGps),
      });
    }
  }

  pingsData.forEach((p) => {
    events.push({
      type: 'ping',
      time: p.ping_time,
      location_name: p.location_name || null,
    });
  });

  if (checkOutTime && checkOutGps) {
    const dt =
      checkOutTime instanceof Date ? checkOutTime : new Date(checkOutTime);
    if (!isNaN(dt.getTime())) {
      events.push({
        type: 'checkout',
        time: dt.toISOString(),
        location_name: resolveLocationLabel(checkOutAddress, checkOutGps),
      });
    }
  }

  events.sort((a, b) => new Date(a.time) - new Date(b.time));

  const totalPings = events.filter((e) => e.type === 'ping').length;
  const hasCheckIn = events.some((e) => e.type === 'checkin');
  const hasCheckOut = events.some((e) => e.type === 'checkout');
  const checkInEvent = events.find((e) => e.type === 'checkin');
  const checkOutEvent = events.find((e) => e.type === 'checkout');

  const summary = {
    status: att?.status || null,
    totalEvents: events.length,
    totalPings,
    hasCheckIn,
    hasCheckOut,
    checkInTime: checkInEvent
      ? fmtTimeOnly(new Date(checkInEvent.time))
      : '—',
    checkOutTime: checkOutEvent
      ? fmtTimeOnly(new Date(checkOutEvent.time))
      : '—',
    workingHours: att?.working_hours ?? null,
  };

  return { events, summary };
};

// ============================================
// MAIN COMPONENT
// ============================================
export const TimelinePDFExporter = ({ employeeId, employeeName }) => {
  const { theme } = useTheme();
  const dark = isDark(theme);

  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  // ============================================
  // GENERATE PDF
  // ============================================
  const generatePDF = async () => {
    if (!employeeId) {
      toast.error('Please select an employee first');
      return;
    }

    try {
      setGenerating(true);
      setProgress('Preparing...');

      const mm = pad2(exportMonth);
      const lastDay = new Date(exportYear, exportMonth, 0).getDate();
      const todayIST = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

      const allDays = Array.from({ length: lastDay }, (_, i) => {
        const day = i + 1;
        return `${exportYear}-${mm}-${pad2(day)}`;
      }).filter((d) => d <= todayIST);

      if (allDays.length === 0) {
        toast.error('No days to export for this month');
        setGenerating(false);
        return;
      }

      setProgress(`Fetching ${allDays.length} days…`);
      const fetchPromises = allDays.map(async (d) => {
        try {
          const res = await fetchDayEvents(employeeId, d);
          return { date: d, ...res };
        } catch (err) {
          console.warn('Fetch error for', d, err);
          return { date: d, events: [], summary: null };
        }
      });

      const dayData = await Promise.all(fetchPromises);
      setProgress('Building PDF...');

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const nonEmptyDays = dayData.filter((d) => d.events.length > 0);
      const pagesToRender = nonEmptyDays.length > 0 ? nonEmptyDays : dayData;

      const totalDays = pagesToRender.length;
      const totalEvents = pagesToRender.reduce(
        (sum, d) => sum + d.events.length,
        0
      );
      const totalPings = pagesToRender.reduce(
        (sum, d) => sum + (d.summary?.totalPings || 0),
        0
      );

      const paintDarkBg = () => {
        pdf.setFillColor(DARK.bg[0], DARK.bg[1], DARK.bg[2]);
        pdf.rect(0, 0, pageW, pageH, 'F');
      };

      // ═══════════════════════════════════════
      // COVER PAGE
      // ═══════════════════════════════════════
      paintDarkBg();

      pdf.setFillColor(4, 47, 46);
      pdf.rect(0, 0, pageW, 95, 'F');
      pdf.setFillColor(6, 78, 59);
      pdf.rect(0, 0, pageW, 88, 'F');
      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.rect(0, 0, pageW, 4, 'F');
      pdf.setFillColor(DARK.accentDark[0], DARK.accentDark[1], DARK.accentDark[2]);
      pdf.rect(0, 88, pageW, 3, 'F');

      pdf.setFillColor(24, 220, 160);
      for (let dx = 0; dx < 5; dx++) {
        for (let dy = 0; dy < 5; dy++) {
          pdf.circle(pageW - 20 - dx * 5, 20 + dy * 5, 0.8, 'F');
        }
      }
      pdf.setFillColor(6, 78, 59);
      pdf.rect(pageW - 50, 12, 50, 40, 'F');

      pdf.setFillColor(8, 120, 85);
      pdf.circle(pageW - 25, 70, 20, 'F');
      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.circle(pageW - 25, 70, 14, 'F');
      pdf.setFillColor(6, 78, 59);
      pdf.circle(pageW - 25, 70, 8, 'F');

      pdf.setFillColor(255, 255, 255);
      pdf.circle(26, 28, 9, 'F');
      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.circle(26, 28, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('VE', 26, 30, { align: 'center' });

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(30);
      pdf.text('VISION EARTH', 42, 25);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(167, 243, 208);
      pdf.text('HUMAN RESOURCE MANAGEMENT SYSTEM', 42, 32);

      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.rect(42, 36, 30, 1, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Employee', 20, 60);
      pdf.text('Timeline Report', 20, 72);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(167, 243, 208);
      pdf.text('MONTHLY ATTENDANCE & ACTIVITY SUMMARY', 20, 81);

      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.rect(0, 91, pageW, 2, 'F');

      const badgeX = pageW - 60;
      const badgeY = 68;
      const badgeW = 45;
      const badgeH = 34;

      pdf.setFillColor(0, 0, 0);
      pdf.roundedRect(badgeX + 1, badgeY + 1, badgeW, badgeH, 5, 5, 'F');
      pdf.setFillColor(DARK.cardBg[0], DARK.cardBg[1], DARK.cardBg[2]);
      pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, 'F');
      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.roundedRect(badgeX, badgeY, badgeW, 4, 5, 5, 'F');
      pdf.rect(badgeX, badgeY + 3, badgeW, 2, 'F');

      pdf.setTextColor(DARK.accentLight[0], DARK.accentLight[1], DARK.accentLight[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text(
        getMonthName(exportMonth).toUpperCase().slice(0, 3),
        badgeX + badgeW / 2,
        badgeY + 18,
        { align: 'center' }
      );

      pdf.setTextColor(DARK.textDim[0], DARK.textDim[1], DARK.textDim[2]);
      pdf.setFontSize(13);
      pdf.text(String(exportYear), badgeX + badgeW / 2, badgeY + 28, {
        align: 'center',
      });

      let y = 115;

      pdf.setFillColor(DARK.cardBgAlt[0], DARK.cardBgAlt[1], DARK.cardBgAlt[2]);
      pdf.roundedRect(20, y, pageW - 40, 42, 4, 4, 'F');
      pdf.setDrawColor(DARK.border[0], DARK.border[1], DARK.border[2]);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(20, y, pageW - 40, 42, 4, 4, 'S');

      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.roundedRect(20, y, 3, 42, 4, 4, 'F');
      pdf.rect(21.5, y, 1.5, 42, 'F');

      pdf.setTextColor(DARK.accentLight[0], DARK.accentLight[1], DARK.accentLight[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('EMPLOYEE', 28, y + 8);

      pdf.setTextColor(DARK.text[0], DARK.text[1], DARK.text[2]);
      pdf.setFontSize(22);
      pdf.text(employeeName || 'Employee', 28, y + 20);

      pdf.setTextColor(DARK.textDim[0], DARK.textDim[1], DARK.textDim[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(
        `Report Period:  ${getMonthName(exportMonth)} ${exportYear}`,
        28,
        y + 29
      );
      pdf.text(
        `Generated:  ${new Date().toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
        28,
        y + 36
      );

      pdf.setTextColor(DARK.textMuted[0], DARK.textMuted[1], DARK.textMuted[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('VISION EARTH HRMS', pageW - 26, y + 36, {
        align: 'right',
      });

      // KPI CARDS
      y += 60;

      const cards = [
        {
          value: totalDays,
          label: 'DAYS WITH ACTIVITY',
          sub: 'active days',
          color: [16, 185, 129],
          darkColor: [5, 150, 105],
          icon: 'date',
        },
        {
          value: totalEvents,
          label: 'TOTAL EVENTS',
          sub: 'check-ins + pings',
          color: [59, 130, 246],
          darkColor: [37, 99, 235],
          icon: 'chart',
        },
        {
          value: totalPings,
          label: 'TOTAL PINGS',
          sub: 'location updates',
          color: [139, 92, 246],
          darkColor: [124, 58, 237],
          icon: 'pin',
        },
      ];

      const cardW = (pageW - 40 - 8) / 3;
      const cardH = 44;

      cards.forEach((c, i) => {
        const x = 20 + i * (cardW + 4);

        pdf.setFillColor(0, 0, 0);
        pdf.roundedRect(x + 1, y + 1.2, cardW, cardH, 4, 4, 'F');

        pdf.setFillColor(c.color[0], c.color[1], c.color[2]);
        pdf.roundedRect(x, y, cardW, cardH, 4, 4, 'F');

        pdf.setFillColor(
          Math.min(255, c.color[0] + 25),
          Math.min(255, c.color[1] + 25),
          Math.min(255, c.color[2] + 25)
        );
        pdf.roundedRect(x, y, cardW, cardH / 2, 4, 4, 'F');
        pdf.rect(x, y + cardH / 2 - 2, cardW, 2, 'F');

        const iconCX = x + 12;
        const iconCY = y + 13;
        pdf.setFillColor(255, 255, 255);
        pdf.circle(iconCX, iconCY, 5.5, 'F');

        pdf.setDrawColor(c.color[0], c.color[1], c.color[2]);
        pdf.setFillColor(c.color[0], c.color[1], c.color[2]);
        pdf.setLineWidth(0.5);

        if (c.icon === 'date') {
          pdf.roundedRect(iconCX - 3, iconCY - 2.5, 6, 5, 0.6, 0.6, 'S');
          pdf.setLineWidth(0.8);
          pdf.line(iconCX - 3, iconCY - 0.8, iconCX + 3, iconCY - 0.8);
          pdf.line(iconCX - 1.5, iconCY - 3.5, iconCX - 1.5, iconCY - 1.5);
          pdf.line(iconCX + 1.5, iconCY - 3.5, iconCX + 1.5, iconCY - 1.5);
          pdf.circle(iconCX - 1, iconCY + 1.2, 0.4, 'F');
          pdf.circle(iconCX + 1, iconCY + 1.2, 0.4, 'F');
        } else if (c.icon === 'chart') {
          pdf.roundedRect(iconCX - 3, iconCY + 0.2, 1.3, 2.3, 0.2, 0.2, 'F');
          pdf.roundedRect(iconCX - 0.7, iconCY - 1.3, 1.3, 3.8, 0.2, 0.2, 'F');
          pdf.roundedRect(iconCX + 1.6, iconCY - 2.3, 1.3, 4.8, 0.2, 0.2, 'F');
        } else if (c.icon === 'pin') {
          pdf.circle(iconCX, iconCY - 0.8, 2, 'F');
          pdf.triangle(
            iconCX - 1.3,
            iconCY + 0.5,
            iconCX + 1.3,
            iconCY + 0.5,
            iconCX,
            iconCY + 3,
            'F'
          );
          pdf.setFillColor(255, 255, 255);
          pdf.circle(iconCX, iconCY - 0.8, 0.7, 'F');
        }

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(30);
        pdf.text(String(c.value), x + 24, y + 18);

        pdf.setFontSize(6.5);
        pdf.text(c.label, x + 6, y + 30);

        const subText = c.sub;
        const subW = subText.length * 1.3 + 6;
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x + 6, y + 33, subW, 6, 3, 3, 'F');
        pdf.setTextColor(c.darkColor[0], c.darkColor[1], c.darkColor[2]);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(5.5);
        pdf.text(subText, x + 6 + subW / 2, y + 37, { align: 'center' });

        pdf.setFillColor(
          Math.min(255, c.color[0] + 60),
          Math.min(255, c.color[1] + 60),
          Math.min(255, c.color[2] + 60)
        );
        pdf.circle(x + cardW - 6, y + cardH - 6, 2, 'F');
      });

      const footerY = pageH - 30;

      pdf.setDrawColor(DARK.border[0], DARK.border[1], DARK.border[2]);
      pdf.setLineWidth(0.3);
      pdf.line(20, footerY, pageW - 20, footerY);

      pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
      pdf.circle(pageW / 2 - 40, footerY + 10, 2, 'F');
      pdf.circle(pageW / 2 + 40, footerY + 10, 2, 'F');

      pdf.setTextColor(DARK.textDim[0], DARK.textDim[1], DARK.textDim[2]);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        'People  ·  Projects  ·  A Greener Tomorrow',
        pageW / 2,
        footerY + 10,
        { align: 'center' }
      );

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(DARK.textMuted[0], DARK.textMuted[1], DARK.textMuted[2]);
      pdf.text('Vision Earth HRMS v1.0', pageW / 2, footerY + 17, {
        align: 'center',
      });

      // ═══════════════════════════════════════
      // DAY PAGES
      // ═══════════════════════════════════════
      for (let i = 0; i < pagesToRender.length; i++) {
        const { date, events, summary } = pagesToRender[i];
        setProgress(`Rendering ${i + 1} / ${pagesToRender.length}...`);

        pdf.addPage();
        paintDarkBg();

        pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
        pdf.rect(0, 0, pageW, 4, 'F');

        pdf.setFillColor(6, 78, 59);
        pdf.rect(0, 4, pageW, 26, 'F');

        pdf.setFillColor(DARK.accentDark[0], DARK.accentDark[1], DARK.accentDark[2]);
        pdf.rect(0, 30, pageW, 1, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('VISION EARTH', 14, 14);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(167, 243, 208);
        pdf.text('EMPLOYEE TIMELINE REPORT', 14, 20);

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(employeeName || 'Employee', pageW - 14, 14, {
          align: 'right',
        });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(167, 243, 208);
        pdf.text(fmtDateLong(date), pageW - 14, 20, {
          align: 'right',
        });

        pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
        pdf.roundedRect(pageW - 30, 4 + 22, 24, 6, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${i + 1} / ${pagesToRender.length}`, pageW - 18, 30.2, {
          align: 'center',
        });

        let cursorY = 38;

        const statusChip = statusInfo(summary?.status);

        const chips = [
          {
            label: 'Status',
            value: statusChip.label,
            color: statusChip.color,
          },
          {
            label: 'Check-In',
            value: summary?.checkInTime || '—',
            color: DARK.accent,
          },
          {
            label: 'Check-Out',
            value: summary?.checkOutTime || '—',
            color: DARK.red,
          },
          {
            label: 'Pings',
            value: String(summary?.totalPings || 0),
            color: DARK.purple,
          },
          {
            label: 'Hours',
            value:
              summary?.workingHours != null
                ? `${summary.workingHours}h`
                : '—',
            color: DARK.blue,
          },
        ];

        const chipW = (pageW - 24 - (chips.length - 1) * 3) / chips.length;
        const chipH = 18;

        chips.forEach((c, ci) => {
          const x = 12 + ci * (chipW + 3);

          pdf.setFillColor(DARK.cardBgAlt[0], DARK.cardBgAlt[1], DARK.cardBgAlt[2]);
          pdf.roundedRect(x, cursorY, chipW, chipH, 2, 2, 'F');

          pdf.setFillColor(c.color[0], c.color[1], c.color[2]);
          pdf.roundedRect(x, cursorY, 1.8, chipH, 1, 1, 'F');

          pdf.setDrawColor(DARK.border[0], DARK.border[1], DARK.border[2]);
          pdf.setLineWidth(0.15);
          pdf.roundedRect(x, cursorY, chipW, chipH, 2, 2, 'S');

          pdf.setTextColor(DARK.textMuted[0], DARK.textMuted[1], DARK.textMuted[2]);
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.text(c.label.toUpperCase(), x + 5, cursorY + 6);

          pdf.setTextColor(DARK.text[0], DARK.text[1], DARK.text[2]);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(c.value, x + 5, cursorY + 14);
        });

        cursorY += chipH + 8;

        pdf.setTextColor(DARK.text[0], DARK.text[1], DARK.text[2]);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Activity Log', 14, cursorY);

        const countText = String(events.length);
        const pillW = 4 + countText.length * 2.2;
        pdf.setFillColor(DARK.accent[0], DARK.accent[1], DARK.accent[2]);
        pdf.roundedRect(14 + 30, cursorY - 4, pillW, 6, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(countText, 14 + 30 + pillW / 2, cursorY + 0.2, {
          align: 'center',
        });

        cursorY += 4;

        // ── TABLE ──
        const tableLeft = 12;
        const tableRight = pageW - 12;
        const tableWidth = tableRight - tableLeft;

        // Column widths (mm)
        const colNum = 10;
        const colTime = 20;
        const colType = 22;
        const colEventId = 30;
        const colLoc = tableWidth - colNum - colTime - colType - colEventId;

        const colStarts = [
          tableLeft,
          tableLeft + colNum,
          tableLeft + colNum + colTime,
          tableLeft + colNum + colTime + colType,
          tableLeft + colNum + colTime + colType + colLoc,
        ];

        // Header row
        pdf.setFillColor(6, 78, 59);
        pdf.rect(tableLeft, cursorY, tableWidth, 8, 'F');
        pdf.setTextColor(167, 243, 208);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('#', colStarts[0] + 3, cursorY + 5.4);
        pdf.text('TIME', colStarts[1] + 2, cursorY + 5.4);
        pdf.text('TYPE', colStarts[2] + 2, cursorY + 5.4);
        pdf.text('LOCATION', colStarts[3] + 2, cursorY + 5.4);
        pdf.text('EVENT ID', colStarts[4] + 2, cursorY + 5.4);
        cursorY += 8;

        const maxY = pageH - 20;
        const minRowH = 9;
        let shown = 0;

        for (let j = 0; j < events.length; j++) {
          const e = events[j];
          const idx = j + 1;
          const time = fmtTimeOnly(new Date(e.time));
          const type =
            e.type === 'checkin'
              ? 'Check-In'
              : e.type === 'checkout'
              ? 'Check-Out'
              : 'Ping';
          const fullAddress = e.location_name || '—';
          const eventId = `${String(date).replace(/-/g, '')}-${pad2(idx)}`;

          // ── Word-wrap the address ──
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          const wrappedLines = pdf.splitTextToSize(
            fullAddress,
            colLoc - 4
          );
          const visibleLines = wrappedLines.slice(0, 4); // cap at 4 lines
          const rowH = Math.max(minRowH, visibleLines.length * 4 + 4);

          if (cursorY + rowH > maxY) break;

          // Alternate row bg
          if (j % 2 === 0) {
            pdf.setFillColor(DARK.cardBg[0], DARK.cardBg[1], DARK.cardBg[2]);
            pdf.rect(tableLeft, cursorY, tableWidth, rowH, 'F');
          }

          // Row bottom border
          pdf.setDrawColor(DARK.border[0], DARK.border[1], DARK.border[2]);
          pdf.setLineWidth(0.1);
          pdf.line(tableLeft, cursorY + rowH, tableRight, cursorY + rowH);

          // Column dividers
          for (let c = 1; c < colStarts.length; c++) {
            pdf.line(colStarts[c], cursorY, colStarts[c], cursorY + rowH);
          }

          // Row content
          const baselineY = cursorY + 5.9;

          // #
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(255, 255, 255);
          pdf.text(String(idx), colStarts[0] + 3, baselineY);

          // Time
          pdf.text(time, colStarts[1] + 2, baselineY);

          // Type (colored)
          const typeColor =
            e.type === 'checkin'
              ? DARK.accent
              : e.type === 'checkout'
              ? DARK.red
              : DARK.purple;
          pdf.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
          pdf.text(type, colStarts[2] + 2, baselineY);

          // Location — wrapped, full text
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8);
          visibleLines.forEach((line, li) => {
            pdf.text(line, colStarts[3] + 2, baselineY + li * 4);
          });

          // Event ID (top-aligned with first line)
          pdf.setTextColor(DARK.textDim[0], DARK.textDim[1], DARK.textDim[2]);
          pdf.setFontSize(7.5);
          pdf.text(eventId, colStarts[4] + 2, baselineY);

          cursorY += rowH;
          shown++;
        }

        if (shown < events.length) {
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(DARK.textMuted[0], DARK.textMuted[1], DARK.textMuted[2]);
          pdf.text(
            `+ ${events.length - shown} more events — see app for full list`,
            12,
            pageH - 14
          );
        }

        // Footer
        pdf.setDrawColor(DARK.border[0], DARK.border[1], DARK.border[2]);
        pdf.setLineWidth(0.3);
        pdf.line(12, pageH - 10, pageW - 12, pageH - 10);

        pdf.setFontSize(7);
        pdf.setTextColor(DARK.textMuted[0], DARK.textMuted[1], DARK.textMuted[2]);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Generated by Vision Earth HRMS', 12, pageH - 6);
        pdf.text(
          `Page ${i + 1} of ${pagesToRender.length}`,
          pageW - 12,
          pageH - 6,
          { align: 'right' }
        );
      }

      const safeName = (employeeName || 'Employee')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 30);
      const fileName = `${safeName}-${getMonthName(exportMonth)}-${exportYear}-dark.pdf`;

      pdf.save(fileName);

      toast.success(`Downloaded ${fileName}`);
      setShowModal(false);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
      setProgress('');
    }
  };

  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const border = dark ? THEME.dark.border : THEME.border;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Download monthly PDF"
        aria-label="Download monthly PDF"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          background: dark
            ? 'rgba(59,130,246,0.15)'
            : 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
          padding: 0,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={THEME.blue}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4 20h16" />
        </svg>
      </button>

      {showModal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => {
              if (generating) return;
              setShowModal(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusXl,
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: textPrimary,
                  margin: 0,
                  marginBottom: '6px',
                }}
              >
                📄 Download Monthly PDF
              </h3>

              <div
                style={{
                  fontSize: '11px',
                  color: textMuted,
                  marginBottom: '18px',
                  fontWeight: 500,
                }}
              >
                {employeeName || 'Employee'} — pick month &amp; year
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(parseInt(e.target.value))}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: THEME.font,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>

                <select
                  value={exportYear}
                  onChange={(e) => setExportYear(parseInt(e.target.value))}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: THEME.font,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {generating && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: dark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
                    border: `1px solid ${THEME.blue}40`,
                    color: THEME.blue,
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '14px',
                    textAlign: 'center',
                  }}
                >
                  ⏳ {progress || 'Working…'}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={generating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    background: 'transparent',
                    color: textSecondary,
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    fontFamily: THEME.font,
                    opacity: generating ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={generatePDF}
                  disabled={generating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: THEME.radiusMd,
                    border: 'none',
                    background: generating
                      ? '#94A3B8'
                      : `linear-gradient(135deg, ${THEME.blue}, #2563EB)`,
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    boxShadow: generating
                      ? 'none'
                      : '0 4px 14px rgba(59,130,246,0.35)',
                    fontFamily: THEME.font,
                    letterSpacing: '0.3px',
                  }}
                >
                  {generating ? 'Generating…' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default TimelinePDFExporter;