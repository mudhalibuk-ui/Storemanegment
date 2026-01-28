
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
    { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: false },
    { id: 'inventory', label: 'Stock', icon: '📦', adminOnly: false },
    { id: 'map', label: 'Layout Map', icon: '🗺️', adminOnly: false },
    { id: 'approvals', label: 'Approvals', icon: '🛡️', adminOnly: true },
    { id: 'transactions', label: 'Activity', icon: '🔄', adminOnly: false },
    { id: 'reports', label: 'Reports', icon: '📄', adminOnly: false },
    { id: 'users', label: 'Users', icon: '👥', adminOnly: true },
    { id: 'branches', label: 'Branches', icon: '🏢', adminOnly: true },
    { id: 'chat', label: 'AI', icon: '✨', adminOnly: false },
    { id: 'settings', label: 'Settings', icon: '⚙️', adminOnly: true },
  ].filter(tab => !tab.adminOnly || user.role === UserRole.ADMIN);

  const mobileTabs = tabs.filter(t => ['dashboard', 'inventory', 'map', 'approvals', 'chat'].includes(t.id));

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white p-8 shadow-2xl z-20 shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">S</div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{systemName.split(' ')[0]}</h2>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Inventory</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              {tab.id === 'approvals' && pendingApprovalsCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-rose-600/20 transition-all">
             <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-700">
               <img src={user.avatar} alt="User" />
             </div>
             <div className="text-left">
               <p className="text-xs font-black truncate max-w-[120px]">{user.name}</p>
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Logout</p>
             </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative pb-20 md:pb-0">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 md:h-24 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="md:hidden w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-black">S</div>
             <div>
                <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">{activeTab === 'map' ? 'Layout Map' : activeTab}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isCloud ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${isCloud ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isCloud ? 'LIVE CLOUD' : 'LOCAL MODE'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             {pendingApprovalsCount > 0 && (
               <button onClick={() => setActiveTab('approvals')} className="bg-amber-50 text-amber-600 px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-amber-100 animate-pulse">
                 {pendingApprovalsCount} {window.innerWidth < 768 ? 'Pending' : 'Approval Pending'}
               </button>
             )}
             <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-indigo-600 border-2 md:border-4 border-indigo-50 shadow-xl overflow-hidden">
                <img src={user.avatar} alt="Profile" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 no-scrollbar">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-20 px-4 flex items-center justify-between z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
           {mobileTabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
                 activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'
               }`}
             >
               <div className={`w-12 h-8 flex items-center justify-center rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-50' : ''}`}>
                 <span className="text-xl">{tab.icon}</span>
               </div>
               <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                 {tab.label === 'Dashboard' ? 'Home' : tab.label === 'Layout Map' ? 'Map' : tab.label}
               </span>
               {tab.id === 'approvals' && pendingApprovalsCount > 0 && (
                 <div className="absolute top-3 right-auto ml-10 bg-rose-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                   {pendingApprovalsCount}
                 </div>
               )}
             </button>
           ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
