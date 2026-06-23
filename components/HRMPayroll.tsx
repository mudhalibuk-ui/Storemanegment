import React, { useState, useEffect } from 'react';
import { Employee, Payroll, Xarun, Attendance } from '../types';
import { API } from '../services/api';

interface HRMPayrollProps {
  employees: Employee[];
  xarumo: Xarun[];
  branch?: string;
}

const HRMPayroll: React.FC<HRMPayrollProps> = ({ employees, xarumo, branch = 'all' }) => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);

  const filteredEmployees = employees.filter(emp => branch === 'all' || emp.branchId === branch);

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth, selectedYear]);

  const loadPayrollData = async () => {
    const data = await API.payroll.getAll();
    const payr = data.filter(p => p.month === selectedMonth && p.year === selectedYear && (branch === 'all' || filteredEmployees.some(e => e.id === p.employeeId)));
    setPayrolls(payr);

    const att = await API.attendance.getAll();
    const monthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth();
    setAttendanceData(att.filter(a => {
        if (!a.date) return false;
        const [y, m] = a.date.split('-');
        return parseInt(m, 10) - 1 === monthIndex && parseInt(y, 10) === selectedYear;
    }));
  };

  const calculateHours = (inTime: string, outTime: string): number => {
    if (!inTime || !outTime) return 0;
    const start = new Date(inTime).getTime();
    const end = new Date(outTime).getTime();
    return (end - start) / (1000 * 60 * 60); 
  };

  const processPayroll = async () => {
    setIsProcessing(true);
    
    const allAttendance = await API.attendance.getAll();
    const monthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth();
    const targetAttendance = allAttendance.filter(a => {
        if (!a.date) return false;
        const [year, month, day] = a.date.split('-');
        return parseInt(month, 10) - 1 === monthIndex && parseInt(year, 10) === selectedYear;
    });

    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const STANDARD_MONTHLY_HOURS = daysInMonth * 10;
    const todayStr = new Date().toISOString().split('T')[0];

    for (const emp of filteredEmployees) {
      const existing = payrolls.find(p => p.employeeId === emp.id);
      const empLogs = targetAttendance.filter(a => a.employeeId === emp.id);
      
      let totalWorkedHours = 0;
      let totalAbsentHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(selectedYear, monthIndex, d);
          const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          
          const isFriday = dateObj.getDay() === 5;
          const isPastOrCurrent = dateStr <= todayStr;
          
          const logsForDay = empLogs.filter(a => a.date === dateStr);
          const log = logsForDay.find(a => a.status !== 'ABSENT') || logsForDay[0];

          if (isFriday) {
              if (log && log.clockIn && log.clockOut) {
                   totalWorkedHours += calculateHours(log.clockIn, log.clockOut);
              }
          } else {
              if (log) {
                  if (log.status === 'HOLIDAY' || log.status === 'LEAVE') {
                      // Paid
                  } else if (log.status === 'ABSENT') {
                      totalAbsentHours += 10;
                  } else if (log.clockIn && log.clockOut) {
                      const hours = calculateHours(log.clockIn, log.clockOut);
                      totalWorkedHours += hours;
                      if (hours < 10) totalAbsentHours += (10 - hours);
                  }
              } else if (isPastOrCurrent) {
                  totalAbsentHours += 10;
                  await API.attendance.save({ employeeId: emp.id, date: dateStr, status: 'ABSENT' });
              }
          }
      }
      
      const hourlyRate = emp.salary / STANDARD_MONTHLY_HOURS;
      const calculatedDeductions = Math.round(totalAbsentHours * hourlyRate);
      const calculatedNetPay = Math.round(emp.salary - calculatedDeductions);

      if (!existing) {
        const newPay: Partial<Payroll> = {
          employeeId: emp.id,
          month: selectedMonth,
          year: selectedYear,
          base_salary: emp.salary,
          bonus: 0, 
          deduction: calculatedDeductions,
          netPay: calculatedNetPay > 0 ? calculatedNetPay : 0, 
          status: 'UNPAID',
          xarunId: emp.xarunId,
          totalHours: parseFloat(totalWorkedHours.toFixed(2))
        };
        await API.payroll.save(newPay);
      } else {
          if (existing.status === 'UNPAID') {
             await API.payroll.save({
                 ...existing,
                 totalHours: parseFloat(totalWorkedHours.toFixed(2)),
                 base_salary: emp.salary,
                 deduction: calculatedDeductions, 
                 netPay: calculatedNetPay > 0 ? calculatedNetPay : 0
             });
          }
      }
    }
    await loadPayrollData();
    setIsProcessing(false);
  };

  const getEmpMonthlyStats = (empId: string) => {
      const empLogs = attendanceData.filter(a => a.employeeId === empId);
      const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(selectedMonth);
      const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
      const todayStr = new Date().toISOString().split('T')[0];

      let worked = 0;
      let left = 0;
      let absent = 0;

      for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(selectedYear, monthIndex, d);
          const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          
          const isFriday = dateObj.getDay() === 5;
          const isPastOrCurrent = dateStr <= todayStr;
          
          const logsForDay = empLogs.filter(a => a.date === dateStr);
          const log = logsForDay.find(a => a.status !== 'ABSENT') || logsForDay[0];

          if (isFriday) {
              left += 10;
              if (log && log.clockIn && log.clockOut) worked += calculateHours(log.clockIn, log.clockOut);
          } else {
              if (log) {
                  if (log.status === 'ABSENT') absent += 10;
                  else if (log.status === 'HOLIDAY' || log.status === 'LEAVE') left += 10;
                  else if (log.clockIn && log.clockOut) {
                      const h = calculateHours(log.clockIn, log.clockOut);
                      worked += h;
                      if (h < 10) absent += (10 - h);
                  }
              } else if (isPastOrCurrent) {
                  absent += 10;
              }
          }
      }

      return { worked: parseFloat(worked.toFixed(1)), paidLeave: left, absent: parseFloat(absent.toFixed(1)) };
  };

  const markAsPaid = async (payroll: Payroll) => {
    if (!confirm("Ma hubtaa inaad bixiso mushaharkan?")) return;
    await API.payroll.save({ ...payroll, status: 'PAID', paymentDate: new Date().toISOString() });
    loadPayrollData();
  };

  const resetPayrollStatus = async (payroll: Payroll) => {
    if (!confirm("Ma hubtaa inaad dib u furto mushaharkan? Tani waxay kuu ogolaaneysaa inaad dib u xisaabiso.")) return;
    await API.payroll.save({ ...payroll, status: 'UNPAID', paymentDate: undefined });
    loadPayrollData();
  };

  const resetAllPayrollStatus = async () => {
    if (!confirm(`Ma hubtaa inaad dib u furto dhamaan mushaharka bisha ${selectedMonth} ${selectedYear}?`)) return;
    setIsProcessing(true);
    for (const pay of payrolls) {
      if (pay.status === 'PAID') {
        await API.payroll.save({ ...pay, status: 'UNPAID', paymentDate: undefined });
      }
    }
    await loadPayrollData();
    setIsProcessing(false);
  };

  const downloadExcel = () => {
    let csv = "SHAQAALAHA,BASE SALARY,WORKED HOURS,PAID LEAVE (JIMCO),ABSENT HOURS,DEDUCTIONS,NET PAY,STATUS\n";
    payrolls.forEach(pay => {
       const emp = employees.find(e => e.id === pay.employeeId);
       const stats = getEmpMonthlyStats(pay.employeeId);
       if (emp) {
           csv += `"${emp.name}",${pay.base_salary},${stats.worked},${stats.paidLeave},${stats.absent},${pay.deduction},${pay.netPay},${pay.status}\n`;
       }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Payroll_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const printPayslip = (payroll: Payroll) => {
    const emp = employees.find(e => e.id === payroll.employeeId);
    if (!emp) return;
    const stats = getEmpMonthlyStats(emp.id);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${emp.name}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .slip { border: 2px solid #1e293b; padding: 40px; max-width: 600px; margin: auto; border-radius: 10px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;}
              .header h2 { margin: 0 0 5px 0; color: #0f172a; font-size: 24px;}
              .header p { margin: 0; color: #64748b; font-size: 14px;}
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 15px;}
              .row span:first-child { color: #64748b; }
              .total { font-weight: bold; font-size: 18px; margin-top: 25px; border-top: 2px solid #1e293b; padding-top: 15px; border-bottom: none;}
              .total span:last-child { color: #059669; }
            </style>
          </head>
          <body>
            <div class="slip">
              <div class="header">
                 <h2>PAYSLIP</h2>
                 <p>${payroll.month} ${payroll.year}</p>
              </div>
              <div class="row"><span>Magaaca Shaqaalaha (Name):</span> <strong>${emp.name}</strong></div>
              <div class="row"><span>ID / Aqoonsiga:</span> <strong>${emp.employeeIdCode}</strong></div>
              <br/>
              <div class="row"><span>Mushaharka Asaasiga (Base Salary):</span> <strong>$${payroll.base_salary}</strong></div>
              <div class="row"><span>Saacadaha Shaqada (Worked Hrs):</span> <strong>${stats.worked} hrs</strong></div>
              <div class="row"><span>Saacadaha Fasaxa (Paid Leave/Fridays):</span> <strong>${stats.paidLeave} hrs</strong></div>
              <div class="row"><span>Saacadaha Maqnaanshaha (Absent Hrs):</span> <strong>${stats.absent} hrs</strong></div>
              <div class="row"><span>Lacagta Laga Jaray (Deductions):</span> <strong style="color: #e11d48">-$${payroll.deduction}</strong></div>
              <div class="row total"><span>MUHSAHARKA NET-KA (NET PAY):</span> <span>$${payroll.netPay}</span></div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const totalPayroll = payrolls.reduce((sum, p) => sum + p.netPay, 0);
  const totalWorkedHrs = payrolls.reduce((sum, p) => sum + (p.totalHours || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.deduction, 0);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Maamulka Mushaharka</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 lg:ml-1">Net Pay = Base - Deductions (Fridays Paid)</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <select className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={resetAllPayrollStatus} disabled={isProcessing || payrolls.length === 0} className="bg-amber-50 text-amber-600 px-6 py-3.5 rounded-2xl font-black shadow-sm border border-amber-100 hover:bg-amber-100 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            DIB U FUR DHAMAAN
          </button>
          <button onClick={processPayroll} disabled={isProcessing} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            {isProcessing ? 'WAA LA XISAABINAYAA...' : 'XISAABI MUSHAHARKA'}
          </button>
        </div>
      </div>

      {/* QAYBTA 1: EXECUTIVE PAYROLL SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-8 rounded-3xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-600">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
             </div>
             <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase mb-1">Total Company Payroll</p>
             <h3 className="text-4xl font-black text-emerald-700">${totalPayroll.toLocaleString()}</h3>
          </div>
          
          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-8 rounded-3xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-indigo-600">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
             </div>
             <p className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase mb-1">Total Working Hours</p>
             <h3 className="text-4xl font-black text-indigo-700">{totalWorkedHrs.toLocaleString()} <span className="text-lg">hrs</span></h3>
          </div>

          <div className="bg-rose-50 border-l-4 border-rose-500 p-8 rounded-3xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 text-rose-600">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
             </div>
             <p className="text-[10px] text-rose-600 font-bold tracking-widest uppercase mb-1">Total Deductions</p>
             <h3 className="text-4xl font-black text-rose-700">${totalDeductions.toLocaleString()}</h3>
          </div>
      </div>

      {/* ACTION BUTTONS (QAYBTA 3) */}
      <div className="flex gap-4 items-center justify-end">
          <button onClick={downloadExcel} disabled={payrolls.length === 0} className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-[11px] tracking-widest uppercase flex items-center gap-2 disabled:opacity-50">
              <span>📥</span> Download Excel Report
          </button>
      </div>

      {/* QAYBTA 2: DETAILED PAYROLL TABLE */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Shaqaalaha</th>
                <th className="px-6 py-5">Base Salary</th>
                <th className="px-6 py-5">Worked Hours</th>
                <th className="px-6 py-5">Paid Leave (Jimco)</th>
                <th className="px-6 py-5">Absent Hours</th>
                <th className="px-6 py-5 text-rose-500">Deductions</th>
                <th className="px-6 py-5 text-emerald-600">Net Pay</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    No payroll data found for {selectedMonth} {selectedYear}
                  </td>
                </tr>
              ) : payrolls.map(pay => {
                const emp = employees.find(e => e.id === pay.employeeId);
                if (branch !== 'all' && emp?.branchId !== branch) return null;
                const stats = getEmpMonthlyStats(pay.employeeId);
                
                return (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-700 text-sm">
                        {emp?.name}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500">
                        ${pay.base_salary}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">
                        {stats.worked} hrs
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-500">
                        {stats.paidLeave} hrs
                    </td>
                    <td className="px-6 py-4 font-bold text-rose-500">
                        {stats.absent} hrs
                    </td>
                    <td className="px-6 py-4 font-black text-rose-500">
                        ${pay.deduction}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xl font-black text-emerald-600">${pay.netPay}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {pay.status === 'PAID' ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => printPayslip(pay)} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all text-sm" title="Print PDF Payslip">
                          📄
                        </button>
                        {pay.status === 'UNPAID' ? (
                            <button onClick={() => markAsPaid(pay)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase hover:bg-emerald-700 shadow-sm active:scale-95 transition-all">BIXI</button>
                        ) : (
                            <button onClick={() => resetPayrollStatus(pay)} className="bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase hover:bg-amber-200 shadow-sm active:scale-95 transition-all">DIB U FUR</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRMPayroll;
