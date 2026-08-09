// src/pages/employee/Leave.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import Card from '../../components/common/Card';

export const Leave = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('my');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'Casual Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Unpaid Leave', 'Maternity Leave'];

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
    if (user?.id) {
      fetchLeaves();
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!formData.fromDate || !formData.toDate) {
      toast.error('Please select start and end dates');
      return;
    }

    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: user?.id,
          leave_type: formData.leaveType,
          leave_start_date: formData.fromDate,
          leave_end_date: formData.toDate,
          reason: formData.reason || null,
          status: 'Pending',
        })
        .select()
        .single();
      
      if (error) throw error;

      toast.success('Leave request submitted successfully!');
      setShowForm(false);
      setFormData({ leaveType: 'Casual Leave', fromDate: '', toDate: '', reason: '' });
      fetchLeaves();
      
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error(error.message || 'Failed to submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredLeaves = () => {
    if (activeTab === 'pending') {
      return leaves.filter(l => l.status === 'Pending' || l.status === 'pending');
    }
    if (activeTab === 'approved') {
      return leaves.filter(l => l.status === 'Approved' || l.status === 'approved');
    }
    if (activeTab === 'rejected') {
      return leaves.filter(l => l.status === 'Rejected' || l.status === 'rejected');
    }
    return leaves;
  };

  const filteredLeaves = getFilteredLeaves();
  const pendingCount = leaves.filter(l => l.status === 'Pending' || l.status === 'pending').length;

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
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'my', label: 'My Leaves' },
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
        <h1>📅 Leave Management</h1>
        <p>Apply for leave and track requests</p>
        <div className="page-header-actions">
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'active' : ''}
          >
            {showForm ? '✕ Close' : '+ Apply Leave'}
          </button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
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

      {showForm && (
        <Card theme={theme} className="mx-5 mt-4" padding="p-4">
          <h3 className="font-bold mb-4" style={{ color: theme.colors.textPrimary }}>
            Apply for Leave
          </h3>
          
          <div className="form-group mb-3">
            <label className="text-xs font-semibold block mb-1" style={{ color: theme.colors.textSecondary }}>
              Leave Type
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              className="form-control"
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-3">
            <label className="text-xs font-semibold block mb-1" style={{ color: theme.colors.textSecondary }}>
              Start Date
            </label>
            <input
              type="date"
              value={formData.fromDate}
              onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group mb-3">
            <label className="text-xs font-semibold block mb-1" style={{ color: theme.colors.textSecondary }}>
              End Date
            </label>
            <input
              type="date"
              value={formData.toDate}
              onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group mb-4">
            <label className="text-xs font-semibold block mb-1" style={{ color: theme.colors.textSecondary }}>
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="form-control"
              rows="3"
              placeholder="Enter reason for leave..."
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </Card>
      )}

      <div style={{ padding: '12px 16px 0' }}>
        {filteredLeaves.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📋</span>
            <p>No leave records found</p>
          </div>
        ) : (
          filteredLeaves.map((leave, idx) => {
            const statusColor = getStatusColor(leave.status, theme);
            const statusLabel = getStatusLabel(leave.status);
            
            return (
              <div key={leave.id || idx} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{leave.leave_type || 'Leave'}</div>
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
              </div>
            );
          })
        )}
      </div>

      <BottomNavigation theme={theme} />
    </div>
  );
};