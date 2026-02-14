
import React, { useState, useEffect } from 'react';
import { Employee, Attendance, Xarun } from '../types';
import { API } from '../services/api';

interface HRMAttendanceTrackerProps {
  employees: Employee[];
  xarumo: Xarun[];
  hardwareUrl?: string; // New prop for status checking
}

const HRMAttendanceTracker: React.FC<HRMAttendanceTrackerProps> = ({ 
  employees, xarumo, hardwareUrl
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedXarunId, setSelectedXarunId] = useState<string>('all');
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Status State
  const [serviceStatus, setServiceStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 10000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Status Polling
  useEffect(() => {
    if (!hardwareUrl) {
      setServiceStatus('OFFLINE');
      return;
    }
    
    const checkService = async () => {
        try {
            const res = await fetch(`${hardwareUrl}/`); // The Flask route '/' returns JSON status
            if(res.ok) setServiceStatus('ONLINE');
            else setServiceStatus('OFFLINE');
        } catch { 
            setServiceStatus('OFFLINE'); 
        }
    }
    
    checkService();
    const timer = setInterval(checkService, 5000); // Check every 5s
    return () => clearInterval(timer);
  }, [hardwareUrl]);

  const fetchLogs = async () => {
    if (!hardwareUrl) return;
    setLogsLoading(true);
    try {
        const res = await fetch(`${hardwareUrl}/logs`);
        const data = await res.json();
        setServiceLogs(data.logs || []);
    } catch (e) {
        console.error(e);
        setServiceLogs(["Failed to fetch logs. Service might be down."]);
    } finally {
        setLogsLoading(false);
    }
  };

  const triggerAbsentCheck = async () => {
    if (!hardwareUrl) return;
    if (!confirm("Ma hubtaa inaad hada socodsiiso 'Absent Check'?\nTani waxay ABSENT ka dhigaysaa cid kasta oo aan imaan maanta.")) return;
    
    try {
        const res = await fetch(`${hardwareUrl}/trigger-absent`, { method: 'POST' });
        if(res.ok) {
            alert("Amar waa la diray! Hubi Logs-ka.");
            fetchLogs();
            setTimeout(loadAttendance, 2000); // Reload data after a moment
        } else {
            alert("Khalad ayaa dhacay markii la dirayay amarka.");
        }
    } catch(e) {
        alert("Cilad xiriirka server-ka.");
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    const data = await API.attendance.getByDate(selectedDate);
    setAttendanceData(data);
    setLoading(false);
  };

  const markAttendance = async (empId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE') => {
    const existing = attendanceData.find(a => a.employeeId === empId);
    const newRecord: Partial<Attendance> = {
      id: existing?.id,
      employeeId: empId,
      date: selectedDate,
      status: status,
      clockIn: status === 'PRESENT' && !existing?.clockIn ? new Date().toISOString() : existing?.clockIn,
      notes: 'Manual Entry'
    };
    await API.attendance.save(newRecord);
    loadAttendance();
  };

  const filteredEmployees = employees.filter(emp => 
    selectedXarunId === 'all' || emp.xarunId === selectedXarunId
  );

  const presentCount = attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'PRESENT').length;
  const absentCount = attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'ABSENT').length;
  const lateCount = attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'LATE').length;
  const pendingCount = filteredEmployees.length - (presentCount + absentCount + lateCount);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">📝</div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Manual Attendance</h2>
            
            {/* Status Indicator with Click Handler */}
            <div 
                className="flex items-center gap-2 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => { setShowLogsModal(true); fetchLogs(); }}
                title="Click to view logs"
            >
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Service Status:</p>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${serviceStatus === 'ONLINE' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className={`w-2 h-2 rounded-full ${serviceStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    <span className={`text-[9px] font-black uppercase ${serviceStatus === 'ONLINE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {serviceStatus === 'ONLINE' ? 'ONLINE (CLICK FOR LOGS)' : 'OFFLINE (CHECK SCRIPT)'}
                    </span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <button 
            onClick={() => loadAttendance()}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-2"
            title="Refresh Data"
          >
            <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>🔄</span>
          </button>

          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Xarunta (Center)</label>
            <select 
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm cursor-pointer"
              value={selectedXarunId}
              onChange={e => setSelectedXarunId(e.target.value)}
            >
              <option value="all">Dhammaan Xarumaha</option>
              {xarumo.map(x => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Taariikhda (Date)</label>
            <input 
              type="date" 
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SERVICE LOGS MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[50000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">System Logs & Diagnostics</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Python Bridge Status: {serviceStatus}</p>
                    </div>
                    <button onClick={() => setShowLogsModal(false)} className="text-white/70 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 bg-black text-green-400 font-mono text-xs overflow-y-auto flex-1 space-y-1 h-96">
                    {logsLoading ? (
                        <p className="animate-pulse">Loading logs from server...</p>
                    ) : serviceLogs.length > 0 ? (
                        serviceLogs.map((log, idx) => <div key={idx} className="border-b border-white/10 pb-1 mb-1">{log}</div>)
                    ) : (
                        <p className="text-slate-500 italic">No logs available or service offline.</p>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={fetchLogs} 
                        className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        🔄 Refresh Logs
                    </button>
                    <button 
                        onClick={triggerAbsentCheck} 
                        className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
                    >
                        ⚡ Run "Absent" Check Now
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Shaqaalaha</p>
            <p className="text-2xl font-black text-slate-600">{filteredEmployees.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jooga (Present)</p>
            <p className="text-2xl font-black text-emerald-600">{presentCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Maqan (Absent)</p>
            <p className="text-2xl font-black text-rose-600">{absentCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dahahay (Late)</p>
            <p className="text-2xl font-black text-amber-600">{lateCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center relative overflow-hidden">
            {pendingCount > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>}
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lama Calaamadin</p>
            <p className="text-2xl font-black text-slate-300">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-6">Shaqaalaha</th>
                <th className="px-6 py-6 text-center">Clock In</th>
                <th className="px-6 py-6 text-center">Clock Out</th>
                <th className="px-6 py-6 text-center bg-indigo-50/30">OT In</th>
                <th className="px-6 py-6 text-center bg-indigo-50/30">OT Out</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-6 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map(emp => {
                const record = attendanceData.find(a => a.employeeId === emp.id);
                const empXarun = xarumo.find(x => x.id === emp.xarunId)?.name || 'N/A';
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} className="w-8 h-8 rounded-lg shadow-sm border border-slate-100" alt="" />
                        <div>
                          <span className="font-black text-slate-700 block text-xs">{emp.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{empXarun}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-emerald-600">
                      {formatTime(record?.clockIn)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-rose-600">
                      {formatTime(record?.clockOut)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">
                      {formatTime(record?.overtimeIn)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">
                      {formatTime(record?.overtimeOut)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record ? (
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' :
                          record.status === 'ABSENT' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {record.status}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase italic">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => markAttendance(emp.id, 'PRESENT')} 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95 ${record?.status === 'PRESENT' ? 'bg-emerald-600 text-white ring-2 ring-emerald-100' : 'bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-50'}`}
                          title="Present"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => markAttendance(emp.id, 'ABSENT')} 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95 ${record?.status === 'ABSENT' ? 'bg-rose-600 text-white ring-2 ring-rose-100' : 'bg-white border border-slate-100 text-rose-600 hover:bg-rose-50'}`}
                          title="Absent"
                        >
                          ❌
                        </button>
                        <button 
                          onClick={() => markAttendance(emp.id, 'LATE')} 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95 ${record?.status === 'LATE' ? 'bg-amber-600 text-white ring-2 ring-amber-100' : 'bg-white border border-slate-100 text-amber-600 hover:bg-amber-50'}`}
                          title="Late"
                        >
                          ⏰
                        </button>
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

export default HRMAttendanceTracker;
