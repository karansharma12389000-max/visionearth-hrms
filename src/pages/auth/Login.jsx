// src/pages/auth/Login.jsx
//
// Vision Earth HRMS — Premium Login
// Green gradient, decorative circles, Remember Me, contact admin mailto.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { login, DEMO_EMPLOYEES } from '../../services/api';
import { THEME, isDark } from '../../utils/designTokens';

export const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login: authLogin, isAuthenticated } = useAuth();
  const dark = isDark(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // ✅ CONFIG: Change these to your admin/HR details
  const ADMIN_EMAIL = 'visionearthcare.com'; // ← UPDATE THIS
  const ADMIN_SUBJECT = 'HRMS Access Request';
  const ADMIN_BODY = `Hello Vision Earth HRMS Team,

I need help with my HRMS account access.

My details:
- Name: 
- Employee ID: 
- Email: 
- Issue: 

Please assist at your earliest convenience.

Thank you,
`;

  // ============================================
  // OPEN MAIL CLIENT
  // ============================================
  const handleContactAdmin = () => {
    const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      ADMIN_SUBJECT
    )}&body=${encodeURIComponent(ADMIN_BODY)}`;
    window.location.href = mailtoLink;
  };

  // ============================================
  // RESTORE REMEMBERED EMAIL
  // ============================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ve_login_email');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // ============================================
  // AUTH REDIRECT
  // ============================================
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // ============================================
  // LOGIN HANDLER
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Remember Me
      try {
        if (rememberMe) {
          localStorage.setItem('ve_login_email', trimmedEmail);
        } else {
          localStorage.removeItem('ve_login_email');
        }
      } catch {}

      // Check demo users
      const found = DEMO_EMPLOYEES.find(
        (emp) =>
          emp.email.toLowerCase() === trimmedEmail.toLowerCase() &&
          emp.password === trimmedPassword
      );

      if (found) {
        const { password: _, ...userData } = found;
        authLogin(userData);
        toast.success('Welcome back, ' + userData.name + '!');
        navigate('/dashboard');
        setLoading(false);
        return;
      }

      // Supabase login
      const result = await login(trimmedEmail, trimmedPassword);

      if (result.ok && result.employee) {
        const userData = {
          id: result.employee.id || 'EMP' + Date.now().toString().slice(-6),
          employee_id:
            result.employee.employee_id ||
            'EMP' + Date.now().toString().slice(-6),
          email: result.employee.email,
          name: result.employee.name,
          role: result.employee.role || 'Employee',
          department: result.employee.department || 'N/A',
          designation: result.employee.designation || 'N/A',
          reporting_location: result.employee.reporting_location || 'N/A',
          phone: result.employee.phone || 'N/A',
          is_active: true,
        };
        authLogin(userData);
        toast.success('Welcome back, ' + userData.name + '!');
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COLORS
  // ============================================
  const pageBg = dark
    ? 'linear-gradient(135deg, #0F172A 0%, #064E3B 100%)'
    : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)';

  const cardBg = dark ? '#1E293B' : '#FFFFFF';
  const textPrimary = dark ? '#F1F5F9' : THEME.text;
  const textSecondary = dark ? '#94A3B8' : THEME.textSecondary;
  const textMuted = dark ? '#64748B' : THEME.textMuted;
  const border = dark ? 'rgba(255,255,255,0.08)' : THEME.border;
  const inputBg = dark ? '#0F172A' : '#F8FAFC';

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        background: pageBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: THEME.font,
      }}
    >
      {/* DECORATIVE CIRCLES */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-120px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(5,150,105,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* CONTAINER */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeIn 0.5s ease-out',
        }}
      >
        {/* LOGO HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              background: dark
                ? 'linear-gradient(135deg, #0F172A, #064E3B)'
                : 'linear-gradient(135deg, #FFFFFF, #ECFDF5)',
              boxShadow:
                '0 12px 32px rgba(16,185,129,0.25), 0 2px 8px rgba(0,0,0,0.06)',
              border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#D1FAE5'}`,
              overflow: 'hidden',
              padding: '10px',
            }}
          >
            <img
              src="/vision-earth-logo.png"
              alt="Vision Earth"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: dark ? '#F1F5F9' : THEME.primaryDeep,
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            VISION EARTH
          </h1>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: THEME.primary,
              letterSpacing: '4px',
              marginTop: '6px',
            }}
          >
            H R M S
          </div>
          <p
            style={{
              fontSize: '11px',
              color: textSecondary,
              marginTop: '8px',
              fontWeight: 500,
              letterSpacing: '0.3px',
            }}
          >
            People · Projects · A Greener Tomorrow
          </p>
        </div>

        {/* LOGIN CARD */}
        <div
          style={{
            background: cardBg,
            borderRadius: '24px',
            padding: '28px 24px 24px',
            border: `1px solid ${border}`,
            boxShadow: dark
              ? '0 20px 60px rgba(0,0,0,0.4)'
              : '0 12px 40px rgba(15,23,42,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ marginBottom: '22px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: textPrimary,
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Welcome Back
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: textSecondary,
                marginTop: '4px',
                fontWeight: 500,
              }}
            >
              Sign in to continue
            </p>
          </div>

          {error && (
            <div
              style={{
                background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                padding: '11px 14px',
                borderRadius: '12px',
                border: `1px solid ${
                  dark ? 'rgba(239,68,68,0.3)' : '#FECACA'
                }`,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'shake 0.4s ease-out',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
              <p
                style={{
                  color: dark ? '#FCA5A5' : '#DC2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* EMAIL */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: textMuted,
                  marginBottom: '7px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '12px',
                  border: `1.5px solid ${
                    error ? THEME.red + '60' : border
                  }`,
                  background: inputBg,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <span
                  style={{
                    padding: '0 0 0 14px',
                    fontSize: '15px',
                    color: textMuted,
                    flexShrink: 0,
                  }}
                >
                  ✉️
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@visionearth.com"
                  autoComplete="email"
                  style={{
                    flex: 1,
                    padding: '13px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: textPrimary,
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    fontFamily: THEME.font,
                    fontWeight: 500,
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: textMuted,
                  marginBottom: '7px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '12px',
                  border: `1.5px solid ${
                    error ? THEME.red + '60' : border
                  }`,
                  background: inputBg,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <span
                  style={{
                    padding: '0 0 0 14px',
                    fontSize: '15px',
                    color: textMuted,
                    flexShrink: 0,
                  }}
                >
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    flex: 1,
                    padding: '13px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: textPrimary,
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    fontFamily: THEME.font,
                    fontWeight: 500,
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '0 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: textMuted,
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* REMEMBER ME */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => !loading && setRememberMe(!rememberMe)}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${
                    rememberMe ? THEME.primary : border
                  }`,
                  background: rememberMe ? THEME.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  boxShadow: rememberMe
                    ? `0 2px 8px ${THEME.primary}40`
                    : 'none',
                }}
              >
                {rememberMe && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: textSecondary,
                }}
              >
                Remember me
              </span>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                border: 'none',
                borderRadius: '14px',
                background: loading
                  ? '#94A3B8'
                  : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading
                  ? 'none'
                  : `0 8px 20px ${THEME.primary}50`,
                opacity: loading ? 0.7 : 1,
                fontFamily: THEME.font,
                letterSpacing: '0.4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 12px 28px ${THEME.primary}60`;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${THEME.primary}50`;
                }
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <span>🔓</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* CONTACT ADMIN — Clickable mailto */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: `1px solid ${border}`,
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleContactAdmin}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: dark
                  ? 'rgba(16,185,129,0.08)'
                  : THEME.primarySoft,
                borderRadius: '999px',
                border: `1px solid ${
                  dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'
                }`,
                cursor: 'pointer',
                fontFamily: THEME.font,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(16,185,129,0.15)'
                  : '#D1FAE5';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(16,185,129,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(16,185,129,0.08)'
                  : THEME.primarySoft;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '14px' }}>✉️</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: dark ? THEME.primaryLight : THEME.primaryDeep,
                  letterSpacing: '0.3px',
                }}
              >
                Contact admin for access
              </span>
            </button>

            <p
              style={{
                fontSize: '10px',
                color: textMuted,
                marginTop: '8px',
                fontWeight: 500,
                fontStyle: 'italic',
                margin: '8px 0 0',
              }}
            >
              Opens your email app
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '11px',
            color: dark ? '#64748B' : THEME.textMuted,
            fontWeight: 500,
          }}
        >
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} Vision Earth HRMS
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.7 }}>
            Smart Attendance for a Better Tomorrow
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;