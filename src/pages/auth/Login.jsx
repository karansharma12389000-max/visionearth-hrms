// src/pages/auth/Login.jsx
//
// Vision Earth HRMS — Premium Login
// Green gradient, decorative circles, Remember Me, WhatsApp contact admin.
//
// 🔧 FIXES (v3 — production ready):
//  1. Static import of DEMO_EMPLOYEES (no top-level await — safe for Vite build)
//  2. Demo creds gated behind VITE_DEMO_MODE env (empty array in prod)
//  3. is_active checked from DB (deactivated users blocked)
//  4. Single source of truth for navigation (useEffect only)
//  5. Rate limiting: 3 failed attempts → 15s lockout with LIVE countdown
//  6. required + aria-invalid + aria-describedby on inputs
//  7. id/htmlFor on labels + inputs
//  8. Remember-me is a real accessible checkbox (role + tabIndex + keyboard)
//  9. WhatsApp template prefills typed email (trimmed)
// 10. WhatsApp number via VITE_ADMIN_WHATSAPP env
// 11. Double-submit guard via useRef
// 12. Mounted-ref guard prevents setState-after-unmount warning
// 13. Password toggle disabled style (opacity + cursor)
// 14. Error banner has role="alert"
// 15. Email trimmed on blur
// 16. console.error only in DEV
// 17. Forgot password link is a <button> (no URL hash pollution)
// 18. Live lockout countdown via separate `now` state (ticks every 500ms)

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  login,
  DEMO_EMPLOYEES as DEMO_EMPLOYEES_IMPORT,
} from '../../services/api';
import { THEME, isDark } from '../../utils/designTokens';

// ============================================
// 🔧 FIX #1 + #2 — Demo mode gate (no top-level await)
// ============================================
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_EMPLOYEES = DEMO_MODE ? DEMO_EMPLOYEES_IMPORT || [] : [];

// 🔧 FIX #10 — WhatsApp number via env
const ADMIN_WHATSAPP =
  import.meta.env.VITE_ADMIN_WHATSAPP || '918424958959';

const WHATSAPP_TEMPLATE = `Hello Vision Earth HRMS Team,

I need help with my HRMS account access.

My details:
- Name: 
- Employee ID: 
- Registered Email: {EMAIL}
- Issue: {ISSUE}

Please assist me at your earliest convenience.

Thank you.`;

