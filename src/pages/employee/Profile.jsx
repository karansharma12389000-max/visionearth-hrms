// src/pages/employee/Profile.jsx
//
// Vision Earth HRMS — Premium Profile
// Avatar header, personal info card, menu list with icons.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { changePassword } from '../../services/api';
import { confirmMsg } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user, logout, isAdmin, updateUser } = useAuth();
  const dark = isDark(theme);

  // ============================================
  // STATE
  // ============================================
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    emergency_contact: user?.emergency_contact || '',
  });
  const [editLoading, setEditLoading] = useState(false);

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
  // PERSONAL INFO ROWS
  // ============================================
  const profileFields = [
    { label: 'Employee ID', value: user?.employee_id || '-', icon: '🆔', color: '#6366F1' },
    { label: 'Email', value: user?.email || '-', icon: '✉️', color: '#3B82F6' },
    { label: 'Department', value: user?.department || 'N/A', icon: '🏢', color: '#10B981' },
    { label: 'Designation', value: user?.designation || 'N/A', icon: '💼', color: '#F59E0B' },
    { label: 'Reporting Location', value: user?.reporting_location || '-', icon: '📍', color: '#EF4444' },
    { label: 'Phone', value: user?.phone || '-', icon: '📞', color: '#8B5CF6' },
    { label: 'Role', value: user?.role || 'Employee', icon: '👑', color: '#F97316' },
  ];

  // ============================================
  // MENU ITEMS
  // ============================================
  const menuItems = [
    {
      key: 'password',
      icon: '🔒',
      label: 'Change Password',
      subtitle: 'Update your account password',
      color: '#6366F1',
      onClick: () => setShowChangePassword(true),
    },
    {
      key: 'edit',
      icon: '✏️',
      label: 'Edit Profile',
      subtitle: 'Update personal information',
      color: '#3B82F6',
      onClick: () => setIsEditing(true),
    },
    {
      key: 'settings',
      icon: '⚙️',
      label: 'App Settings',
      subtitle: 'Notifications, theme, privacy',
      color: '#10B981',
      onClick: () => toast.info('App settings coming soon!'),
    },
    {
      key: 'help',
      icon: '❓',
      label: 'Help & Support',
      subtitle: 'Get help with the app',
      color: '#F59E0B',
      onClick: () => toast.info('Help & Support coming soon!'),
    },
    {
      key: 'about',
      icon: 'ℹ️',
      label: 'About',
      subtitle: 'Vision Earth HRMS v1.0',
      color: '#8B5CF6',
      onClick: () => toast.info('Vision Earth HRMS v1.0'),
    },
  ];

  if (isAdmin) {
    menuItems.unshift({
      key: 'admin',
      icon: '🛠️',
      label: 'Admin Dashboard',
      subtitle: 'Manage employees and leave requests',
      color: '#F97316',
      onClick: () => navigate('/admin'),
    });
  }

  // ============================================
  // HANDLE PASSWORD CHANGE
  // ============================================
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

  // ============================================
  // HANDLE UPDATE PROFILE
  // ============================================
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
        updated_at: new Date().toISOString(),
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

      // ✅ FIX: update the AuthContext session in-place instead of reloading.
      //    This makes the header, avatar, and profile card re-render instantly
      //    with the new data, and persists to localStorage.
      if (typeof updateUser === 'function') {
        updateUser({
          name: editData.name,
          phone: editData.phone,
          address: editData.address,
          city: editData.city,
          state: editData.state,
          pincode: editData.pincode,
          emergency_contact: editData.emergency_contact,
        });
      } else {
        // Fallback for older AuthContext that doesn't yet expose updateUser
        const updatedUser = { ...user, ...editData };
        try {
          localStorage.setItem('ve_session', JSON.stringify(updatedUser));
        } catch {}
        window.location.reload();
      }
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
      {/* ============================================ */}
      {/* PREMIUM HEADER */}
      {/* ============================================ */}
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
                  PROFILE
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
                  ACCOUNT
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
            👤 Manage your account and preferences
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* AVATAR CARD */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderRadius: THEME.radiusXl,
            padding: '24px 20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
            boxShadow: cardShadow,
          }}
        >
          {/* Decorative leaves glow */}
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Avatar */}
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              margin: '0 auto 14px',
              background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              fontWeight: 800,
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
              position: 'relative',
              zIndex: 1,
              border: '4px solid rgba(255,255,255,0.5)',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || '👤'}
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: textPrimary,
              letterSpacing: '-0.3px',
              marginBottom: '4px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {user?.name || 'User'}
          </div>

          {/* ID */}
          <div
            style={{
              fontSize: '12px',
              color: textSecondary,
              fontWeight: 600,
              marginBottom: '10px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {user?.employee_id || 'N/A'}
          </div>

          {/* Badges */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                borderRadius: THEME.radiusPill,
                fontSize: '10px',
                fontWeight: 800,
                background: 'rgba(59,130,246,0.15)',
                color: THEME.blue,
                border: `1px solid ${THEME.blue}30`,
                letterSpacing: '0.3px',
              }}
            >
              {user?.role || 'Employee'}
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: THEME.radiusPill,
                fontSize: '10px',
                fontWeight: 800,
                background: 'rgba(16,185,129,0.15)',
                color: THEME.primary,
                border: `1px solid ${THEME.primary}30`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                letterSpacing: '0.3px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: THEME.primary,
                  boxShadow: `0 0 0 3px ${THEME.primary}30`,
                }}
              />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PERSONAL INFORMATION */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '10px',
            paddingLeft: '4px',
          }}
        >
          Personal Information
        </div>

        <div
          style={{
            background: cardBg,
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
            overflow: 'hidden',
          }}
        >
          {profileFields.map((field, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '13px 16px',
                borderBottom:
                  idx < profileFields.length - 1
                    ? `1px solid ${border}`
                    : 'none',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: field.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  flexShrink: 0,
                  color: field.color,
                }}
              >
                {field.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '2px',
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {field.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* MENU ITEMS */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '10px',
            paddingLeft: '4px',
          }}
        >
          Settings
        </div>

        <div
          style={{
            background: cardBg,
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
            overflow: 'hidden',
          }}
        >
          {menuItems.map((item, idx) => (
            <button
              key={item.key}
              onClick={item.onClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom:
                  idx < menuItems.length - 1
                    ? `1px solid ${border}`
                    : 'none',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s ease',
                fontFamily: THEME.font,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(255,255,255,0.03)'
                  : '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: item.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: textPrimary,
                    marginBottom: '1px',
                  }}
                >
                  {item.label}
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
                  {item.subtitle}
                </div>
              </div>
              <span
                style={{
                  fontSize: '16px',
                  color: textMuted,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* LOGOUT BUTTON */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
            borderRadius: THEME.radiusLg,
            border: `1.5px solid ${THEME.red}30`,
            background: dark ? 'rgba(239,68,68,0.08)' : THEME.redSoft,
            color: THEME.red,
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: THEME.font,
            gap: '8px',
            letterSpacing: '0.3px',
            boxShadow: cardShadow,
          }}
        >
          <span style={{ fontSize: '16px' }}>🚪</span>
          Logout
        </button>
      </div>

      {/* ============================================ */}
      {/* FOOTER QUOTE */}
      {/* ============================================ */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            padding: '14px 16px',
            background: dark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))'
              : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderRadius: THEME.radiusLg,
            border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '4px' }}>🌿</div>
          <div
            style={{
              fontSize: '11px',
              fontStyle: 'italic',
              color: dark ? THEME.primaryLight : THEME.primaryDeep,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            "People · Projects · A Greener Tomorrow"
          </div>
          <div
            style={{
              fontSize: '9px',
              color: textMuted,
              marginTop: '6px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            VISION EARTH HRMS v1.0
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* EDIT PROFILE MODAL */}
      {/* ============================================ */}
      {isEditing && (
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
          onClick={() => setIsEditing(false)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
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
                ✏️ Edit Profile
              </h3>
              <button
                onClick={() => setIsEditing(false)}
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

            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Enter full name' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: 'Enter phone number' },
              { label: 'Address', key: 'address', type: 'text', placeholder: 'Enter address' },
            ].map((field) => (
              <ModalInput
                key={field.key}
                label={field.label}
                value={editData[field.key]}
                onChange={(v) => setEditData({ ...editData, [field.key]: v })}
                type={field.type}
                placeholder={field.placeholder}
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
            ))}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <ModalInput
                label="City"
                value={editData.city}
                onChange={(v) => setEditData({ ...editData, city: v })}
                placeholder="City"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
              <ModalInput
                label="State"
                value={editData.state}
                onChange={(v) => setEditData({ ...editData, state: v })}
                placeholder="State"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />
            </div>

            <ModalInput
              label="Pincode"
              value={editData.pincode}
              onChange={(v) => setEditData({ ...editData, pincode: v })}
              placeholder="Enter pincode"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <ModalInput
              label="Emergency Contact"
              value={editData.emergency_contact}
              onChange={(v) =>
                setEditData({ ...editData, emergency_contact: v })
              }
              placeholder="Emergency contact number"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setIsEditing(false)}
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
                onClick={handleUpdateProfile}
                disabled={editLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: editLoading
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  boxShadow: editLoading ? 'none' : THEME.shadowGreen,
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ============================================ */}
      {showChangePassword && (
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
          onClick={() => setShowChangePassword(false)}
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
                🔒 Change Password
              </h3>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setPasswordData({ current: '', new: '', confirm: '' });
                }}
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

            {passwordError && (
              <div
                style={{
                  background: THEME.redSoft,
                  padding: '10px 14px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${THEME.red}40`,
                  marginBottom: '16px',
                }}
              >
                <p
                  style={{
                    color: THEME.red,
                    fontSize: '12px',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {passwordError}
                </p>
              </div>
            )}

            <ModalInput
              label="Current Password"
              value={passwordData.current}
              onChange={(v) => setPasswordData({ ...passwordData, current: v })}
              type="password"
              placeholder="Enter current password"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <ModalInput
              label="New Password"
              value={passwordData.new}
              onChange={(v) => setPasswordData({ ...passwordData, new: v })}
              type="password"
              placeholder="Enter new password (min 6)"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <ModalInput
              label="Confirm Password"
              value={passwordData.confirm}
              onChange={(v) => setPasswordData({ ...passwordData, confirm: v })}
              type="password"
              placeholder="Confirm new password"
              dark={dark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setPasswordData({ current: '', new: '', confirm: '' });
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
                onClick={handleChangePassword}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: loading
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : THEME.shadowGreen,
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
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

// ============================================
// MODAL INPUT HELPER
// ============================================
const ModalInput = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  dark,
  cardBg,
  textPrimary,
  textMuted,
  border,
}) => (
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
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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
);

export default Profile;