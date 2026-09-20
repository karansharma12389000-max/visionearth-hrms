// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Employee Pages
import { Dashboard } from '../pages/employee/Dashboard';
import { Attendance } from '../pages/employee/Attendance';
import { Leave } from '../pages/employee/Leave';
import { Report } from '../pages/employee/Report';
import { Profile } from '../pages/employee/Profile';

// Admin Pages
import { AdminDashboard } from '../pages/admin/Dashboard';
import { AdminAttendanceReport } from '../pages/admin/AttendanceReport';
import { AdminAttendanceHistory } from '../pages/admin/AttendanceHistory';
import { AdminCheckinHistory } from '../pages/admin/CheckinHistory';
import { Employees } from '../pages/admin/Employees';
import { AdminLeaves } from '../pages/admin/Leaves';
import { ForgotTracker } from '../pages/admin/ForgotTracker';       // ✅ NEW
import { SalaryCalculator } from '../pages/admin/SalaryCalculator'; // ✅ NEW
import { AdminHolidays } from '../pages/admin/Holidays';

// Auth Pages
import { Login } from '../pages/auth/Login';

const AppRoutes = () => {
  const { user, isAdmin } = useAuth();

  // Protected route wrapper
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (adminOnly && !isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Employee Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <Leave />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance-report"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminAttendanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance-history"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminAttendanceHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/checkin-history"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminCheckinHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute adminOnly={true}>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leaves"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminLeaves />
          </ProtectedRoute>
        }
      />
      {/* ✅ NEW: Forgot Check-Out Tracker */}
      <Route
        path="/admin/forgot-tracker"
        element={
          <ProtectedRoute adminOnly={true}>
            <ForgotTracker />
          </ProtectedRoute>
        }
      />
      {/* ✅ NEW: Salary Calculator */}
      <Route
        path="/admin/salary-calculator"
        element={
          <ProtectedRoute adminOnly={true}>
            <SalaryCalculator />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/holidays"
  element={
    <ProtectedRoute adminOnly={true}>
      <AdminHolidays />
    </ProtectedRoute>
  }
/>

      {/* Fallback - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;