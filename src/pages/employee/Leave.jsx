// src/pages/employee/Leave.jsx
//
// Vision Earth HRMS — Premium Leave Management
// (Balance tab removed)
// ✅ Edit + Revoke + Cancel Revoke with admin-approval flow

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import {
  formatDate,
  getStatusColor,
  getStatusLabel,
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const Leave = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('apply');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [editingWasApproved, setEditingWasApproved] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'Casual Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const leaveTypes = [
    { code: 'CL', label: 'Casual Leave', full: 'Casual Leave', color: '#3B82F6', bg: '#EFF6FF' },
    { code: 'SL', label: 'Sick Leave', full: 'Sick Leave', color: '#EF4444', bg: '#FEF2F2' },
    { code: 'PL', label: 'Privilege Leave', full: 'Earned Leave', color: '#10B981', bg: '#ECFDF5' },
    { code: 'ML', label: 'Maternity Leave', full: 'Maternity Leave', color: '#8B5CF6', bg: '#F5F3FF' },
    { code: 'UL', label: 'Unpaid Leave', full: 'Unpaid Leave', color: '#F59E0B', bg: '#FFFBEB' },
  ];

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH LEAVES
  // ============================================
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchLeaves();
  }, [user]);

  // ============================================
  // SUBMIT NEW LEAVE
  // ============================================
  const handleSubmit = async () => {
    if (!formData.fromDate || !formData.toDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);
    if (to < from) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: user?.id,
        leave_type: formData.leaveType,
        leave_start_date: formData.fromDate,
        leave_end_date: formData.toDate,
        reason: formData.reason || null,
        status: 'Pending',
      });

      if (error) throw error;

      toast.success('✅ Leave request submitted!');
      setFormData({
        leaveType: 'Casual Leave',
        fromDate: '',
        toDate: '',
        reason: '',
      });
      fetchLeaves();
      setActiveTab('my');
      setStatusFilter('all');
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error(error.message || 'Failed to submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // OPEN EDIT
  // ============================================
  const handleEditLeave = (leave) => {
    setFormData({
      leaveType: leave.leave_type || 'Casual Leave',
      fromDate: leave.leave_start_date || '',
      toDate: leave.leave_end_date || '',
      reason: leave.reason || '',
    });
    setEditingLeaveId(leave.id);
    setEditingWasApproved(leave.status === 'Approved');
    setActiveTab('apply');
  };

  // ============================================
  // SAVE EDIT
  // ============================================
  const handleSaveEdit = async () => {
    if (!editingLeaveId) return;

    if (!formData.fromDate || !formData.toDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);
    if (to < from) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('leave_requests')
        .update({
          leave_type: formData.leaveType,
          leave_start_date: formData.fromDate,
          leave_end_date: formData.toDate,
          reason: formData.reason || null,
          status: 'Pending',
          updated_at: new Date().toISOString(),
          approved_by: null,
          rejection_reason: null,
        })
        .eq('id', editingLeaveId)
        .eq('employee_id', user?.id);

      if (error) throw error;

      if (editingWasApproved) {
        toast.success('✅ Leave updated · re-approval pending');
      } else {
        toast.success('✅ Leave updated successfully!');
      }

      setEditingLeaveId(null);
      setEditingWasApproved(false);
      setFormData({
        leaveType: 'Casual Leave',
        fromDate: '',
        toDate: '',
        reason: '',
      });
      fetchLeaves();
      setActiveTab('my');
      setStatusFilter('all');
    } catch (error) {
      console.error('Error updating leave:', error);
      toast.error(error.message || 'Failed to update leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // CANCEL EDIT
  // ============================================
  const handleCancelEdit = () => {
    setEditingLeaveId(null);
    setEditingWasApproved(false);
    setFormData({
      leaveType: 'Casual Leave',
      fromDate: '',
      toDate: '',
      reason: '',
    });
  };

  // ============================================
  // REVOKE
  // ============================================
  const handleRevokeLeave = async (leave) => {
    const isApproved = leave.status === 'Approved';

    const message = isApproved
      ? `Request to revoke this APPROVED leave?\n\n${leave.leave_type}\nFrom ${leave.leave_start_date} to ${leave.leave_end_date}\n\nAn admin must approve the revoke.`
      : `Revoke this leave request?\n\n${leave.leave_type}\nFrom ${leave.leave_start_date} to ${leave.leave_end_date}\n\nThis will be deleted immediately.`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    try {
      setSubmitting(true);

      if (isApproved) {
        const { error } = await supabase
          .from('leave_requests')
          .update({
            status: 'Revoke Requested',
            updated_at: new Date().toISOString(),
          })
          .eq('id', leave.id)
          .eq('employee_id', user?.id);

        if (error) throw error;
        toast.success('✅ Revoke request sent to admin');
      } else {
        const { error } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', leave.id)
          .eq('employee_id', user?.id);

        if (error) throw error;
        toast.success('✅ Leave request revoked');
      }

      fetchLeaves();
    } catch (error) {
      console.error('Error revoking leave:', error);
      toast.error(error.message || 'Failed to revoke leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // ✅ NEW: CANCEL REVOKE (restore to Approved)
  // ============================================
  const handleCancelRevoke = async (leave) => {
    const confirmed = window.confirm(
      `Cancel the revoke request?\n\n${leave.leave_type}\nFrom ${leave.leave_start_date} to ${leave.leave_end_date}\n\nThe leave will go back to "Approved".`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leave.id)
        .eq('employee_id', user?.id);

      if (error) throw error;

      toast.success('✅ Revoke cancelled — leave restored to Approved');
      fetchLeaves();
    } catch (error) {
      console.error('Error cancelling revoke:', error);
      toast.error(error.message || 'Failed to cancel revoke');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusFilteredLeaves = () => {
    if (statusFilter === 'pending')
      return leaves.filter((l) => l.status === 'Pending' || l.status === 'pending');
    if (statusFilter === 'approved')
      return leaves.filter((l) => l.status === 'Approved' || l.status === 'approved');
    if (statusFilter === 'rejected')
      return leaves.filter((l) => l.status === 'Rejected' || l.status === 'rejected');
    if (statusFilter === 'revoke')
      return leaves.filter((l) => l.status === 'Revoke Requested');
    return leaves;
  };

  const filteredLeaves = getStatusFilteredLeaves();
  const pendingCount = leaves.filter(
    (l) => l.status === 'Pending' || l.status === 'pending'
  ).length;
  const revokeRequestedCount = leaves.filter(
    (l) => l.status === 'Revoke Requested'
  ).length;

  const getLeaveTypeStyle = (type) => {
    return (
      leaveTypes.find(
        (t) =>
          t.full.toLowerCase() === (type || '').toLowerCase() ||
          t.label.toLowerCase() === (type || '').toLowerCase()
      ) || { color: THEME.primary, bg: THEME.primarySoft, code: 'LV', label: 'Leave' }
    );
  };

  const calculateDays = () => {
    if (!formData.fromDate || !formData.toDate) return 0;
    const from = new Date(formData.fromDate + 'T00:00:00+05:30');
    const to = new Date(formData.toDate + 'T00:00:00+05:30');
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
    const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays + 1);
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
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
          <p style={{ marginTop: '16px', color: textSecondary, fontSize: '14px' }}>
            Loading...
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
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
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
                  LEAVE
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
                  MANAGEMENT
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

          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              letterSpacing: '0.8px',
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            📅 Apply and track your leave requests
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: dark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
            borderRadius: THEME.radiusPill,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
          }}
        >
          {[
            { key: 'apply', label: 'Apply Leave', icon: '✍️' },
            { key: 'my', label: 'My Leaves', icon: '📋' },
          ].map((v) => {
            const active = activeTab === v.key;
            return (
              <button
                key={v.key}
                onClick={() => {
                  setActiveTab(v.key);
                  setStatusFilter('all');
                }}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  borderRadius: THEME.radiusPill,
                  border: 'none',
                  background: active
                    ? dark
                      ? '#1E293B'
                      : '#FFFFFF'
                    : 'transparent',
                  color: active ? THEME.primary : textSecondary,
                  fontWeight: active ? 800 : 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: THEME.font,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ fontSize: '13px' }}>{v.icon}</span>
                {v.label}
                {v.key === 'my' && pendingCount > 0 && (
                  <span
                    style={{
                      background: THEME.amber,
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '8px',
                      marginLeft: '2px',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: APPLY */}
      {activeTab === 'apply' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Info banner */}
          <div
            style={{
              background: editingLeaveId
                ? dark
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))'
                  : 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                : dark
                ? 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))'
                : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
              borderRadius: THEME.radiusLg,
              padding: '14px 16px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${
                editingLeaveId
                  ? dark
                    ? 'rgba(245,158,11,0.3)'
                    : '#FBBF24'
                  : dark
                  ? 'rgba(59,130,246,0.2)'
                  : '#BFDBFE'
              }`,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: editingLeaveId ? THEME.amber : THEME.blue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
                boxShadow: editingLeaveId
                  ? '0 4px 10px rgba(245,158,11,0.3)'
                  : '0 4px 10px rgba(59,130,246,0.3)',
              }}
            >
              {editingLeaveId ? '✏️' : '📝'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: editingLeaveId
                    ? dark
                      ? '#FDE68A'
                      : '#92400E'
                    : dark
                    ? '#DBEAFE'
                    : '#1E40AF',
                  marginBottom: '2px',
                }}
              >
                {editingLeaveId ? 'Editing Leave Request' : 'Apply for Leave'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: editingLeaveId
                    ? dark
                      ? '#FCD34D'
                      : '#78350F'
                    : dark
                    ? '#93C5FD'
                    : '#3B82F6',
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {editingLeaveId
                  ? editingWasApproved
                    ? 'Saving will send it back to admin for re-approval'
                    : 'Change the details and save'
                  : 'Fill in the details to apply for leave'}
              </div>
            </div>
          </div>

          {/* Leave Type */}
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
              Leave Type
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) =>
                setFormData({ ...formData, leaveType: e.target.value })
              }
              style={{
                width: '100%',
                padding: '13px 16px',
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
                backgroundPosition: 'right 14px center',
                backgroundSize: '16px',
                paddingRight: '42px',
                boxSizing: 'border-box',
              }}
            >
              {leaveTypes.map((type) => (
                <option key={type.code} value={type.full}>
                  {type.full}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div>
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
                From Date
              </label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) =>
                  setFormData({ ...formData, fromDate: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '13px 14px',
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

            <div>
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
                To Date
              </label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) =>
                  setFormData({ ...formData, toDate: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '13px 14px',
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
          </div>

          {/* Total Days */}
          <div
            style={{
              padding: '12px 16px',
              background: dark ? 'rgba(16,185,129,0.08)' : THEME.primarySoft,
              borderRadius: THEME.radiusMd,
              border: `1px solid ${THEME.primary}30`,
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: textSecondary,
              }}
            >
              Total Days
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: THEME.primary,
              }}
            >
              {calculateDays()}
            </span>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '16px' }}>
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
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows="3"
              placeholder="Enter reason for leave..."
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '13px',
                outline: 'none',
                fontFamily: THEME.font,
                resize: 'vertical',
                minHeight: '70px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit / Save Edit */}
          <button
            onClick={editingLeaveId ? handleSaveEdit : handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: THEME.radiusMd,
              border: 'none',
              background: submitting
                ? '#94A3B8'
                : editingWasApproved
                ? `linear-gradient(135deg, ${THEME.amber}, #D97706)`
                : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting
                ? 'none'
                : editingWasApproved
                ? '0 4px 14px rgba(245,158,11,0.4)'
                : THEME.shadowGreen,
              fontFamily: THEME.font,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.3px',
            }}
          >
            <span>{editingLeaveId ? '💾' : '📤'}</span>
            {submitting
              ? 'Saving...'
              : editingLeaveId
              ? editingWasApproved
                ? 'Save & Request Re-Approval'
                : 'Save Changes'
              : 'Submit Leave Request'}
          </button>

          {/* Cancel Edit */}
          {editingLeaveId && (
            <button
              onClick={handleCancelEdit}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '10px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: 'transparent',
                color: textSecondary,
                fontWeight: 700,
                fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: THEME.font,
              }}
            >
              Cancel Edit
            </button>
          )}

          {/* Leave Types Reference */}
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
              }}
            >
              Leave Types
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              {leaveTypes.slice(0, 4).map((type) => (
                <div
                  key={type.code}
                  style={{
                    padding: '10px 12px',
                    background: dark ? '#1E293B' : type.bg,
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${
                      dark ? 'rgba(255,255,255,0.05)' : type.color + '30'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: cardShadow,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: type.color + '20',
                      color: type.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {type.code}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: textPrimary,
                      lineHeight: 1.2,
                    }}
                  >
                    {type.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MY LEAVES */}
      {activeTab === 'my' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Status filter pills */}
          {leaves.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              {[
                {
                  key: 'all',
                  label: 'All',
                  count: leaves.length,
                  color: textSecondary,
                },
                {
                  key: 'pending',
                  label: 'Pending',
                  count: leaves.filter(
                    (l) => l.status === 'Pending' || l.status === 'pending'
                  ).length,
                  color: THEME.amber,
                },
                {
                  key: 'approved',
                  label: 'Approved',
                  count: leaves.filter(
                    (l) => l.status === 'Approved' || l.status === 'approved'
                  ).length,
                  color: THEME.primary,
                },
                {
                  key: 'rejected',
                  label: 'Rejected',
                  count: leaves.filter(
                    (l) => l.status === 'Rejected' || l.status === 'rejected'
                  ).length,
                  color: THEME.red,
                },
                {
                  key: 'revoke',
                  label: 'Revoke Req.',
                  count: revokeRequestedCount,
                  color: THEME.orange,
                },
              ].map((f) => {
                const active = statusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: THEME.radiusPill,
                      border: `1px solid ${active ? f.color + '50' : border}`,
                      background: active ? f.color + '15' : cardBg,
                      color: active ? f.color : textSecondary,
                      fontSize: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: THEME.font,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {f.label}
                    <span
                      style={{
                        background: active ? f.color : 'transparent',
                        color: active ? '#FFFFFF' : textMuted,
                        padding: '0 5px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: 800,
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Leave cards */}
          {filteredLeaves.length === 0 ? (
            <EmptyState
              icon="📋"
              text={
                leaves.length === 0
                  ? 'No leave requests yet'
                  : `No ${statusFilter} leaves`
              }
              subtitle={
                leaves.length === 0
                  ? "Tap 'Apply Leave' to submit your first request"
                  : 'Try changing the filter'
              }
              dark={dark}
              cardBg={cardBg}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
          ) : (
            filteredLeaves.map((leave, idx) => {
              const statusColor = getStatusColor(leave.status, theme);
              const statusLabel = getStatusLabel(leave.status);
              const typeStyle = getLeaveTypeStyle(leave.leave_type);

              const canEdit =
                leave.status === 'Pending' || leave.status === 'Approved';
              const canRevoke =
                leave.status === 'Pending' || leave.status === 'Approved';
              const canCancelRevoke = leave.status === 'Revoke Requested';

              return (
                <div
                  key={leave.id || idx}
                  style={{
                    background: cardBg,
                    borderRadius: THEME.radiusLg,
                    padding: '16px',
                    marginBottom: '10px',
                    border: `1px solid ${border}`,
                    boxShadow: cardShadow,
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          background: typeStyle.color + '20',
                          color: typeStyle.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                          letterSpacing: '0.3px',
                        }}
                      >
                        {typeStyle.code}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: textPrimary,
                          }}
                        >
                          {leave.leave_type || 'Leave'}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: textMuted,
                            fontWeight: 500,
                            marginTop: '2px',
                          }}
                        >
                          Requested on{' '}
                          {leave.created_at
                            ? formatDate(leave.created_at)
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: THEME.radiusPill,
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: statusColor + '18',
                        color: statusColor,
                        border: `1px solid ${statusColor}30`,
                        whiteSpace: 'nowrap',
                        marginLeft: '8px',
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Date range */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: dark ? '#0F172A' : '#F8FAFC',
                      borderRadius: THEME.radiusMd,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          marginBottom: '3px',
                        }}
                      >
                        From
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: textPrimary,
                        }}
                      >
                        {formatDate(leave.leave_start_date)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: textMuted,
                        fontSize: '16px',
                        fontWeight: 300,
                      }}
                    >
                      →
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          marginBottom: '3px',
                        }}
                      >
                        To
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: textPrimary,
                        }}
                      >
                        {formatDate(leave.leave_end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {leave.reason && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: textSecondary,
                        padding: '10px 12px',
                        background: dark ? '#0F172A' : '#F8FAFC',
                        borderRadius: '10px',
                        marginTop: '10px',
                        border: `1px solid ${border}`,
                        lineHeight: 1.4,
                      }}
                    >
                      📝 {leave.reason}
                    </div>
                  )}

                  {/* Rejection */}
                  {leave.rejection_reason && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: THEME.red,
                        padding: '10px 12px',
                        background: THEME.redSoft,
                        borderRadius: '10px',
                        marginTop: '10px',
                        borderLeft: `3px solid ${THEME.red}`,
                        lineHeight: 1.4,
                      }}
                    >
                      <strong>Rejected:</strong> {leave.rejection_reason}
                    </div>
                  )}

                  {/* Revoke Requested Info + Cancel Revoke */}
                  {canCancelRevoke && (
                    <>
                      <div
                        style={{
                          fontSize: '12px',
                          color: THEME.orange,
                          padding: '10px 12px',
                          background: THEME.orangeSoft,
                          borderRadius: '10px',
                          marginTop: '10px',
                          borderLeft: `3px solid ${THEME.orange}`,
                          lineHeight: 1.4,
                          fontWeight: 600,
                        }}
                      >
                        ⏳ Revoke request sent to admin — awaiting approval
                      </div>

                      <button
                        onClick={() => handleCancelRevoke(leave)}
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '10px',
                          marginTop: '10px',
                          borderRadius: THEME.radiusMd,
                          border: `1px solid ${THEME.primary}30`,
                          background: THEME.primary + '10',
                          color: THEME.primary,
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: THEME.font,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          letterSpacing: '0.3px',
                          opacity: submitting ? 0.6 : 1,
                        }}
                      >
                        ↩️ Cancel Revoke Request
                      </button>
                    </>
                  )}

                  {/* Edit + Revoke buttons */}
                  {canEdit && canRevoke && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px',
                      }}
                    >
                      <button
                        onClick={() => handleEditLeave(leave)}
                        disabled={submitting}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: THEME.radiusMd,
                          border: `1px solid ${THEME.primary}30`,
                          background: THEME.primary + '10',
                          color: THEME.primary,
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: THEME.font,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          letterSpacing: '0.3px',
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleRevokeLeave(leave)}
                        disabled={submitting}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: THEME.radiusMd,
                          border: `1px solid ${THEME.red}30`,
                          background: THEME.red + '10',
                          color: THEME.red,
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: THEME.font,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {leave.status === 'Approved' ? '🚫 Request Revoke' : '🗑️ Revoke'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

// ============================================
// HELPERS
// ============================================
const EmptyState = ({
  icon,
  text,
  subtitle,
  dark,
  cardBg,
  textSecondary,
  textMuted,
}) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      background: cardBg,
      borderRadius: THEME.radiusLg,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : THEME.border}`,
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
      {text}
    </p>
    {subtitle && (
      <p
        style={{
          fontSize: '12px',
          color: textMuted,
          marginTop: '6px',
          margin: 0,
        }}
      >
        {subtitle}
      </p>
    )}
  </div>
);

export default Leave;