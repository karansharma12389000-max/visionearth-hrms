// src/hooks/useCheckInOut.js
//
// Custom hook that wraps checkInOutService with React state

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import checkInOutService from '../services/checkInOutService';

export const useCheckInOut = () => {
  const { user } = useAuth();

  const [todayRecord, setTodayRecord] = useState(null);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [forgottenCount, setForgottenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================
  // Fetch all status in one go
  // ============================================
  const refetch = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [today, pending, count] = await Promise.all([
        checkInOutService.getTodayCheckIn(user.id),
        checkInOutService.getPendingCheckOut(user.id),
        checkInOutService.getForgottenCount(user.id),
      ]);
      setTodayRecord(today);
      setPendingRecord(pending);
      setForgottenCount(count);
    } catch (err) {
      console.error('useCheckInOut refetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ============================================
  // Derived state
  // ============================================
  const hasPendingCheckout = !!pendingRecord;
  const isCheckedIn = !!todayRecord && !todayRecord.check_out_time;
  const isCheckedOut = !!todayRecord && !!todayRecord.check_out_time;
  const isNotCheckedIn = !todayRecord;

  // What state is the user in?
  // 'blocked'      → has forgotten check-out, must resolve
  // 'not_checked_in' → ready to check in
  // 'checked_in'   → currently working
  // 'checked_out'  → done for today
  const status = hasPendingCheckout
    ? 'blocked'
    : isCheckedIn
    ? 'checked_in'
    : isCheckedOut
    ? 'checked_out'
    : 'not_checked_in';

  return {
    // State
    todayRecord,
    pendingRecord,
    forgottenCount,
    loading,
    error,

    // Flags
    hasPendingCheckout,
    isCheckedIn,
    isCheckedOut,
    isNotCheckedIn,
    status,

    // Actions
    refetch,
  };
};

export default useCheckInOut;