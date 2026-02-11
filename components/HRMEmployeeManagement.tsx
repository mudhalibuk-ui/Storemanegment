
import React, { useState } from 'react';
import { Employee, Branch, Xarun, Attendance, Payroll } from '../types';
import QRCode from 'qrcode';
import EmployeeProfileModal from './EmployeeProfileModal';
import BiometricScanModal from './BiometricScanModal';

interface HRMEmployeeManagementProps {
  employees: Employee[];
  branches: Branch[];
  xarumo: Xarun[];
  attendance: Attendance[];
  payrolls: Payroll[];
  hardwareUrl?: string;
  onAdd: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (id: string) => void;
}

const HRMEmployeeManagement: React.FC<HRMEmployeeManagementProps> = ({ 
  employees, branches, xarumo, attendance, payrolls, hardwareUrl, onAdd, onEdit, onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);
  const [showBiometricSearch, setShowBiometricSearch] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.employeeIdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const syncUsersFromDevice = async () => {
    if (!hardwareUrl) {
      alert("Fadlan marka hore deji Hardware Bridge URL gudaha Settings.");
      return;
    }

    const settings = JSON.parse(localStorage.getItem('smartstock_settings') || '{}');
    const ip = settings.zkDeviceIp;
    const port = settings.zkDevicePort || 4370;

    if (!ip) {
      alert("Cilad: IP-ga qalabka laguma hayo settings-ka.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`${hardwareUrl}/sync-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ip: ip, 
            port: port,
            default_xarun_id: xarumo[0]?.id || 'x1'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Unknown Error");

      alert(`✅ GUUL: ${result.message}`);
      window.location.reload(); 
    } catch (err) {
      console.error("Sync Error:", err);
      alert(`CILAD SYNC: ${err instanceof Error ? err.message : 'Unknown error'}\n\nFadlan hubi in 'python_bridge/app.py' uu ka shaqaynayo kombiyuutarka.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const printIDBadge = async (employee: Employee) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(employee.employeeIdCode);
      const branch = branches.find(b => b.id === employee.branchId)?.name || 'N/A';
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ID Badge - ${employee.name}</title>
              <style>
                body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; padding: 50px; }
                .badge {
                  width: 320px;
                  height: 500px;
                  border: 2px solid #4f46e5;
                  border-radius: 20px;
                  overflow: hidden;
                  display: flex; flex-direction: column; text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .header { background: #4f46e5; color: white; padding: 20px; }
                .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
                .content { padding: 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid #f8fafc; margin-bottom: 20px; object-fit: cover; }
                .name { font-size: 24px; font-weight: 900; color: #1e293b; margin: 0; }
                .pos { font-size: 14px; font-weight: 700; color: #6366f1; text-transform: uppercase; margin-top: 5px; }
                .branch { font-size: 12px; color: #94a3b8; margin-top: 10px; font-weight: bold; }
                .qr { width: 100px; height: 100px; margin-top: 20px; }
                .footer { padding: 10px; background: #f8fafc; font-size: 10px; color: #94a3b8; font-weight: 900; }
              </style>
            </head>
            <body>
              <div class="badge">
                <div class="header"><h1>SmartStock Pro</h1></div>
                <div class="content">
                  <img src="${employee.avatar}" class="avatar" />
                  <p class="name">${employee.name}</p>
                  <p class="pos">${employee.position}</p>
                  <p class="branch">🏢 ${branch}</p>
                  <img src="${qrDataUrl}" class="qr" />
                  <p style="font-family: monospace; font-size: 12px; margin-top: 10px;">ID: ${employee.employeeIdCode}</p>
                </div>
                <div class="footer">EMPLOYEE IDENTITY CARD</div>
              </div>
              <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Maamulka Shaqaalaha (HRM)</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Diiwaangali, Bedel, ama Tirtir Shaqaalaha.</p>
        </div>
        <div className="flex gap-4">
           {/* Hardware Sync Button Removed to keep UI clean for Manual Mode, can be re-enabled if needed */}
           
           <div className="relative w-64">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
              <input 
                type="text" 
                placeholder="Raadi shaqaale..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <button onClick={onAdd} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
              + SHAQAALE CUSUB
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all group relative">
            
            {/* ACTION BUTTONS (Edit / Delete / Print / View) */}
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
               <button onClick={() => setSelectedProfile(emp)} className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all" title="View Profile">👁️</button>
               <button onClick={() => printIDBadge(emp)} className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all" title="Print ID Card">🖨️</button>
               <button onClick={() => onEdit(emp)} className="p-3 bg-white text-amber-500 rounded-xl shadow-sm border border-slate-100 hover:bg-amber-500 hover:text-white transition-all" title="Edit Employee">⚙️</button>
               <button 
                 onClick={() => {
                   if(confirm(`Ma hubtaa inaad tirtirto shaqaalaha: ${emp.name}?`)) {
                     onDelete(emp.id);
                   }
                 }} 
                 className="p-3 bg-white text-rose-500 rounded-xl shadow-sm border border-slate-100 hover:bg-rose-600 hover:text-white transition-all" 
                 title="Delete Employee"
               >
                 🗑️
               </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                 <img src={emp.avatar} className="w-24 h-24 rounded-[2rem] border-4 border-slate-50 shadow-xl object-cover" alt="" />
                 <span className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[8px] font-black border-2 border-white text-white ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {emp.status}
                 </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{emp.name}</h3>
              <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mt-1">{emp.position}</p>
              
              <div className="mt-6 w-full space-y-3 pt-6 border-t border-slate-50">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Code</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{emp.employeeIdCode}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bakhaarka</span>
                    <span className="text-xs font-bold text-slate-600">🏢 {branches.find(b => b.id === emp.branchId)?.name || 'N/A'}</span>
                 </div>
                 <button onClick={() => setSelectedProfile(emp)} className="w-full mt-2 py-3 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all">View Full Profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProfile && (
        <EmployeeProfileModal 
          employee={selectedProfile} 
          attendance={attendance} 
          payrolls={payrolls} 
          branches={branches} 
          xarumo={xarumo} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}

      {showBiometricSearch && (
        <BiometricScanModal 
          employees={employees} 
          hardwareUrl={hardwareUrl}
          onMatch={(emp) => {
            setSelectedProfile(emp);
            setShowBiometricSearch(false);
          }} 
          onCancel={() => setShowBiometricSearch(false)}
          title="Employee Quick Search"
        />
      )}
    </div>
  );
};

export default HRMEmployeeManagement;
