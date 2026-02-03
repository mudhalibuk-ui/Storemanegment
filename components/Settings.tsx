
import React, { useState } from 'react';
import { SystemSettings, InventoryItem, Branch } from '../types';
import { isDbConnected } from '../services/supabaseClient';
import { utils, writeFile } from 'xlsx';

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

  const handleExportExcel = () => {
    const exportData = items.map(item => ({
      'Magaca': item.name,
      'SKU': item.sku,
      'Nooca': item.category,
      'Tirada': item.quantity,
      'Iskafalo': item.shelves,
      'Godka': item.sections,
      'Bakhaarka': branches.find(b => b.id === item.branchId)?.name || item.branchId,
      'Xarunta ID': item.xarunId,
      'Halista (Alert)': item.minThreshold
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Inventory");
    writeFile(wb, `${localSettings.systemName}_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSave = () => {
    onSave(localSettings);
    alert("Nidaamka waa la cusboonaysiiyey!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nidaamka (Settings)</h2>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Configure your Workspace Identity</p>
           </div>
           <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${dbStatus ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
             {dbStatus ? 'Cloud Active' : 'Offline Mode'}
           </div>
        </div>

        <div className="p-10 space-y-10">
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Branding & Currency</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase px-1 tracking-tight">App Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" 
                  value={localSettings.systemName} 
                  onChange={e => setLocalSettings({...localSettings, systemName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase px-1 tracking-tight">Currency</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none cursor-pointer" 
                  value={localSettings.currency} 
                  onChange={e => setLocalSettings({...localSettings, currency: e.target.value})}
                >
                  <option value="USD">United States Dollar ($)</option>
                  <option value="SOS">Somali Shilling (Sh.So)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-6 border-t border-slate-50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Data & Security</h3>
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
               <div className="text-center md:text-left">
                  <p className="font-black text-xl tracking-tight">Kaabi Xogta (Backup)</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">Export all inventory to Excel.</p>
               </div>
               <button 
                onClick={handleExportExcel} 
                className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black transition-all uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white shadow-xl"
               >
                 Export to Excel
               </button>
            </div>
          </section>

          <div className="pt-10 flex justify-end">
            <button 
              onClick={handleSave} 
              className="w-full md:w-auto bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-indigo-100 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              Cusboonaysii
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center">
         <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">SmartStock Pro v1.6.0 Stability Edition</p>
      </div>
    </div>
  );
};

export default Settings;
