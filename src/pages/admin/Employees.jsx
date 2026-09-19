// src/pages/admin/Employees.jsx
//
// Vision Earth HRMS — Premium Employee Management
// Now with click-to-view employee details + inline edit.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const Employees = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, isAdmin } = useAuth();
  const dark = isDark(theme);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ NEW: Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    password: '',
    company: '',
    department: '',
    designation: '',
    role: 'Employee',
    phone: '',
    reporting_location: 'Head Office',
    address: '',
    city: '',
    state: '',
    pincode: '',
    date_of_joining: '',
    emergency_contact: '',
  });

  const locations = [
    'Head Office',
    'Branch Office',
    'Client Site',
    'Work From Home',
    'Field Work',
  ];
  const roles = ['Employee', 'Admin', 'HR'];
  const companies = [
    'VISION EARTH CARE',
    'VISION EARTH TECHNOLOGY',
    'VISION EARTH FOUNDATION',
  ];

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH EMPLOYEES
  // ============================================
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchEmployees();
  }, [isAdmin]);

  // ============================================
  // ADD EMPLOYEE
  // ============================================
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Name, Email, and Password are required');
      setSubmitting(false);
      return;
    }

    if (!formData.company) {
      toast.error('Please select a company');
      setSubmitting(false);
      return;
    }

    try {
      const { data: existingEmail } = await supabase
        .from('employees')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingEmail) {
        toast.error('Email already exists!');
        setSubmitting(false);
        return;
      }

      let empId = formData.employee_id;
      if (!empId) {
        const { data: lastEmployee } = await supabase
          .from('employees')
          .select('employee_id')
          .order('employee_id', { ascending: false })
          .limit(1);

        if (lastEmployee && lastEmployee.length > 0) {
          const lastId = lastEmployee[0].employee_id;
          const num = parseInt(lastId.replace('EMP', '')) + 1;
          empId = `EMP${String(num).padStart(3, '0')}`;
        } else {
          empId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
        }
      } else {
        const { data: existingId } = await supabase
          .from('employees')
          .select('employee_id')
          .eq('employee_id', empId)
          .maybeSingle();

        if (existingId) {
          toast.error(`Employee ID ${empId} already exists!`);
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('employees').insert({
        employee_id: empId,
        name: formData.name,
        email: formData.email,
        password_hash: formData.password,
        company: formData.company,
        department: formData.department || 'N/A',
        designation: formData.designation || 'N/A',
        role: formData.role || 'Employee',
        phone: formData.phone || '',
        reporting_location: formData.reporting_location || 'Head Office',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        date_of_joining: formData.date_of_joining || null,
        emergency_contact: formData.emergency_contact || '',
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Employee ID or Email already exists.');
        } else {
          throw error;
        }
        setSubmitting(false);
        return;
      }

      toast.success(`✅ ${formData.name} added successfully!`);
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        name: '',
        email: '',
        password: '',
        company: '',
        department: '',
        designation: '',
        role: 'Employee',
        phone: '',
        reporting_location: 'Head Office',
        address: '',
        city: '',
        state: '',
        pincode: '',
        date_of_joining: '',
        emergency_contact: '',
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // DELETE EMPLOYEE
  // ============================================
  const handleDeleteEmployee = async (employee) => {
    try {
      setSubmitting(true);

      if (employee.id === user?.id) {
        toast.error('You cannot delete your own account!');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      toast.success(`✅ ${employee.name} deleted successfully!`);
      setShowDeleteModal(null);
      setShowDetailModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // ✅ NEW: OPEN DETAIL MODAL
  // ============================================
  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setEditData({
      name: employee.name || '',
      company: employee.company || '',
      department: employee.department || '',
      designation: employee.designation || '',
      role: employee.role || 'Employee',
      phone: employee.phone || '',
      reporting_location: employee.reporting_location || 'Head Office',
      address: employee.address || '',
      city: employee.city || '',
      state: employee.state || '',
      pincode: employee.pincode || '',
      date_of_joining: employee.date_of_joining || '',
      emergency_contact: employee.emergency_contact || '',
      is_active: employee.is_active !== false,
    });
    setIsEditing(false);
    setShowDetailModal(true);
  };

  // ============================================
  // ✅ NEW: SAVE EDIT
  // ============================================
  const handleSaveEdit = async () => {
    if (!selectedEmployee?.id) return;

    try {
      setSaving(true);

      const updateData = {
        name: editData.name,
        company: editData.company,
        department: editData.department || 'N/A',
        designation: editData.designation || 'N/A',
        role: editData.role,
        phone: editData.phone || '',
        reporting_location: editData.reporting_location || 'Head Office',
        address: editData.address || '',
        city: editData.city || '',
        state: editData.state || '',
        pincode: editData.pincode || '',
        date_of_joining: editData.date_of_joining || null,
        emergency_contact: editData.emergency_contact || '',
        is_active: editData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast.success('✅ Employee updated successfully!');

      // Update local state
      const updatedEmployee = { ...selectedEmployee, ...updateData };
      setSelectedEmployee(updatedEmployee);
      setEmployees((prev) =>
        prev.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e))
      );

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  const filteredEmployees = employees.filter((emp) => {
    const s = search.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(s) ||
      emp.employee_id?.toLowerCase().includes(s) ||
      emp.email?.toLowerCase().includes(s) ||
      emp.department?.toLowerCase().includes(s) ||
      emp.role?.toLowerCase().includes(s) ||
      emp.company?.toLowerCase().includes(s)
    );
  });

  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.is_active !== false).length;
  const adminCount = employees.filter(
    (e) => e.role === 'Admin' || e.role === 'admin'
  ).length;
  const empCount = employees.filter(
    (e) => e.role === 'Employee' || e.role === 'employee'
  ).length;

  // ============================================
  // NOT ADMIN
  // ============================================
  if (!isAdmin) {
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
          padding: '20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            background: cardBg,
            borderRadius: THEME.radiusXl,
            border: `1px solid ${border}`,
            width: '100%',
          }}
        >
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
            🔒
          </span>
          <h2
            style={{
              color: textPrimary,
              marginBottom: '8px',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            Access Denied
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px' }}>
            You don't have permission to view this page.
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
                  EMPLOYEES
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
                  MANAGEMENT
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 16px',
                borderRadius: THEME.radiusMd,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: THEME.shadowGreen,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span>
              Add
            </button>
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
            {totalCount} employees · {activeCount} active
          </div>
        </div>
      </div>

      {/* STATS GRID — Attractive */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {[
            { value: totalCount, label: 'Total', color: THEME.blue, accent: THEME.blue },
            { value: activeCount, label: 'Active', color: THEME.primary, accent: THEME.primary },
            { value: adminCount, label: 'Admins', color: THEME.amber, accent: THEME.amber },
            { value: empCount, label: 'Staff', color: THEME.purple, accent: THEME.purple },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: dark
                  ? `linear-gradient(145deg, ${stat.accent}15 0%, #1E293B 60%)`
                  : `linear-gradient(145deg, ${stat.accent}10 0%, #FFFFFF 60%)`,
                borderRadius: THEME.radiusMd,
                padding: '12px 6px 10px',
                textAlign: 'center',
                border: `1px solid ${
                  dark ? 'rgba(255,255,255,0.05)' : stat.accent + '25'
                }`,
                boxShadow: dark
                  ? '0 4px 12px rgba(0,0,0,0.25)'
                  : `0 4px 12px ${stat.accent}10`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}80)`,
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '4px',
                  letterSpacing: '-0.5px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '14px',
              color: textMuted,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search name, ID, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '13px 14px 13px 40px',
              borderRadius: THEME.radiusMd,
              border: `1px solid ${border}`,
              background: cardBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              fontFamily: THEME.font,
              boxSizing: 'border-box',
              boxShadow: cardShadow,
            }}
          />
        </div>
      </div>

      {/* EMPLOYEE LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: `3px solid ${border}`,
                borderTopColor: THEME.primary,
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto',
              }}
            />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>👤</div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: textSecondary,
                margin: 0,
              }}
            >
              No employees found
            </p>
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const isAdminRole = emp.role === 'Admin' || emp.role === 'admin';

            return (
              <div
                key={emp.id}
                onClick={() => handleEmployeeClick(emp)}
                style={{
                  background: cardBg,
                  borderRadius: THEME.radiusLg,
                  padding: '14px',
                  marginBottom: '10px',
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = dark
                    ? '0 8px 20px rgba(0,0,0,0.35)'
                    : '0 8px 20px rgba(15,23,42,0.08)';
                  e.currentTarget.style.borderColor = THEME.primary + '40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = cardShadow;
                  e.currentTarget.style.borderColor = border;
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: isAdminRole
                      ? `linear-gradient(135deg, ${THEME.amber}, #D97706)`
                      : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: isAdminRole
                      ? '0 4px 10px rgba(245,158,11,0.3)'
                      : '0 4px 10px rgba(16,185,129,0.3)',
                  }}
                >
                  {emp.name?.charAt(0).toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: textPrimary,
                      marginBottom: '3px',
                    }}
                  >
                    {emp.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: textMuted,
                      fontWeight: 600,
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginBottom: '4px',
                    }}
                  >
                    <span>{emp.employee_id}</span>
                    <span>·</span>
                    <span>{emp.department || 'N/A'}</span>
                  </div>

                  {emp.company && (
                    <div style={{ marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139,92,246,0.12)',
                          color: THEME.purple,
                          display: 'inline-block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {emp.company}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '10px',
                      color: textMuted,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {emp.email}
                  </div>
                </div>

                {/* Right side */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '5px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: THEME.radiusPill,
                      fontSize: '9px',
                      fontWeight: 800,
                      background: isAdminRole
                        ? THEME.amber + '18'
                        : THEME.blue + '18',
                      color: isAdminRole ? THEME.amber : THEME.blue,
                      border: `1px solid ${
                        isAdminRole ? THEME.amber + '30' : THEME.blue + '30'
                      }`,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {emp.role || 'Employee'}
                  </span>

                  <span
                    style={{
                      fontSize: '11px',
                      color: textMuted,
                      fontWeight: 700,
                    }}
                  >
                    View →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================ */}
      {/* ✅ EMPLOYEE DETAIL MODAL */}
      {/* ============================================ */}
      {showDetailModal && selectedEmployee && (
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
          onClick={() => {
            setShowDetailModal(false);
            setSelectedEmployee(null);
            setIsEditing(false);
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '0',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Avatar */}
            <div
              style={{
                background: dark
                  ? `linear-gradient(135deg, ${THEME.primary}20, #0F172A)`
                  : `linear-gradient(135deg, ${THEME.primarySoft}, #FFFFFF)`,
                padding: '22px 20px 18px',
                borderBottom: `1px solid ${border}`,
                position: 'relative',
              }}
            >
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEmployee(null);
                  setIsEditing(false);
                }}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  fontSize: '20px',
                  color: textMuted,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background:
                      selectedEmployee.role === 'Admin'
                        ? `linear-gradient(135deg, ${THEME.amber}, #D97706)`
                        : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 6px 16px rgba(16,185,129,0.3)',
                    border: '3px solid #FFFFFF',
                  }}
                >
                  {selectedEmployee.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: textPrimary,
                      lineHeight: 1.2,
                      marginBottom: '4px',
                    }}
                  >
                    {selectedEmployee.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: textSecondary,
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    {selectedEmployee.employee_id}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: THEME.radiusPill,
                        fontSize: '9px',
                        fontWeight: 800,
                        background:
                          selectedEmployee.role === 'Admin'
                            ? THEME.amber + '20'
                            : THEME.blue + '20',
                        color:
                          selectedEmployee.role === 'Admin'
                            ? THEME.amber
                            : THEME.blue,
                        letterSpacing: '0.3px',
                      }}
                    >
                      {selectedEmployee.role || 'Employee'}
                    </span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: THEME.radiusPill,
                        fontSize: '9px',
                        fontWeight: 800,
                        background:
                          selectedEmployee.is_active !== false
                            ? THEME.primary + '20'
                            : THEME.red + '20',
                        color:
                          selectedEmployee.is_active !== false
                            ? THEME.primary
                            : THEME.red,
                        letterSpacing: '0.3px',
                      }}
                    >
                      {selectedEmployee.is_active !== false
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {!isEditing ? (
                <>
                  {/* Basic Info Section */}
                  <SectionLabel text="Basic Info" dark={dark} border={border} />
                  <DetailRow
                    label="Employee ID"
                    value={selectedEmployee.employee_id || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                    locked
                  />
                  <DetailRow
                    label="Company"
                    value={selectedEmployee.company || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Department"
                    value={selectedEmployee.department || 'N/A'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Designation"
                    value={selectedEmployee.designation || 'N/A'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Role"
                    value={selectedEmployee.role || 'Employee'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Email"
                    value={selectedEmployee.email || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                    locked
                  />
                  <DetailRow
                    label="Phone"
                    value={selectedEmployee.phone || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />

                  {/* Location Section */}
                  <SectionLabel
                    text="Location"
                    dark={dark}
                    border={border}
                  />
                  <DetailRow
                    label="Reporting Location"
                    value={selectedEmployee.reporting_location || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Address"
                    value={selectedEmployee.address || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="City"
                    value={selectedEmployee.city || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="State"
                    value={selectedEmployee.state || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Pincode"
                    value={selectedEmployee.pincode || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />

                  {/* Other Section */}
                  <SectionLabel text="Other" dark={dark} border={border} />
                  <DetailRow
                    label="Date of Joining"
                    value={
                      selectedEmployee.date_of_joining
                        ? new Date(
                            selectedEmployee.date_of_joining
                          ).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'
                    }
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                  <DetailRow
                    label="Emergency Contact"
                    value={selectedEmployee.emergency_contact || '—'}
                    dark={dark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                    isLast
                  />

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '20px',
                    }}
                  >
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        flex: 1,
                        padding: '13px',
                        borderRadius: THEME.radiusMd,
                        border: 'none',
                        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: THEME.shadowGreen,
                        fontFamily: THEME.font,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    {selectedEmployee.id !== user?.id && (
                      <button
                        onClick={() => setShowDeleteModal(selectedEmployee)}
                        style={{
                          flex: 1,
                          padding: '13px',
                          borderRadius: THEME.radiusMd,
                          border: 'none',
                          background: `linear-gradient(135deg, ${THEME.red}, #DC2626)`,
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                          fontFamily: THEME.font,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          letterSpacing: '0.3px',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* EDIT MODE */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: THEME.primary,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '14px',
                      padding: '6px 12px',
                      background: THEME.primarySoft,
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    Editing Mode
                  </div>

                  <EditInput
                    label="Name"
                    value={editData.name}
                    onChange={(v) => setEditData({ ...editData, name: v })}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditSelect
                    label="Company"
                    value={editData.company}
                    onChange={(v) => setEditData({ ...editData, company: v })}
                    options={['', ...companies]}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Department"
                    value={editData.department}
                    onChange={(v) => setEditData({ ...editData, department: v })}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Designation"
                    value={editData.designation}
                    onChange={(v) =>
                      setEditData({ ...editData, designation: v })
                    }
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditSelect
                    label="Role"
                    value={editData.role}
                    onChange={(v) => setEditData({ ...editData, role: v })}
                    options={roles}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Phone"
                    value={editData.phone}
                    onChange={(v) => setEditData({ ...editData, phone: v })}
                    type="tel"
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditSelect
                    label="Reporting Location"
                    value={editData.reporting_location}
                    onChange={(v) =>
                      setEditData({ ...editData, reporting_location: v })
                    }
                    options={locations}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Address"
                    value={editData.address}
                    onChange={(v) => setEditData({ ...editData, address: v })}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                    }}
                  >
                    <EditInput
                      label="City"
                      value={editData.city}
                      onChange={(v) => setEditData({ ...editData, city: v })}
                      dark={dark}
                      cardBg={cardBg}
                      textPrimary={textPrimary}
                      textMuted={textMuted}
                      border={border}
                    />
                    <EditInput
                      label="State"
                      value={editData.state}
                      onChange={(v) => setEditData({ ...editData, state: v })}
                      dark={dark}
                      cardBg={cardBg}
                      textPrimary={textPrimary}
                      textMuted={textMuted}
                      border={border}
                    />
                  </div>

                  <EditInput
                    label="Pincode"
                    value={editData.pincode}
                    onChange={(v) => setEditData({ ...editData, pincode: v })}
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Date of Joining"
                    value={editData.date_of_joining}
                    onChange={(v) =>
                      setEditData({ ...editData, date_of_joining: v })
                    }
                    type="date"
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  <EditInput
                    label="Emergency Contact"
                    value={editData.emergency_contact}
                    onChange={(v) =>
                      setEditData({ ...editData, emergency_contact: v })
                    }
                    dark={dark}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    border={border}
                  />

                  {/* Save/Cancel */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '16px',
                    }}
                  >
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          name: selectedEmployee.name || '',
                          company: selectedEmployee.company || '',
                          department: selectedEmployee.department || '',
                          designation: selectedEmployee.designation || '',
                          role: selectedEmployee.role || 'Employee',
                          phone: selectedEmployee.phone || '',
                          reporting_location:
                            selectedEmployee.reporting_location || 'Head Office',
                          address: selectedEmployee.address || '',
                          city: selectedEmployee.city || '',
                          state: selectedEmployee.state || '',
                          pincode: selectedEmployee.pincode || '',
                          date_of_joining: selectedEmployee.date_of_joining || '',
                          emergency_contact:
                            selectedEmployee.emergency_contact || '',
                          is_active: selectedEmployee.is_active !== false,
                        });
                      }}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: THEME.radiusMd,
                        border: `1px solid ${border}`,
                        background: 'transparent',
                        color: textSecondary,
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: THEME.font,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: THEME.radiusMd,
                        border: 'none',
                        background: saving
                          ? '#94A3B8'
                          : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: saving ? 'none' : THEME.shadowGreen,
                        fontFamily: THEME.font,
                        letterSpacing: '0.3px',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ADD EMPLOYEE MODAL (unchanged) */}
      {/* ============================================ */}
      {showAddModal && (
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
            overflowY: 'auto',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '480px',
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
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                Add Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddEmployee}>
              <EditInput
                label="Employee ID (Optional)"
                value={formData.employee_id}
                onChange={(v) => setFormData({ ...formData, employee_id: v })}
                placeholder="Auto-generated if left blank"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Full Name *"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="Enter full name"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Email *"
                value={formData.email}
                onChange={(v) => setFormData({ ...formData, email: v })}
                type="email"
                placeholder="Enter email address"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Password *"
                value={formData.password}
                onChange={(v) => setFormData({ ...formData, password: v })}
                placeholder="Set initial password (min 6 chars)"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditSelect
                label="Company *"
                value={formData.company}
                onChange={(v) => setFormData({ ...formData, company: v })}
                options={['', ...companies]}
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
                placeholder="— Select Company —"
              />

              <EditInput
                label="Department"
                value={formData.department}
                onChange={(v) => setFormData({ ...formData, department: v })}
                placeholder="e.g., IT, HR, Finance"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Designation"
                value={formData.designation}
                onChange={(v) => setFormData({ ...formData, designation: v })}
                placeholder="e.g., Software Engineer"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditSelect
                label="Role"
                value={formData.role}
                onChange={(v) => setFormData({ ...formData, role: v })}
                options={roles}
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Phone"
                value={formData.phone}
                onChange={(v) => setFormData({ ...formData, phone: v })}
                type="tel"
                placeholder="Enter phone number"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditSelect
                label="Reporting Location"
                value={formData.reporting_location}
                onChange={(v) =>
                  setFormData({ ...formData, reporting_location: v })
                }
                options={locations}
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Date of Joining"
                value={formData.date_of_joining}
                onChange={(v) =>
                  setFormData({ ...formData, date_of_joining: v })
                }
                type="date"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Address"
                value={formData.address}
                onChange={(v) => setFormData({ ...formData, address: v })}
                placeholder="Enter address"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <EditInput
                  label="City"
                  value={formData.city}
                  onChange={(v) => setFormData({ ...formData, city: v })}
                  placeholder="City"
                  dark={dark}
                  cardBg={cardBg}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  border={border}
                />
                <EditInput
                  label="State"
                  value={formData.state}
                  onChange={(v) => setFormData({ ...formData, state: v })}
                  placeholder="State"
                  dark={dark}
                  cardBg={cardBg}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  border={border}
                />
              </div>

              <EditInput
                label="Pincode"
                value={formData.pincode}
                onChange={(v) => setFormData({ ...formData, pincode: v })}
                placeholder="Enter pincode"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <EditInput
                label="Emergency Contact"
                value={formData.emergency_contact}
                onChange={(v) =>
                  setFormData({ ...formData, emergency_contact: v })
                }
                placeholder="Emergency contact number"
                dark={dark}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                border={border}
              />

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: submitting
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : THEME.shadowGreen,
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                  marginTop: '8px',
                }}
              >
                {submitting ? 'Adding...' : 'Add Employee'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
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
            zIndex: 1100,
          }}
          onClick={() => setShowDeleteModal(null)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontSize: '48px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              ⚠️
            </span>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: textPrimary,
                marginBottom: '8px',
              }}
            >
              Delete Employee?
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: textSecondary,
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete{' '}
              <strong style={{ color: textPrimary }}>
                {showDeleteModal.name}
              </strong>
              ?
              <br />
              <span style={{ fontSize: '11px', color: THEME.red }}>
                This action cannot be undone.
              </span>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteModal(null)}
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
                onClick={() => handleDeleteEmployee(showDeleteModal)}
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
                  boxShadow: submitting
                    ? 'none'
                    : '0 4px 14px rgba(239,68,68,0.4)',
                  fontFamily: THEME.font,
                  letterSpacing: '0.3px',
                }}
              >
                {submitting ? 'Deleting...' : 'Delete'}
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
// HELPER COMPONENTS
// ============================================
const SectionLabel = ({ text, dark, border }) => (
  <div
    style={{
      fontSize: '10px',
      fontWeight: 800,
      color: dark ? '#94A3B8' : THEME.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginTop: '4px',
      marginBottom: '8px',
      paddingBottom: '4px',
      borderBottom: `1px solid ${border}`,
    }}
  >
    {text}
  </div>
);

const DetailRow = ({
  label,
  value,
  dark,
  textPrimary,
  textSecondary,
  border,
  locked,
  isLast,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${border}`,
      gap: '12px',
    }}
  >
    <div
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: textSecondary,
        flexShrink: 0,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '12px',
        fontWeight: 700,
        color: textPrimary,
        textAlign: 'right',
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {value}
      {locked && (
        <span
          style={{
            fontSize: '10px',
            color: dark ? '#64748B' : '#94A3B8',
          }}
          title="Read-only"
        >
          🔒
        </span>
      )}
    </div>
  </div>
);

const EditInput = ({
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
        fontSize: '10px',
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
        padding: '11px 14px',
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

const EditSelect = ({
  label,
  value,
  onChange,
  options,
  dark,
  cardBg,
  textPrimary,
  textMuted,
  border,
  placeholder,
}) => (
  <div style={{ marginBottom: '14px' }}>
    <label
      style={{
        display: 'block',
        fontSize: '10px',
        fontWeight: 700,
        color: textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
      }}
    >
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '11px 14px',
        borderRadius: THEME.radiusMd,
        border: `1px solid ${border}`,
        background: cardBg,
        color: textPrimary,
        fontSize: '13px',
        fontWeight: 600,
        outline: 'none',
        fontFamily: THEME.font,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px',
        paddingRight: '38px',
        boxSizing: 'border-box',
      }}
    >
      {options.map((opt, i) => (
        <option key={i} value={opt}>
          {opt === '' && placeholder ? placeholder : opt}
        </option>
      ))}
    </select>
  </div>
);

export default Employees;