// 🔧 FIX #5 — Rate limiting constants
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15000; // 15s

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

  // 🔧 FIX #5 — rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  // 🔧 FIX #18 — live clock for countdown
  const [now, setNow] = useState(Date.now());

  // 🔧 FIX #11 — double-submit guard
  const submittingRef = useRef(false);

  // 🔧 FIX #12 — mounted guard
  const mountedRef = useRef(true);

  // ============================================
  // MOUNT / UNMOUNT
  // ============================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================
  // 🔧 FIX #17 — dynamic WhatsApp URL builder
  // ============================================
  const buildWhatsAppUrl = useCallback(
    (issueHint = '') => {
      const body = WHATSAPP_TEMPLATE
        .replace('{EMAIL}', (email || '').trim() || '(not typed yet)')
        .replace('{ISSUE}', issueHint || '(describe your issue)');
      return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(body)}`;
    },
    [email]
  );

  const handleContactAdmin = () => {
    window.open(
      buildWhatsAppUrl('Unable to login'),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleForgotPassword = () => {
    window.open(
      buildWhatsAppUrl('Forgot password — please reset my account'),
      '_blank',
      'noopener,noreferrer'
    );
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
    } catch {
      /* ignore */
    }
  }, []);

  // ============================================
  // 🔧 FIX #4 — AUTH REDIRECT (single source of truth)
  // ============================================
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ============================================
  // 🔧 FIX #5 / #18 — LOCKOUT COUNTDOWN (live ticking)
  // ============================================
  const isLockedOut = lockUntil > now;
  const secondsRemaining = isLockedOut
    ? Math.max(1, Math.ceil((lockUntil - now) / 1000))
    : 0;

  useEffect(() => {
    if (!isLockedOut) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isLockedOut]);

  // ============================================
  // LOGIN HANDLER
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();

    // 🔧 FIX #11 — block double-submit
    if (submittingRef.current) return;

    // Block while locked out
    if (isLockedOut) {
      setError(
        `Too many failed attempts. Try again in ${secondsRemaining}s.`
      );
      return;
    }

    const trimmedEmail = email.trim();
    const rawPassword = password;

    if (!trimmedEmail || !rawPassword) {
      setError('Please enter both email and password.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      // Persist / clear remembered email
      try {
        if (rememberMe) {
          localStorage.setItem('ve_login_email', trimmedEmail);
        } else {
          localStorage.removeItem('ve_login_email');
        }
      } catch {
        /* ignore */
      }

      // 🔧 FIX #2 — demo path (only when DEMO_MODE is true)
      if (DEMO_MODE && DEMO_EMPLOYEES.length > 0) {
        const found = DEMO_EMPLOYEES.find(
          (emp) =>
            emp.email.toLowerCase() === trimmedEmail.toLowerCase() &&
            emp.password === rawPassword
        );

        if (found) {
          const { password: _pw, ...userData } = found;
          authLogin({ ...userData, is_active: true });
          toast.success('Welcome back, ' + userData.name + '!');
          return; // 🔧 FIX #4 — useEffect handles redirect
        }
      }

      // Real API login
      const result = await login(trimmedEmail, rawPassword);

      if (result?.ok && result?.employee) {
        // 🔧 FIX #3 — respect is_active from DB
        if (result.employee.is_active === false) {
          setError(
            'Your account has been deactivated. Please contact your admin.'
          );
          return;
        }

        const userData = {
          id:
            result.employee.id ||
            'EMP' + Date.now().toString().slice(-6),
          employee_id:
            result.employee.employee_id ||
            'EMP' + Date.now().toString().slice(-6),
          email: result.employee.email,
          name: result.employee.name,
          role: result.employee.role || 'Employee',
          company: result.employee.company || 'N/A',
          department: result.employee.department || 'N/A',
          designation: result.employee.designation || 'N/A',
          reporting_location:
            result.employee.reporting_location || 'N/A',
          phone: result.employee.phone || 'N/A',
          address: result.employee.address || '',
          city: result.employee.city || '',
          state: result.employee.state || '',
          pincode: result.employee.pincode || '',
          emergency_contact: result.employee.emergency_contact || '',
          date_of_joining: result.employee.date_of_joining || null,
          is_active: result.employee.is_active ?? true,
        };
        authLogin(userData);
        toast.success('Welcome back, ' + userData.name + '!');
        // 🔧 FIX #4 — useEffect handles navigation
      } else {
        // 🔧 FIX #5 — track failed attempts + lockout
        const next = failedAttempts + 1;
        setFailedAttempts(next);

        if (next >= MAX_FAILED_ATTEMPTS) {
          setLockUntil(Date.now() + LOCKOUT_DURATION_MS);
          setNow(Date.now());
          setFailedAttempts(0);
          setError(
            `Too many failed attempts. Locked for ${
              LOCKOUT_DURATION_MS / 1000
            }s.`
          );
        } else {
          setError(
            result?.message ||
              `Invalid email or password. ${
                MAX_FAILED_ATTEMPTS - next
              } attempt(s) left.`
          );
        }
      }
    } catch (err) {
      // 🔧 FIX #16 — quiet in production
      if (import.meta.env.DEV) {
        console.error('Login error:', err);
      }
      if (mountedRef.current) {
        setError('Login failed. Please try again.');
      }
    } finally {
      // 🔧 FIX #12 — prevent setState-after-unmount
      if (mountedRef.current) {
        setLoading(false);
      }
      submittingRef.current = false;
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

  const isFormDisabled = loading || isLockedOut;

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
              border: `1px solid ${
                dark ? 'rgba(16,185,129,0.2)' : '#D1FAE5'
              }`,
              overflow: 'hidden',
              padding: '10px',
            }}
          >
            <img
              src="/vision-earth-logo.png"
              alt="Vision Earth"
              width="88"
              height="88"
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

          {/* 🔧 FIX #14 — role="alert" */}
          {error && (
            <div
              id="login-error"
              role="alert"
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
              <span
                style={{ fontSize: '16px', flexShrink: 0 }}
                aria-hidden="true"
              >
                ⚠️
              </span>
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

          <form onSubmit={handleLogin} noValidate>
            {/* EMAIL */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="login-email"
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
                    paddingLeft: 14,
                    paddingRight: 4,
                    fontSize: '15px',
                    color: textMuted,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  ✉️
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(e.target.value.trim())}
                  placeholder="you@visionearth.com"
                  autoComplete="email"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
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
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="login-password"
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
                    paddingLeft: 14,
                    paddingRight: 4,
                    fontSize: '15px',
                    color: textMuted,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  🔒
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
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
                  disabled={isFormDisabled}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '0 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    color: textMuted,
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isFormDisabled ? 0.5 : 1,
                  }}
                  disabled={isFormDisabled}
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* 🔧 FIX #17 — Forgot password as button */}
              <div
                style={{
                  textAlign: 'right',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: THEME.primary,
                    cursor: 'pointer',
                    fontFamily: THEME.font,
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* 🔧 FIX #8 — REMEMBER ME (accessible) */}
            <div
              role="checkbox"
              aria-checked={rememberMe}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  if (!isFormDisabled) setRememberMe(!rememberMe);
                }
              }}
              onClick={() =>
                !isFormDisabled && setRememberMe(!rememberMe)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                userSelect: 'none',
                outline: 'none',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${
                    rememberMe ? THEME.primary : border
                  }`,
                  background: rememberMe
                    ? THEME.primary
                    : 'transparent',
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
                    aria-hidden="true"
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
              disabled={isFormDisabled}
              style={{
                width: '100%',
                padding: '15px',
                border: 'none',
                borderRadius: '14px',
                background: isFormDisabled
                  ? '#94A3B8'
                  : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isFormDisabled
                  ? 'none'
                  : `0 8px 20px ${THEME.primary}50`,
                opacity: isFormDisabled ? 0.7 : 1,
                fontFamily: THEME.font,
                letterSpacing: '0.4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!isFormDisabled) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 12px 28px ${THEME.primary}60`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isFormDisabled) {
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
              ) : isLockedOut ? (
                <>
                  <span aria-hidden="true">🔒</span>
                  Locked — wait {secondsRemaining}s
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔓</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* CONTACT ADMIN — WhatsApp */}
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
                padding: '10px 18px',
                background: dark
                  ? 'rgba(37,211,102,0.12)'
                  : '#ECFDF5',
                borderRadius: '999px',
                border: `1px solid ${
                  dark ? 'rgba(37,211,102,0.35)' : '#A7F3D0'
                }`,
                cursor: 'pointer',
                fontFamily: THEME.font,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(37,211,102,0.2)'
                  : '#D1FAE5';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(37,211,102,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dark
                  ? 'rgba(37,211,102,0.12)'
                  : '#ECFDF5';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#25D366"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: dark ? '#A7F3D0' : '#065F46',
                  letterSpacing: '0.3px',
                }}
              >
                Contact admin on WhatsApp
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
              Opens WhatsApp with a pre-filled message
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
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '10px',
              opacity: 0.7,
            }}
          >
            Smart Attendance for a Better Tomorrow
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;