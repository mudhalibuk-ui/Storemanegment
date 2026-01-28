
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { isDbConnected } from '../services/supabaseClient';

interface UserManagementProps {
  users: User[];
  onAdd: (u: Partial<User>) => void;
  onSwitchUser: (u: User) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAdd, onSwitchUser }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: UserRole.STAFF });
  const [isCloud, setIsCloud] = useState(false);

  useEffect(() => {
    setIsCloud(isDbConnected());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...formData, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}` });
    setFormData({ name: '', username: '', password: '', role: UserRole.STAFF });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nidaamka Users-ka</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isCloud ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <p className={`text-[8px] font-black uppercase tracking-widest ${isCloud ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isCloud ? 'Supabase Connection Active' : 'Local Mode Only'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
        >
          <span>👤</span> User Cusub
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group relative hover:border-indigo-500 transition-all overflow-hidden">
             {/* Cloud Indicator Badge */}
             <div className="absolute top-4 right-4 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {isCloud ? 'Synced' : 'Local'}
                </span>
             </div>

             <div className="flex items-center gap-5 mb-6">
               <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border-2 border-white shadow-sm overflow-hidden relative">
                 <img src={u.avatar} alt={u.name} />
                 {isCloud && (
                   <div className="absolute bottom-0 right-0 bg-emerald-500 text-white text-[8px] p-0.5 rounded-tl-lg shadow-sm">
                     ☁️
                   </div>
                 )}
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-800 tracking-tight">{u.name}</h3>
                 <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      {u.role}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">@{u.username}</span>
                 </div>
               </div>
             </div>
             
             <div className="flex gap-2">
               <button 
                onClick={() => onSwitchUser(u)}
                className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
               >
                 Switch Login
               </button>
             </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Abuur User Cusub</h2>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400">✖</button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Magaca oo buuxa</label>
                 <input required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Username</label>
                 <input required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-indigo-600" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</label>
                 <input required type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Awoodda (Role)</label>
                 <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                 >
                   <option value={UserRole.STAFF}>STAFF (Requires Approval)</option>
                   <option value={UserRole.ADMIN}>ADMIN (Auto-Approve)</option>
                 </select>
               </div>
               
               {isCloud && (
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-[10px] font-bold text-emerald-700 flex items-center gap-2">
                   <span>✅</span> User-kan waxaa si toos ah loogu dari doonaa Supabase Cloud.
                 </div>
               )}

               <div className="pt-6 flex gap-4">
                 <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]">Jooji</button>
                 <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100">KEYDI USER-KA 🚀</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
