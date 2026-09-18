// src/pages/admin/Leaves.jsx
//
// Vision Earth HRMS — Premium Admin Leave Approvals
// Approve/reject leave requests with premium design.

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

export const AdminLeaves = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = isDark(theme);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH
  // ============================================
  const fetchLeaves = async () => {
    try {
      setLoading(true);

      const { data: leavesData, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leavesError) throw leavesError;

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, employee_id, email');

      if (employeesError) throw employeesError;

      const combinedData =
        leavesData?.map((leave) => ({
          ...leave,
          employees:
            employeesData?.find((emp) => emp.id === leave.employee_id) || null,
        })) || [];

      setLeaves(combinedData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // ============================================
  // APPROVE
  // ============================================
  const handleApprove = async (leave) => {
    try {
      setSubmitting(true);

      const { data: adminData, error: adminError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (adminError) {
        toast.error('Could not find admin record');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Approved',
          approved_by: adminData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leave.id);

      if (error) throw error;

      const { data: empData } = await supabase
        .from('employees')
        .select('name')
        .eq('id', leave.employee_id)
        .single();

      // Mark attendance as 'L'
      const startDate = new Date(leave.leave_start_date);
      const endDate = new Date(leave.leave_end_date);
      let markedCount = 0;
      let skippedCount = 0;

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        const dateStr = istDate.toISOString().split('T')[0];

        const { data: existingAtt } = await supabase
          .from('attendance')
          .select('id, status')
          .eq('employee_id', leave.employee_id)
          .eq('attendance_date', dateStr)
          .maybeSingle();

        if (existingAtt) {
          if (existingAtt.status !== 'P' && existingAtt.status !== 'Present') {
            await supabase
              .from('attendance')
              .update({
                status: 'L',
                remarks: `Approved leave: ${leave.leave_type}`,
              })
              .eq('id', existingAtt.id);
            markedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await supabase.from('attendance').insert({
            employee_id: leave.employee_id,
            employee_name: empData?.name || 'Employee',
            attendance_date: dateStr,
            status: 'L',
            reporting_location: 'Leave',
            remarks: `Approved leave: ${leave.leave_type}`,
          });
          markedCount++;
        }
      }

      let message = `✅ Leave approved for ${empData?.name || 'employee'}`;
      if (markedCount > 0) message += ` · ${markedCount} day(s) marked L`;
      if (skippedCount > 0) message += ` · ${skippedCount} kept as P`;

      toast.success(message);
      await fetchLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.message || 'Failed to approve leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // REJECT
  // ============================================
  const handleReject = async () => {
    if (!selectedLeave) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectReason || 'No reason provided',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLeave.id);

      if (error) throw error;

      // Remove any 'L' entries
      const startDate = new Date(selectedLeave.leave_start_date);
      const endDate = new Date(selectedLeave.leave_end_date);
      let removedCount = 0;

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        const dateStr = istDate.toISOString().split('T')[0];

        const { data: existingAtt } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', selectedLeave.employee_id)
          .eq('attendance_date', dateStr)
          .eq('status', 'L')
          .maybeSingle();

        if (existingAtt) {
          await supabase.from('attendance').delete().eq('id', existingAtt.id);
          removedCount++;
        }
      }

      toast.success(`✅ Rejected · removed ${removedCount} day(s)`);

      setShowRejectModal(false);
      setSelectedLeave(null);
      setRejectReason('');
      fetchLeaves();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error(error.message || 'Failed to reject leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // FILTERS
  // ============================================
  const getFilteredLeaves = () => {
    if (filter === 'all') return leaves;
    return leaves.filter((l) => l.status?.toLowerCase() === filter);
  };

  const filteredLeaves = getFilteredLeaves();
  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'Rejected').length;

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
              marginBottom: '14px',
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
                  APPROVALS
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            📋 Review and manage leave requests
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {[
            { value: pendingCount, label: 'Pending', color: THEME.amber },
            { value: approvedCount, label: 'Approved', color: THEME.primary },
            { value: rejectedCount, label: 'Rejected', color: THEME.red },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: cardBg,
                borderRadius: THEME.radiusMd,
                padding: '12px 8px',
                textAlign: 'center',
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  letterSpacing: '-0.5px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  marginTop: '4px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
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
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'approved', label: 'Approved', count: approvedCount },
            { key: 'rejected', label: 'Rejected', count: rejectedCount },
            { key: 'all', label: 'All', count: leaves.length },
          ].map((v) => {
            const active = filter === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setFilter(v.key)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: THEME.radiusPill,
                  border: 'none',
                  background: active
                    ? dark
                      ? '#1E293B'
                      : '#FFFFFF'
                    : 'transparent',
                  color: active ? THEME.primary : textSecondary,
                  fontWeight: active ? 800 : 600,
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  fontFamily: THEME.font,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                }}
              >
                {v.label}
                {v.count > 0 && (
                  <span
                    style={{
                      background: active ? THEME.primary : 'transparent',
                      color: active ? '#FFFFFF' : textMuted,
                      padding: '0 5px',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: 800,
                      minWidth: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {v.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {filteredLeaves.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>📋</div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: textSecondary,
                margin: 0,
              }}
            >
              No {filter} leave requests
            </p>
          </div>
        ) : (
          filteredLeaves.map((leave) => {
            const statusColor = getStatusColor(leave.status, theme);
            const statusLabel = getStatusLabel(leave.status);
            const isPending = leave.status === 'Pending';

            return (
              <div
                key={leave.id}
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
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
                      }}
                    >
                      {leave.employees?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leave.employees?.name || 'Unknown'}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: textMuted,
                          fontWeight: 600,
                          marginTop: '1px',
                        }}
                      >
                        {leave.employees?.employee_id || 'N/A'} ·{' '}
                        {leave.leave_type || 'Leave'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
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
                    padding: '10px 12px',
                    background: dark ? '#0F172A' : '#F8FAFC',
                    borderRadius: THEME.radiusMd,
                    border: `1px solid ${border}`,
                    marginBottom: '10px',
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
                        marginBottom: '2px',
                      }}
                    >
                      From
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: textPrimary,
                      }}
                    >
                      {formatDate(leave.leave_start_date)}
                    </div>
                  </div>
                  <div style={{ color: textMuted, fontSize: '14px', fontWeight: 300 }}>
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
                        marginBottom: '2px',
                      }}
                    >
                      To
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
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
                      fontSize: '11px',
                      color: textSecondary,
                      padding: '8px 12px',
                      background: dark ? '#0F172A' : '#F8FAFC',
                      borderRadius: '10px',
                      marginBottom: '10px',
                      border: `1px solid ${border}`,
                      lineHeight: 1.4,
                    }}
                  >
                    📝 {leave.reason}
                  </div>
                )}

                {/* Rejection reason */}
                {leave.rejection_reason && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: THEME.red,
                      padding: '8px 12px',
                      background: THEME.redSoft,
                      borderRadius: '10px',
                      marginBottom: '10px',
                      borderLeft: `3px solid ${THEME.red}`,
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>Rejected:</strong> {leave.rejection_reason}
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(leave)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: THEME.radiusMd,
                        border: 'none',
                        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: THEME.shadowGreen,
                        fontFamily: THEME.font,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        letterSpacing: '0.3px',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowRejectModal(true);
                      }}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: THEME.radiusMd,
                        border: 'none',
                        background: `linear-gradient(135deg, ${THEME.red}, #DC2626)`,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                        fontFamily: THEME.font,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        letterSpacing: '0.3px',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && (
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
          onClick={() => setShowRejectModal(false)}
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
                marginBottom: '16px',
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
                ❌ Reject Leave
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
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

            <p
              style={{
                fontSize: '13px',
                color: textSecondary,
                marginBottom: '16px',
                lineHeight: 1.5,
              }}
            >
              Rejecting leave for{' '}
              <strong style={{ color: textPrimary }}>
                {selectedLeave?.employees?.name || 'employee'}
              </strong>
            </p>

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
              Reason (Optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="3"
              placeholder="Enter reason for rejection..."
              style={{
                width: '100%',
                padding: '12px 14px',
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
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLeave(null);
                  setRejectReason('');
                }}
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
                onClick={handleReject}
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
                  boxShadow: submitting ? 'none' : '0 4px 14px rgba(239,68,68,0.4)',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminLeaves;