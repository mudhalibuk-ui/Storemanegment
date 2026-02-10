
import React, { useState, useEffect } from 'react';
import { SystemSettings, InventoryItem, Branch } from '../types';
import { isDbConnected } from '../services/supabaseClient';
import * as XLSX from 'xlsx';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
  onResetData: () => void;
  items: InventoryItem[];
  branches: Branch[];
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, items, branches }) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const dbStatus = isDbConnected();

  const handleSave = () => {
    onSave(localSettings);
    alert("Nidaamka iyo canshuuraha default-ka waa la keydiyey!");
  };

  const handleBackup = () => {
    const backup = {
      items,
      branches,
      settings: localSettings,
      date: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `smartstock_backup_${new Date().toISOString().split('T')[0]}.json`);
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
           </div>

           <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
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
        </div>

        {/* Data Management Section (Restored Backup) */}
        <div className="mt-10 pt-8 border-t border-white/10">
           <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4">Data Management</h3>
           <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleBackup}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <span>💾</span> Backup Data (JSON)
              </button>
              <button 
                onClick={() => {
                  if(confirm("Tani waxay tirtiraysaa keydka maxalliga ah (Local Cache). Ma hubtaa?")) {
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
