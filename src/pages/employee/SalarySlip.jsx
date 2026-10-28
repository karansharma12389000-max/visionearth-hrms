// src/pages/employee/SalarySlip.jsx
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { getMonthName } from '../../utils/helpers';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';
import { SalarySlipPDF } from '../../components/SalarySlipPDF';
import html2pdf from 'html2pdf.js';

export const EmployeeSalarySlip = () => {
  const { user } = useAuth();
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

  const _now = new Date();
  const [month, setMonth] = useState(_now.getMonth() + 1);
  const [year, setYear] = useState(_now.getFullYear());
  
  const [slipData, setSlipData] = useState(null);
  const [loading, setLoading] = useState(false);
  const pdfRef = useRef();

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const border = dark ? THEME.dark.border : THEME.border;

  const handleFetch = async () => {
    setLoading(true);
    setSlipData(null);

    try {
      // 🔑 Searches using the employee's ID code (e.g. EMP001) OR their Name
      const { data, error } = await supabase
        .from('salary_slips')
        .select('*')
        .or(`employee_id.eq."${user?.employee_id}",employee.eq."${user?.name}"`)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error(`No salary slip found for ${getMonthName(month)} ${year}`);
      } else {
        setSlipData(data);
        toast.success("Salary slip loaded successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch salary slip');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!slipData) return;
    
    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `SalarySlip_${slipData.year}_${slipData.month}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 800 },
      jsPDF: { unit: 'px', format: [820, element.offsetHeight + 40], orientation: 'portrait' }
    };

    toast.promise(html2pdf().set(opt).from(element).save(), {
      loading: 'Generating PDF...',
      success: 'Downloaded!',
      error: 'Failed to generate PDF'
    });
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: pageBg, paddingBottom: '120px', fontFamily: THEME.font }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>My Salary Slip</h2>
        <button onClick={toggleDark} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: dark ? 'rgba(255,255,255,0.08)' : '#FEF3C7', cursor: 'pointer' }}>{dark ? '☀️' : '🌙'}</button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ background: cardBg, borderRadius: THEME.radiusMd, border: `1px solid ${border}`, padding: 16 }}>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', color: textSecondary, marginBottom: 4 }}>Month</label>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${border}`, background: pageBg, color: textPrimary }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', color: textSecondary, marginBottom: 4 }}>Year</label>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${border}`, background: pageBg, color: textPrimary }}>
                {[_now.getFullYear(), _now.getFullYear() - 1, _now.getFullYear() - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={handleFetch} 
            disabled={loading} 
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: loading ? '#94A3B8' : THEME.primary, color: '#fff', fontWeight: 'bold', fontSize: 14 }}
          >
            {loading ? 'Searching...' : '🔍 View Salary Slip'}
          </button>
        </div>
      </div>

      {slipData && (
        <div style={{ padding: '0 16px' }}>
          <button onClick={handleDownloadPDF} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', fontWeight: 'bold', marginBottom: 16 }}>
            ⬇ Download PDF
          </button>

          <div style={{ overflowX: 'auto', paddingBottom: 20, background: '#fff', borderRadius: 8, padding: 10 }}>
             <div style={{ width: '800px', transform: 'scale(0.5)', transformOrigin: 'top left', margin: '0 auto' }}>
                <div style={{ width: '800px' }}>
                   <SalarySlipPDF ref={pdfRef} data={slipData} />
                </div>
             </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default EmployeeSalarySlip;