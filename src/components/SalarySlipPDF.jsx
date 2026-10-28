// src/components/SalarySlipPDF.jsx
import React from 'react';

const fmt = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SalarySlipPDF = React.forwardRef(({ data }, ref) => {
  if (!data) return null;

  const annualCTC = Number(data.monthly_ctc || 0) * 12;
  const showNetPayable = Number(data.net_salary || 0);
  const totalDed = Number(data.tot_dedn || 0);

  const cellStyle = { border: '1px solid #000', padding: '6px 10px', fontSize: '13px', color: '#000' };
  const labelStyle = { ...cellStyle, fontWeight: 'bold', width: '35%' };
  const valStyle = { ...cellStyle, textAlign: 'right', width: '15%', fontWeight: '600' };

  return (
    <div ref={ref} style={{ width: '800px', backgroundColor: '#fff', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '0' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', borderRight: '1px solid #000', textAlign: 'center', padding: '10px' }}>
              <img src="/vision-earth-logo.png" alt="VEC" style={{ width: '180px', objectFit: 'contain' }} />
              <div style={{ color: '#10B981', fontStyle: 'italic', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
                towards a green tomorrow
              </div>
            </td>
            <td style={{ padding: '10px', verticalAlign: 'top' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '6px', color: '#000' }}>Vision Earthcare Technologies Pvt Ltd</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#000' }}>Flat No. 1, C Wing , Raheja Nest, Chandivali Rd Chandivali, Near</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#000' }}>BKC Garden Mumbai 40007</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>hr@visionearthcare.com</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* EMPLOYEE INFO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...labelStyle, width: '15%', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000' }}>Employee</td>
            <td style={{ ...cellStyle, width: '35%', borderTop: 'none', borderBottom: '1px solid #000' }}>{data.employee}</td>
            <td style={{ ...labelStyle, width: '10%', borderTop: 'none', borderBottom: '1px solid #000' }}>UAN</td>
            <td style={{ ...cellStyle, width: '40%', borderTop: 'none', borderRight: 'none', borderBottom: '1px solid #000' }}>{data.uan || '-'}</td>
          </tr>
          <tr>
            <td style={{ ...labelStyle, borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #000' }}>DOJ</td>
            <td style={{ ...cellStyle, borderTop: 'none', borderBottom: '1px solid #000' }}>{data.doj || '-'}</td>
            <td style={{ ...labelStyle, borderTop: 'none', borderBottom: '1px solid #000' }}>Salary Month</td>
            <td style={{ ...cellStyle, borderTop: 'none', borderRight: 'none', borderBottom: '1px solid #000', textAlign: 'right' }}>{data.year}{String(data.month).padStart(2, '0')}</td>
          </tr>
        </tbody>
      </table>

      {/* MAIN TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...labelStyle, borderTop: 'none', borderLeft: 'none' }}>Earnings</td>
            <td style={{ ...labelStyle, borderTop: 'none', textAlign: 'right' }}>Amt.(Rs)</td>
            <td style={{ ...labelStyle, borderTop: 'none' }}>Attendance</td>
            <td style={{ ...cellStyle, borderTop: 'none', borderRight: 'none', textAlign: 'right' }}></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>CTC Salary Monthly</td>
            <td style={valStyle}>{fmt(data.monthly_ctc)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>Working Days in Month</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{data.working_days || 26}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>CTC Salary Annual</td>
            <td style={valStyle}>{fmt(annualCTC)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>Calendar Day in Month</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{data.calendar_days || 31}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Gross Salary Monthly</td>
            <td style={valStyle}>{fmt(data.gross_salary)}</td>
            <td style={{ ...cellStyle, borderTop: '2px solid #000', borderBottom: '2px solid #000', textAlign: 'center', fontWeight: 'bold' }}>Deductions</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: '2px solid #000', borderBottom: '2px solid #000', textAlign: 'center', fontWeight: 'bold' }}>Amt (Rs)</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none', borderTop: '2px solid #000', borderBottom: '2px solid #000', textAlign: 'center', fontWeight: 'bold' }}>Monthly Salary Breakup</td>
            <td style={{ ...cellStyle, borderTop: '2px solid #000', borderBottom: '2px solid #000' }}></td>
            <td style={{ ...cellStyle, borderTop: 'none', fontWeight: 'bold' }}>Monthly VEC ESIC</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.monthly_vec_esic)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Monthly CTC</td>
            <td style={valStyle}>{fmt(data.monthly_ctc)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>Monthly ESIC Employee</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.monthly_esic_employee)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Gross Salary</td>
            <td style={valStyle}>{fmt(data.gross_salary)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>VEC PF Contribution + 1.00% Govt</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.vec_pf_govt)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Basic Salary</td>
            <td style={valStyle}>{fmt(data.basic_salary)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>Monthly EmployeePF Contribution</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.monthly_employee_pf)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>H.R.A</td>
            <td style={valStyle}>{fmt(data.hra)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>TDS</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.tds)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Uniform Allowance</td>
            <td style={valStyle}>{fmt(data.uniform_allowance)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold' }}>Professional Tax</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: '600' }}>{fmt(data.professional_tax)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Medical Allowance</td>
            <td style={valStyle}>{fmt(data.medical_allowance)}</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderBottom: 'none' }}></td>
            <td style={{ ...cellStyle, borderRight: 'none', borderBottom: 'none' }}></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Conveyance Allowance</td>
            <td style={valStyle}>{fmt(data.conveyance_allowance)}</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none' }}></td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none' }}></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none' }}>Oth. Allowance</td>
            <td style={valStyle}>{fmt(data.oth_allowance)}</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none' }}></td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none' }}></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none', borderBottom: 'none', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>CTC Salary</td>
            <td style={{ ...valStyle, borderBottom: 'none', backgroundColor: '#f0f0f0' }}>{fmt(data.monthly_ctc)}</td>
            <td style={{ ...cellStyle, fontWeight: 'bold', backgroundColor: '#f0f0f0', borderBottom: 'none' }}>Total Deductions</td>
            <td style={{ ...cellStyle, borderRight: 'none', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0', borderBottom: 'none' }}>{fmt(totalDed)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, borderLeft: 'none', borderTop: 'none', borderBottom: 'none', fontWeight: 'bold', fontSize: '15px' }}>Net Payable</td>
            <td style={{ ...valStyle, borderTop: 'none', borderBottom: 'none', fontWeight: '900', fontSize: '15px' }}>{fmt(showNetPayable)}</td>
            <td style={{ ...cellStyle, borderTop: 'none', borderBottom: 'none', fontSize: '11px', fontWeight: 'bold' }}>TDS Deductions credited to PAN</td>
            <td style={{ ...cellStyle, borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});