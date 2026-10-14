// src/pages/admin/AttendanceEditor.jsx
//
// Vision Earth HRMS — Admin Attendance Editor
//
// ✅ Filter by Month, Year, Employee (with search)
// ✅ Loads all records from `attendance` table
// ✅ Edit any record inline + save to DB
// ✅ Delete record from DB
// ✅ IST-anchored date handling
// ✅ Dark mode + responsive
// ✅ Real day name (Mon/Tue/…) in day badge
// ✅ Uses ACTUAL attendance table columns (check_in_location, etc.)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

// ============================================
// CONSTANTS
// ============================================
const STATUS_OPTIONS = [
  { value: 'P', label: 'Present', color: '#10B981' },
  { value: 'A', label: 'Absent', color: '#EF4444' },
  { value: 'D', label: 'Delayed', color: '#F59E0B' },
  { value: 'B', label: 'Beyond Delay', color: '#DC2626' },
  { value: 'L', label: 'Leave', color: '#3B82F6' },
  { value: 'F', label: 'Forgot Out', color: '#F97316' },
];

const statusColor = (s) => {
  const map = {
    P: '#10B981',
    Present: '#10B981',
    A: '#EF4444',
    Absent: '#EF4444',
    D: '#F59E0B',
    Delayed: '#F59E0B',
    B: '#DC2626',
    'Beyond Delay': '#DC2626',
    L: '#3B82F6',
    Leave: '#3B82F6',
    F: '#F97316',
    Forgotten: '#F97316',
  };
  return map[s] || '#64748B';
};

const statusShort = (s) => {
  const map = {
    P: 'P',
    Present: 'P',
    A: 'A',
    Absent: 'A',
    D: 'D',
    Delayed: 'D',
    B: 'B',
    'Beyond Delay': 'B',
    L: 'L',
    Leave: 'L',
    F: 'F',
    Forgotten: 'F',
  };
  return map[s] || '?';
};

// Returns 3-letter day name (Mon, Tue, Wed…) — anchored to noon IST
const getDayName = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return '';
  }
};

export const AdminAttendanceEditor = () => {
  const { theme } = useTheme();
  const { user, isAdmin } = useAuth();
  const dark = isDark(theme);

  // IST-anchored defaults
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

  // ============================================
  // STATE
  // ============================================
  const [month, setMonth] = useState(_istMonth);
  const [year, setYear] = useState(_istYear);

  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const dropdownRef = useRef(null);

  // ============================================
  // THEME HELPERS
  // ============================================
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH EMPLOYEES
  // ============================================
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, employee_id, department, company')
          .order('name');
        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        console.error('Fetch employees failed:', err);
        toast.error('Failed to load employees');
      }
    })();
  }, [isAdmin]);

  // ============================================
  // CLOSE EMPLOYEE DROPDOWN ON OUTSIDE CLICK
  // ============================================
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowEmpDropdown(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  // ============================================
  // FETCH ATTENDANCE RECORDS
  // ============================================
  const fetchRecords = async () => {
    if (!selectedEmployee?.id) {
      setRecords([]);
      return;
    }

    try {
      setLoading(true);
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const dd = String(lastDay).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      const endDate = `${year}-${mm}-${dd}`;

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Fetch attendance failed:', err);
      toast.error('Failed to load attendance records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?.id, month, year]);

  // ============================================
  // FILTERED EMPLOYEE LIST
  // ============================================
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 50);
    return employees
      .filter((e) => {
        const name = (e.name || '').toLowerCase();
        const empId = (e.employee_id || '').toLowerCase();
        const dept = (e.department || '').toLowerCase();
        return name.includes(q) || empId.includes(q) || dept.includes(q);
      })
      .slice(0, 50);
  }, [employees, empSearch]);

  // ============================================
  // EDIT HANDLERS
  // ============================================
  const openEdit = (record) => setEditingRecord({ ...record });
  const closeEdit = () => setEditingRecord(null);
  const updateEditField = (key, value) =>
    setEditingRecord((prev) => ({ ...prev, [key]: value }));

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      setSaving(true);

      // ✅ Uses ONLY your real column names
      const updatePayload = {
        status: editingRecord.status || null,
        working_hours:
          editingRecord.working_hours === '' ||
          editingRecord.working_hours === null ||
          editingRecord.working_hours === undefined
            ? null
            : parseFloat(editingRecord.working_hours),
        check_in_time: editingRecord.check_in_time || null,
        check_out_time: editingRecord.check_out_time || null,
        check_in_location: editingRecord.check_in_location || null,
        check_out_location: editingRecord.check_out_location || null,
        check_in_gps: editingRecord.check_in_gps || null,
        check_out_gps: editingRecord.check_out_gps || null,
        reporting_location: editingRecord.reporting_location || null,
        project: editingRecord.project || null,
        remarks: editingRecord.remarks || null,
      };

      const { error } = await supabase
        .from('attendance')
        .update(updatePayload)
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast.success('Record updated successfully!');
      setEditingRecord(null);
      await fetchRecords();
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.message || 'Failed to update record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record) return;
    if (
      !window.confirm(
        `Delete attendance record for ${record.attendance_date}? This cannot be undone.`
      )
    )
      return;
    try {
      setDeletingId(record.id);
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', record.id);
      if (error) throw error;

      toast.success('Record deleted');
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================
  // NOT ADMIN GUARD
  // ============================================
  if (!isAdmin) {
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
          padding: '20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            background: cardBg,
            borderRadius: THEME.radiusXl,
            border: `1px solid ${border}`,
            width: '100%',
          }}
        >
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
            🔒
          </span>
          <h2
            style={{
              color: textPrimary,
              marginBottom: '8px',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            Access Denied
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px' }}>
            Only admins can access the Attendance Editor.
          </p>
        </div>
      </div>
    );
  }

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
      {/* HEADER */}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              zIndex: 1,
            }}
          >
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
                fontSize: '22px',
              }}
            >
              ✏️
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
                ATTENDANCE EDITOR
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
                ADMIN TOOL
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              marginTop: '12px',
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Pick employee → edit or delete records
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ padding: '0 16px 12px' }}>
        {/* Month + Year */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={selectStyle({ cardBg, textPrimary, border })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={selectStyle({ cardBg, textPrimary, border })}
          >
            {Array.from({ length: 5 }, (_, i) => _istYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Employee search dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowEmpDropdown((v) => !v)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {selectedEmployee
                ? `${selectedEmployee.name} (${selectedEmployee.employee_id})`
                : '👤 Select employee…'}
            </span>
            <span style={{ color: textMuted, fontSize: '12px' }}>
              {showEmpDropdown ? '▲' : '▼'}
            </span>
          </div>

          {showEmpDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: THEME.radiusMd,
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                zIndex: 50,
                maxHeight: '320px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px', borderBottom: `1px solid ${border}` }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="🔍 Search name, ID, department…"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${border}`,
                    background: dark ? '#0F172A' : '#F8FAFC',
                    color: textPrimary,
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: THEME.font,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredEmployees.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: textMuted,
                      fontSize: '12px',
                    }}
                  >
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSel = selectedEmployee?.id === emp.id;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setShowEmpDropdown(false);
                          setEmpSearch('');
                        }}
                        style={{
                          padding: '11px 14px',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${border}`,
                          background: isSel
                            ? 'rgba(16,185,129,0.12)'
                            : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSel)
                            e.currentTarget.style.background = dark
                              ? 'rgba(255,255,255,0.04)'
                              : '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSel)
                            e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          {emp.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {emp.name}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: textMuted,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {emp.employee_id}
                            {emp.department ? ` · ${emp.department}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECORDS LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            📋 Records ({records.length})
          </div>
          {selectedEmployee && (
            <button
              onClick={fetchRecords}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: THEME.primary,
                fontSize: '11px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: THEME.font,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '⏳ Loading…' : '🔄 Refresh'}
            </button>
          )}
        </div>

        {!selectedEmployee ? (
          <EmptyCard
            icon="👆"
            title="Select an employee"
            subtitle="Pick from the dropdown above to view attendance"
            cardBg={cardBg}
            border={border}
            textSecondary={textSecondary}
          />
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: `3px solid ${border}`,
                borderTopColor: THEME.primary,
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto',
              }}
            />
          </div>
        ) : records.length === 0 ? (
          <EmptyCard
            icon="📭"
            title="No records found"
            subtitle={`No attendance for ${getMonthName(month)} ${year}`}
            cardBg={cardBg}
            border={border}
            textSecondary={textSecondary}
          />
        ) : (
          records.map((rec) => (
            <RecordCard
              key={rec.id}
              rec={rec}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
              cardShadow={cardShadow}
              onEdit={() => openEdit(rec)}
              onDelete={() => handleDelete(rec)}
              deleting={deletingId === rec.id}
            />
          ))
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
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
            zIndex: 2000,
          }}
          onClick={closeEdit}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
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
                  fontSize: '16px',
                  fontWeight: 800,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                Edit Record
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                style={{
                  fontSize: '22px',
                  color: textMuted,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '10px 14px',
                background: dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                borderRadius: '10px',
                marginBottom: '16px',
                border: `1px solid ${border}`,
                fontSize: '12px',
                fontWeight: 700,
                color: textSecondary,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{selectedEmployee?.name}</span>
              <span>{editingRecord.attendance_date}</span>
            </div>

            {/* STATUS */}
            <FieldLabel text="Status" textMuted={textMuted} />
            <select
              value={editingRecord.status || ''}
              onChange={(e) => updateEditField('status', e.target.value)}
              style={selectStyle({ cardBg, textPrimary, border })}
            >
              <option value="">— Select —</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({s.value})
                </option>
              ))}
            </select>

            {/* WORKING HOURS */}
            <FieldLabel text="Working Hours" textMuted={textMuted} />
            <input
              type="number"
              step="0.1"
              value={editingRecord.working_hours ?? ''}
              onChange={(e) => updateEditField('working_hours', e.target.value)}
              placeholder="e.g. 8.5"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* CHECK-IN TIME */}
            <FieldLabel text="Check-In Time" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.check_in_time ?? ''}
              onChange={(e) => updateEditField('check_in_time', e.target.value)}
              placeholder="e.g. 09:15:00 or 09:15 AM"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* CHECK-OUT TIME */}
            <FieldLabel text="Check-Out Time" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.check_out_time ?? ''}
              onChange={(e) => updateEditField('check_out_time', e.target.value)}
              placeholder="e.g. 18:30:00 or 06:30 PM"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* ✅ CHECK-IN LOCATION (real column name) */}
            <FieldLabel text="Check-In Location" textMuted={textMuted} />
            <textarea
              value={editingRecord.check_in_location ?? ''}
              onChange={(e) =>
                updateEditField('check_in_location', e.target.value)
              }
              rows={2}
              placeholder="Address (any language)"
              style={{
                ...inputStyle({ cardBg, textPrimary, border }),
                resize: 'vertical',
                minHeight: '60px',
              }}
            />

            {/* ✅ CHECK-OUT LOCATION (real column name) */}
            <FieldLabel text="Check-Out Location" textMuted={textMuted} />
            <textarea
              value={editingRecord.check_out_location ?? ''}
              onChange={(e) =>
                updateEditField('check_out_location', e.target.value)
              }
              rows={2}
              placeholder="Address (any language)"
              style={{
                ...inputStyle({ cardBg, textPrimary, border }),
                resize: 'vertical',
                minHeight: '60px',
              }}
            />

            {/* ✅ CHECK-IN GPS */}
            <FieldLabel text="Check-In GPS" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.check_in_gps ?? ''}
              onChange={(e) => updateEditField('check_in_gps', e.target.value)}
              placeholder="e.g. 18.5204,73.8567"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* ✅ CHECK-OUT GPS */}
            <FieldLabel text="Check-Out GPS" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.check_out_gps ?? ''}
              onChange={(e) => updateEditField('check_out_gps', e.target.value)}
              placeholder="e.g. 18.5204,73.8567"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* REPORTING LOCATION */}
            <FieldLabel text="Reporting Location" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.reporting_location ?? ''}
              onChange={(e) =>
                updateEditField('reporting_location', e.target.value)
              }
              placeholder="e.g. Head Office"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* PROJECT */}
            <FieldLabel text="Project" textMuted={textMuted} />
            <input
              type="text"
              value={editingRecord.project ?? ''}
              onChange={(e) => updateEditField('project', e.target.value)}
              placeholder="e.g. Project name"
              style={inputStyle({ cardBg, textPrimary, border })}
            />

            {/* REMARKS */}
            <FieldLabel text="Remarks" textMuted={textMuted} />
            <textarea
              value={editingRecord.remarks ?? ''}
              onChange={(e) => updateEditField('remarks', e.target.value)}
              rows={2}
              placeholder="Optional admin remarks"
              style={{
                ...inputStyle({ cardBg, textPrimary, border }),
                resize: 'vertical',
                minHeight: '60px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: saving
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : THEME.shadowGreen,
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================
const EmptyCard = ({ icon, title, subtitle, cardBg, border, textSecondary }) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      background: cardBg,
      borderRadius: THEME.radiusLg,
      border: `1px solid ${border}`,
    }}
  >
    <div style={{ fontSize: '44px', marginBottom: '12px' }}>{icon}</div>
    <p
      style={{
        fontSize: '14px',
        fontWeight: 700,
        color: textSecondary,
        margin: 0,
      }}
    >
      {title}
    </p>
    <p
      style={{
        fontSize: '11px',
        color: textSecondary,
        marginTop: 4,
        opacity: 0.7,
      }}
    >
      {subtitle}
    </p>
  </div>
);

const RecordCard = ({
  rec,
  cardBg,
  textPrimary,
  textMuted,
  border,
  cardShadow,
  onEdit,
  onDelete,
  deleting,
}) => {
  const color = statusColor(rec.status);
  const short = statusShort(rec.status);
  const day = rec.attendance_date?.split('-')[2] || '?';
  const dayName = getDayName(rec.attendance_date);

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: THEME.radiusLg,
        padding: '14px',
        marginBottom: '10px',
        border: `1px solid ${border}`,
        boxShadow: cardShadow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Day badge */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: color + '18',
            border: `1.5px solid ${color}40`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 900,
              color,
              lineHeight: 1,
            }}
          >
            {day}
          </div>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color,
              opacity: 0.85,
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            {dayName}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                background: color + '18',
                color,
                border: `1px solid ${color}30`,
                letterSpacing: '0.3px',
              }}
            >
              {short}
            </span>
            <span
              style={{ fontSize: '11px', fontWeight: 700, color: textPrimary }}
            >
              {rec.attendance_date}
            </span>
          </div>

          <div
            style={{
              fontSize: '10px',
              color: textMuted,
              fontWeight: 600,
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {rec.check_in_time && (
              <span>IN: {String(rec.check_in_time).slice(0, 5)}</span>
            )}
            {rec.check_out_time && (
              <span>OUT: {String(rec.check_out_time).slice(0, 5)}</span>
            )}
            {rec.working_hours && <span>⏱ {rec.working_hours}h</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: THEME.primary,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: `1px solid ${THEME.red}40`,
              background: 'transparent',
              color: THEME.red,
              fontSize: '14px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {deleting ? '⏳' : '🗑️'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FieldLabel = ({ text, textMuted }) => (
  <label
    style={{
      display: 'block',
      fontSize: '10px',
      fontWeight: 800,
      color: textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginTop: '12px',
      marginBottom: '6px',
    }}
  >
    {text}
  </label>
);

// ============================================
// STYLE HELPERS
// ============================================
const selectStyle = ({ cardBg, textPrimary, border }) => ({
  width: '100%',
  padding: '12px 14px',
  borderRadius: THEME.radiusMd,
  border: `1px solid ${border}`,
  background: cardBg,
  color: textPrimary,
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none',
  fontFamily: THEME.font,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '16px',
  paddingRight: '38px',
  boxSizing: 'border-box',
});

const inputStyle = ({ cardBg, textPrimary, border }) => ({
  width: '100%',
  padding: '11px 14px',
  borderRadius: THEME.radiusMd,
  border: `1px solid ${border}`,
  background: cardBg,
  color: textPrimary,
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none',
  fontFamily: THEME.font,
  boxSizing: 'border-box',
});

export default AdminAttendanceEditor;