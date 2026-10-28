// src/pages/admin/ExcelImport.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const ExcelImport = () => {
  const navigate = useNavigate();
  const { theme, toggleDark } = useTheme();
  const dark = isDark(theme);

  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const border = dark ? THEME.dark.border : THEME.border;

  const cleanNum = (val) => {
    if (!val) return 0;
    const s = String(val).replace(/[₹,\s]/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const parseSmartMonth = (val) => {
    if (!val) return new Date().getMonth() + 1;
    const s = String(val).toLowerCase().trim();
    const num = parseInt(s, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;
    const months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    const match = s.match(/^[a-z]+/);
    if (match && months[match[0]]) return months[match[0]];
    return months[s] || new Date().getMonth() + 1;
  };

  const parseSmartYear = (val) => {
    if (!val) return new Date().getFullYear();
    const s = String(val).trim();
    const matches = s.match(/\d+/g);
    if (!matches) return new Date().getFullYear();
    for (let num of matches) {
      const n = parseInt(num, 10);
      if (n >= 2000 && n <= 2100) return n;
      if (n >= 20 && n < 100) return 2000 + n;
    }
    return new Date().getFullYear();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        const mappedData = rawData.map((row) => {
          // 1. TAKE EXACTLY WHAT IS IN THE EXCEL FILE
          const excelEmpId = String(row["employee_id"] || row["Employee ID"] || "").trim();
          const excelName = String(row["Employee"] || row["employee"] || "").trim();

          if (!excelEmpId && !excelName) return null; 

          let month = parseSmartMonth(row["month"]);
          let year = parseSmartYear(row["year"]);

          return {
            doj: String(row["DOJ"] || row["doj"] || "").trim(),
            sr_no: cleanNum(row["SR No."] || row["sr_no"]),
            employee: excelName, 
            uan: String(row["UAN"] || row["uan"] || "").trim(),
            gross: cleanNum(row["Gross"] || row["gross"]),
            monthly_ctc: cleanNum(row["Monthly CTC"] || row["monthly_ctc"]),
            gross_salary: cleanNum(row["Gross Salary"] || row["gross_salary"]),
            basic_salary: cleanNum(row["Basic Salary"] || row["basic_salary"]),
            hra: cleanNum(row["H.R.A"] || row["hra"]),
            conveyance_allowance: cleanNum(row["Conveyance Allowance"] || row["conveyance_allowance"]),
            uniform_allowance: cleanNum(row["Uniform Allowance"] || row["uniform_allowance"]),
            medical_allowance: cleanNum(row["Medical Allowance"] || row["medical_allowance"]),
            oth_allowance: cleanNum(row["Oth. Allowance"] || row["oth_allowance"]),
            salary_payable: cleanNum(row["Salary payable"] || row["salary_payable"]),
            monthly_employee_pf: cleanNum(row["Monthly EmployeePF Contribution"] || row["monthly_employee_pf"]),
            vec_pf_govt: cleanNum(row["VEC PF Contribution + 1.00% Govt Charge (monthly)"] || row["vec_pf_govt"]),
            monthly_esic_employee: cleanNum(row["Monthly ESIC Employee"] || row["monthly_esic_employee"]),
            monthly_vec_esic: cleanNum(row["Monthly VEC ESIC"] || row["monthly_vec_esic"]),
            professional_tax: cleanNum(row["Professional Tax"] || row["professional_tax"]),
            tds: cleanNum(row["TDS"] || row["tds"]),
            sal_adv: cleanNum(row["Sal. Adv."] || row["sal_adv"]),
            oth_dedn_bonus: cleanNum(row["Oth. Dedn and Bonus (-VE)"] || row["oth_dedn_bonus"]),
            tot_dedn: cleanNum(row["Tot. Dedn."] || row["tot_dedn"]),
            add_less_prev_diff: cleanNum(row["ADD/LESS PREVIOUS DIFF"] || row["add_less_prev_diff"]),
            net_salary: cleanNum(row["Net Salary"] || row["net_salary"]),
            remark: String(row["Remark"] || row["remark"] || "").trim(),
            
            // 🔑 JUST USE THE EXCEL VALUE (e.g., "EMP001")
            employee_id: excelEmpId, 
            month: month,
            year: year
          };
        }).filter(row => row !== null);

        if (mappedData.length === 0) {
          toast.error("No rows found. Ensure the 'Employee' column has data.");
          setFileData([]);
        } else {
          setFileData(mappedData);
          toast.success(`Loaded ${mappedData.length} rows exactly as written!`);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to read the file.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (fileData.length === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('salary_slips').insert(fileData);
      if (error) throw error;
      
      toast.success(`Imported ${fileData.length} salary slips successfully!`);
      setFileData([]);
      setFileName('');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: pageBg, paddingBottom: '120px', fontFamily: THEME.font }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>Auto Excel Import</h2>
        <button onClick={toggleDark} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: dark ? 'rgba(255,255,255,0.08)' : '#FEF3C7', cursor: 'pointer' }}>{dark ? '☀️' : '🌙'}</button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${fileData.length > 0 ? THEME.primary : border}`,
            borderRadius: THEME.radiusMd, padding: '30px 20px', textAlign: 'center',
            background: cardBg, cursor: 'pointer', position: 'relative'
          }}
        >
          <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: textPrimary, marginBottom: 4 }}>
            {fileData.length > 0 ? 'File Loaded Successfully' : 'Click to Upload Excel/CSV'}
          </div>
          <div style={{ fontSize: 11, color: textSecondary }}>
            {fileName ? `Selected: ${fileName}` : 'Works with Oct, 10, 2026, EMP001, etc.'}
          </div>
        </div>
      </div>

      {fileData.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ padding: 12, background: THEME.primary + '15', borderRadius: 8, border: `1px solid ${THEME.primary}`, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: THEME.primary }}>✅ Ready to Import</div>
            <div style={{ fontSize: 12, color: textSecondary }}>{fileData.length} total rows found</div>
          </div>

          <button onClick={handleImport} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: loading ? '#94A3B8' : THEME.primary, color: '#fff', fontWeight: 'bold' }}>
            {loading ? 'Importing...' : `⬆ Upload ${fileData.length} Slips to Database`}
          </button>
        </div>
      )}
      <BottomNavigation theme={theme} />
    </div>
  );
};

export default ExcelImport;