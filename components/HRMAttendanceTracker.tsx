
import React, { useState, useEffect } from 'react';
import { Employee, Attendance, Xarun } from '../types';
import { API } from '../services/api';
import BiometricScanModal from './BiometricScanModal';

interface HRMAttendanceTrackerProps {
  employees: Employee[];
  xarumo: Xarun[];
  hardwareUrl?: string;
  zkIp?: string;
  zkPort?: number;
}

const HRMAttendanceTracker: React.FC<HRMAttendanceTrackerProps> = ({ 
  employees, xarumo, hardwareUrl, zkIp, zkPort 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedXarunId, setSelectedXarunId] = useState<string>('all');
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const loadAttendance = async () => {
    setLoading(true);
    const data = await API.attendance.getByDate(selectedDate);
    setAttendanceData(data);
    setLoading(false);
  };

  const syncLogsFromDevice = async () => {
    if (!hardwareUrl || !zkIp) {
      alert("Cilad: Hardware connection-ka ma fadhido. Hubi Settings.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`${hardwareUrl}/zk/logs?ip=${zkIp}&port=${zkPort || 4370}`);
      if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
      
      const deviceLogs = await response.json();
      if (!Array.isArray(deviceLogs)) throw new Error("Format-ka logs-ka waa qaldan yahay.");

      if (deviceLogs.length === 0) {
        alert("Ma jiraan wax faro-faraysi ah (Logs) oo hadda qalabka ku jira.");
        return;
      }

      let importedLogs = 0;
      for (const log of deviceLogs) {
        const emp = employees.find(e => e.employeeIdCode === log.userId.toString());
        if (emp) {
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          const existingForDay = await API.attendance.getByDate(logDate);
          const alreadyMarked = existingForDay.some(a => a.employeeId === emp.id);

          if (!alreadyMarked) {
            await API.attendance.save({
              employeeId: emp.id,
              date: logDate,
              status: 'PRESENT',
              clockIn: log.timestamp,
              notes: 'ZK Auto-Sync'
            });
            importedLogs++;
          }
        }
      }
      
      alert(`Sync Complete! Waxaan helnay ${deviceLogs.length} logs. ${importedLogs} check-ins cusub ayaa la galiyay database-ka.`);
      loadAttendance();
    } catch (err) {
      console.error("Attendance Sync Error:", err);
      alert(`CILAD SYNC LOGS: ${err instanceof Error ? err.message : 'Unknown'}\n\nHaddii ay tiraahdo "Failed to fetch", fadlan guji badanka "Open Bridge Status" ee Settings si aad u fasaxdo xiriirka Browser-ka.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const markAttendance = async (empId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE') => {
    const existing = attendanceData.find(a => a.employeeId === empId);
    const newRecord: Partial<Attendance> = {
      id: existing?.id,
      employeeId: empId,
      date: selectedDate,
      status: status,
      clockIn: status === 'PRESENT' ? new Date().toISOString() : undefined
    };
    await API.attendance.save(newRecord);
    loadAttendance();
  };

  const handleBiometricMatch = (emp: Employee) => {
    markAttendance(emp.id, 'PRESENT');
    setShowBiometric(false);
  };

  const filteredEmployees = employees.filter(emp => 
    selectedXarunId === 'all' || emp.xarunId === selectedXarunId
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Iimaanshaha Shaqaalaha</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Calaamadi iimaanshaha xarun kasta.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={syncLogsFromDevice}
              disabled={isSyncing}
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-600 transition-all items-center gap-3 uppercase text-[10px] tracking-widest disabled:opacity-50"
            >
              {isSyncing ? '🔄 Syncing...' : '📥 Sync Logs from ZK'}
            </button>
            <button 
              onClick={() => setShowBiometric(true)}
              className={`hidden md:flex px-6 py-4 rounded-2xl font-black shadow-lg transition-all items-center gap-3 uppercase text-[10px] tracking-widest ${zkIp ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white'}`}
            >
              <span>☝️</span> {zkIp ? `Fingerprint Scan` : 'Clock-in'}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Wadarta Shaqaalaha', value: filteredEmployees.length, color: 'text-slate-600' },
          { label: 'Jooga (Present)', value: attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'PRESENT').length, color: 'text-emerald-600' },
          { label: 'Maqan (Absent)', value: attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'ABSENT').length, color: 'text-rose-600' },
          { label: 'Dahahay (Late)', value: attendanceData.filter(a => filteredEmployees.some(e => e.id === a.employeeId) && a.status === 'LATE').length, color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-6">Shaqaalaha</th>
                <th className="px-10 py-6">Xarunta</th>
                <th className="px-10 py-6 text-center">Xaaladda (Status)</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map(emp => {
                const record = attendanceData.find(a => a.employeeId === emp.id);
                const empXarun = xarumo.find(x => x.id === emp.xarunId)?.name || 'N/A';
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-4">
                      <div className="flex items-center gap-4">
                        <img src={emp.avatar} className="w-10 h-10 rounded-xl shadow-sm border border-slate-100" alt="" />
                        <div>
                          <span className="font-black text-slate-700 block">{emp.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.employeeIdCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-4">
                      <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg uppercase">
                        {empXarun}
                      </span>
                    </td>
                    <td className="px-10 py-4 text-center">
                      {record ? (
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' :
                          record.status === 'ABSENT' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {record.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic">Sugaya...</span>
                      )}
                    </td>
                    <td className="px-10 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => markAttendance(emp.id, 'PRESENT')} 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${record?.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                          title="Present"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => markAttendance(emp.id, 'ABSENT')} 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${record?.status === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'}`}
                          title="Absent"
                        >
                          ❌
                        </button>
                        <button 
                          onClick={() => markAttendance(emp.id, 'LATE')} 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${record?.status === 'LATE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'}`}
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

      {showBiometric && (
        <BiometricScanModal 
          employees={employees} 
          hardwareUrl={hardwareUrl}
          zkConfig={{ ip: zkIp, port: zkPort }}
          onMatch={handleBiometricMatch} 
          onCancel={() => setShowBiometric(false)}
          title="Attendance Clock-In"
        />
      )}
    </div>
  );
};

export default HRMAttendanceTracker;
