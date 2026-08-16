// src/pages/employee/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { changePassword } from '../../services/api';
import { confirmMsg } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  
  // State for change password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // State for edit profile
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    emergency_contact: user?.emergency_contact || ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const profileFields = [
    { label: 'Employee ID', value: user?.employee_id || '-', icon: '🆔' },
    { label: 'Email Address', value: user?.email || '-', icon: '✉️' },
    { label: 'Department', value: user?.department || '-', icon: '🏢' },
    { label: 'Designation', value: user?.designation || '-', icon: '💼' },
    { label: 'Reporting Location', value: user?.reporting_location || '-', icon: '📍' },
    { label: 'Phone', value: user?.phone || '-', icon: '📞' },
    { label: 'Role', value: user?.role || '-', icon: '👑' },
  ];

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New password and confirm password do not match');
      return;
    }
    
    if (passwordData.new.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const result = await changePassword(
        user?.email,
        passwordData.current,
        passwordData.new
      );
      
      if (result.ok) {
        toast.success('Password changed successfully!');
        setShowChangePassword(false);
        setPasswordData({ current: '', new: '', confirm: '' });
        setPasswordError('');
      } else {
        setPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    try {
      setEditLoading(true);
      
      const updateData = {
        name: editData.name,
        phone: editData.phone,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        pincode: editData.pincode,
        emergency_contact: editData.emergency_contact,
        updated_at: new Date().toISOString()
      };
      
      let error;
      const isDemoUser = user?.id && user.id.startsWith('demo-');
      
      if (isDemoUser) {
        const { error: updateError } = await supabase
          .from('employees')
          .update(updateData)
          .eq('email', user.email);
        error = updateError;
      } else {
        const { error: updateError } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', user.id);
        error = updateError;
      }

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      const updatedUser = { ...user, ...editData };
      localStorage.setItem('ve_session', JSON.stringify(updatedUser));
      
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = () => {
    confirmMsg('Logout', 'Are you sure you want to logout?', () => {
      logout();
      navigate('/login');
    });
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC',
      padding: '16px 16px 100px',
    }}>
      
      {/* ✅ UBER-STYLE HEADER - Same as Dashboard, Attendance, Leave */}
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
                👤 Profile
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '13px', 
                fontWeight: 500,
                marginTop: '2px',
              }}>
                Manage your account
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
        </div>
      </div>

      {/* Avatar - Uber Style */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 20px 20px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          fontWeight: 800,
          background: theme.dark ? '#1E293B' : '#FFFFFF',
          border: '4px solid #3B82F6',
          boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
          color: '#3B82F6',
        }}>
          {user?.name?.charAt(0).toUpperCase() || '👤'}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          marginTop: '12px',
          color: theme.dark ? '#F1F5F9' : '#0F172A',
        }}>
          {user?.name || 'User'}
        </div>
        <div style={{
          fontSize: '14px',
          color: theme.dark ? '#94A3B8' : '#64748B',
        }}>
          {user?.designation || 'N/A'}
        </div>
        <span style={{
          display: 'inline-block',
          padding: '4px 18px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(59,130,246,0.1)',
          color: '#3B82F6',
          marginTop: '6px',
        }}>
          {user?.role || 'Employee'}
        </span>
      </div>

      {/* Personal Information - Uber Style */}
      <div style={{
        background: theme.dark 
          ? 'rgba(30, 41, 59, 0.6)' 
          : '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
        boxShadow: theme.dark 
          ? '0 4px 20px rgba(0,0,0,0.2)' 
          : '0 4px 20px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          color: theme.dark ? '#F1F5F9' : '#0F172A',
          marginBottom: '16px',
        }}>
          Personal Information
        </div>
        {profileFields.map((field, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: idx < profileFields.length - 1 ? `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` : 'none',
            }}
          >
            <span style={{
              fontSize: '18px',
              marginRight: '12px',
              width: '28px',
              textAlign: 'center',
            }}>
              {field.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: theme.dark ? '#94A3B8' : '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {field.label}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: theme.dark ? '#F1F5F9' : '#0F172A',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {field.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions - Uber Style */}
      <div>
        {/* Edit Profile Button */}
        <button
          onClick={() => setIsEditing(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.6)' 
              : '#FFFFFF',
            marginBottom: '10px',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: theme.dark 
              ? '0 2px 12px rgba(0,0,0,0.2)' 
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = theme.dark 
              ? '0 2px 12px rgba(0,0,0,0.2)' 
              : '0 2px 12px rgba(0,0,0,0.04)';
          }}
        >
          <span style={{ fontSize: '20px', marginRight: '14px' }}>✏️</span>
          <span style={{
            flex: 1,
            textAlign: 'left',
            fontWeight: 600,
            fontSize: '15px',
            color: theme.dark ? '#F1F5F9' : '#0F172A',
          }}>
            Edit Profile
          </span>
          <span style={{ color: theme.dark ? '#94A3B8' : '#94A3B8' }}>→</span>
        </button>

        {/* Change Password Button */}
        <button
          onClick={() => setShowChangePassword(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.6)' 
              : '#FFFFFF',
            marginBottom: '10px',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: theme.dark 
              ? '0 2px 12px rgba(0,0,0,0.2)' 
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = theme.dark 
              ? '0 2px 12px rgba(0,0,0,0.2)' 
              : '0 2px 12px rgba(0,0,0,0.04)';
          }}
        >
          <span style={{ fontSize: '20px', marginRight: '14px' }}>🔒</span>
          <span style={{
            flex: 1,
            textAlign: 'left',
            fontWeight: 600,
            fontSize: '15px',
            color: theme.dark ? '#F1F5F9' : '#0F172A',
          }}>
            Change Password
          </span>
          <span style={{ color: theme.dark ? '#94A3B8' : '#94A3B8' }}>→</span>
        </button>

        {/* Admin Tools */}
        {isAdmin && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: theme.dark ? '#F1F5F9' : '#0F172A',
              marginBottom: '12px',
            }}>
              🛠️ Admin Quick Access
            </div>
            <button
              onClick={() => navigate('/admin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '14px 18px',
                borderRadius: '12px',
                border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                background: theme.dark 
                  ? 'rgba(30, 41, 59, 0.6)' 
                  : '#FFFFFF',
                marginBottom: '10px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: theme.dark 
                  ? '0 2px 12px rgba(0,0,0,0.2)' 
                  : '0 2px 12px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ fontSize: '20px', marginRight: '14px' }}>🛠️</span>
              <span style={{
                flex: 1,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '14px',
                color: theme.dark ? '#F1F5F9' : '#0F172A',
              }}>
                Go to Admin Dashboard
              </span>
              <span style={{ color: theme.dark ? '#94A3B8' : '#94A3B8' }}>→</span>
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1px solid #EF4444`,
            background: theme.dark 
              ? 'rgba(30, 41, 59, 0.6)' 
              : '#FFFFFF',
            marginBottom: '10px',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: theme.dark 
              ? '0 2px 12px rgba(0,0,0,0.2)' 
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#DC2626';
            e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
            e.currentTarget.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#EF4444';
            e.currentTarget.style.background = theme.dark 
              ? 'rgba(30, 41, 59, 0.6)' 
              : '#FFFFFF';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <span style={{ fontSize: '20px', marginRight: '14px' }}>🚪</span>
          <span style={{
            flex: 1,
            textAlign: 'left',
            fontWeight: 600,
            fontSize: '15px',
            color: '#EF4444',
          }}>
            Logout
          </span>
          <span style={{ color: '#EF4444' }}>→</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setIsEditing(false)}>
          <div style={{
            background: theme.dark ? '#1E293B' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: theme.dark ? '#F1F5F9' : '#0F172A',
              }}>
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  fontSize: '24px',
                  color: theme.dark ? '#94A3B8' : '#94A3B8',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
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
                Full Name
              </label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
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
                Phone
              </label>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
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
                Address
              </label>
              <input
                type="text"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                  City
                </label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                    background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                    color: theme.dark ? '#F1F5F9' : '#0F172A',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
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
                  State
                </label>
                <input
                  type="text"
                  value={editData.state}
                  onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                    background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                    color: theme.dark ? '#F1F5F9' : '#0F172A',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
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
                Pincode
              </label>
              <input
                type="text"
                value={editData.pincode}
                onChange={(e) => setEditData({ ...editData, pincode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: theme.dark ? '#94A3B8' : '#64748B',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                Emergency Contact
              </label>
              <input
                type="text"
                value={editData.emergency_contact}
                onChange={(e) => setEditData({ ...editData, emergency_contact: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: 'transparent',
                  color: theme.dark ? '#94A3B8' : '#64748B',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={editLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: editLoading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(30,64,175,0.3)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowChangePassword(false)}>
          <div style={{
            background: theme.dark ? '#1E293B' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: theme.dark ? '#F1F5F9' : '#0F172A',
              }}>
                Change Password
              </h3>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setPasswordData({ current: '', new: '', confirm: '' });
                }}
                style={{
                  fontSize: '24px',
                  color: theme.dark ? '#94A3B8' : '#94A3B8',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div style={{
                background: '#FEE2E2',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #FCA5A5',
                marginBottom: '16px',
              }}>
                <p style={{
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 500,
                  margin: 0,
                }}>
                  {passwordError}
                </p>
              </div>
            )}

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
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${passwordError ? '#EF4444' : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
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
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${passwordError ? '#EF4444' : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: theme.dark ? '#94A3B8' : '#64748B',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${passwordError ? '#EF4444' : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')}`,
                  background: theme.dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  color: theme.dark ? '#F1F5F9' : '#0F172A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setPasswordData({ current: '', new: '', confirm: '' });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                  background: 'transparent',
                  color: theme.dark ? '#94A3B8' : '#64748B',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(30,64,175,0.3)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};