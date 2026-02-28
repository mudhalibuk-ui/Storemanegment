
import React, { useState, useEffect } from 'react';
import { Employee, Payroll, Xarun, Attendance } from '../types';
import { API } from '../services/api';

interface HRMPayrollProps {
  employees: Employee[];
  xarumo: Xarun[];
}

const HRMPayroll: React.FC<HRMPayrollProps> = ({ employees, xarumo }) => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth, selectedYear]);

  const loadPayrollData = async () => {
    const data = await API.payroll.getAll();
    setPayrolls(data.filter(p => p.month === selectedMonth && p.year === selectedYear));
  };

  const calculateHours = (inTime: string, outTime: string): number => {
    if (!inTime || !outTime) return 0;
    const start = new Date(inTime).getTime();
    const end = new Date(outTime).getTime();
    return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
  };

  const processPayroll = async () => {
    setIsProcessing(true);
    
    // 1. Fetch ALL attendance
    const allAttendance = await API.attendance.getAll();
    
    // 2. Filter attendance for selected month/year
    const monthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth();
    const targetAttendance = allAttendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
    });

    for (const emp of employees) {
      const existing = payrolls.find(p => p.employeeId === emp.id);
      
      // Calculate Total Hours & Overtime
      const empLogs = targetAttendance.filter(a => a.employeeId === emp.id);
      let totalWorkedHours = 0;
      let totalOvertimeHours = 0;

      empLogs.forEach(log => {
          if (log.clockIn && log.clockOut) {
              const hours = calculateHours(log.clockIn, log.clockOut);
              totalWorkedHours += hours;
              
              // DAILY OVERTIME LOGIC: If worked > 10 hours in a single day
              if (hours > 10) {
                  totalOvertimeHours += (hours - 10);
              }
          }
      });

      // Standard Monthly Hours (10 hours * 30 days = 300)
      const STANDARD_MONTHLY_HOURS = 300; 
      
      // Hourly Rate based on salary
      const hourlyRate = emp.salary / STANDARD_MONTHLY_HOURS;
      
      // Base Pay (Standard Hours Only, capped at 300 or actual)
      const regularHours = totalWorkedHours - totalOvertimeHours;
      const basePay = regularHours * hourlyRate;
      
      // Overtime Pay (Added on top)
      // Assuming Overtime is paid at same rate or 1.0x (Change to 1.5 for extra pay)
      const overtimePay = totalOvertimeHours * hourlyRate;

      const calculatedNetPay = Math.round(basePay + overtimePay);

      if (!existing) {
        const newPay: Partial<Payroll> = {
          employeeId: emp.id,
          month: selectedMonth,
          year: selectedYear,
          base_salary: emp.salary,
          bonus: Math.round(overtimePay), // Show Overtime as Bonus/Extra
          deduction: 0,
          netPay: calculatedNetPay, 
          status: 'UNPAID',
          xarunId: emp.xarunId,
          totalHours: parseFloat(totalWorkedHours.toFixed(2))
        };
        await API.payroll.save(newPay);
      } else {
          // Update existing with new hours if not paid
          if (existing.status === 'UNPAID') {
             await API.payroll.save({
                 ...existing,
                 totalHours: parseFloat(totalWorkedHours.toFixed(2)),
                 bonus: Math.round(overtimePay), // Update OT
                 netPay: calculatedNetPay // Recalculate Total
             });
          }
      }
    }
    await loadPayrollData();
    setIsProcessing(false);
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

  const printPayslip = (payroll: Payroll) => {
    const emp = employees.find(e => e.id === payroll.employeeId);
    
    const printWindow = window.open('', '_blank');
    if (printWindow && emp) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${emp.name}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; }
              .slip { border: 1px solid #000; padding: 30px; max-width: 500px; margin: auto; }
              .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
              .total { font-weight: bold; font-size: 18px; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px;}
            </style>
          </head>
          <body>
            <div class="slip">
              <h2 style="text-align:center">PAYSLIP: ${payroll.month} ${payroll.year}</h2>
              <div class="row"><span>Name:</span> <strong>${emp.name}</strong></div>
              <div class="row"><span>ID:</span> <strong>${emp.employeeIdCode}</strong></div>
              <div class="row"><span>Total Hours:</span> <strong>${payroll.totalHours} hrs</strong></div>
              <div class="row"><span>Base Salary:</span> <strong>$${payroll.base_salary}</strong></div>
              <div class="row"><span>Overtime/Bonus:</span> <strong>+$${payroll.bonus}</strong></div>
              <div class="row"><span>Deductions:</span> <strong>-$${payroll.deduction}</strong></div>
              <div class="row total"><span>NET PAY:</span> <span>$${payroll.netPay}</span></div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Maamulka Mushaharka</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Xisaabin Toos ah (10saac/Maalin + Saacado Dheeri ah)</p>
        </div>
        
        <div className="flex gap-4">
          <select className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={resetAllPayrollStatus} disabled={isProcessing || payrolls.length === 0} className="bg-amber-100 text-amber-700 px-6 py-3.5 rounded-2xl font-black shadow-sm hover:bg-amber-200 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            DIB U FUR DHAMAAN
          </button>
          <button onClick={processPayroll} disabled={isProcessing} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            {isProcessing ? 'WAA LA XISAABINAYAA...' : 'XISAABI MUSHAHARKA'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <th className="px-10 py-6">Shaqaalaha</th>
              <th className="px-10 py-6">Saacadaha (Wadarta)</th>
              <th className="px-10 py-6">Mushaharka Aasaasiga</th>
              <th className="px-10 py-6">Mushaharka Net-ka</th>
              <th className="px-10 py-6">Xaaladda</th>
              <th className="px-10 py-6 text-right">Falalka</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payrolls.map(pay => {
              const emp = employees.find(e => e.id === pay.employeeId);
              return (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-4 font-black text-slate-700">{emp?.name}</td>
                  <td className="px-10 py-4 font-black text-slate-600">{pay.totalHours}h</td>
                  <td className="px-10 py-4 font-bold text-slate-400">${pay.base_salary}</td>
                  <td className="px-10 py-4">
                    <span className="text-lg font-black text-emerald-600">${pay.netPay}</span>
                    {pay.bonus > 0 && <span className="text-[9px] text-emerald-500 font-bold block">Inc. OT: +${pay.bonus}</span>}
                  </td>
                  <td className="px-10 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {pay.status === 'PAID' ? 'LA BIXIYAY' : 'LAMA BIXIN'}
                    </span>
                  </td>
                  <td className="px-10 py-4 text-right">
                    <button onClick={() => printPayslip(pay)} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white transition-all" title="Print Payslip">🖨️</button>
                    {pay.status === 'UNPAID' ? (
                        <button onClick={() => markAsPaid(pay)} className="ml-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">BIXI</button>
                    ) : (
                        <button onClick={() => resetPayrollStatus(pay)} className="ml-2 bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-200">DIB U FUR</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRMPayroll;
