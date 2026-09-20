// src/pages/admin/Holidays.jsx

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { formatDate, getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminHolidays = () => {
  const { theme } = useTheme();
  const dark = isDark(theme);

  // ✅ FIX: derive current month/year from IST calendar
  const _istNow = new Date();
  const _istMonth = parseInt(
    _istNow.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      month: '2-digit',
    })
  );
  const _istYear = parseInt(
    _istNow.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    })
  );

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter state — default to current IST month/year
  const [filterMonth, setFilterMonth] = useState(_istMonth);
  const [filterYear, setFilterYear] = useState(_istYear);
  const [showAll, setShowAll] = useState(false);

  // Add form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  // Edit modal state
  const [editing, setEditing] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');

  // Delete confirm state
  const [deleting, setDeleting] = useState(null);

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: false });
      if (error) throw error;
      setHolidays(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // ============================================
  // FILTERED LIST
  // ============================================
  const filteredHolidays = useMemo(() => {
    if (showAll) return holidays;

    const monthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
    return holidays.filter((h) => h.holiday_date?.startsWith(monthStr));
  }, [holidays, filterMonth, filterYear, showAll]);

  // ============================================
  // ADD
  // ============================================
  const handleAdd = async () => {
    if (!holidayDate) {
      toast.error('Select a date');
      return;
    }
    if (!holidayName.trim()) {
      toast.error('Enter holiday name');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('holidays').insert({
        holiday_date: holidayDate,
        name: holidayName.trim(),
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Holiday already exists on this date');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`✅ ${holidayName} added`);
      setHolidayDate('');
      setHolidayName('');
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // EDIT
  // ============================================
  const openEdit = (holiday) => {
    setEditing(holiday);
    setEditDate(holiday.holiday_date);
    setEditName(holiday.name);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editDate) {
      toast.error('Select a date');
      return;
    }
    if (!editName.trim()) {
      toast.error('Enter holiday name');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('holidays')
        .update({
          holiday_date: editDate,
          name: editName.trim(),
        })
        .eq('id', editing.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Another holiday already exists on this date');
        } else {
          throw error;
        }
        return;
      }

      toast.success('✅ Holiday updated');
      setEditing(null);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // DELETE
  // ============================================
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', deleting.id);
      if (error) throw error;
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

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
      {/* HEADER */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: THEME.radius2xl,
            padding: '20px',
            boxShadow: dark ? THEME.shadowDark : THEME.shadowLg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: textPrimary,
              letterSpacing: '0.5px',
            }}
          >
            🎉 HOLIDAYS
          </div>
          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              fontWeight: 500,
              marginTop: '4px',
            }}
          >
            Shows as <b>H</b> in report tables
          </div>
        </div>
      </div>

      {/* ADD FORM */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            background: cardBg,
            borderRadius: THEME.radiusLg,
            padding: '16px',
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}
          >
            Holiday Date
          </label>
          <input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: pageBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}
          >
            Holiday Name
          </label>
          <input
            type="text"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            placeholder="e.g. Independence Day"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: pageBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              boxSizing: 'border-box',
              marginBottom: '14px',
            }}
          />

          <button
            onClick={handleAdd}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: THEME.radiusMd,
              border: 'none',
              background: submitting
                ? '#94A3B8'
                : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: THEME.font,
              letterSpacing: '0.3px',
            }}
          >
            {submitting ? 'Adding...' : 'Add Holiday'}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* MONTH / YEAR FILTER */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            paddingLeft: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            Filter
          </div>
          <button
            onClick={() => setShowAll((s) => !s)}
            style={{
              padding: '4px 12px',
              borderRadius: THEME.radiusPill,
              border: `1px solid ${showAll ? THEME.primary : border}`,
              background: showAll ? THEME.primary + '15' : 'transparent',
              color: showAll ? THEME.primary : textSecondary,
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: THEME.font,
              letterSpacing: '0.3px',
            }}
          >
            {showAll ? '✓ Showing All' : 'Show All'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filterMonth}
            disabled={showAll}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: showAll ? textMuted : textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              cursor: showAll ? 'not-allowed' : 'pointer',
              appearance: 'none',
              opacity: showAll ? 0.5 : 1,
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
              paddingRight: '38px',
              boxSizing: 'border-box',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option
                key={m}
                value={m}
                style={{ color: '#000', background: '#FFF' }}
              >
                {getMonthName(m)}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            disabled={showAll}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: showAll ? textMuted : textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              cursor: showAll ? 'not-allowed' : 'pointer',
              appearance: 'none',
              opacity: showAll ? 0.5 : 1,
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
              paddingRight: '38px',
              boxSizing: 'border-box',
            }}
          >
            {Array.from(
              { length: 5 },
              (_, i) => _istYear - 1 + i
            ).map((y) => (
              <option
                key={y}
                value={y}
                style={{ color: '#000', background: '#FFF' }}
              >
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: '10px',
            paddingLeft: '4px',
          }}
        >
          {showAll
            ? `All Holidays (${holidays.length})`
            : `${getMonthName(filterMonth)} ${filterYear} · ${filteredHolidays.length} holiday${filteredHolidays.length === 1 ? '' : 's'}`}
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 0',
              color: textSecondary,
            }}
          >
            Loading...
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
              color: textMuted,
              fontSize: '13px',
            }}
          >
            {showAll
              ? 'No holidays yet'
              : `No holidays in ${getMonthName(filterMonth)} ${filterYear}`}
          </div>
        ) : (
          filteredHolidays.map((h) => (
            <div
              key={h.id}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusMd,
                padding: '12px 14px',
                marginBottom: '8px',
                border: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  {formatDate(h.holiday_date)}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textSecondary,
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  {h.name}
                </div>
              </div>

              <button
                onClick={() => openEdit(h)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${THEME.primary}30`,
                  background: THEME.primary + '10',
                  color: THEME.primary,
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Edit
              </button>

              <button
                onClick={() => setDeleting(h)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${THEME.red}30`,
                  background: THEME.red + '10',
                  color: THEME.red,
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '420px',
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
                  margin: 0,
                }}
              >
                ✏️ Edit Holiday
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{
                  fontSize: '22px',
                  color: textMuted,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <label
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              Holiday Date
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: pageBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              Holiday Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Independence Day"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: pageBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: submitting
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
          }}
          onClick={() => setDeleting(null)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontSize: '48px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              ⚠️
            </span>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: textPrimary,
                marginBottom: '8px',
              }}
            >
              Delete Holiday?
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: textSecondary,
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              Remove <strong style={{ color: textPrimary }}>{deleting.name}</strong> on{' '}
              {formatDate(deleting.holiday_date)}?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleting(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: submitting
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.red}, #DC2626)`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting
                    ? 'none'
                    : '0 4px 14px rgba(239,68,68,0.4)',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminHolidays;