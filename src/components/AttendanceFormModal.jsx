// src/components/AttendanceFormModal.jsx
//
// Vision Earth HRMS — Premium Attendance Form Modal
// Used for: normal check-out, forgotten check-out resolution.
// Feature: searchable project dropdown with matched-text highlighting.
// Reporting Location: free-text input (no dropdown).

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { formatDate, formatTime } from '../utils/helpers';
import checkInOutService from '../services/checkInOutService';
import { THEME, isDark } from '../utils/designTokens';

export const AttendanceFormModal = ({
  isOpen,
  onClose,
  mode,
  record,
  location,
  address,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    reportingLocation: '',
    remarks: '',
  });

  const [projectFields, setProjectFields] = useState([
    { project: '', workDone: '' },
  ]);

  // Search state per project field (index → query)
  const [projectSearch, setProjectSearch] = useState({});
  // Which field's dropdown is currently open
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  // One ref per project field
  const dropdownRefs = useRef([]);

  // Theme helpers
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;

  // ============================================
  // LOAD PROJECTS
  // ============================================
  useEffect(() => {
    const load = async () => {
      try {
        const projRes = await supabase
          .from('projects')
          .select('name')
          .order('name');

        if (projRes.error) {
          console.error('Projects fetch error:', projRes.error);
          toast.error('Failed to load projects: ' + projRes.error.message);
          setProjects([]);
        } else {
          const projNames = (projRes.data || [])
            .map((p) => p.name)
            .filter(Boolean);
          setProjects(projNames);
        }
      } catch (err) {
        console.error('Error loading projects:', err);
        toast.error('Error loading projects');
      }
    };
    if (isOpen) load();
  }, [isOpen]);

  // ============================================
  // RESET ON OPEN
  // ============================================
  useEffect(() => {
    if (isOpen) {
      setFormData({
        reportingLocation:
          record?.check_in_address?.split(',')[0] ||
          user?.reporting_location ||
          '',
        remarks: '',
      });
      setProjectFields([{ project: '', workDone: '' }]);
      setProjectSearch({});
      setOpenDropdownIndex(null);
      dropdownRefs.current = [];
    }
  }, [isOpen, record, user]);

  // ============================================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // ============================================
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      const clickedInsideAny = dropdownRefs.current.some(
        (ref) => ref && ref.contains(e.target)
      );
      if (!clickedInsideAny) {
        setOpenDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ============================================
  // PROJECT FIELD HELPERS
  // ============================================
  const updateProjectField = (index, field, value) => {
    setProjectFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ============================================
  // PROJECT SEARCH HELPERS
  // ============================================
  const getFilteredProjects = useCallback(
    (query) => {
      if (!query || !query.trim()) return projects.slice(0, 50);
      const q = query.toLowerCase().trim();
      return projects
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 100);
    },
    [projects]
  );

  const highlightMatch = useCallback((text, query) => {
    if (!query || !query.trim()) return [{ text, match: false }];
    const q = query.toLowerCase().trim();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return [{ text, match: false }];
    return [
      { text: text.slice(0, idx), match: false },
      { text: text.slice(idx, idx + q.length), match: true },
      { text: text.slice(idx + q.length), match: false },
    ];
  }, []);

  const selectProject = (index, projectName) => {
    updateProjectField(index, 'project', projectName);
    setOpenDropdownIndex(null);
    setProjectSearch((prev) => ({ ...prev, [index]: '' }));
  };

  // ============================================
  // ADD / REMOVE PROJECT FIELDS
  // ============================================
  const addProjectField = () => {
    if (projectFields.length < 6) {
      setProjectFields([...projectFields, { project: '', workDone: '' }]);
    } else {
      toast.error('Maximum 6 projects allowed');
    }
  };

  const removeProjectField = (index) => {
    if (projectFields.length > 1) {
      setProjectFields(projectFields.filter((_, i) => i !== index));
      setProjectSearch({});
      setOpenDropdownIndex(null);
    }
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (!record?.id) {
      toast.error('Missing check-in record');
      return;
    }
    if (!formData.reportingLocation || !formData.reportingLocation.trim()) {
      toast.error('Please enter reporting location');
      return;
    }
    const hasProject = projectFields.some(
      (p) => p.project.trim() && p.workDone.trim()
    );
    if (!hasProject) {
      toast.error('Please add at least one project with work details');
      return;
    }

    try {
      setSubmitting(true);

      const result = await checkInOutService.checkOut(
        user?.id,
        record.id,
        {
          reportingLocation: formData.reportingLocation.trim(),
          remarks: formData.remarks,
          projects: projectFields,
        },
        location,
        address,
        user?.name
      );

      const { status, forgottenCheckout } = result;
      const statusInfo = checkInOutService.getStatusDescription(status);

      toast.success(
        `${statusInfo.icon} Check-out successful — ${statusInfo.label}${
          forgottenCheckout ? ' (late)' : ''
        }`
      );

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      console.error('Check-out error:', err);
      toast.error(err.message || 'Failed to check out');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // PREVIEW STATUS
  // ============================================
  const previewStatus = record
    ? checkInOutService.calculateStatus(
        new Date(record.check_in_time).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata',
        })
      )
    : 'P';
  const previewInfo = checkInOutService.getStatusDescription(previewStatus);

  // ============================================
  // ✅ FIXED: WORKING HOURS IN "X hr Y min" FORMAT
  // ============================================
  const workingHoursPreview = (() => {
    if (!record?.check_in_time) return '0 min';
    const diffMs = new Date() - new Date(record.check_in_time);
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
    if (hours > 0) return `${hours} hr`;
    return `${minutes} min`;
  })();

  if (!isOpen || !record) return null;

  const attendanceDate = new Date(record.check_in_time).toLocaleDateString(
    'en-CA',
    { timeZone: 'Asia/Kolkata' }
  );

  // ============================================
  // RENDER
  // ============================================
  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: THEME.radiusXl,
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: textPrimary,
                margin: 0,
                letterSpacing: '-0.2px',
              }}
            >
              {mode === 'forgotten'
                ? '⚠️ Resolve Forgotten Check-Out'
                : '📋 Attendance Form'}
            </h3>
            <p
              style={{
                fontSize: '11px',
                color: textMuted,
                marginTop: '3px',
                fontWeight: 600,
              }}
            >
              {formatDate(attendanceDate)}
            </p>
          </div>
          <button
            onClick={onClose}
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

        {/* INFO BANNER */}
        {mode === 'forgotten' && (
          <div
            style={{
              background: dark
                ? 'rgba(245,158,11,0.1)'
                : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              padding: '12px 14px',
              borderRadius: THEME.radiusMd,
              marginBottom: '16px',
              border: `1px solid ${dark ? 'rgba(245,158,11,0.3)' : '#FBBF24'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <p
              style={{
                fontSize: '11px',
                color: dark ? '#FDE68A' : '#92400E',
                lineHeight: 1.5,
                margin: 0,
                fontWeight: 600,
              }}
            >
              You forgot to check out on{' '}
              <strong>{formatDate(attendanceDate)}</strong>. Please complete this
              form to close your session and continue with today.
            </p>
          </div>
        )}

        {/* SESSION INFO CARD */}
        <div
          style={{
            background: dark ? '#0F172A' : '#F8FAFC',
            padding: '14px',
            borderRadius: THEME.radiusMd,
            marginBottom: '16px',
            border: `1px solid ${border}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            {/* Check In */}
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: THEME.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>✓</span> Check In
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: textPrimary,
                  letterSpacing: '-0.2px',
                }}
              >
                {formatTime(record.check_in_time)}
              </div>
              {record.check_in_address && (
                <div
                  style={{
                    fontSize: '9px',
                    color: textMuted,
                    marginTop: '4px',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  📍 {record.check_in_address.slice(0, 40)}
                  {record.check_in_address.length > 40 ? '…' : ''}
                </div>
              )}
            </div>

            {/* Check Out */}
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: THEME.red,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>↑</span> Check Out
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: textPrimary,
                  letterSpacing: '-0.2px',
                }}
              >
                {new Date().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata',
                })}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: textMuted,
                  marginTop: '4px',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {address
                  ? `📍 ${address.slice(0, 40)}${address.length > 40 ? '…' : ''}`
                  : '📍 Capturing…'}
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: textSecondary,
                fontWeight: 600,
              }}
            >
              ⏱️ Working Hours
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: THEME.blue,
                letterSpacing: '-0.3px',
              }}
            >
              {workingHoursPreview}
            </span>
          </div>

          {/* Status Preview */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: textSecondary,
                fontWeight: 600,
              }}
            >
              Will be marked as
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: previewInfo.color,
                background: previewInfo.color + '20',
                padding: '4px 12px',
                borderRadius: '10px',
                border: `1px solid ${previewInfo.color}30`,
                letterSpacing: '0.3px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {previewInfo.icon} {previewInfo.label}
            </span>
          </div>
        </div>

        {/* REPORTING LOCATION — FREE-TEXT INPUT */}
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}
          >
            Reporting Location *
          </label>
          <input
            type="text"
            value={formData.reportingLocation}
            onChange={(e) =>
              setFormData({ ...formData, reportingLocation: e.target.value })
            }
            placeholder="Enter reporting location..."
            style={{
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
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* PROJECT DETAILS HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📋 Project Details
          </div>
          {projectFields.length < 6 && (
            <button
              onClick={addProjectField}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: 'none',
                background: THEME.primary + '15',
                color: THEME.primary,
                fontWeight: 800,
                fontSize: '10px',
                cursor: 'pointer',
                fontFamily: THEME.font,
                letterSpacing: '0.2px',
              }}
            >
              + Add More
            </button>
          )}
        </div>

        {/* PROJECT FIELDS */}
        {projectFields.map((field, index) => (
          <div
            key={index}
            style={{
              background: dark ? '#0F172A' : '#F8FAFC',
              borderRadius: THEME.radiusMd,
              padding: '14px',
              marginBottom: '10px',
              border: `1px solid ${border}`,
            }}
          >
            {/* Field Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📌 Project {index + 1}
                {index === 0 && <span style={{ color: THEME.red }}>*</span>}
              </span>
              {projectFields.length > 1 && (
                <button
                  onClick={() => removeProjectField(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: THEME.red,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontFamily: THEME.font,
                    fontWeight: 800,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* SEARCHABLE PROJECT INPUT */}
            <div
              style={{ marginBottom: '10px' }}
              ref={(el) => {
                dropdownRefs.current[index] = el;
              }}
            >
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: index === 0 ? THEME.red : textMuted,
                  display: 'block',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Project Name {index === 0 && '*'}
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={field.project}
                  onChange={(e) => {
                    updateProjectField(index, 'project', e.target.value);
                    setProjectSearch((prev) => ({
                      ...prev,
                      [index]: e.target.value,
                    }));
                    setOpenDropdownIndex(index);
                  }}
                  onFocus={() => {
                    setProjectSearch((prev) => ({ ...prev, [index]: '' }));
                    setOpenDropdownIndex(index);
                  }}
                  placeholder={
                    projects.length
                      ? `Search from ${projects.length} projects...`
                      : 'Loading projects...'
                  }
                  style={{
                    width: '100%',
                    padding: '11px 36px 11px 14px',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${
                      openDropdownIndex === index ? THEME.primary : border
                    }`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: THEME.font,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                />

                {field.project && (
                  <button
                    type="button"
                    onClick={() => {
                      updateProjectField(index, 'project', '');
                      setProjectSearch((prev) => ({ ...prev, [index]: '' }));
                      setOpenDropdownIndex(index);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: textMuted,
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}

                {/* CUSTOM DROPDOWN */}
                {openDropdownIndex === index &&
                  (() => {
                    const query = projectSearch[index] ?? '';
                    const filtered = getFilteredProjects(query);
                    if (filtered.length === 0) {
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            background: cardBg,
                            border: `1px solid ${border}`,
                            borderRadius: THEME.radiusMd,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            zIndex: 50,
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '12px',
                            fontSize: '12px',
                            color: textMuted,
                            textAlign: 'center',
                            fontStyle: 'italic',
                          }}
                        >
                          No projects match "{query}"
                        </div>
                      );
                    }
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          background: cardBg,
                          border: `1px solid ${border}`,
                          borderRadius: THEME.radiusMd,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          zIndex: 50,
                          maxHeight: '260px',
                          overflowY: 'auto',
                        }}
                      >
                        {filtered.map((p) => {
                          const parts = highlightMatch(p, query);
                          return (
                            <div
                              key={p}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectProject(index, p);
                              }}
                              style={{
                                padding: '10px 14px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: textPrimary,
                                cursor: 'pointer',
                                borderBottom: `1px solid ${border}`,
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = dark
                                  ? 'rgba(16,185,129,0.1)'
                                  : 'rgba(16,185,129,0.06)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {parts.map((part, i) =>
                                part.match ? (
                                  <span
                                    key={i}
                                    style={{
                                      background: dark
                                        ? 'rgba(16,185,129,0.35)'
                                        : 'rgba(16,185,129,0.25)',
                                      color: dark ? '#6EE7B7' : '#065F46',
                                      fontWeight: 800,
                                      padding: '1px 2px',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    {part.text}
                                  </span>
                                ) : (
                                  <span key={i}>{part.text}</span>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            </div>

            {/* WORKS COMPLETED */}
            <div>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: index === 0 ? THEME.red : textMuted,
                  display: 'block',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Works Completed {index === 0 && '*'}
              </label>
              <textarea
                value={field.workDone}
                onChange={(e) =>
                  updateProjectField(index, 'workDone', e.target.value)
                }
                rows="2"
                placeholder="Describe work done..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: THEME.font,
                  resize: 'vertical',
                  minHeight: '50px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        ))}

        {/* REMARKS */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: textMuted,
              display: 'block',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) =>
              setFormData({ ...formData, remarks: e.target.value })
            }
            rows="2"
            placeholder="Any additional remarks..."
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '13px',
              outline: 'none',
              fontFamily: THEME.font,
              resize: 'vertical',
              minHeight: '50px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: THEME.radiusMd,
            border: 'none',
            background: submitting
              ? '#94A3B8'
              : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : THEME.shadowGreen,
            fontFamily: THEME.font,
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '14px' }}>📤</span>
          {submitting ? 'Submitting...' : 'SUBMIT & CHECK OUT'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceFormModal;