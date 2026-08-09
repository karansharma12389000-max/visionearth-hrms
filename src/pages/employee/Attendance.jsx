// src/pages/employee/Attendance.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { 
  getTodayIST, 
  formatDate, 
  formatTime, 
  formatDateTime,
  getStatusColor, 
  getStatusLabel,
  getStatusIcon,
  getMonthName
} from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';

export const Attendance = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState([]);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [filteredCheckin, setFilteredCheckin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [viewMode, setViewMode] = useState('today');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showACOForm, setShowACOForm] = useState(false);
  const [acoDates, setAcoDates] = useState([]);
  const [selectedACODate, setSelectedACODate] = useState('');
  const [acoDetails, setAcoDetails] = useState(null);
  const [acoStatus, setAcoStatus] = useState('');
  const [acoSubmitting, setAcoSubmitting] = useState(false);
  const [acoProjectFields, setAcoProjectFields] = useState([
    { project: '', workDone: '' }
  ]);
  const [acoFormData, setAcoFormData] = useState({
    reportingLocation: user?.reporting_location || '',
    remarks: '',
  });

  const [projectFields, setProjectFields] = useState([
    { project: '', workDone: '' }
  ]);

  const [formData, setFormData] = useState({
    attendanceDate: getTodayIST(),
    reportingLocation: user?.reporting_location || '',
    checkInTime: '',
    checkInLocation: '',
    checkOutTime: '',
    checkOutLocation: '',
    remarks: '',
    status: 'P'
  });

  const infoMessage = `⏰ Important: Submit after 5 PM for full attendance credit (P). Delay up to 72 hrs gets D. Beyond 72 hrs gets B. Before 5 PM is marked Absent (A).`;

  const statusColors = {
    'P': '#10B981',
    'Present': '#10B981',
    'A': '#EF4444',
    'Absent': '#EF4444',
    'D': '#F59E0B',
    'Delayed': '#F59E0B',
    'B': '#DC2626',
    'Beyond Delay': '#DC2626',
    'L': '#3B82F6',
    'Leave': '#3B82F6',
    'ACO': '#8B5CF6',
    'Auto Check-Out': '#8B5CF6',
  };

  const fetchLocationsAndProjects = async () => {
    try {
      const { data: locData } = await supabase
        .from('office_locations')
        .select('name')
        .eq('is_active', true);
      
      setLocations(locData?.map(l => l.name) || ['Head Office', 'Branch Office', 'Client Site', 'Work From Home', 'Field Work']);
      
      const { data: projData } = await supabase
        .from('projects')
        .select('name')
        .eq('is_active', true);
      
      setProjects(projData?.map(p => p.name) || ['Project Alpha', 'Project Beta', 'Internal', 'Support', 'Training', 'Administrative']);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchACODates = async () => {
    try {
      const { data, error } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('status', 'Checked Out (Auto)')
        .eq('aco_filled', false)
        .order('check_in_time', { ascending: false });
      
      if (error) throw error;
      
      const dates = data?.map(item => {
        const date = new Date(item.check_in_time);
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return istDate.toISOString().split('T')[0];
      }) || [];
      
      setAcoDates(dates);
      return dates.length > 0;
    } catch (error) {
      console.error('Error fetching ACO dates:', error);
      return false;
    }
  };

  const loadACODetails = async (date) => {
    try {
      const utcDate = new Date(date + 'T00:00:00.000Z');
      utcDate.setHours(utcDate.getHours() - 5);
      utcDate.setMinutes(utcDate.getMinutes() - 30);
      const utcDateStr = utcDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('status', 'Checked Out (Auto)')
        .gte('check_in_time', utcDateStr + 'T00:00:00.000Z')
        .lte('check_in_time', utcDateStr + 'T23:59:59.999Z')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setAcoDetails(data);
        
        const checkInDate = new Date(data.check_in_time);
        const now = new Date();
        const nextDay10AM = new Date(checkInDate);
        nextDay10AM.setDate(checkInDate.getDate() + 1);
        nextDay10AM.setHours(10, 0, 0, 0);
        
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const istNextDay10AM = new Date(nextDay10AM.getTime() + (5.5 * 60 * 60 * 1000));
        
        const hoursDiff = (istNow - checkInDate) / (1000 * 60 * 60);
        
        let status = '';
        if (istNow <= istNextDay10AM) {
          status = 'P';
        } else if (hoursDiff <= 72) {
          status = 'D';
        } else {
          status = 'B';
        }
        setAcoStatus(status);
        
        setAcoFormData(prev => ({
          ...prev,
          reportingLocation: data.check_in_address?.split(',')[0] || user?.reporting_location || 'Head Office'
        }));
      }
    } catch (error) {
      console.error('Error loading ACO details:', error);
    }
  };

  const handleAcoSubmit = async () => {
    if (!selectedACODate) {
      toast.error('Please select an ACO date');
      return;
    }
    if (!acoFormData.reportingLocation) {
      toast.error('Please select reporting location');
      return;
    }

    const hasProject = acoProjectFields.some(p => p.project && p.workDone);
    if (!hasProject) {
      toast.error('Please add at least one project with work details');
      return;
    }

    try {
      setAcoSubmitting(true);

      const attendanceData = {
        employee_id: user?.id,
        employee_name: user?.name,
        attendance_date: selectedACODate,
        reporting_location: acoFormData.reportingLocation,
        check_in_time: acoDetails?.check_in_time ? formatTime(acoDetails.check_in_time) : null,
        check_in_location: acoDetails?.check_in_address || null,
        check_in_gps: acoDetails?.check_in_gps || null,
        check_out_time: acoDetails?.check_out_time ? formatTime(acoDetails.check_out_time) : null,
        check_out_location: acoDetails?.check_out_address || null,
        check_out_gps: acoDetails?.check_out_gps || null,
        working_hours: acoDetails?.working_hours || 0,
        status: acoStatus,
        remarks: acoFormData.remarks || `ACO attendance - ${acoStatus === 'P' ? 'Present' : acoStatus === 'D' ? 'Delayed' : 'Beyond Delay'}`,
        project1: acoProjectFields[0]?.project || null,
        project1_details: acoProjectFields[0]?.workDone || null,
        project2: acoProjectFields[1]?.project || null,
        project2_details: acoProjectFields[1]?.workDone || null,
        project3: acoProjectFields[2]?.project || null,
        project3_details: acoProjectFields[2]?.workDone || null,
        project4: acoProjectFields[3]?.project || null,
        project4_details: acoProjectFields[3]?.workDone || null,
        project5: acoProjectFields[4]?.project || null,
        project5_details: acoProjectFields[4]?.workDone || null,
        project6: acoProjectFields[5]?.project || null,
        project6_details: acoProjectFields[5]?.workDone || null
      };

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceData);

      if (error) throw error;

      await supabase
        .from('check_in_out')
        .update({ aco_filled: true })
        .eq('id', acoDetails.id);

      const statusText = acoStatus === 'P' ? 'Present' : acoStatus === 'D' ? 'Delayed' : 'Beyond Delay';
      toast.success(`✅ ACO attendance marked successfully as ${statusText}!`);
      
      setShowACOForm(false);
      setSelectedACODate('');
      setAcoDetails(null);
      setAcoProjectFields([{ project: '', workDone: '' }]);
      setAcoFormData({ reportingLocation: user?.reporting_location || '', remarks: '' });
      
      await fetchTodayData();
      await fetchAttendance();
      await fetchCheckinHistory();
      await fetchACODates();
      
    } catch (error) {
      console.error('Error submitting ACO attendance:', error);
      toast.error(error.message || 'Failed to submit ACO attendance');
    } finally {
      setAcoSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      setFetchingLocation(true);
      setLocationError('');
      
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        setFetchingLocation(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const loc = { lat: latitude, lng: longitude };
          setLocation(loc);
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: { 'User-Agent': 'VisionEarthHRMS/1.0' }
              }
            );
            const data = await response.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch (err) {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
          
          setFetchingLocation(false);
          resolve(loc);
        },
        (error) => {
          let msg = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Location permission denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              msg = 'Location request timed out.';
              break;
          }
          setLocationError(msg);
          setFetchingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheckIn = async () => {
    const loc = await getCurrentLocation();
    
    if (!loc) {
      toast.error('Unable to get location. Please check your GPS.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const now = new Date();
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const nowISO = istTime.toISOString();
      const gps = `${loc.lat},${loc.lng}`;

      const { data, error } = await supabase
        .from('check_in_out')
        .insert({
          employee_id: user?.id,
          check_in_time: nowISO,
          check_in_gps: gps,
          check_in_address: address || 'Location captured',
          status: 'Checked In'
        })
        .select()
        .single();
      
      if (error) throw error;

      const istTimeDisplay = formatTime(nowISO);
      toast.success(`✅ Checked in at ${istTimeDisplay}`);
      setShowCheckInModal(false);
      await fetchTodayData();
      await fetchCheckinHistory();
      
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    const loc = await getCurrentLocation();
    
    if (!loc) {
      toast.error('Unable to get location. Please check your GPS.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const now = new Date();
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const checkOutTime = istTime.toISOString();
      const checkInTime = new Date(checkInStatus.check_in_time);
      const diffMs = istTime.getTime() - checkInTime.getTime();
      const diffHrs = Math.round((diffMs / 3600000) * 100) / 100;

      const { error: updateError } = await supabase
        .from('check_in_out')
        .update({
          check_out_time: checkOutTime,
          check_out_gps: `${loc.lat},${loc.lng}`,
          check_out_address: address || 'Location captured',
          working_hours: diffHrs,
          status: 'Checked Out'
        })
        .eq('id', checkInStatus.id);
      
      if (updateError) throw updateError;

      toast.success(`✅ Checked out - ${diffHrs} hrs`);
      setShowCheckOutModal(false);
      await fetchTodayData();
      await fetchCheckinHistory();
      
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error(error.message || 'Failed to check out');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTodayData = async () => {
    try {
      const today = getTodayIST();
      
      const { data: statusData, error: statusError } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('check_in_time', today + 'T00:00:00.000Z')
        .lte('check_in_time', today + 'T23:59:59.999Z')
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!statusError) {
        setCheckInStatus(statusData);
        if (statusData) {
          setFormData(prev => ({
            ...prev,
            checkInTime: statusData.check_in_time ? formatTime(statusData.check_in_time) : '',
            checkInLocation: statusData.check_in_address || '',
            checkOutTime: statusData.check_out_time ? formatTime(statusData.check_out_time) : '',
            checkOutLocation: statusData.check_out_address || '',
            attendanceDate: today,
            reportingLocation: statusData.check_in_address?.split(',')[0] || user?.reporting_location || 'Head Office'
          }));
        }
      }
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('attendance_date', today)
        .maybeSingle();
      
      if (!attError) {
        setTodayAttendance(attData);
        const hasProjects = attData && (attData.project1 || attData.project1_details || attData.project2 || attData.project2_details);
        setIsComplete(!!hasProjects);
        
        if (hasProjects) {
          setShowForm(false);
        }
      }
      
    } catch (error) {
      console.error('Error fetching today data:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id)
        .order('attendance_date', { ascending: false });
      
      if (error) throw error;
      
      setAttendance(data || []);
      applyFilters(data || [], checkinHistory);
      
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckinHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('check_in_out')
        .select('*')
        .eq('employee_id', user?.id)
        .order('check_in_time', { ascending: false });
      
      if (error) throw error;
      
      setCheckinHistory(data || []);
      applyFilters(attendance, data || []);
      
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      toast.error('Failed to load check-in history');
    }
  };

  const applyFilters = (attData = attendance, checkData = checkinHistory) => {
    let filteredAtt = [...attData];
    let filteredCheck = [...checkData];

    const today = getTodayIST();
    
    if (viewMode === 'today') {
      filteredAtt = filteredAtt.filter(a => a.attendance_date === today);
      filteredCheck = filteredCheck.filter(c => {
        if (!c.check_in_time) return false;
        const checkDate = new Date(c.check_in_time);
        const istDate = new Date(checkDate.getTime() + (5.5 * 60 * 60 * 1000));
        const checkDateStr = istDate.toISOString().split('T')[0];
        return checkDateStr === today;
      });
    } else if (viewMode === 'month') {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      filteredAtt = filteredAtt.filter(a => a.attendance_date?.startsWith(monthStr));
      filteredCheck = filteredCheck.filter(c => {
        if (!c.check_in_time) return false;
        const checkDate = new Date(c.check_in_time);
        const istDate = new Date(checkDate.getTime() + (5.5 * 60 * 60 * 1000));
        const checkDateStr = istDate.toISOString().split('T')[0];
        return checkDateStr?.startsWith(monthStr);
      });
    }

    if (filterDate) {
      filteredAtt = filteredAtt.filter(a => a.attendance_date === filterDate);
      filteredCheck = filteredCheck.filter(c => {
        if (!c.check_in_time) return false;
        const checkDate = new Date(c.check_in_time);
        const istDate = new Date(checkDate.getTime() + (5.5 * 60 * 60 * 1000));
        const checkDateStr = istDate.toISOString().split('T')[0];
        return checkDateStr === filterDate;
      });
    }
    
    if (filterStatus !== 'all') {
      filteredAtt = filteredAtt.filter(a => a.status === filterStatus);
    }

    setFilteredAttendance(filteredAtt);
    setFilteredCheckin(filteredCheck);
  };

  useEffect(() => {
    if (user?.id) {
      fetchLocationsAndProjects();
      fetchTodayData();
      fetchAttendance();
      fetchCheckinHistory();
      fetchACODates();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [viewMode, month, year, filterDate, filterStatus, attendance, checkinHistory]);

  const resetFilters = () => {
    setViewMode('today');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setFilterDate('');
    setFilterStatus('all');
  };

  const handleSearch = () => {
    if (filterDate) {
      setViewMode('custom');
      applyFilters();
    } else {
      toast.error('Please select a date to search');
    }
  };

  const addProjectField = () => {
    if (projectFields.length < 6) {
      setProjectFields([...projectFields, { project: '', workDone: '' }]);
    } else {
      toast.error('Maximum 6 projects allowed');
    }
  };

  const removeProjectField = (index) => {
    if (projectFields.length > 1) {
      const newFields = projectFields.filter((_, i) => i !== index);
      setProjectFields(newFields);
    }
  };

  const updateProjectField = (index, field, value) => {
    const newFields = [...projectFields];
    newFields[index][field] = value;
    setProjectFields(newFields);
  };

  const addAcoProjectField = () => {
    if (acoProjectFields.length < 6) {
      setAcoProjectFields([...acoProjectFields, { project: '', workDone: '' }]);
    } else {
      toast.error('Maximum 6 projects allowed');
    }
  };

  const removeAcoProjectField = (index) => {
    if (acoProjectFields.length > 1) {
      const newFields = acoProjectFields.filter((_, i) => i !== index);
      setAcoProjectFields(newFields);
    }
  };

  const updateAcoProjectField = (index, field, value) => {
    const newFields = [...acoProjectFields];
    newFields[index][field] = value;
    setAcoProjectFields(newFields);
  };

  const extractTimeFromISO = (isoString) => {
    if (!isoString) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(isoString)) return isoString;
    if (isoString.includes('T')) {
      return isoString.split('T')[1]?.split('.')[0] || null;
    }
    return isoString;
  };

  const handleSubmit = async () => {
    if (!formData.attendanceDate) {
      toast.error('Please select attendance date');
      return;
    }
    if (!formData.reportingLocation) {
      toast.error('Please select reporting location');
      return;
    }

    const hasProject = projectFields.some(p => p.project && p.workDone);
    if (!hasProject) {
      toast.error('Please add at least one project with work details');
      return;
    }

    if (isComplete) {
      toast.error('Attendance already completed for today!');
      return;
    }

    try {
      setSubmitting(true);

      const attendanceData = {
        employee_id: user?.id,
        employee_name: user?.name,
        attendance_date: formData.attendanceDate,
        reporting_location: formData.reportingLocation,
        check_in_time: checkInStatus?.check_in_time ? extractTimeFromISO(checkInStatus.check_in_time) : null,
        check_in_location: checkInStatus?.check_in_address || null,
        check_in_gps: checkInStatus?.check_in_gps || null,
        check_out_time: checkInStatus?.check_out_time ? extractTimeFromISO(checkInStatus.check_out_time) : null,
        check_out_location: checkInStatus?.check_out_address || null,
        check_out_gps: checkInStatus?.check_out_gps || null,
        working_hours: checkInStatus?.working_hours || 0,
        status: 'P',
        remarks: formData.remarks || '',
        project1: projectFields[0]?.project || null,
        project1_details: projectFields[0]?.workDone || null,
        project2: projectFields[1]?.project || null,
        project2_details: projectFields[1]?.workDone || null,
        project3: projectFields[2]?.project || null,
        project3_details: projectFields[2]?.workDone || null,
        project4: projectFields[3]?.project || null,
        project4_details: projectFields[3]?.workDone || null,
        project5: projectFields[4]?.project || null,
        project5_details: projectFields[4]?.workDone || null,
        project6: projectFields[5]?.project || null,
        project6_details: projectFields[5]?.workDone || null
      };

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceData);

      if (error) throw error;

      toast.success('✅ Attendance marked successfully!');
      setShowForm(false);
      setProjectFields([{ project: '', workDone: '' }]);
      
      await fetchTodayData();
      await fetchAttendance();
      await fetchCheckinHistory();
      
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error(error.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardClick = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getProjects = (record) => {
    const projects = [];
    for (let i = 1; i <= 6; i++) {
      if (record[`project${i}`]) {
        projects.push({
          name: record[`project${i}`],
          details: record[`project${i}_details`] || ''
        });
      }
    }
    return projects;
  };

  const isCheckedIn = checkInStatus?.status === 'Checked In' && !checkInStatus?.check_out_time;
  const isCheckedOut = checkInStatus?.status === 'Checked Out' || checkInStatus?.check_out_time;
  const isAttendanceComplete = isComplete || (todayAttendance && (todayAttendance.project1 || todayAttendance.project1_details || todayAttendance.project2 || todayAttendance.project2_details));

  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'P' || a.status === 'Present').length;
  const absent = attendance.filter(a => a.status === 'A' || a.status === 'Absent').length;
  const leave = attendance.filter(a => a.status === 'L' || a.status === 'Leave').length;
  const autoCheckout = attendance.filter(a => a.status === 'ACO' || a.status === 'Auto Check-Out').length;
  const delayed = attendance.filter(a => a.status === 'D' || a.status === 'Delayed').length;
  const beyondDelay = attendance.filter(a => a.status === 'B' || a.status === 'Beyond Delay').length;
  const acoPendingCount = acoDates.length;

  const getViewLabel = () => {
    if (viewMode === 'today') return `Today • ${formatDate(getTodayIST())}`;
    if (viewMode === 'month') return `${getMonthName(month)} ${year}`;
    if (viewMode === 'custom' && filterDate) {
      return formatDate(filterDate);
    }
    return 'All Records';
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `3px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.primary,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '12px', color: theme.colors.textSecondary, fontSize: '13px' }}>
            Loading...
          </p>
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
        <h1>📍 Check In / Out</h1>
        <p>📅 {getViewLabel()}</p>
        {isAttendanceComplete && (
          <span style={{
            background: 'rgba(16,185,129,0.2)',
            color: '#10B981',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-block',
            marginTop: '8px',
          }}>
            ✅ Attendance Complete
          </span>
        )}
        {!isAttendanceComplete && !isCheckedIn && !isCheckedOut && (
          <span style={{
            background: 'rgba(239,68,68,0.2)',
            color: '#EF4444',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-block',
            marginTop: '8px',
          }}>
            ⭕ Not Checked In
          </span>
        )}
        {isCheckedIn && !isAttendanceComplete && (
          <span style={{
            background: 'rgba(16,185,129,0.2)',
            color: '#10B981',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-block',
            marginTop: '8px',
          }}>
            🟢 At Work
          </span>
        )}
        {isCheckedOut && !isAttendanceComplete && (
          <span style={{
            background: 'rgba(139,92,246,0.2)',
            color: '#8B5CF6',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'inline-block',
            marginTop: '8px',
          }}>
            ⏳ Checked Out - Fill Attendance
          </span>
        )}
      </div>

      <div style={{
        margin: '12px 16px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: isAttendanceComplete ? '#DCFCE7' : isCheckedIn ? '#DCFCE7' : isCheckedOut ? '#EDE9FE' : '#FEF3C7',
        border: `1px solid ${isAttendanceComplete ? '#10B981' : isCheckedIn ? '#10B981' : isCheckedOut ? '#8B5CF6' : '#F59E0B'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isAttendanceComplete ? '#166534' : isCheckedIn ? '#166534' : isCheckedOut ? '#5B21B6' : '#92400E',
          }}>
            {isAttendanceComplete 
              ? '✅ Attendance Complete' 
              : isCheckedIn 
                ? '🟢 At Work'
                : isCheckedOut 
                  ? '⏳ Checked Out - Fill Attendance' 
                  : '⭕ Not Checked In'}
          </div>
          <div style={{
            fontSize: '11px',
            color: isAttendanceComplete ? '#166534AA' : isCheckedIn ? '#166534AA' : isCheckedOut ? '#5B21B6AA' : '#92400EAA',
          }}>
            {isAttendanceComplete 
              ? `Completed on ${formatDate(getTodayIST())}` 
              : isCheckedIn 
                ? `Since ${formatTime(checkInStatus?.check_in_time)}` 
                : isCheckedOut 
                  ? `Out at ${formatTime(checkInStatus?.check_out_time)} • ${checkInStatus?.working_hours || 0}h worked`
                  : 'Check in to start your day'}
          </div>
        </div>

        {!isCheckedIn && !isCheckedOut && !isAttendanceComplete && (
          <button
            onClick={() => setShowCheckInModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#10B981',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📍 Check In
          </button>
        )}

        {isCheckedIn && !isAttendanceComplete && (
          <button
            onClick={() => setShowCheckOutModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📤 Check Out
          </button>
        )}

        {isCheckedOut && !isAttendanceComplete && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#8B5CF6',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📋 Fill Attendance
          </button>
        )}

        {isAttendanceComplete && (
          <span style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: '#10B981',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '12px',
          }}>
            ✅ Done
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        padding: '12px 16px',
      }}>
        <div className="stat-box">
          <div className="label">Total</div>
          <div className="value">{total}</div>
        </div>
        <div className="stat-box">
          <div className="label">Present</div>
          <div className="value" style={{ color: '#10B981' }}>{present}</div>
        </div>
        <div className="stat-box">
          <div className="label">Delayed</div>
          <div className="value" style={{ color: '#F59E0B' }}>{delayed}</div>
        </div>
        <div className="stat-box">
          <div className="label">Beyond Delay</div>
          <div className="value" style={{ color: '#DC2626' }}>{beyondDelay}</div>
        </div>
        <div className="stat-box">
          <div className="label">Absent</div>
          <div className="value" style={{ color: '#EF4444' }}>{absent}</div>
        </div>
        <div className="stat-box">
          <div className="label">Leave</div>
          <div className="value" style={{ color: '#3B82F6' }}>{leave}</div>
        </div>
        <div className="stat-box">
          <div className="label">Auto Check-Out</div>
          <div className="value" style={{ color: '#8B5CF6' }}>{autoCheckout}</div>
        </div>
        <div 
          onClick={() => {
            if (acoPendingCount > 0) {
              setShowACOForm(true);
            } else {
              toast.info('No ACO entries available to mark');
            }
          }}
          style={{
            padding: '12px 8px',
            borderRadius: '10px',
            textAlign: 'center',
            border: `1px solid ${acoPendingCount > 0 ? '#8B5CF6' : '#CBD5E1'}`,
            background: acoPendingCount > 0 ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : '#CBD5E1',
            cursor: acoPendingCount > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            boxShadow: acoPendingCount > 0 ? '0 4px 14px rgba(139,92,246,0.3)' : 'none',
            opacity: acoPendingCount > 0 ? 1 : 0.6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (acoPendingCount > 0) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (acoPendingCount > 0) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,92,246,0.3)';
            }
          }}
        >
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            color: '#FFFFFF',
            marginBottom: '2px',
          }}>
            🔄 Mark ACO
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
          }}>
            {acoPendingCount}
          </div>
          <div style={{
            fontSize: '8px',
            color: 'rgba(255,255,255,0.8)',
            marginTop: '2px',
          }}>
            {acoPendingCount > 0 ? 'Click to fill' : 'No entries'}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => {
            setViewMode('today');
            setFilterDate('');
          }}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'today' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'today' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'today' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📅 Today
        </button>
        <button
          onClick={() => {
            setViewMode('month');
            setFilterDate('');
          }}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'month' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'month' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'month' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📊 This Month
        </button>
        <button
          onClick={() => {
            setViewMode('all');
            setFilterDate('');
          }}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            border: viewMode === 'all' ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
            background: viewMode === 'all' ? theme.colors.primary + '20' : 'transparent',
            color: viewMode === 'all' ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📋 All
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '10px 16px',
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <select
          value={month}
          onChange={(e) => {
            setMonth(parseInt(e.target.value));
            if (viewMode !== 'month') setViewMode('custom');
          }}
          className="form-control"
          style={{ 
            flex: 1, 
            minWidth: '80px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2024, m - 1).toLocaleDateString('en-US', { month: 'short' })}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => {
            setYear(parseInt(e.target.value));
            if (viewMode !== 'month') setViewMode('custom');
          }}
          className="form-control"
          style={{ 
            flex: 1, 
            minWidth: '70px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="form-control"
          style={{ 
            flex: 1,
            minWidth: '120px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.inputBg,
            color: theme.colors.textPrimary,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
          }}
        />

        <button
          onClick={handleSearch}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #059669, #10B981)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🔍 Search
        </button>

        {(viewMode === 'custom' || filterDate || filterStatus !== 'all') && (
          <button
            onClick={resetFilters}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${theme.colors.border}`,
              background: 'transparent',
              color: theme.colors.textSecondary,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        padding: '12px 16px 0',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'attendance' ? theme.colors.card : 'transparent',
            color: activeTab === 'attendance' ? theme.colors.primary : theme.colors.textSecondary,
            borderBottom: activeTab === 'attendance' ? `2px solid ${theme.colors.primary}` : 'none',
          }}
        >
          📋 Attendance History
        </button>
        <button
          onClick={() => setActiveTab('checkinout')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'checkinout' ? theme.colors.card : 'transparent',
            color: activeTab === 'checkinout' ? theme.colors.primary : theme.colors.textSecondary,
            borderBottom: activeTab === 'checkinout' ? `2px solid ${theme.colors.primary}` : 'none',
          }}
        >
          📍 Check-In/Out History
        </button>
      </div>

      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        color: theme.colors.textMuted,
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        {activeTab === 'attendance' ? filteredAttendance.length : filteredCheckin.length} records found
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {activeTab === 'attendance' ? (
          <>
            {filteredAttendance.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📋</span>
                <p>No attendance records found</p>
              </div>
            ) : (
              filteredAttendance.map((att, idx) => {
                const statusColor = getStatusColor(att.status, theme);
                const statusLabel = getStatusLabel(att.status);
                const statusIcon = getStatusIcon(att.status);
                
                const projects = [];
                for (let i = 1; i <= 6; i++) {
                  if (att[`project${i}`]) {
                    projects.push(att[`project${i}`]);
                  }
                }
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleCardClick(att)}
                    className="card"
                    style={{ 
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      e.currentTarget.style.borderColor = theme.colors.border;
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: theme.colors.textPrimary }}>
                          📅 {formatDate(att.attendance_date)}
                        </div>
                        <div style={{ fontSize: '13px', color: theme.colors.textSecondary, marginTop: '4px' }}>
                          📍 {att.reporting_location || 'N/A'}
                        </div>
                        {projects.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {projects.slice(0, 2).map((project, i) => (
                              <span 
                                key={i}
                                style={{
                                  fontSize: '11px',
                                  background: theme.colors.inputBg,
                                  padding: '2px 10px',
                                  borderRadius: '12px',
                                  color: theme.colors.textSecondary,
                                  border: `1px solid ${theme.colors.border}`,
                                }}
                              >
                                📌 {project}
                              </span>
                            ))}
                            {projects.length > 2 && (
                              <span style={{
                                fontSize: '11px',
                                color: theme.colors.textMuted,
                              }}>
                                +{projects.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          color: theme.colors.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span>👆 Click to view details</span>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 14px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: statusColor + '22',
                          color: statusColor,
                          flexShrink: 0,
                          marginLeft: '12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusIcon} {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            {filteredCheckin.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📍</span>
                <p>No check-in/out records found</p>
              </div>
            ) : (
              filteredCheckin.map((item, idx) => {
                const statusColor = item.status === 'Checked In' ? '#10B981' : 
                                   item.status === 'Checked Out (Auto)' ? '#F59E0B' : '#8B5CF6';
                
                const checkInDate = item.check_in_time ? new Date(item.check_in_time) : null;
                const checkOutDate = item.check_out_time ? new Date(item.check_out_time) : null;
                
                return (
                  <div
                    key={idx}
                    className="card"
                    style={{ 
                      marginBottom: '12px',
                      padding: '16px',
                      background: theme.colors.card,
                      borderRadius: '12px',
                      border: `1px solid ${theme.colors.border}`,
                      boxShadow: theme.dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      paddingBottom: '10px',
                      borderBottom: `1px solid ${theme.colors.border}`,
                    }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: theme.colors.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span>📅</span>
                        {formatDate(checkInDate)}
                      </div>
                      <span
                        style={{
                          padding: '4px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: statusColor + '22',
                          color: statusColor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.status || 'Checked In'}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '12px',
                    }}>
                      <div style={{
                        background: theme.colors.inputBg,
                        borderRadius: '10px',
                        padding: '12px',
                        border: `1px solid ${theme.colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: '#10B981',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span>✅</span> Check In
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: theme.colors.textPrimary,
                        }}>
                          {formatTime(checkInDate)}
                        </div>
                        {item.check_in_address && (
                          <div style={{
                            fontSize: '11px',
                            color: theme.colors.textMuted,
                            marginTop: '6px',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                          }}>
                            📍 {item.check_in_address}
                          </div>
                        )}
                      </div>

                      <div style={{
                        background: theme.colors.inputBg,
                        borderRadius: '10px',
                        padding: '12px',
                        border: `1px solid ${theme.colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                      }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: '#EF4444',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span>📤</span> Check Out
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: theme.colors.textPrimary,
                        }}>
                          {formatTime(checkOutDate)}
                        </div>
                        {item.check_out_address && (
                          <div style={{
                            fontSize: '11px',
                            color: theme.colors.textMuted,
                            marginTop: '6px',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                          }}>
                            📍 {item.check_out_address}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: `1px solid ${theme.colors.border}`,
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span style={{
                          fontSize: '13px',
                          color: theme.colors.textSecondary,
                        }}>
                          ⏱️ Working Hours:
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: item.working_hours > 8 ? '#10B981' : item.working_hours > 4 ? '#F59E0B' : '#EF4444',
                        }}>
                          {item.working_hours ? `${item.working_hours}h` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: theme.colors.card,
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  📋 Attendance Details
                </div>
                <div style={{
                  fontSize: '13px',
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}>
                  {formatDate(selectedRecord.attendance_date)}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
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

            <div style={{
              background: theme.colors.inputBg,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.border}`,
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Status</div>
              <div style={{
                fontSize: '15px',
                fontWeight: 700,
                color: getStatusColor(selectedRecord.status, theme),
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: getStatusColor(selectedRecord.status, theme),
                }} />
                {getStatusLabel(selectedRecord.status)}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                  {formatDate(selectedRecord.attendance_date)}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Reporting Location</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                  📍 {selectedRecord.reporting_location || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Check In</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#10B981' }}>
                  {selectedRecord.check_in_time ? formatTime(selectedRecord.check_in_time) : '—'}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Check Out</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>
                  {selectedRecord.check_out_time ? formatTime(selectedRecord.check_out_time) : '—'}
                </div>
              </div>
              <div style={{
                background: theme.colors.inputBg,
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: theme.colors.textMuted, textTransform: 'uppercase' }}>Working Hours</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: selectedRecord.working_hours > 8 ? '#10B981' : selectedRecord.working_hours > 4 ? '#F59E0B' : '#EF4444',
                }}>
                  {selectedRecord.working_hours || 0}h
                </div>
              </div>
            </div>

            {getProjects(selectedRecord).length > 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: theme.colors.inputBg,
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginBottom: '8px',
                }}>
                  📋 Projects
                </div>
                {getProjects(selectedRecord).map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    background: theme.colors.card,
                    borderRadius: '6px',
                    marginBottom: i < getProjects(selectedRecord).length - 1 ? '6px' : 0,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <div style={{ fontWeight: 600, color: theme.colors.textPrimary, fontSize: '13px' }}>
                      📌 {p.name}
                    </div>
                    {p.details && (
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                        {p.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedRecord.remarks && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: theme.colors.inputBg,
                borderRadius: '10px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginBottom: '4px',
                }}>
                  📝 Remarks
                </div>
                <div style={{ fontSize: '13px', color: theme.colors.textPrimary }}>
                  {selectedRecord.remarks}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}DD)`,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ACO FORM MODAL */}
      {showACOForm && (
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
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowACOForm(false)}>
          <div style={{
            background: theme.colors.card,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '85vh',
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
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                }}>
                  🔄 Mark ACO Attendance
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}>
                  Fill attendance for days you forgot to check out
                </p>
              </div>
              <button
                onClick={() => setShowACOForm(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#FEF3C7',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              border: '1px solid #F59E0B',
            }}>
              <p style={{
                fontSize: '12px',
                color: '#92400E',
                lineHeight: '1.5',
                margin: 0,
              }}>
                ⏰ <strong>Deadline Rules:</strong><br/>
                • Before 10 AM next day → <span style={{ color: '#10B981' }}>Present (P)</span><br/>
                • 10 AM to 72 hours → <span style={{ color: '#F59E0B' }}>Delayed (D)</span><br/>
                • After 72 hours → <span style={{ color: '#DC2626' }}>Beyond Delay (B)</span>
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: theme.colors.textSecondary,
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                Select ACO Date *
              </label>
              <select
                value={selectedACODate}
                onChange={(e) => {
                  setSelectedACODate(e.target.value);
                  loadACODetails(e.target.value);
                }}
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.inputBg,
                  color: theme.colors.textPrimary,
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="">Select date...</option>
                {acoDates.map(date => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
              {acoDates.length === 0 && (
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '4px' }}>
                  No ACO entries available
                </div>
              )}
            </div>

            {selectedACODate && acoDetails && (
              <>
                <div style={{
                  background: '#EDE9FE',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #8B5CF6',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#5B21B6', textTransform: 'uppercase' }}>Check In Time</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                        {formatTime(acoDetails.check_in_time)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#5B21B6', textTransform: 'uppercase' }}>Check In Location</div>
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                        📍 {acoDetails.check_in_address || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#5B21B6', textTransform: 'uppercase' }}>Auto Check Out Time</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.textPrimary }}>
                        {acoDetails.check_out_time ? formatTime(acoDetails.check_out_time) : '11:59 PM'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#5B21B6', textTransform: 'uppercase' }}>Auto Check Out Location</div>
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                        📍 {acoDetails.check_out_address || 'Auto captured'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  background: acoStatus === 'P' ? '#DCFCE7' : acoStatus === 'D' ? '#FEF3C7' : '#FEE2E2',
                  border: `1px solid ${acoStatus === 'P' ? '#10B981' : acoStatus === 'D' ? '#F59E0B' : '#DC2626'}`,
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textSecondary }}>
                    Current Status:
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: acoStatus === 'P' ? '#10B981' : acoStatus === 'D' ? '#F59E0B' : '#DC2626',
                    }}>
                      {acoStatus === 'P' ? '✅ Present' : acoStatus === 'D' ? '⏳ Delayed' : '🚫 Beyond Delay'}
                    </span>
                  </div>
                  {acoStatus === 'P' && (
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                      ✅ Within deadline - Will be marked as Present
                    </div>
                  )}
                  {acoStatus === 'D' && (
                    <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px' }}>
                      ⏳ After 10 AM but within 72 hours - Will be marked as Delayed
                    </div>
                  )}
                  {acoStatus === 'B' && (
                    <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '2px' }}>
                      🚫 After 72 hours - Will be marked as Beyond Delay
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: theme.colors.textSecondary,
                    display: 'block',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    Reporting Location *
                  </label>
                  <select
                    value={acoFormData.reportingLocation}
                    onChange={(e) => setAcoFormData({ ...acoFormData, reportingLocation: e.target.value })}
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.inputBg,
                      color: theme.colors.textPrimary,
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <option value="">Select location...</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  📋 Project Details
                </div>

                {acoProjectFields.map((field, index) => (
                  <div key={index} style={{
                    background: theme.colors.inputBg,
                    borderRadius: '12px',
                    padding: '14px',
                    marginBottom: '12px',
                    border: `1px solid ${theme.colors.border}`,
                    position: 'relative',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: theme.colors.textPrimary,
                      }}>
                        📌 Project {index + 1} {index === 0 && <span style={{ color: '#EF4444' }}>*</span>}
                      </span>
                      {acoProjectFields.length > 1 && (
                        <button
                          onClick={() => removeAcoProjectField(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: index === 0 ? '#EF4444' : theme.colors.textSecondary,
                        display: 'block',
                        marginBottom: '4px',
                      }}>
                        Project Name {index === 0 && '*'}
                      </label>
                      <input
                        type="text"
                        value={field.project}
                        onChange={(e) => updateAcoProjectField(index, 'project', e.target.value)}
                        className="form-control"
                        placeholder="Search project..."
                        list="projects-list"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.inputBg,
                          color: theme.colors.textPrimary,
                          fontSize: '14px',
                          outline: 'none',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      />
                      <datalist id="projects-list">
                        {projects.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: index === 0 ? '#EF4444' : theme.colors.textSecondary,
                        display: 'block',
                        marginBottom: '4px',
                      }}>
                        Works Completed {index === 0 && '*'}
                      </label>
                      <textarea
                        value={field.workDone}
                        onChange={(e) => updateAcoProjectField(index, 'workDone', e.target.value)}
                        className="form-control"
                        rows="2"
                        placeholder="Describe work done..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.inputBg,
                          color: theme.colors.textPrimary,
                          fontSize: '14px',
                          outline: 'none',
                          fontFamily: 'Inter, sans-serif',
                          resize: 'vertical',
                          minHeight: '40px',
                        }}
                      />
                    </div>
                  </div>
                ))}

                {acoProjectFields.length < 6 && (
                  <button
                    onClick={addAcoProjectField}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `2px dashed ${theme.colors.border}`,
                      background: 'transparent',
                      color: theme.colors.textSecondary,
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '16px',
                    }}
                  >
                    ➕ Add Project
                  </button>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: theme.colors.textSecondary,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Remarks
                  </label>
                  <textarea
                    value={acoFormData.remarks}
                    onChange={(e) => setAcoFormData({ ...acoFormData, remarks: e.target.value })}
                    className="form-control"
                    rows="2"
                    placeholder="Any additional remarks..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.inputBg,
                      color: theme.colors.textPrimary,
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                      resize: 'vertical',
                      minHeight: '40px',
                    }}
                  />
                </div>

                <button
                  onClick={handleAcoSubmit}
                  disabled={acoSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: acoSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: acoSubmitting ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '0.5px',
                  }}
                  onMouseEnter={(e) => {
                    if (!acoSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!acoSubmitting) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,92,246,0.3)';
                    }
                  }}
                >
                  {acoSubmitting ? 'Submitting...' : '📤 SUBMIT ACO ATTENDANCE'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowCheckInModal(false)}>
          <div style={{
            background: theme.colors.card,
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
                color: theme.colors.textPrimary,
              }}>
                Check In
              </h3>
              <button
                onClick={() => setShowCheckInModal(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{
              fontSize: '13px',
              color: theme.colors.textSecondary,
              marginBottom: '16px',
            }}>
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Asia/Kolkata'
              })}
            </p>

            <div style={{
              background: theme.colors.inputBg,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.colors.textPrimary,
                }}>
                  Current Location
                </span>
              </div>
              
              {fetchingLocation ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(59,130,246,0.1)',
                  color: '#1E40AF',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span>
                  Fetching location...
                </div>
              ) : locationError ? (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ⚠️ {locationError}
                </div>
              ) : location ? (
                <>
                  <div style={{
                    padding: '8px 12px',
                    background: theme.colors.card,
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: '13px',
                    color: theme.colors.textPrimary,
                    wordBreak: 'break-word',
                  }}>
                    {address || 'Location captured'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: theme.colors.textMuted,
                    marginTop: '4px',
                  }}>
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10B981',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    ✅ Location captured
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ⚠️ Click refresh to get location
                </div>
              )}
              
              <button
                onClick={async () => {
                  await getCurrentLocation();
                }}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.card,
                  color: theme.colors.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🔄 Refresh Location
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowCheckInModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: 'transparent',
                  color: theme.colors.textSecondary,
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                disabled={submitting || fetchingLocation || !location}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: (submitting || fetchingLocation || !location) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'linear-gradient(135deg, #059669, #10B981)',
                  opacity: (submitting || fetchingLocation || !location) ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                }}
              >
                {submitting ? 'Processing...' : 'Confirm Check In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowCheckOutModal(false)}>
          <div style={{
            background: theme.colors.card,
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
                color: theme.colors.textPrimary,
              }}>
                Check Out
              </h3>
              <button
                onClick={() => setShowCheckOutModal(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{
              fontSize: '13px',
              color: theme.colors.textSecondary,
              marginBottom: '16px',
            }}>
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Asia/Kolkata'
              })}
            </p>

            {checkInStatus && (
              <div style={{
                background: '#DCFCE7',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                border: '1px solid #10B981',
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#166534',
                }}>
                  ✅ Checked in at {formatTime(checkInStatus.check_in_time)}
                </div>
                {checkInStatus.check_in_address && (
                  <div style={{
                    fontSize: '11px',
                    color: '#166534AA',
                    marginTop: '2px',
                  }}>
                    📍 {checkInStatus.check_in_address}
                  </div>
                )}
              </div>
            )}

            <div style={{
              background: theme.colors.inputBg,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.colors.textPrimary,
                }}>
                  Check-out Location
                </span>
              </div>
              
              {fetchingLocation ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(59,130,246,0.1)',
                  color: '#1E40AF',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span>
                  Fetching location...
                </div>
              ) : locationError ? (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ⚠️ {locationError}
                </div>
              ) : location ? (
                <>
                  <div style={{
                    padding: '8px 12px',
                    background: theme.colors.card,
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: '13px',
                    color: theme.colors.textPrimary,
                    wordBreak: 'break-word',
                  }}>
                    {address || 'Location captured'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: theme.colors.textMuted,
                    marginTop: '4px',
                  }}>
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10B981',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    ✅ Location captured
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ⚠️ Click refresh to get location
                </div>
              )}
              
              <button
                onClick={async () => {
                  await getCurrentLocation();
                }}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.card,
                  color: theme.colors.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🔄 Refresh Location
              </button>
            </div>

            {checkInStatus && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(139,92,246,0.1)',
                marginBottom: '16px',
                border: '1px solid rgba(139,92,246,0.2)',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#5B21B6',
                }}>
                  ⏱️ Estimated working hours: {(() => {
                    const now = new Date();
                    const checkIn = new Date(checkInStatus.check_in_time);
                    const diff = (now - checkIn) / 3600000;
                    return diff.toFixed(2) + 'h';
                  })()}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowCheckOutModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: 'transparent',
                  color: theme.colors.textSecondary,
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckOut}
                disabled={submitting || fetchingLocation || !location}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: (submitting || fetchingLocation || !location) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                  opacity: (submitting || fetchingLocation || !location) ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                }}
              >
                {submitting ? 'Processing...' : 'Confirm Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Form */}
      {showForm && !isAttendanceComplete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: theme.colors.card,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '85vh',
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
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: theme.colors.textPrimary,
                }}>
                  📋 Attendance Form
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}>
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata'
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  fontSize: '24px',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#FEF3C7',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              border: '1px solid #F59E0B',
            }}>
              <p style={{
                fontSize: '12px',
                color: '#92400E',
                lineHeight: '1.5',
                margin: 0,
              }}>
                ⏰ {infoMessage}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: theme.colors.textSecondary,
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                Date of Attendance *
              </label>
              <input
                type="date"
                value={formData.attendanceDate}
                onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.inputBg,
                  color: theme.colors.textPrimary,
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: theme.colors.textSecondary,
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                Reporting Location *
              </label>
              <select
                value={formData.reportingLocation}
                onChange={(e) => setFormData({ ...formData, reportingLocation: e.target.value })}
                className="form-control"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.inputBg,
                  color: theme.colors.textPrimary,
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '14px',
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: theme.colors.textSecondary,
                  display: 'block',
                  marginBottom: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}>
                  Check-In Time
                </label>
                <input
                  type="text"
                  value={formData.checkInTime}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.inputBg,
                    color: theme.colors.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                  readOnly
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: theme.colors.textSecondary,
                  display: 'block',
                  marginBottom: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}>
                  Check-Out Time
                </label>
                <input
                  type="text"
                  value={formData.checkOutTime}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.inputBg,
                    color: theme.colors.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                  readOnly
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: theme.colors.textSecondary,
                  display: 'block',
                  marginBottom: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}>
                  Check-In Location
                </label>
                <input
                  type="text"
                  value={formData.checkInLocation}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.inputBg,
                    color: theme.colors.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                  readOnly
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: theme.colors.textSecondary,
                  display: 'block',
                  marginBottom: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}>
                  Check-Out Location
                </label>
                <input
                  type="text"
                  value={formData.checkOutLocation}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.inputBg,
                    color: theme.colors.textPrimary,
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                  readOnly
                />
              </div>
            </div>

            <div style={{
              height: '1px',
              background: theme.colors.border,
              margin: '0 0 16px 0',
            }} />

            <div style={{
              fontSize: '15px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              📋 Project Details
            </div>

            {projectFields.map((field, index) => (
              <div key={index} style={{
                background: theme.colors.inputBg,
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '12px',
                border: `1px solid ${theme.colors.border}`,
                position: 'relative',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: theme.colors.textPrimary,
                  }}>
                    📌 Project {index + 1} {index === 0 && <span style={{ color: '#EF4444' }}>*</span>}
                  </span>
                  {projectFields.length > 1 && (
                    <button
                      onClick={() => removeProjectField(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: index === 0 ? '#EF4444' : theme.colors.textSecondary,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Project Name {index === 0 && '*'}
                  </label>
                  <input
                    type="text"
                    value={field.project}
                    onChange={(e) => updateProjectField(index, 'project', e.target.value)}
                    className="form-control"
                    placeholder="Search project..."
                    list="projects-list"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.inputBg,
                      color: theme.colors.textPrimary,
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <datalist id="projects-list">
                    {projects.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: index === 0 ? '#EF4444' : theme.colors.textSecondary,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Works Completed {index === 0 && '*'}
                  </label>
                  <textarea
                    value={field.workDone}
                    onChange={(e) => updateProjectField(index, 'workDone', e.target.value)}
                    className="form-control"
                    rows="2"
                    placeholder="Describe work done..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.inputBg,
                      color: theme.colors.textPrimary,
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                      resize: 'vertical',
                      minHeight: '40px',
                    }}
                  />
                </div>
              </div>
            ))}

            {projectFields.length < 6 && (
              <button
                onClick={addProjectField}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px dashed ${theme.colors.border}`,
                  background: 'transparent',
                  color: theme.colors.textSecondary,
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px',
                }}
              >
                ➕ Add Project
              </button>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: theme.colors.textSecondary,
                display: 'block',
                marginBottom: '4px',
              }}>
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-control"
                rows="2"
                placeholder="Any additional remarks..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.inputBg,
                  color: theme.colors.textPrimary,
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  resize: 'vertical',
                  minHeight: '40px',
                }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(30,64,175,0.3)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.5px',
              }}
            >
              {submitting ? 'Submitting...' : '📤 SUBMIT ATTENDANCE'}
            </button>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};