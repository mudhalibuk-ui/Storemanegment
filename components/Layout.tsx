
import React from 'react';
import { User, UserRole } from '../types';
import { isDbConnected } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemName?: string;
  lowStockCount?: number;
  pendingApprovalsCount?: number;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, setActiveTab, systemName = "SmartStock Pro", lowStockCount = 0, pendingApprovalsCount = 0, user, onLogout 
}) => {
  const isCloud = isDbConnected();
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory', label: 'Stock-ga', icon: '📦', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'approvals', label: 'Ogolaanshaha', icon: '🛡️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER], badge: pendingApprovalsCount },
    { id: 'transactions', label: 'Dhaqdhaqaaqa', icon: '🔄', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'map', label: 'Khariidadda', icon: '🗺️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'reports', label: 'Warbixin', icon: '📄', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
    { id: 'users', label: 'Users-ka', icon: '👥', roles: [UserRole.SUPER_ADMIN] },
    { id: 'xarumo', label: 'Xarumaha', icon: '📍', roles: [UserRole.SUPER_ADMIN] },
    { id: 'bakhaarada', label: 'Bakhaarada', icon: '🏢', roles: [UserRole.SUPER_ADMIN] },
    { id: 'settings', label: 'Settings', icon: '⚙️', roles: [UserRole.SUPER_ADMIN] },
  ].filter(tab => tab.roles.includes(user.role));

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 text-slate-900">
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white p-8 shadow-2xl z-20 shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">S</div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{systemName}</h2>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Inventory v2.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-xl">{tab.icon}</span>
                <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              </div>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-800">
           <div className="mb-4 px-4">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                user.role === UserRole.SUPER_ADMIN ? 'bg-amber-500/20 text-amber-500' : 
                user.role === UserRole.MANAGER ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'
              }`}>
                {user.role}
              </span>
           </div>
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-white transition-all group">
             <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-700 group-hover:border-indigo-500">
               <img src={user.avatar} alt="User" />
             </div>
             <div className="text-left">
               <p className="text-xs font-black truncate max-w-[120px]">{user.name}</p>
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest truncate max-w-[120px]">
                  {user.role === UserRole.SUPER_ADMIN ? 'Dhamaan Xarumaha' : `Xarunta: ${user.xarunId}`}
               </p>
             </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 md:h-24 flex items-center justify-between px-6 md:px-10 shrink-0 z-30">
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">{activeTab}</h1>
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isCloud ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isCloud ? 'Cloud Connected' : 'Local Mode'}
             </div>
             <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-indigo-600 overflow-hidden shadow-xl border-2 border-white">
                <img src={user.avatar} alt="Profile" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
