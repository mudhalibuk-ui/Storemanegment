
import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { isDbConnected, supabaseFetch, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
  onResetData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onResetData }) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [testResult, setTestResult] = useState<{status: 'idle' | 'testing' | 'success' | 'fail', msg: string}>({ status: 'idle', msg: '' });
  
  const dbStatus = isDbConnected();

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing', msg: 'Checking connection...' });
    
    if (!SUPABASE_URL.startsWith('https://')) {
      setTestResult({ status: 'fail', msg: 'Qalad: URL-ka mashruucaagu ma ahan mid sax ah. Waa inuu ku bilaawdaa https://' });
      return;
    }

    const response = await supabaseFetch('inventory_items?select=id&limit=1');
    
    if (response !== null) {
      setTestResult({ status: 'success', msg: 'Habaar! Database-kaagu waa uu xiran yahay Cloud-ka dhabta ah.' });
    } else {
      setTestResult({ status: 'fail', msg: 'Cilad: Key-gaagu ma ahan midka saxda ah ama link-ga ayaa khaldan. Hubi Supabase Dashboard.' });
    }
  };

  const colors = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Slate', value: '#475569' }
  ];

  const handleSave = () => {
    onSave(localSettings);
    alert("Settings updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Database Connection Status Card */}
      <div className={`p-8 rounded-[3rem] border-2 flex flex-col items-center justify-between gap-6 transition-all ${dbStatus ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
         <div className="flex flex-col md:flex-row items-center gap-6 w-full">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm ${dbStatus ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {dbStatus ? '🌐' : '📴'}
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className={`text-xl font-black tracking-tight ${dbStatus ? 'text-emerald-900' : 'text-amber-900'}`}>
                {dbStatus ? 'Database: Connected' : 'Database: Local Only'}
              </h3>
              <p className={`text-xs font-bold ${dbStatus ? 'text-emerald-600' : 'text-amber-600'} opacity-70`}>
                {dbStatus 
                  ? 'Koodhkaagu wuxuu si sax ah ugu xiran yahay Supabase Cloud.' 
                  : 'Fadlan ku bedel URL-ka iyo Key-ga koodhka services/supabaseClient.ts'}
              </p>
            </div>
            <button 
               onClick={handleTestConnection}
               disabled={testResult.status === 'testing'}
               className="bg-white px-8 py-3 rounded-2xl text-[10px] font-black text-indigo-600 border border-slate-200 shadow-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
            >
               {testResult.status === 'testing' ? 'Testing...' : 'Test Sync Status ⚡'}
            </button>
         </div>

         {testResult.msg && (
           <div className={`w-full p-4 rounded-2xl text-[10px] font-black uppercase text-center ${testResult.status === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {testResult.msg}
           </div>
         )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter text-center md:text-left">Maamulka System-ka</h2>
          <p className="text-slate-500 font-medium mt-1 text-center md:text-left">Configure your professional inventory experience.</p>
        </div>

        <div className="p-10 space-y-12">
          {/* General Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">General Setup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">System-wide identification and currency preferences.</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">System Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                  value={localSettings.systemName}
                  onChange={e => setLocalSettings({...localSettings, systemName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Currency Unit</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all cursor-pointer"
                  value={localSettings.currency}
                  onChange={e => setLocalSettings({...localSettings, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="SOS">SOS (Sh.So)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Localization Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Localization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Choose your preferred interaction language.</p>
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-4 p-2 bg-slate-100 rounded-3xl w-fit">
                <button 
                  onClick={() => setLocalSettings({...localSettings, language: 'EN'})}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black transition-all ${localSettings.language === 'EN' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ENGLISH (US)
                </button>
                <button 
                  onClick={() => setLocalSettings({...localSettings, language: 'SO'})}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black transition-all ${localSettings.language === 'SO' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  SOMALI (SO)
                </button>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Appearance Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Appearance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Custom color themes to beautify your workspace.</p>
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-4">
                {colors.map(color => (
                  <button 
                    key={color.name}
                    onClick={() => setLocalSettings({...localSettings, primaryColor: color.value})}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all ${localSettings.primaryColor === color.value ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <div className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: color.value }}></div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="p-10 bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <button 
            onClick={onResetData}
            className="text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"
          >
            <span>🗑️</span> RESET ENTIRE DATABASE
          </button>
          <button 
            onClick={handleSave}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-3xl text-sm font-black shadow-2xl shadow-indigo-900/50 transition-all active:scale-95 uppercase tracking-widest"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
