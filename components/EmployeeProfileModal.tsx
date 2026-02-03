
import React from 'react';
import { Employee, Attendance, Payroll, Branch, Xarun } from '../types';

interface EmployeeProfileModalProps {
  employee: Employee;
  attendance: Attendance[];
  payrolls: Payroll[];
  branches: Branch[];
  xarumo: Xarun[];
  onClose: () => void;
}

const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({ 
  employee, attendance, payrolls, branches, xarumo, onClose 
}) => {
  const empAttendance = attendance.filter(a => a.employeeId === employee.id).sort((a, b) => b.date.localeCompare(a.date));
  const empPayrolls = payrolls.filter(p => p.employeeId === employee.id).sort((a, b) => b.year - a.year || b.month.localeCompare(a.month));
  const branch = branches.find(b => b.id === employee.branchId)?.name || 'N/A';
  const xarun = xarumo.find(x => x.id === employee.xarunId)?.name || 'N/A';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[40000] flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 my-auto print:shadow-none print:rounded-none print:max-w-full">
        
        {/* Header - Hidden on Print or specialized for print */}
        <div className="bg-indigo-600 p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white print:hidden">✕</button>
          
          <img src={employee.avatar} className="w-32 h-32 rounded-[2.5rem] border-4 border-white/20 shadow-2xl relative z-10" alt={employee.name} />
          
          <div className="text-center md:text-left relative z-10 flex-1">
            <h2 className="text-4xl font-black tracking-tighter">{employee.name}</h2>
            <p className="text-indigo-200 font-black uppercase tracking-[0.2em] mt-1">{employee.position} • {employee.employeeIdCode}</p>
            <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
               <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">📍 {xarun}</span>
               <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">🏢 {branch}</span>
               <span className="bg-emerald-400 text-emerald-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{employee.status}</span>
            </div>
          </div>

          <button 
            onClick={handlePrint}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest print:hidden"
          >
            🖨️ Print Profile
          </button>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Attendance History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Iimaanshaha (Attendance History)</h3>
               <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg">{empAttendance.length} Records</span>
            </div>
            <div className="max-h-96 overflow-y-auto no-scrollbar space-y-3">
              {empAttendance.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-black text-slate-700">{new Date(a.date).toLocaleDateString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString() : '--:--'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-600' : 
                    a.status === 'ABSENT' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
              {empAttendance.length === 0 && (
                <div className="py-10 text-center text-slate-300 italic text-sm">Ma jiro wax diiwaan iimaan ah.</div>
              )}
            </div>
          </div>

          {/* Payroll History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mushaharka (Payroll History)</h3>
               <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">${empPayrolls.reduce((sum, p) => sum + p.netPay, 0)} Total</span>
            </div>
            <div className="max-h-96 overflow-y-auto no-scrollbar space-y-3">
              {empPayrolls.map(p => (
                <div key={p.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                   <div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{p.month} {p.year}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Status: {p.status}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-indigo-600">${p.netPay}</p>
                      <p className="text-[8px] font-bold text-slate-300 uppercase">Paid: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'Pending'}</p>
                   </div>
                </div>
              ))}
              {empPayrolls.length === 0 && (
                <div className="py-10 text-center text-slate-300 italic text-sm">Ma jiro wax diiwaan mushahar ah.</div>
              )}
            </div>
          </div>

        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center print:hidden">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">SmartStock Pro HRM Suite • Internal Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
