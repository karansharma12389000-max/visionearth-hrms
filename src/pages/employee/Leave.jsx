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
  const { theme, toggleDark } = useTheme();
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
        backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC',
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
      backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC',
      padding: '16px 16px 100px',
    }}>
      
      {/* ✅ UBER-STYLE HEADER - Same as Dashboard and Attendance */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
        borderRadius: '20px',
        padding: '24px 20px 20px',
        marginBottom: '16px',
        border: 'none',
        boxShadow: '0 4px 24px rgba(59,130,246,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: -40,
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top Row: Title + Theme Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '6px',
          }}>
            <div>
              <h1 style={{ 
                color: '#FFFFFF', 
                fontSize: '22px', 
                fontWeight: 700, 
                margin: 0,
                lineHeight: 1.2,
              }}>
                📅 Leave Management
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '13px', 
                fontWeight: 500,
                marginTop: '2px',
              }}>
                Apply for leave and track requests
              </p>
            </div>
            
            {/* Theme Toggle - White style */}
            <button
              onClick={toggleDark}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {theme.dark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Apply Leave Button - Inside Header */}
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: showForm 
                ? 'rgba(239,68,68,0.2)' 
                : 'rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = showForm 
                ? 'rgba(239,68,68,0.3)' 
                : 'rgba(255,255,255,0.25)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showForm 
                ? 'rgba(239,68,68,0.2)' 
                : 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {showForm ? '✕ Close' : '+ Apply Leave'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        padding: '0 0 12px',
        borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        marginBottom: '12px',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === tab.key 
                ? 'linear-gradient(135deg, #3B82F6, #6366F1)' 
                : 'transparent',
              color: activeTab === tab.key 
                ? '#FFFFFF' 
                : theme.dark 
                  ? '#94A3B8' 
                  : '#64748B',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: activeTab === tab.key 
                  ? 'rgba(255,255,255,0.2)' 
                  : '#EF4444',
                color: activeTab === tab.key 
                  ? '#FFFFFF' 
                  : '#FFFFFF',
                padding: '0 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leave Form - Uber Style */}
      {showForm && (
        <div style={{
          background: theme.dark 
            ? 'rgba(30, 41, 59, 0.8)' 
            : '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: theme.dark 
            ? '0 4px 20px rgba(0,0,0,0.2)' 
            : '0 4px 20px rgba(0,0,0,0.04)',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: theme.dark ? '#F1F5F9' : '#0F172A',
            marginBottom: '16px',
          }}>
            Apply for Leave
          </h3>
          
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.dark ? '#94A3B8' : '#64748B',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              Leave Type
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                color: theme.dark ? '#F1F5F9' : '#0F172A',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.dark ? '#94A3B8' : '#64748B',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={formData.fromDate}
              onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                color: theme.dark ? '#F1F5F9' : '#0F172A',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.dark ? '#94A3B8' : '#64748B',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              End Date
            </label>
            <input
              type="date"
              value={formData.toDate}
              onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                color: theme.dark ? '#F1F5F9' : '#0F172A',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.dark ? '#94A3B8' : '#64748B',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows="3"
              placeholder="Enter reason for leave..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                color: theme.dark ? '#F1F5F9' : '#0F172A',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                resize: 'vertical',
                minHeight: '60px',
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '15px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.3)';
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}

      {/* Leave List */}
      <div>
        {filteredLeaves.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: theme.dark ? '#94A3B8' : '#94A3B8',
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.5)' 
              : '#FFFFFF',
            borderRadius: '16px',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontWeight: 600 }}>No leave records found</p>
          </div>
        ) : (
          filteredLeaves.map((leave, idx) => {
            const statusColor = getStatusColor(leave.status, theme);
            const statusLabel = getStatusLabel(leave.status);
            
            return (
              <div
                key={leave.id || idx}
                style={{
                  background: theme.dark 
                    ? 'rgba(30, 41, 59, 0.6)' 
                    : '#FFFFFF',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  marginBottom: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                  boxShadow: theme.dark 
                    ? '0 2px 12px rgba(0,0,0,0.2)' 
                    : '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px',
                }}>
                  <div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: theme.dark ? '#F1F5F9' : '#0F172A',
                    }}>
                      {leave.leave_type || 'Leave'}
                    </div>
                  </div>
                  <span 
                    style={{
                      padding: '4px 14px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: statusColor + '22',
                      color: statusColor,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }}>
                  <div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: theme.dark ? '#94A3B8' : '#94A3B8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      From
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.dark ? '#F1F5F9' : '#0F172A',
                    }}>
                      {formatDate(leave.leave_start_date)}
                    </div>
                  </div>
                  <span style={{
                    color: theme.dark ? '#475569' : '#CBD5E1',
                    fontSize: '18px',
                  }}>→</span>
                  <div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: theme.dark ? '#94A3B8' : '#94A3B8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      To
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.dark ? '#F1F5F9' : '#0F172A',
                    }}>
                      {formatDate(leave.leave_end_date)}
                    </div>
                  </div>
                </div>

                {leave.reason && (
                  <div style={{
                    fontSize: '13px',
                    color: theme.dark ? '#94A3B8' : '#64748B',
                    padding: '8px 12px',
                    background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
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