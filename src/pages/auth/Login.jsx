// src/pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { login, DEMO_EMPLOYEES } from '../../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login: authLogin, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
      // Check demo users first
      const found = DEMO_EMPLOYEES.find(
        emp => emp.email.toLowerCase() === trimmedEmail.toLowerCase() && 
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

      // Try Supabase login
      const result = await login(trimmedEmail, trimmedPassword);
      
      if (result.ok && result.employee) {
        const userData = {
          id: result.employee.id || 'EMP' + Date.now().toString().slice(-6),
          employee_id: result.employee.employee_id || 'EMP' + Date.now().toString().slice(-6),
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: theme.colors.background,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
            boxShadow: '0 8px 24px rgba(30, 64, 175, 0.3)',
          }}>
            <span style={{ fontSize: '32px' }}>🏢</span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 900,
            color: theme.colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            Vision <span style={{ color: '#3B82F6' }}>Earth</span>
          </h1>
          <p style={{
            fontSize: '13px',
            color: theme.colors.textSecondary,
            marginTop: '2px',
          }}>
            HRMS Attendance System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          backgroundColor: theme.colors.card,
          borderRadius: '16px',
          padding: '28px 24px 24px',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: theme.colors.textPrimary,
              margin: 0,
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontSize: '13px',
              color: theme.colors.textSecondary,
              marginTop: '2px',
            }}>
              Sign in to your account
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FEE2E2',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #FCA5A5',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <p style={{
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 500,
                margin: 0,
              }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.colors.textPrimary,
                marginBottom: '5px',
              }}>
                Email Address
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '10px',
                border: `2px solid ${error ? '#EF4444' : theme.colors.border}`,
                background: theme.colors.inputBg,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}>
                <span style={{
                  padding: '0 0 0 12px',
                  fontSize: '16px',
                  color: theme.colors.textMuted,
                }}>✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: theme.colors.textPrimary,
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.colors.textPrimary,
                marginBottom: '5px',
              }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '10px',
                border: `2px solid ${error ? '#EF4444' : theme.colors.border}`,
                background: theme.colors.inputBg,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}>
                <span style={{
                  padding: '0 0 0 12px',
                  fontSize: '16px',
                  color: theme.colors.textMuted,
                }}>🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: theme.colors.textPrimary,
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '0 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: theme.colors.textMuted,
                    minWidth: '40px',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  disabled={loading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(30, 64, 175, 0.3)',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div style={{
            marginTop: '18px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: theme.colors.inputBg,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              🔑 Demo Credentials
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
              fontSize: '12px',
              color: theme.colors.textSecondary,
              flexWrap: 'wrap',
              gap: '4px',
            }}>
              <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>👑 Admin</span>
              <span style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '11px',
                background: theme.colors.card,
                padding: '2px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.colors.border}`,
                wordBreak: 'break-all',
              }}>
                admin@visionearth.com / admin123
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
              fontSize: '12px',
              color: theme.colors.textSecondary,
              flexWrap: 'wrap',
              gap: '4px',
            }}>
              <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>👤 Employee</span>
              <span style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '11px',
                background: theme.colors.card,
                padding: '2px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.colors.border}`,
                wordBreak: 'break-all',
              }}>
                john.doe@visionearth.com / emp123
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '11px',
          color: theme.colors.textMuted,
        }}>
          <p style={{ margin: 0 }}>
            &copy; {new Date().getFullYear()} Vision Earth HRMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};