// src/pages/employee/Profile.jsx
//
// Vision Earth HRMS — Premium Profile (FINAL — MODALS WORK)
//
// ✅ Modals rendered via Portal → never blink
// ✅ Live data fetch (mount + focus + 30s + Realtime)
// ✅ No re-render loop (fetch does NOT touch AuthContext)
// ✅ AuthContext synced ONLY when user saves their own edit

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { changePassword } from '../../services/api';
import { confirmMsg } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

const emptyEditData = () => ({
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  emergency_contact: '',
});

const emptyPasswordData = () => ({
  current: '',
  new: '',
  confirm: '',
});

export const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const { user, logout, isAdmin, updateUser } = useAuth();
  const dark = isDark(theme);

  // ============================================
  // STATE
  // ============================================
  const [liveProfile, setLiveProfile] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState(emptyPasswordData);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(emptyEditData);
  const [editLoading, setEditLoading] = useState(false);

  // Stable refs
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================
  // THEME
  // ============================================
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // IDENTITY
  // ============================================
  const isDemoUser = String(user?.id || '').startsWith('demo-');
  const identityColumn = isDemoUser ? 'email' : 'id';
  const identityValue = isDemoUser ? user?.email : user?.id;

  // Merged source — prefers live data, falls back to AuthContext
  const source = liveProfile || user || {};

  // ============================================
  // LIVE FETCH (does NOT touch AuthContext)
  // ============================================
  const loadLiveProfile = useCallback(async () => {
    if (!identityValue) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq(identityColumn, identityValue)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        return;
      }

      if (!data || !mountedRef.current) return;

      // 🔑 Only update LOCAL state — no updateUser() call here.
      //    This prevents re-renders that break modals.
      setLiveProfile(data);
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    }
  }, [identityColumn, identityValue]);

  // Fetch on mount
  useEffect(() => {
    loadLiveProfile();
  }, [loadLiveProfile]);

  // Fetch on window focus
  useEffect(() => {
    const onFocus = () => loadLiveProfile();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadLiveProfile]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(loadLiveProfile, 30000);
    return () => clearInterval(id);
  }, [loadLiveProfile]);

  // Realtime — instant updates
  useEffect(() => {
    if (!identityValue) return;

    const channel = supabase
      .channel(`profile-sync-${identityColumn}-${identityValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `${identityColumn}=eq.${identityValue}`,
        },
        (payload) => {
          if (!payload?.new || !mountedRef.current) return;
          // 🔑 Only local state — no re-render cascade
          setLiveProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [identityColumn, identityValue]);

  // ============================================
  // MODAL OPENERS — STABLE (empty deps)
  // ============================================
  const openEditModal = useCallback(() => {
    const s = source || {};
    setEditData({
      name: s.name || '',
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      pincode: s.pincode || '',
      emergency_contact: s.emergency_contact || '',
    });
    setIsEditing(true);
  }, [source]);

  const openPasswordModal = useCallback(() => {
    setPasswordError('');
    setPasswordData(emptyPasswordData());
    setShowChangePassword(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    setShowChangePassword(false);
    setPasswordError('');
    setPasswordData(emptyPasswordData());
  }, []);

  // ESC closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showChangePassword) closePasswordModal();
      if (isEditing) setIsEditing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showChangePassword, isEditing, closePasswordModal]);

  // Body scroll lock while modal open
  useEffect(() => {
    const anyOpen = isEditing || showChangePassword;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isEditing, showChangePassword]);

  // ============================================
  // PROFILE FIELDS (memoized)
  // ============================================
  const profileFields = useMemo(() => {
    const s = source || {};
    return [
      { label: 'Employee ID', value: s.employee_id || '-', icon: '🆔', color: '#6366F1' },
      { label: 'Email', value: s.email || '-', icon: '✉️', color: '#3B82F6' },
      { label: 'Department', value: s.department || 'N/A', icon: '🏢', color: '#10B981' },
      { label: 'Designation', value: s.designation || 'N/A', icon: '💼', color: '#F59E0B' },
      { label: 'Reporting Location', value: s.reporting_location || '-', icon: '📍', color: '#EF4444' },
      { label: 'Phone', value: s.phone || '-', icon: '📞', color: '#8B5CF6' },
      { label: 'Role', value: s.role || 'Employee', icon: '👑', color: '#F97316' },
    ];
  }, [source]);

  // ============================================
  // MENU ITEMS (memoized)
  // ============================================
  const menuItems = useMemo(() => {
    const baseItems = [
      {
        key: 'password',
        icon: '🔒',
        label: 'Change Password',
        subtitle: 'Update your account password',
        color: '#6366F1',
        onClick: openPasswordModal,
      },
      {
        key: 'edit',
        icon: '✏️',
        label: 'Edit Profile',
        subtitle: 'Update personal information',
        color: '#3B82F6',
        onClick: openEditModal,
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
      return [
        {
          key: 'admin',
          icon: '🛠️',
          label: 'Admin Dashboard',
          subtitle: 'Manage employees and leave requests',
          color: '#F97316',
          onClick: () => navigate('/admin'),
        },
        ...baseItems,
      ];
    }

    return baseItems;
  }, [isAdmin, navigate, openEditModal, openPasswordModal]);

  // ============================================
  // CHANGE PASSWORD
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
    if (!source?.email) {
      setPasswordError('Your email is missing. Please re-login and try again.');
      return;
    }

    try {
      setLoading(true);
      const result = await changePassword(
        source.email,
        passwordData.current,
        passwordData.new
      );

      if (result?.ok) {
        toast.success('Password changed successfully!');
        closePasswordModal();
      } else {
        setPasswordError(result?.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError(error?.message || 'Failed to change password');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ============================================
  // UPDATE PROFILE
  // ============================================
  const handleUpdateProfile = async () => {
    const trimmedName = (editData.name || '').trim();
    const trimmedPhone = (editData.phone || '').trim();
    const trimmedPincode = (editData.pincode || '').trim();

    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    if (trimmedPhone && !/^[0-9+\-()\s]{6,20}$/.test(trimmedPhone)) {
      toast.error('Enter a valid phone number');
      return;
    }
    if (trimmedPincode && !/^\d{6}$/.test(trimmedPincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }
    if (!identityValue) {
      toast.error('Cannot update profile: missing user identity');
      return;
    }

    try {
      setEditLoading(true);

      const updateData = {
        name: trimmedName,
        phone: trimmedPhone,
        address: (editData.address || '').trim(),
        city: (editData.city || '').trim(),
        state: (editData.state || '').trim(),
        pincode: trimmedPincode,
        emergency_contact: (editData.emergency_contact || '').trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq(identityColumn, identityValue);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);

      // 🔑 Only here do we sync AuthContext (user explicitly saved)
      if (typeof updateUser === 'function') {
        updateUser({
          name: updateData.name,
          phone: updateData.phone,
          address: updateData.address,
          city: updateData.city,
          state: updateData.state,
          pincode: updateData.pincode,
          emergency_contact: updateData.emergency_contact,
        });
      }

      // Re-fetch to confirm
      await loadLiveProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      if (mountedRef.current) setEditLoading(false);
    }
  };

  const handleLogout = () => {
    confirmMsg('Logout', 'Are you sure you want to logout?', () => {
      logout();
      navigate('/login');
    });
  };

  // ============================================
  // MODALS (portalled to document.body)
  // ============================================
  const editModalJSX = isEditing
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={(e) => {
            // Close ONLY if the click was directly on the backdrop
            if (e.target === e.currentTarget) setIsEditing(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 99999,
            overflowY: 'auto',
          }}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                id="edit-profile-title"
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
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Close edit profile"
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
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Enter full name', autoComplete: 'name' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: 'Enter phone number', autoComplete: 'tel', inputMode: 'tel' },
              { label: 'Address', key: 'address', type: 'text', placeholder: 'Enter address', autoComplete: 'street-address' },
            ].map((field) => (
              <ModalInput
                key={field.key}
                label={field.label}
                value={editData[field.key]}
                onChange={(v) => setEditData({ ...editData, [field.key]: v })}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                inputMode={field.inputMode}
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
                autoComplete="address-level2"
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
                autoComplete="address-level1"
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
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
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
                type="button"
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
        </div>,
        document.body
      )
    : null;

  const passwordModalJSX = showChangePassword
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePasswordModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 99999,
            overflowY: 'auto',
          }}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                id="change-password-title"
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
                type="button"
                onClick={closePasswordModal}
                aria-label="Close change password"
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
                role="alert"
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
              autoComplete="current-password"
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
              autoComplete="new-password"
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
              autoComplete="new-password"
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={closePasswordModal}
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
                type="button"
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
        </div>,
        document.body
      )
    : null;

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
                  width="52"
                  height="52"
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
              type="button"
              onClick={toggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
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

      {/* AVATAR CARD */}
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
            {source.name?.charAt(0).toUpperCase() || '👤'}
          </div>
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
            {source.name || 'User'}
          </div>
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
            {source.employee_id || 'N/A'}
          </div>
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
              {source.role || 'Employee'}
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

      {/* PERSONAL INFO */}
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
                  title={field.value}
                >
                  {field.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MENU */}
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
              type="button"
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

      {/* LOGOUT */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          type="button"
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

      {/* FOOTER */}
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

      {/* MODALS — portalled to body */}
      {editModalJSX}
      {passwordModalJSX}

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
  autoComplete,
  inputMode,
  maxLength,
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
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
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