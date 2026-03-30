
import React, { useState, useEffect } from 'react';
import { SystemSettings, InventoryItem, Branch, Xarun, Transaction, User, Employee, Attendance, Payroll, Device } from '../types';
import { isDbConnected } from '../services/supabaseClient';
import { API } from '../services/api';
import * as XLSX from 'xlsx';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
  onResetData: () => void;
  items: InventoryItem[];
  branches: Branch[];
  xarumo: Xarun[];
  transactions: Transaction[];
  users: User[];
  employees: Employee[];
  attendance: Attendance[];
  payrolls: Payroll[];
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onSave, items, branches, xarumo, transactions, users, employees, attendance, payrolls 
}) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [devices, setDevices] = useState<Device[]>([]);

  const AVAILABLE_FEATURES = [
    { id: 'dashboard', name: 'Dashboard & Analytics', description: 'Main overview and statistics' },
    { id: 'inventory', name: 'Inventory Management', description: 'Stock items, adjustments, and warehouse map' },
    { id: 'pos', name: 'POS & Sales', description: 'Point of Sale terminal and customer management' },
    { id: 'purchases', name: 'Purchasing & Vendors', description: 'Purchase orders and vendor management' },
    { id: 'financials', name: 'Financial Management', description: 'Payments, expenses, and financial reports' },
    { id: 'hr', name: 'HR Management', description: 'Employees, attendance, and payroll' },
    { id: 'crm', name: 'CRM (Sales Pipeline)', description: 'Lead tracking and sales funnel' },
    { id: 'mrp', name: 'Manufacturing (MRP)', description: 'Production planning and work orders' },
    { id: 'projects', name: 'Project Management', description: 'Task tracking and project hub' },
    { id: 'fleet', name: 'Fleet & Logistics', description: 'Vehicle tracking and logistics' },
    { id: 'qc', name: 'Quality Control', description: 'Product quality testing and standards' },
    { id: 'dms', name: 'Document Management (DMS)', description: 'File storage and document organization' },
    { id: 'helpdesk', name: 'Support Helpdesk', description: 'Ticketing system and customer support' },
    { id: 'inter-branch', name: 'Inter-Branch Transfers', description: 'Logistics between different locations' },
    { id: 'stock-take', name: 'Year-End Audit (Stock-take)', description: 'Inventory auditing and reconciliation' },
  ];

  const toggleFeature = (featureId: string) => {
    const currentFeatures = localSettings.enabledFeatures || [];
    let newFeatures: string[];
    
    if (currentFeatures.includes(featureId)) {
      newFeatures = currentFeatures.filter(id => id !== featureId);
    } else {
      newFeatures = [...currentFeatures, featureId];
    }
    
    setLocalSettings({ ...localSettings, enabledFeatures: newFeatures });
  };
  const [newDevice, setNewDevice] = useState<Partial<Device>>({ name: '', ip_address: '', port: 4370, is_active: true, xarun_id: '' });
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const dbStatus = isDbConnected();

  useEffect(() => {
    if (dbStatus) {
      loadDevices();
    }
  }, [dbStatus]);

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const data = await API.devices.getAll();
      setDevices(data);
    } catch (e) {
      console.error("Failed to load devices", e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.ip_address || !newDevice.xarun_id) {
      alert("Fadlan buuxi Magaca, IP-ga, iyo Xarunta.");
      return;
    }
    
    try {
      await API.devices.save(newDevice);
      alert("Aaladda waa la keydiyey! Python-ka ayaa hadda la xiriiri doona.");
      setNewDevice({ name: '', ip_address: '', port: 4370, is_active: true, xarun_id: '' });
      loadDevices();
    } catch (e) {
      alert("Cilad: Ma awoodin inaan keydiyo aaladda. Hubi internet-ka.");
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if(!confirm("Ma hubtaa inaad tirtirto aaladdan?")) return;
    try {
      await API.devices.delete(id);
      loadDevices();
    } catch (e) {
      alert("Cilad tirtiridda.");
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    alert("Nidaamka iyo canshuuraha default-ka waa la keydiyey!");
  };

  const handleBackup = () => {
    const fullBackup = {
      meta: {
        date: new Date().toISOString(),
        version: "1.5.0",
        system: localSettings.systemName
      },
      settings: localSettings,
      data: {
        xarumo,
        branches,
        items,
        transactions,
        users,
        employees,
        attendance,
        payrolls
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `smartstock_full_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <h2 className="text-2xl font-black tracking-tight uppercase mb-6 flex items-center gap-3">
          <span className="text-3xl">⚙️</span> Settings-ka Guud
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Configuration</h3>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Magaca System-ka</label>
                 <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" value={localSettings.systemName} onChange={e => setLocalSettings({...localSettings, systemName: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Main Store (Meesha Alaabtu ku dhacayso)</label>
                 <select className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold outline-none cursor-pointer" value={localSettings.mainStoreId} onChange={e => setLocalSettings({...localSettings, mainStoreId: e.target.value})}>
                    <option value="">Dooro Main Store...</option>
                    {branches.map(b => <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Financial Closing Date (Xiritaanka Muddada)</label>
                 <input 
                   type="date" 
                   className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-white" 
                   value={localSettings.financialClosingDate || ''} 
                   onChange={e => setLocalSettings({...localSettings, financialClosingDate: e.target.value})} 
                 />
                 <p className="text-[8px] text-slate-500 italic mt-1">* Waxba laguma qori karo (Journal) taariikhdan iyo wixii ka horreeya.</p>
              </div>
           </div>

           {/* COMPANY PROFILE SECTION */}
           <div className="space-y-4">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Company Profile (Document Header)</h3>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Company Logo URL</label>
                    <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyLogo || ''} onChange={e => setLocalSettings({...localSettings, companyLogo: e.target.value})} placeholder="https://example.com/logo.png" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Address</label>
                    <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyAddress || ''} onChange={e => setLocalSettings({...localSettings, companyAddress: e.target.value})} placeholder="Mogadishu, Somalia" />
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Phone</label>
                       <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyPhone || ''} onChange={e => setLocalSettings({...localSettings, companyPhone: e.target.value})} placeholder="+252..." />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Email</label>
                       <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyEmail || ''} onChange={e => setLocalSettings({...localSettings, companyEmail: e.target.value})} placeholder="info@company.com" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Website</label>
                       <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyWebsite || ''} onChange={e => setLocalSettings({...localSettings, companyWebsite: e.target.value})} placeholder="www.company.com" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Tax ID / License</label>
                       <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white text-xs" value={localSettings.companyTaxId || ''} onChange={e => setLocalSettings({...localSettings, companyTaxId: e.target.value})} placeholder="TRN-123456" />
                    </div>
                 </div>
              </div>
           </div>

           {/* DEVICE MANAGEMENT SECTION */}
           <div className="space-y-4">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Aaladaha (ZK Devices)</h3>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                 
                 {/* List of Existing Devices */}
                 <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {isLoadingDevices ? <p className="text-[10px] text-slate-400">Loading devices...</p> : devices.length === 0 ? <p className="text-[10px] text-slate-400 italic">Ma jiraan aalado la keydiyey.</p> : (
                        devices.map(d => (
                            <div key={d.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-[10px] font-black text-white">{d.name}</p>
                                    <p className="text-[9px] text-slate-400">{d.ip_address}:{d.port} • {xarumo.find(x => x.id === d.xarun_id)?.name}</p>
                                </div>
                                <button onClick={() => handleDeleteDevice(d.id)} className="text-rose-400 hover:text-rose-500 text-xs">🗑️</button>
                            </div>
                        ))
                    )}
                 </div>

                 {/* Add New Device Form */}
                 <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Ku dar Device Cusub</p>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white placeholder-slate-600 text-xs" 
                      placeholder="Magaca (e.g. Main Gate)"
                      value={newDevice.name} 
                      onChange={e => setNewDevice({...newDevice, name: e.target.value})} 
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white placeholder-slate-600 text-xs" 
                          placeholder="IP (192.168.1.201)"
                          value={newDevice.ip_address} 
                          onChange={e => setNewDevice({...newDevice, ip_address: e.target.value})} 
                        />
                        <input 
                          type="number" 
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white placeholder-slate-600 text-xs" 
                          placeholder="Port (4370)"
                          value={newDevice.port} 
                          onChange={e => setNewDevice({...newDevice, port: parseInt(e.target.value)})} 
                        />
                    </div>
                    <select 
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-slate-300 text-xs outline-none"
                        value={newDevice.xarun_id}
                        onChange={e => setNewDevice({...newDevice, xarun_id: e.target.value})}
                    >
                        <option value="">Dooro Xarun...</option>
                        {xarumo.map(x => <option key={x.id} value={x.id} className="text-slate-900">{x.name}</option>)}
                    </select>
                    <button 
                        onClick={handleAddDevice}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        + Keydi Device-ka
                    </button>
                 </div>
              </div>
           </div>

           <div className="col-span-1 md:col-span-2 bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Canshuurta Default ($)</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Per Box</label>
                    <input type="number" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-indigo-400" value={localSettings.taxPerBox} onChange={e => setLocalSettings({...localSettings, taxPerBox: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Per Kiish</label>
                    <input type="number" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-indigo-400" value={localSettings.taxPerKiish} onChange={e => setLocalSettings({...localSettings, taxPerKiish: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Per Dram</label>
                    <input type="number" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-indigo-400" value={localSettings.taxPerDram} onChange={e => setLocalSettings({...localSettings, taxPerDram: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Per Falag</label>
                    <input type="number" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-indigo-400" value={localSettings.taxPerFalag} onChange={e => setLocalSettings({...localSettings, taxPerFalag: Number(e.target.value)})} />
                 </div>
              </div>
              <p className="text-[8px] text-slate-500 italic mt-2">* Qiimahan waxaa si otomaatik ah loogu darayaa Unit Price-ka alaabta markay timaado.</p>
           </div>

           {/* FEATURE MANAGEMENT SECTION */}
           <div className="col-span-1 md:col-span-2 bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Feature Management (Advanced)</h3>
                 <span className="bg-indigo-600/20 text-indigo-400 text-[8px] font-black px-3 py-1 rounded-full uppercase">Global Controls</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {AVAILABLE_FEATURES.map(feature => {
                   const isEnabled = (localSettings.enabledFeatures || []).includes(feature.id);
                   return (
                     <div 
                       key={feature.id} 
                       onClick={() => toggleFeature(feature.id)}
                       className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                         isEnabled 
                           ? 'bg-indigo-600/10 border-indigo-500/50' 
                           : 'bg-white/5 border-white/10 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                       }`}
                     >
                       <div className="flex justify-between items-start">
                         <span className="text-sm font-black text-white">{feature.name}</span>
                         <div className={`w-8 h-4 rounded-full relative transition-all ${isEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                           <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isEnabled ? 'right-1' : 'left-1'}`} />
                         </div>
                       </div>
                       <p className="text-[9px] text-slate-400 font-medium leading-relaxed">{feature.description}</p>
                     </div>
                   );
                 })}
              </div>
              <p className="text-[8px] text-slate-500 italic">* Features-ka aad damiso halkan kama muuqan doonaan menu-ga guud ee nidaamka.</p>
           </div>
        </div>

        {/* Data Management Section (Restored Backup) */}
        <div className="mt-10 pt-8 border-t border-white/10">
           <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Data Management</h3>
           <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleBackup}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
              >
                <span>💾</span> FULL BACKUP (ALL DATA)
              </button>
              <button 
                onClick={() => {
                  if(confirm("DIGNIIN: Tani waxay tirtiraysaa keydka maxalliga ah (Local Cache) kaliya. Xogta Cloud-ka lama taabanayo. Ma hubtaa?")) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-6 py-4 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/30 transition-all flex items-center gap-2"
              >
                <span>♻️</span> Reset Local Cache
              </button>
           </div>
        </div>

        <div className="mt-10 flex justify-end">
           <button onClick={handleSave} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all uppercase text-xs tracking-widest">Cusboonaysii Nidaamka</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
