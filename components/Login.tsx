
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { API } from '../services/api';
import { isDbConnected } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cloudActive, setCloudActive] = useState(false);

  useEffect(() => {
    setCloudActive(isDbConnected());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch users from Cloud/API
      const users = await API.users.getAll();
      
      // 2. Define Default Admin
      const defaultAdmin: User = { 
        id: 'u1', 
        name: 'Super Admin', 
        username: 'admin', 
        password: 'password', 
        role: UserRole.ADMIN, 
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' 
      };

      // 3. Xaqiijin: Mar walba ku dar defaultAdmin liiska haddii uusan jirin admin kale oo database-ka ku jira
      // Tani waxay ka hortageysaa in qofka laga xirto system-ka markuu user hal qof ku daro
      const hasCloudAdmin = users.some(u => u.username.toLowerCase() === 'admin');
      const allUsers = hasCloudAdmin ? users : [defaultAdmin, ...users];

      const foundUser = allUsers.find(u => 
        u.username.toLowerCase() === username.trim().toLowerCase() && 
        (u.password === password || (!u.password && password === 'password'))
      );

      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError('Username ama Password waa qalad! Hubi in Cloud-ku xiran yahay ama SQL-ka Supabase aad marisay.');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('Cilad ayaa dhacday markii lala xiriirayay server-ka.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-500/50">
            S
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">SmartStock <span className="text-indigo-500">Pro</span></h1>
          
          <div className="mt-4 flex justify-center">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${cloudActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <span className={`w-2 h-2 rounded-full ${cloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${cloudActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {cloudActive ? 'Cloud Sync Active (Otomaatik)' : 'Local Mode (No Sync)'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl text-rose-400 text-[10px] font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Username</label>
            <input 
              required
              type="text" 
              placeholder="admin"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Password</label>
            <input 
              required
              type="password" 
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>GAL SYSTEM-KA 🚀</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
