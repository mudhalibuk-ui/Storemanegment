
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'PAYROLL' | 'DOCS' | 'LEAVE'>('ATTENDANCE');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [newDoc, setNewDoc] = useState({ title: '', notes: '' });
  const [newLeave, setNewLeave] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    API.documents.getAll(employee.id).then(setDocuments);
    API.leaves.getAll().then(data => setLeaves(data.filter(l => l.employeeId === employee.id)));
  }, [employee.id]);

  // Month mapping for sorting
  const monthMap: { [key: string]: number } = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
  };

  // --- 1. PROCESS ATTENDANCE (Strict Deduplication & Merging) ---
  const processedAttendanceMap = new Map<string, any>();
  const rawEmpAttendance = attendance.filter(a => a.employeeId === employee.id);

  rawEmpAttendance.forEach(record => {
      // Use substring for safer, strictly string-based date grouping (YYYY-MM-DD)
      const dateKey = record.date ? record.date.substring(0, 10) : '';
      if (!dateKey) return;

      const existing = processedAttendanceMap.get(dateKey);

      if (!existing) {
          processedAttendanceMap.set(dateKey, { ...record, date: dateKey });
      } else {
          // Merge Logic: Best Status & Widest Time Range
          let status = existing.status;
          
          // Priority: PRESENT > LATE > LEAVE > ABSENT
          if (record.status === 'PRESENT') status = 'PRESENT';
          else if (record.status === 'LATE' && status !== 'PRESENT') status = 'LATE';
          else if (record.status === 'LEAVE' && status === 'ABSENT') status = 'LEAVE';
          
          // Merge Times (Earliest IN, Latest OUT)
          const getTs = (d: string | undefined) => d ? new Date(d).getTime() : null;
          
          const tIn = getTs(record.clockIn);
          const eIn = getTs(existing.clockIn);
          const bestIn = (tIn && eIn) ? Math.min(tIn, eIn) : (tIn || eIn);
          
          const tOut = getTs(record.clockOut);
          const eOut = getTs(existing.clockOut);
          const bestOut = (tOut && eOut) ? Math.max(tOut, eOut) : (tOut || eOut);

          processedAttendanceMap.set(dateKey, {
              ...existing,
              status,
              clockIn: bestIn ? new Date(bestIn).toISOString() : null,
              clockOut: bestOut ? new Date(bestOut).toISOString() : null
          });
      }
  });

  const empAttendance = Array.from(processedAttendanceMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // PAYROLL HISTORY
  const empPayrolls = payrolls
    .filter(p => p.employeeId === employee.id)
    .sort((a, b) => {
        const yearDiff = b.year - a.year;
        if (yearDiff !== 0) return yearDiff;
        return (monthMap[b.month] || 0) - (monthMap[a.month] || 0);
    });

  const branch = branches.find(b => b.id === employee.branchId)?.name || 'N/A';
  
  // --- CALCULATIONS (CURRENT MONTH) --- //
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleString('default', { month: 'long' });
  
  let hoursWorkedThisMonth = 0;
  let totalScore = 0;
  let countableDays = 0;

  empAttendance.forEach(a => {
      const d = new Date(a.date);
      // Only process current month records
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          // Scoring
          if (a.status === 'PRESENT') { totalScore += 100; countableDays++; }
          else if (a.status === 'LATE') { totalScore += 50; countableDays++; }
          else if (a.status === 'ABSENT') { totalScore += 0; countableDays++; }

          // Hours Calculation
          if (a.clockIn && a.clockOut) {
              const start = new Date(a.clockIn).getTime();
              const end = new Date(a.clockOut).getTime();
              const hours = (end - start) / (1000 * 60 * 60);
              if (hours > 0 && hours < 24) {
                  hoursWorkedThisMonth += hours;
              }
          }
      }
  });

  const performanceScore = countableDays > 0 ? Math.round(totalScore / countableDays) : 100;
  
  // Payroll Estimation (Based on 300h/month standard)
  const standardHours = 300; 
  const hourlyRate = (employee.salary || 0) / standardHours;
  const accruedSalary = Math.floor(hoursWorkedThisMonth * hourlyRate);
  const paidMonthsCount = empPayrolls.filter(p => p.status === 'PAID').length;

  // --- LEAVE & FRIDAY CALCULATION ---
  const getFridaysCount = (year: number, month: number) => {
      let count = 0;
      const date = new Date(year, month, 1);
      while (date.getMonth() === month) {
          if (date.getDay() === 5) count++; // 5 is Friday
          date.setDate(date.getDate() + 1);
      }
      return count;
  };
  const fridaysThisMonth = getFridaysCount(currentYear, currentMonth);

  // Calculate approved leaves days in current month
  const leavesThisMonth = leaves.filter(l => {
      const d = new Date(l.startDate);
      return l.status === 'APPROVED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const leaveDaysCount = leavesThisMonth.reduce((acc, curr) => {
      const start = new Date(curr.startDate);
      const end = new Date(curr.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + (isNaN(diff) ? 0 : diff);
  }, 0);

  let attStatusMsg = "Xog Ma Jirto (No Data)";
  let attStatusColor = "bg-slate-100 text-slate-500 border-slate-200";
  let attEmoji = "⚪";

  if (countableDays > 0) {
      if (performanceScore >= 90) { 
          attStatusMsg = "Aad u Wanaagsan (Excellent)"; 
          attStatusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
          attEmoji = "🌟";
      } else if (performanceScore >= 70) { 
          attStatusMsg = "Wanaagsan (Good)"; 
          attStatusColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
          attEmoji = "👍";
      } else { 
          attStatusMsg = "Liita / Wuxuu u baahan yahay sixid"; 
          attStatusColor = "bg-rose-50 text-rose-700 border-rose-100";
          attEmoji = "⚠️";
      }
  } else {
      attStatusMsg = "Bishan Cusub (No Records Yet)";
      attStatusColor = "bg-slate-50 text-slate-500 border-slate-200";
      attEmoji = "📅";
  }

  // Safe Date Formatting
  const formatListDate = (dateStr: string) => {
      try {
          return new Date(dateStr).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return dateStr; }
  };

  // Helper: Format Time Duration
  const getDuration = (start?: string, end?: string) => {
      if (!start || !end) return null;
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const diffMs = e - s;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
  };

  const handleAddDocument = async () => {
    if (!newDoc.title) return;
    await API.documents.save({ 
        employeeId: employee.id, 
        title: newDoc.title, 
        type: 'NOTE', 
        notes: newDoc.notes,
        uploadDate: new Date().toISOString()
    });
    // refresh docs
    API.documents.getAll(employee.id).then(setDocuments);
    setNewDoc({ title: '', notes: '' });
  };

  const handleRequestLeave = async () => {
    if (!newLeave.startDate || !newLeave.endDate) return;
    await API.leaves.save({
        employeeId: employee.id,
        type: newLeave.type as any,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason,
        status: 'APPROVED'
    });
    // refresh leaves
    API.leaves.getAll().then(data => setLeaves(data.filter(l => l.employeeId === employee.id)));
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
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance ({monthName})</p>
             <div className={`text-3xl font-black ${performanceScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{performanceScore}%</div>
             <p className="text-[8px] text-slate-500">Monthly Score</p>
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
                    {/* ATTENDANCE STATUS CARD (THIS MONTH) */}
                    <div className={`p-6 rounded-[2.5rem] border text-center relative overflow-hidden ${attStatusColor}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl grayscale">{attEmoji}</div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Warbixinta Bisha ({monthName})</p>
                        <h3 className="text-2xl font-black mt-2">{attStatusMsg}</h3>
                        <p className="text-xs font-bold mt-1 opacity-75">Heerka Joogitaanka (Score): {performanceScore}%</p>
                    </div>

                    {/* Leave & Friday Summary in Attendance Tab */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 text-center">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Jimcaha (Off Days)</p>
                            <p className="text-2xl font-black text-emerald-800">{fridaysThisMonth} <span className="text-xs">Maalmood</span></p>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 text-center">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Fasax la Qaatay (Leave)</p>
                            <p className="text-2xl font-black text-amber-800">{leaveDaysCount} <span className="text-xs">Maalmood</span></p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Diiwaanka Maalmihii Hore (History)</h3>
                        
                        {empAttendance.length > 0 ? (
                            empAttendance.map((a, index) => {
                                const dateStr = formatListDate(a.date);
                                // Calculate duration if clockOut exists
                                const duration = getDuration(a.clockIn, a.clockOut);
                                const isMissingOut = a.clockIn && !a.clockOut && a.status === 'PRESENT';

                                // Simple header grouping logic
                                const prev = empAttendance[index - 1];
                                const showHeader = !prev || new Date(a.date).getMonth() !== new Date(prev.date).getMonth();
                                const monthHeader = new Date(a.date).toLocaleString('default', { month: 'long', year: 'numeric' });

                                return (
                                    <React.Fragment key={a.id}>
                                        {showHeader && (
                                            <div className="pt-4 pb-2 px-2">
                                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-50 pb-1">
                                                    {monthHeader}
                                                </h4>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                                            <div className="flex-1">
                                                <p className="font-black text-slate-700">{dateStr}</p>
                                                <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    <span>IN: <span className="text-emerald-600">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'}) : '--:--'}</span></span>
                                                    <span>OUT: <span className={a.clockOut ? "text-rose-600" : "text-amber-500"}>{a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'}) : 'Pending'}</span></span>
                                                </div>
                                            </div>
                                            
                                            {/* DURATION BADGE */}
                                            {duration && (
                                                <div className="mr-4 text-right">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase block tracking-widest">Duration</span>
                                                    <span className="text-xs font-black text-indigo-600">{duration}</span>
                                                </div>
                                            )}

                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                                isMissingOut ? 'bg-amber-50 text-amber-600 animate-pulse' :
                                                a.status==='PRESENT'?'bg-emerald-50 text-emerald-600':
                                                a.status==='ABSENT'?'bg-rose-50 text-rose-600':
                                                a.status==='LATE'?'bg-orange-50 text-orange-600':
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {isMissingOut ? 'No Clock-Out' : a.status}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <p className="text-center text-slate-400 italic py-10">Lama hayo xog hore.</p>
                        )}
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
                    {/* PAYROLL SUMMARY DASHBOARD (REAL-TIME UPDATED) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 text-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Saacadaha La Shaqeeyay</p>
                            <p className="text-3xl font-black text-indigo-700">{hoursWorkedThisMonth.toFixed(1)} <span className="text-sm text-indigo-400">Saacadood</span></p>
                            <p className="text-[8px] text-indigo-300 mt-1">Bishan (Current Month)</p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 text-center">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Lacagta Kuu Soo Hoyatay</p>
                            <p className="text-3xl font-black text-emerald-700">${accruedSalary.toLocaleString()}</p>
                            <p className="text-[8px] text-emerald-300 mt-1">Saldhiga: ${employee.salary}</p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 text-center">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Mushaharka La Qaatay</p>
                            <p className="text-3xl font-black text-amber-700">{paidMonthsCount} <span className="text-sm text-amber-400">Bilood</span></p>
                            <p className="text-[8px] text-amber-300 mt-1">History Total</p>
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
