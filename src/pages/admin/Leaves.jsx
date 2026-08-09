// src/pages/admin/Leaves.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { formatDate, getStatusColor, getStatusLabel, getTodayIST } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const AdminLeaves = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      
      const combinedData = leavesData?.map(leave => ({
        ...leave,
        employees: employeesData?.find(emp => emp.id === leave.employee_id) || null
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

  const handleApprove = async (leave) => {
    try {
      setSubmitting(true);
      
      const { data: adminData, error: adminError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (adminError) {
        console.error('Error finding admin:', adminError);
        toast.error('Could not find admin record');
        setSubmitting(false);
        return;
      }
      
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Approved',
          approved_by: adminData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', leave.id);
      
      if (error) throw error;
      
      const { data: empData } = await supabase
        .from('employees')
        .select('name')
        .eq('id', leave.employee_id)
        .single();
      
      // Mark attendance as 'L' for all leave dates using IST
      const startDate = new Date(leave.leave_start_date);
      const endDate = new Date(leave.leave_end_date);
      let markedCount = 0;
      let skippedCount = 0;
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Convert to IST
        const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
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
                remarks: `Approved leave: ${leave.leave_type}`
              })
              .eq('id', existingAtt.id);
            markedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await supabase
            .from('attendance')
            .insert({
              employee_id: leave.employee_id,
              employee_name: empData?.name || 'Employee',
              attendance_date: dateStr,
              status: 'L',
              reporting_location: 'Leave',
              remarks: `Approved leave: ${leave.leave_type}`
            });
          markedCount++;
        }
      }
      
      let message = `✅ Leave approved for ${empData?.name || 'employee'}`;
      if (markedCount > 0) message += `, marked ${markedCount} day(s) as Leave (L)`;
      if (skippedCount > 0) message += `, ${skippedCount} day(s) kept as Present (already worked)`;
      
      toast.success(message);
      await fetchLeaves();
      
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.message || 'Failed to approve leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectReason || 'No reason provided',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLeave.id);
      
      if (error) throw error;
      
      const startDate = new Date(selectedLeave.leave_start_date);
      const endDate = new Date(selectedLeave.leave_end_date);
      let removedCount = 0;
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        const dateStr = istDate.toISOString().split('T')[0];
        
        const { data: existingAtt } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', selectedLeave.employee_id)
          .eq('attendance_date', dateStr)
          .eq('status', 'L')
          .maybeSingle();
        
        if (existingAtt) {
          await supabase
            .from('attendance')
            .delete()
            .eq('id', existingAtt.id);
          removedCount++;
        }
      }
      
      toast.success(`✅ Leave rejected and 'L' removed from ${removedCount} day(s)`);
      
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

  const getFilteredLeaves = () => {
    if (filter === 'all') return leaves;
    return leaves.filter(l => l.status?.toLowerCase() === filter);
  };

  const filteredLeaves = getFilteredLeaves();
  const pendingCount = leaves.filter(l => l.status === 'Pending').length;

  if (loading) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `3px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.primary,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '12px', color: theme.colors.textSecondary, fontSize: '13px' }}>
            Loading leave requests...
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'all', label: 'All Requests' },
    { key: 'pending', label: 'Pending', badge: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      paddingBottom: '80px',
    }}>
      <div className="page-header">
        <h1>📋 Leave Approvals</h1>
        <p>Review and manage leave requests</p>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`tab ${filter === tab.key ? 'active' : ''}`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`badge ${tab.key === 'pending' ? 'pending' : ''}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📋</span>
            <p>No leave requests found</p>
          </div>
        ) : (
          filteredLeaves.map((leave) => {
            const statusColor = getStatusColor(leave.status, theme);
            const statusLabel = getStatusLabel(leave.status);
            const isPending = leave.status === 'Pending';
            
            return (
              <div key={leave.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{leave.leave_type || 'Leave Request'}</div>
                    <div className="card-subtitle">
                      {leave.employees?.name || 'Unknown Employee'} ({leave.employees?.employee_id || 'N/A'})
                    </div>
                  </div>
                  <span 
                    className="badge-theme"
                    style={{
                      backgroundColor: statusColor + '22',
                      color: statusColor,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="date-range">
                  <div className="date-group">
                    <label>From</label>
                    <span>{formatDate(leave.leave_start_date)}</span>
                  </div>
                  <span className="arrow">→</span>
                  <div className="date-group">
                    <label>To</label>
                    <span>{formatDate(leave.leave_end_date)}</span>
                  </div>
                </div>

                {leave.reason && (
                  <div style={{
                    fontSize: '13px',
                    color: theme.colors.textSecondary,
                    padding: '8px 12px',
                    background: theme.colors.inputBg,
                    borderRadius: '8px',
                    marginTop: '6px'
                  }}>
                    📝 {leave.reason}
                  </div>
                )}

                {leave.rejection_reason && (
                  <div style={{
                    fontSize: '13px',
                    color: '#EF4444',
                    padding: '8px 12px',
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: '8px',
                    marginTop: '6px',
                    borderLeft: '3px solid #EF4444'
                  }}>
                    <strong>Rejected:</strong> {leave.rejection_reason}
                  </div>
                )}

                {isPending && (
                  <div className="action-group">
                    <button
                      className="approve"
                      onClick={() => handleApprove(leave)}
                      disabled={submitting}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="reject"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowRejectModal(true);
                      }}
                      disabled={submitting}
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

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '12px' }}>
              Reject Leave Request
            </h3>
            <p style={{ fontSize: '13px', color: theme.colors.textSecondary, marginBottom: '12px' }}>
              Rejecting leave for <strong>{selectedLeave?.employees?.name || 'employee'}</strong>
            </p>
            <div className="form-group">
              <label>Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-control"
                rows="3"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLeave(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={handleReject}
                disabled={submitting}
                style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}
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