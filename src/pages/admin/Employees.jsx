// src/pages/admin/Employees.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';

export const Employees = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, isAdmin } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    password: '',
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
    emergency_contact: ''
  });

  const locations = ['Head Office', 'Branch Office', 'Client Site', 'Work From Home', 'Field Work'];
  const roles = ['Employee', 'Admin', 'HR'];

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
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Name, Email, and Password are required');
      setSubmitting(false);
      return;
    }

    try {
      // Check if email already exists
      const { data: existingEmail, error: checkEmailError } = await supabase
        .from('employees')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingEmail) {
        toast.error('Email already exists!');
        setSubmitting(false);
        return;
      }

      // Generate a unique employee_id
      let empId = formData.employee_id;
      if (!empId) {
        const { data: lastEmployee, error: lastError } = await supabase
          .from('employees')
          .select('employee_id')
          .order('employee_id', { ascending: false })
          .limit(1);
        
        if (!lastError && lastEmployee && lastEmployee.length > 0) {
          const lastId = lastEmployee[0].employee_id;
          const num = parseInt(lastId.replace('EMP', '')) + 1;
          empId = `EMP${String(num).padStart(3, '0')}`;
        } else {
          empId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
        }
      } else {
        // Check if the provided employee_id already exists
        const { data: existingId, error: checkIdError } = await supabase
          .from('employees')
          .select('employee_id')
          .eq('employee_id', empId)
          .maybeSingle();
        
        if (existingId) {
          toast.error(`Employee ID ${empId} already exists! Please use a different ID.`);
          setSubmitting(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({
          employee_id: empId,
          name: formData.name,
          email: formData.email,
          password_hash: formData.password,
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
          is_active: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Employee ID or Email already exists. Please use unique values.');
        } else {
          throw error;
        }
        setSubmitting(false);
        return;
      }

      toast.success(`Employee ${formData.name} added successfully!`);
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        name: '',
        email: '',
        password: '',
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
        emergency_contact: ''
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

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

      toast.success(`Employee ${employee.name} deleted successfully!`);
      setShowDeleteModal(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = search.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower) ||
      emp.role?.toLowerCase().includes(searchLower)
    );
  });

  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h2 style={{ color: theme.colors.textPrimary, marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: theme.colors.textSecondary }}>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      paddingBottom: '80px',
    }}>
      <div className="page-header">
        <h1>👥 Employee Management</h1>
        <p>{employees.length} employees • {employees.filter(e => e.is_active !== false).length} active</p>
        <div className="page-header-actions">
          <button onClick={() => setShowAddModal(true)}>
            + Add Employee
          </button>
        </div>
      </div>

      <div className="stats-row" style={{ padding: '12px 16px' }}>
        <div className="stat-box">
          <div className="label">Total</div>
          <div className="value">{employees.length}</div>
        </div>
        <div className="stat-box">
          <div className="label">Active</div>
          <div className="value" style={{ color: '#10B981' }}>
            {employees.filter(e => e.is_active !== false).length}
          </div>
        </div>
        <div className="stat-box">
          <div className="label">Admins</div>
          <div className="value" style={{ color: '#F59E0B' }}>
            {employees.filter(e => e.role === 'Admin' || e.role === 'admin').length}
          </div>
        </div>
        <div className="stat-box">
          <div className="label">Employees</div>
          <div className="value" style={{ color: '#3B82F6' }}>
            {employees.filter(e => e.role === 'Employee' || e.role === 'employee').length}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <input
          type="text"
          placeholder="🔍 Search by name, ID, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control"
        />
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: `3px solid ${theme.colors.border}`,
              borderTopColor: theme.colors.primary,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-state">
            <span className="icon">👤</span>
            <p>No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                flexShrink: 0,
                color: '#FFFFFF',
                backgroundColor: emp.role === 'Admin' || emp.role === 'admin' ? '#F59E0B' : '#3B82F6'
              }}>
                {emp.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: theme.colors.textPrimary }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                  🆔 {emp.employee_id} • 🏢 {emp.department || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                  📧 {emp.email} • 💼 {emp.designation || 'N/A'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className={`badge ${emp.role === 'Admin' || emp.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                  {emp.role || 'Employee'}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: emp.is_active !== false ? '#10B981' : '#EF4444',
                  fontWeight: 600
                }}>
                  {emp.is_active !== false ? '● Active' : '● Inactive'}
                </span>
                {emp.id !== user?.id && (
                  <button
                    onClick={() => setShowDeleteModal(emp)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#EF4444',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: theme.colors.card,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 800,
                color: theme.colors.textPrimary
              }}>
                Add Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label>Employee ID (Optional)</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="form-control"
                  placeholder="Auto-generated if left blank"
                />
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-control"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control"
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-control"
                  placeholder="Set initial password (min 6 chars)"
                  required
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="form-control"
                  placeholder="e.g., IT, HR, Finance"
                />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="form-control"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="form-control"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-control"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>Reporting Location</label>
                <select
                  value={formData.reporting_location}
                  onChange={(e) => setFormData({ ...formData, reporting_location: e.target.value })}
                  className="form-control"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date of Joining</label>
                <input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-control"
                  placeholder="Enter address"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="form-control"
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="form-control"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="form-control"
                  placeholder="Enter pincode"
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="form-control"
                  placeholder="Emergency contact number"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ marginTop: '8px' }}
              >
                {submitting ? 'Adding...' : 'Add Employee'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setShowDeleteModal(null)}>
          <div style={{
            background: theme.colors.card,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-xl)'
          }} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>⚠️</span>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '8px'
            }}>
              Delete Employee?
            </h3>
            <p style={{
              fontSize: '14px',
              color: theme.colors.textSecondary,
              marginBottom: '16px'
            }}>
              Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?
              <br />
              <span style={{ fontSize: '12px', color: '#EF4444' }}>
                This action cannot be undone.
              </span>
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteModal(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDeleteEmployee(showDeleteModal)}
                disabled={submitting}
                style={{ flex: 1 }}
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