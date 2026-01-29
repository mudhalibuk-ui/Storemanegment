
import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { isDbConnected, supabaseFetch } from '../services/supabaseClient';
import { API } from '../services/api';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
  onResetData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onResetData }) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [testResult, setTestResult] = useState<{status: 'idle' | 'testing' | 'success' | 'fail', msg: string}>({ status: 'idle', msg: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const dbStatus = isDbConnected();

  const handleClearAllInventory = async () => {
    if (confirm("DIGNIIN: Ma hubtaa inaad rabto inaad tirtirto DHAMAAN STOCK-GA (700+ items)? Tani lagama soo kaban karo!")) {
      setIsDeleting(true);
      try {
        await API.items.deleteAll();
        alert("DHAMAAN STOCK-GII WAA LA TIRTIRAY! ✅\nSystem-ka hadda waa faaruq.");
        window.location.reload();
      } catch (err) {
        alert("Cilad ayaa dhacday intii tirtirista lagu jiray.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing', msg: 'Checking connection...' });
    const response = await supabaseFetch('inventory_items?select=id&limit=1');
    if (response !== null) {
      setTestResult({ status: 'success', msg: 'Connected successfully to Supabase Cloud!' });
    } else {
      setTestResult({ status: 'fail', msg: 'Connection failed. Check your URL and Key.' });
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    alert("Settings updated!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Database Connection Status Card */}
      <div className={`p-8 rounded-[3rem] border-2 flex flex-col items-center justify-between gap-6 ${dbStatus ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
         <div className="flex flex-col md:flex-row items-center gap-6 w-full">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl ${dbStatus ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {dbStatus ? '🌐' : '📴'}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black">{dbStatus ? 'Cloud Connected' : 'Local Only'}</h3>
              <p className="text-xs font-bold opacity-70">Xogtaadu waxay ku kaydsan tahay: {dbStatus ? 'Supabase Cloud' : 'Browser Storage'}</p>
            </div>
            <button onClick={handleTestConnection} className="bg-white px-8 py-3 rounded-2xl text-[10px] font-black border uppercase tracking-widest">Test Sync ⚡</button>
         </div>
         {testResult.msg && <div className={`w-full p-4 rounded-2xl text-[10px] font-black text-center ${testResult.status === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{testResult.msg}</div>}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden p-10 space-y-12">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">System Configuration</h2>

        {/* Data Management Section */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Data Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex flex-col gap-4">
                <div>
                   <h4 className="text-rose-900 font-black text-lg">Clear All Stock</h4>
                   <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Tir-tir dhamaan Inventory-ga hadda jira.</p>
                </div>
                <button 
                  disabled={isDeleting}
                  onClick={handleClearAllInventory}
                  className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isDeleting ? 'bg-slate-300 text-slate-500' : 'bg-rose-600 text-white shadow-rose-200'}`}
                >
                  {isDeleting ? 'SHAQADAA SOCOTA...' : 'TIRTIR DHAMAAN STOCK-GA 🗑️'}
                </button>
             </div>

             <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col gap-4">
                <div>
                   <h4 className="text-white font-black text-lg">Factory Reset</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tir-tir dhamaan Users, Settings, iyo Stock.</p>
                </div>
                <button 
                  onClick={onResetData}
                  className="bg-slate-700 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  RESET EVERYTHING ⚠️
                </button>
             </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <label className="text-[11px] font-black text-slate-500 uppercase px-1">System Name</label>
             <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={localSettings.systemName} onChange={e => setLocalSettings({...localSettings, systemName: e.target.value})} />
           </div>
           <div className="space-y-2">
             <label className="text-[11px] font-black text-slate-500 uppercase px-1">Currency</label>
             <select className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={localSettings.currency} onChange={e => setLocalSettings({...localSettings, currency: e.target.value})}>
                <option value="USD">USD ($)</option>
                <option value="SOS">SOS (Sh.So)</option>
             </select>
           </div>
        </section>

        <div className="pt-6 flex justify-end">
          <button onClick={handleSave} className="bg-indigo-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl active:scale-95 transition-all uppercase text-xs">Save All Changes</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
