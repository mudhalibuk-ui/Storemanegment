
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
    
    // 1. Fetch ALL attendance (this might be heavy, ideally filter by date range in API)
    const allAttendance = await API.attendance.getAll();
    
    // 2. Filter attendance for selected month/year
    const monthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth();
    const targetAttendance = allAttendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
    });

    for (const emp of employees) {
      const existing = payrolls.find(p => p.employeeId === emp.id);
      
      // Calculate Total Hours Worked
      const empLogs = targetAttendance.filter(a => a.employeeId === emp.id);
      let totalWorkedHours = 0;

      empLogs.forEach(log => {
          // Regular Shift
          if (log.clockIn && log.clockOut) {
              totalWorkedHours += calculateHours(log.clockIn, log.clockOut);
          }
          // Overtime
          if (log.overtimeIn && log.overtimeOut) {
              totalWorkedHours += calculateHours(log.overtimeIn, log.overtimeOut);
          }
          // If Present but forgot punch out, assume Standard 10h? Or 0? Let's assume 0 for accuracy or maybe 8.
          // For strict hourly pay, we need both punches.
      });

      // Standard Monthly Hours (10 hours * 30 days)
      const STANDARD_MONTHLY_HOURS = 300; 
      
      // Calculate Hourly Rate
      const hourlyRate = emp.salary / STANDARD_MONTHLY_HOURS;
      
      // Calculate Net Pay based on Actual Worked Hours
      const calculatedNetPay = Math.round(totalWorkedHours * hourlyRate);

      if (!existing) {
        const newPay: Partial<Payroll> = {
          employeeId: emp.id,
          month: selectedMonth,
          year: selectedYear,
          base_salary: emp.salary,
          bonus: 0,
          deduction: 0,
          netPay: calculatedNetPay, // Pay based on time
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
                 netPay: calculatedNetPay + existing.bonus - existing.deduction
             });
          }
      }
    }
    await loadPayrollData();
    setIsProcessing(false);
  };

  const markAsPaid = async (payroll: Payroll) => {
    await API.payroll.save({ ...payroll, status: 'PAID', paymentDate: new Date().toISOString() });
    loadPayrollData();
  };

  const printPayslip = (payroll: Payroll) => {
    const emp = employees.find(e => e.id === payroll.employeeId);
    const xarun = xarumo.find(x => x.id === emp?.xarunId)?.name || 'N/A';
    
    const printWindow = window.open('', '_blank');
    if (printWindow && emp) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${emp.name}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; }
              .slip { border: 2px solid #000; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }
              .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .total { font-weight: 900; font-size: 20px; margin-top: 20px; background: #f8fafc; padding: 15px; }
              .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="slip">
              <div class="header">
                <h1>SmartStock Pro - PAYSLIP</h1>
                <p>${payroll.month} ${payroll.year} - ${xarun}</p>
              </div>
              <div class="row"><span>Employee Name:</span> <strong>${emp.name}</strong></div>
              <div class="row"><span>Employee ID:</span> <strong>${emp.employeeIdCode}</strong></div>
              <div class="row"><span>Position:</span> <strong>${emp.position}</strong></div>
              <div class="row"><span>Base Salary (Contract):</span> <strong>$${payroll.base_salary}</strong></div>
              <div class="row"><span>Hours Worked:</span> <strong>${payroll.totalHours || 0} hrs</strong></div>
              <div class="row"><span>Standard Hours:</span> <strong>300 hrs</strong></div>
              <div class="row"><span>Bonuses:</span> <strong>$${payroll.bonus}</strong></div>
              <div class="row"><span>Deductions:</span> <strong style="color:red">-$${payroll.deduction}</strong></div>
              <div class="total"><div class="row"><span>NET PAY:</span> <span>$${payroll.netPay}</span></div></div>
              <div class="footer">OFFICIAL SALARY RECEIPT - BASED ON HOURLY ATTENDANCE</div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
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
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Maamulka Mushaharka (Payroll)</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Mushaharka waxaa lagu xisaabiyaa saacadaha (10h/Day).</p>
        </div>
        
        <div className="flex gap-4">
          <select className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={processPayroll} disabled={isProcessing} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            {isProcessing ? 'CALCULATING HOURS...' : 'PROCESS HOURLY PAYROLL'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <th className="px-10 py-6">Shaqaalaha</th>
              <th className="px-10 py-6">Saacadaha (Worked)</th>
              <th className="px-10 py-6">Mushaharka (Base)</th>
              <th className="px-10 py-6">Net Pay (Calculated)</th>
              <th className="px-10 py-6">Xaaladda</th>
              <th className="px-10 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payrolls.map(pay => {
              const emp = employees.find(e => e.id === pay.employeeId);
              const percentWorked = pay.totalHours ? Math.min(100, Math.round((pay.totalHours / 300) * 100)) : 0;
              
              return (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-4">
                    <div className="flex items-center gap-4">
                      <img src={emp?.avatar} className="w-10 h-10 rounded-xl" alt="" />
                      <div>
                        <p className="font-black text-slate-700">{emp?.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{emp?.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-4">
                     <span className="font-black text-slate-700 block">{pay.totalHours || 0} hrs</span>
                     <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentWorked}%` }}></div>
                     </div>
                     <span className="text-[8px] font-bold text-slate-400">{percentWorked}% of 300h</span>
                  </td>
                  <td className="px-10 py-4 font-bold text-slate-400 line-through decoration-rose-400">${pay.base_salary}</td>
                  <td className="px-10 py-4">
                    <span className="text-lg font-black text-emerald-600">${pay.netPay}</span>
                    {(pay.bonus > 0 || pay.deduction > 0) && (
                        <div className="flex text-[8px] font-black gap-2">
                            {pay.bonus > 0 && <span className="text-emerald-500">+{pay.bonus} Bonus</span>}
                            {pay.deduction > 0 && <span className="text-rose-500">-{pay.deduction} Ded</span>}
                        </div>
                    )}
                  </td>
                  <td className="px-10 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-10 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => printPayslip(pay)} className="p-3 bg-slate-50 text-slate-500 rounded-xl shadow-sm hover:bg-slate-900 hover:text-white transition-all">🖨️</button>
                      {pay.status === 'UNPAID' && (
                        <button onClick={() => markAsPaid(pay)} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">MARK PAID</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payrolls.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest">
             <p>Lama hayo xogta mushaharka ee bishan.</p>
             <button onClick={processPayroll} className="mt-4 text-indigo-500 underline text-xs">Riix halkan si aad u xisaabiso</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRMPayroll;
