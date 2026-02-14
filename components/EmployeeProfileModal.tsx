
import React, { useState, useEffect } from 'react';
import { Employee, Attendance, Payroll, Branch, Xarun, LeaveRequest, EmployeeDocument } from '../types';
import { API } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'PAYROLL' | 'DOCS' | 'LEAVE'>('OVERVIEW');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [newDoc, setNewDoc] = useState({ title: '', notes: '' });
  const [newLeave, setNewLeave] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    API.documents.getAll(employee.id).then(setDocuments);
    API.leaves.getAll().then(data => setLeaves(data.filter(l => l.employeeId === employee.id)));
  }, [employee.id]);

  const empAttendance = attendance.filter(a => a.employeeId === employee.id).sort((a, b) => b.date.localeCompare(a.date));
  const empPayrolls = payrolls.filter(p => p.employeeId === employee.id).sort((a, b) => b.year - a.year || b.month.localeCompare(a.month));
  const branch = branches.find(b => b.id === employee.branchId)?.name || 'N/A';
  
  // --- STATS CALCULATIONS --- //
  
  // 1. Attendance Analysis
  const totalRecorded = empAttendance.length;
  const presentRecs = empAttendance.filter(a => a.status === 'PRESENT').length;
  const attendanceRate = totalRecorded ? (presentRecs / totalRecorded) * 100 : 0;
  
  let attStatusMsg = "Xog Ma Jirto (No Data)";
  let attStatusColor = "bg-slate-100 text-slate-500 border-slate-200";
  let attEmoji = "⚪";

  if (totalRecorded > 0) {
      if (attendanceRate >= 90) { 
          attStatusMsg = "Aad u Wanaagsan (Excellent)"; 
          attStatusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
          attEmoji = "🌟";
      } else if (attendanceRate >= 75) { 
          attStatusMsg = "Wanaagsan (Good)"; 
          attStatusColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
          attEmoji = "👍";
      } else { 
          attStatusMsg = "Liita / Wuxuu u baahan yahay sixid"; 
          attStatusColor = "bg-rose-50 text-rose-700 border-rose-100";
          attEmoji = "⚠️";
      }
  }

  // 2. Payroll & Time Logic
  const now = new Date();
  
  // Helper: Count Fridays in current month
  const getFridaysCount = (year: number, month: number) => {
      let count = 0;
      const date = new Date(year, month, 1);
      while (date.getMonth() === month) {
          if (date.getDay() === 5) count++; // 5 is Friday
          date.setDate(date.getDate() + 1);
      }
      return count;
  };
  const currentFridays = getFridaysCount(now.getFullYear(), now.getMonth());

  // Count paid months
  const paidMonthsCount = empPayrolls.filter(p => p.status === 'PAID').length;

  // Calculate approved leaves days in current month
  const leavesThisMonth = leaves.filter(l => {
      const d = new Date(l.startDate);
      return l.status === 'APPROVED' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  const leaveDaysThisMonth = leavesThisMonth.reduce((acc, curr) => {
      const start = new Date(curr.startDate);
      const end = new Date(curr.endDate);
      // Difference in days + 1
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + (isNaN(diff) ? 0 : diff);
  }, 0);


  // Performance Score (Punctuality)
  const calculateScore = () => {
    return Math.round(attendanceRate);
  };

  const handleAddDocument = async () => {
    if (!newDoc.title) return;
    const doc = await API.documents.save({ 
        employeeId: employee.id, 
        title: newDoc.title, 
        type: 'NOTE', 
        notes: newDoc.notes,
        uploadDate: new Date().toISOString()
    });
    setDocuments([...documents, doc]);
    setNewDoc({ title: '', notes: '' });
  };

  const handleRequestLeave = async () => {
    if (!newLeave.startDate || !newLeave.endDate) return;
    const leave = await API.leaves.save({
        employeeId: employee.id,
        type: newLeave.type as any,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason,
        status: 'APPROVED' // Auto approve for admin context
    });
    setLeaves([...leaves, leave]);
    setNewLeave({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[40000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
        
        {/* Professional Header */}
        <div className="bg-slate-900 text-white p-8 flex flex-col md:flex-row items-center gap-8 relative shrink-0">
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-xl">✕</button>
          
          <img src={employee.avatar} className="w-28 h-28 rounded-[2.5rem] border-4 border-white/20 shadow-2xl object-cover" alt={employee.name} />
          
          <div className="text-center md:text-left flex-1">
            <h2 className="text-3xl font-black tracking-tighter">{employee.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 justify-center md:justify-start">
               <span className="bg-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{employee.position}</span>
               <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">{employee.department || 'General'}</span>
               <span className="bg-emerald-500 text-emerald-950 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{employee.status}</span>
            </div>
            <div className="flex gap-6 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>📞 {employee.phone || 'No Phone'}</span>
                <span>📧 {employee.email || 'No Email'}</span>
                <span>🆔 {employee.employeeIdCode}</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance</p>
             <div className="text-3xl font-black text-emerald-400">{calculateScore()}%</div>
             <p className="text-[8px] text-slate-500">Punctuality Score</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-8 gap-6 overflow-x-auto no-scrollbar shrink-0">
            {['OVERVIEW', 'ATTENDANCE', 'PAYROLL', 'LEAVE', 'DOCS'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-5 text-[10px] font-black uppercase tracking-[0.15em] border-b-4 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto no-scrollbar bg-slate-50 flex-1">
            
            {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Job Details</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-sm font-bold text-slate-500">Department</span><span className="font-black text-slate-800">{employee.department || 'N/A'}</span></div>
                            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-sm font-bold text-slate-500">Branch</span><span className="font-black text-slate-800">{branch}</span></div>
                            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-sm font-bold text-slate-500">Joined Date</span><span className="font-black text-slate-800">{employee.joinedDate}</span></div>
                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Base Salary</span><span className="font-black text-emerald-600">${employee.salary}/mo</span></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Shift Schedule</h3>
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                            <p className="text-2xl font-black text-indigo-600">07:00 - 17:00</p>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">Standard Morning Shift</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ATTENDANCE' && (
                <div className="space-y-6">
                    {/* ATTENDANCE STATUS CARD */}
                    <div className={`p-6 rounded-[2.5rem] border text-center relative overflow-hidden ${attStatusColor}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl grayscale">{attEmoji}</div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Warbixinta Iimaanshaha</p>
                        <h3 className="text-2xl font-black mt-2">{attStatusMsg}</h3>
                        <p className="text-xs font-bold mt-1 opacity-75">Heerka Joogitaanka: {Math.round(attendanceRate)}%</p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Diiwaanka Maalmihii Hore</h3>
                        {empAttendance.map(a => (
                            <div key={a.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                                <div>
                                    <p className="font-black text-slate-700">{new Date(a.date).toLocaleDateString()}</p>
                                    <div className="flex gap-3 text-[10px] font-bold text-slate-400 uppercase mt-1">
                                        <span>IN: <span className="text-emerald-600">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span></span>
                                        <span>OUT: <span className="text-rose-600">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span></span>
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${a.status==='PRESENT'?'bg-emerald-50 text-emerald-600':a.status==='ABSENT'?'bg-rose-50 text-rose-600':'bg-amber-50 text-amber-600'}`}>
                                    {a.status}
                                </span>
                            </div>
                        ))}
                        {empAttendance.length === 0 && <p className="text-center text-slate-400 italic py-10">Lama hayo xog hore.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'LEAVE' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Diiwaangali Fasax (Record Leave)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <select className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value})}>
                                <option value="ANNUAL">Annual Leave</option>
                                <option value="SICK">Sick Leave</option>
                                <option value="EMERGENCY">Emergency</option>
                            </select>
                            <input type="date" className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} />
                            <input type="date" className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} />
                            <button onClick={handleRequestLeave} className="bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all">Submit</button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {leaves.map(l => (
                            <div key={l.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-700 text-sm uppercase">{l.type} LEAVE</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{l.startDate} ➔ {l.endDate}</p>
                                </div>
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{l.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'DOCS' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Add Document / Note</h3>
                        <div className="flex gap-4">
                            <input className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="Document Title (e.g. Contract)" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} />
                            <button onClick={handleAddDocument} className="bg-indigo-600 text-white px-6 rounded-xl font-black text-xs uppercase">Save</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map(d => (
                            <div key={d.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start">
                                    <span className="text-2xl">📄</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{new Date(d.uploadDate).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-black text-slate-700 mt-2">{d.title}</h4>
                                {d.notes && <p className="text-xs text-slate-500 mt-1 italic">"{d.notes}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'PAYROLL' && (
                <div className="space-y-6">
                    {/* PAYROLL SUMMARY DASHBOARD */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 text-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Mushaharka La Qaatay</p>
                            <p className="text-3xl font-black text-indigo-700">{paidMonthsCount} <span className="text-sm text-indigo-400">Bilood</span></p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 text-center">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Jimcaha Bisha (Off Days)</p>
                            <p className="text-3xl font-black text-emerald-700">{currentFridays} <span className="text-sm text-emerald-400">Maalmood</span></p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 text-center">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Fasaxa Bisha (This Month)</p>
                            <p className="text-3xl font-black text-amber-700">{leaveDaysThisMonth} <span className="text-sm text-amber-400">Maalmood</span></p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mt-4">History-ga Mushaharka</h3>
                        {empPayrolls.length > 0 ? empPayrolls.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                                <div>
                                    <p className="font-black text-slate-800">{p.month} {p.year}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Hours: {p.totalHours} • {p.status}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-emerald-600 block">${p.netPay}</span>
                                    {p.paymentDate && <span className="text-[8px] font-bold text-slate-300 uppercase">Paid: {new Date(p.paymentDate).toLocaleDateString()}</span>}
                                </div>
                            </div>
                        )) : (
                            <div className="py-10 text-center bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                                <p className="text-xs font-black text-slate-400 uppercase">Weli mushahar lama siin</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
