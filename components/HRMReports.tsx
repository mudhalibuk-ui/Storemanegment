
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Employee, Attendance, Payroll, Xarun } from '../types';

interface HRMReportsProps {
  employees: Employee[];
  attendance: Attendance[];
  payrolls: Payroll[];
  xarumo: Xarun[];
}

const HRMReports: React.FC<HRMReportsProps> = ({ employees, attendance, payrolls, xarumo }) => {
  
  // 1. Attendance Data for Today
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentCount = todayAttendance.filter(a => a.status === 'PRESENT').length;
  const absentCount = todayAttendance.filter(a => a.status === 'ABSENT').length;
  const lateCount = todayAttendance.filter(a => a.status === 'LATE').length;
  const otherCount = employees.length - todayAttendance.length;

  const attendancePieData = [
    { name: 'Yimid', value: presentCount, color: '#10b981' },
    { name: 'Maqan', value: absentCount, color: '#ef4444' },
    { name: 'Dahahay', value: lateCount, color: '#f59e0b' },
    { name: 'Aan la calaamadin', value: otherCount, color: '#e2e8f0' },
  ];

  // 2. Payroll Summary per Xarun
  const payrollPerXarun = xarumo.map(x => {
    const xarunPayrolls = payrolls.filter(p => p.xarunId === x.id);
    const total = xarunPayrolls.reduce((sum, p) => sum + p.netPay, 0);
    return { name: x.name, amount: total };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Print Action */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Warbixinta Shaqaalaha (HR Reports)</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Falanqaynta Iimaanshaha iyo Mushaharka.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
        >
          <span>🖨️</span> Print Full Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Pie Chart */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Iimaanshaha Maanta (Today's Attendance)</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendancePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
               {attendancePieData.map(d => (
                 <div key={d.name} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase">{d.name}: {d.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Payroll Bar Chart */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Kharashka Mushaharka (Payroll by Center)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollPerXarun}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Diiwaanka Iimaanshaha ee Maanta</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-6">Shaqaalaha</th>
                <th className="px-10 py-6">Xarunta</th>
                <th className="px-10 py-6">Waqtiga (In)</th>
                <th className="px-10 py-6">Xaaladda</th>
                <th className="px-10 py-6 text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map(emp => {
                const record = todayAttendance.find(a => a.employeeId === emp.id);
                const xarun = xarumo.find(x => x.id === emp.xarunId)?.name || 'N/A';
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-4">
                      <span className="font-black text-slate-700">{emp.name}</span>
                    </td>
                    <td className="px-10 py-4 text-xs font-bold text-slate-400 uppercase">{xarun}</td>
                    <td className="px-10 py-4 font-mono text-xs text-slate-600">
                      {record?.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '--:--'}
                    </td>
                    <td className="px-10 py-4">
                       {record ? (
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                         }`}>
                           {record.status}
                         </span>
                       ) : <span className="text-slate-300 italic text-[10px]">Lama calaamadin</span>}
                    </td>
                    <td className="px-10 py-4 text-right text-xs text-slate-400 italic">{record?.notes || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Payroll Table for Printing */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden print:mt-10">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Warbixinta Mushaharka (Net Payments)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-6">Shaqaalaha</th>
                <th className="px-10 py-6">Bisha</th>
                <th className="px-10 py-6">Base Salary</th>
                <th className="px-10 py-6">Net Pay</th>
                <th className="px-10 py-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payrolls.slice(0, 10).map(pay => {
                const emp = employees.find(e => e.id === pay.employeeId);
                return (
                  <tr key={pay.id}>
                    <td className="px-10 py-4 font-black text-slate-700">{emp?.name}</td>
                    <td className="px-10 py-4 text-xs font-bold text-slate-400 uppercase">{pay.month} {pay.year}</td>
                    <td className="px-10 py-4 text-xs font-bold text-slate-600">${pay.base_salary}</td>
                    <td className="px-10 py-4 text-sm font-black text-indigo-600">${pay.netPay}</td>
                    <td className="px-10 py-4 text-right">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                         pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                       }`}>
                         {pay.status}
                       </span>
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

export default HRMReports;
