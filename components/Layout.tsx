
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { isDbConnected } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemName?: string;
  lowStockCount?: number;
  pendingApprovalsCount?: number;
  interBranchTransferCount?: number; // New prop for inter-branch transfers
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, activeTab, setActiveTab, systemName = "SmartStock Pro", lowStockCount = 0, pendingApprovalsCount = 0, interBranchTransferCount = 0, user, onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCloud = isDbConnected();
  
  const sections = [
    { 
      section: 'OVERVIEW', 
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
      ]
    },
    { 
      section: 'INVENTORY & STORES', 
      items: [
        { id: 'inventory', label: 'Stock Items', icon: '📦', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'approvals', label: 'Ogolaanshaha', icon: '🛡️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER], badge: pendingApprovalsCount },
        { id: 'transactions', label: 'Dhaqdhaqaaqa', icon: '🔄', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'map', label: 'Warehouse Map', icon: '🗺️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'xarumo', label: 'Xarumaha (Centers)', icon: '📍', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'bakhaarada', label: 'Bakhaarada', icon: '🏢', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'inter-branch-transfers', label: 'Logistics & Transfers', icon: '🚚', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER], badge: interBranchTransferCount }
      ]
    },
    { 
      section: 'PROCUREMENT', 
      items: [
        { id: 'procurement', label: 'Logistics & Buying', icon: '🛒', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.BUYER] },
      ]
    },
    { 
      section: 'HUMAN RESOURCES', 
      items: [
        { id: 'hr-employees', label: 'Shaqaalaha', icon: '👥', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-attendance', label: 'Iimaanshaha', icon: '📝', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-payroll', label: 'Mushaharka', icon: '💰', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-reports', label: 'HR Reports', icon: '📈', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
      ]
    },
    { 
      section: 'SYSTEM CONTROL', 
      items: [
        { id: 'users', label: 'User Control', icon: '🔐', roles: [UserRole.SUPER_ADMIN] },
        { id: 'settings', label: 'Settings', icon: '⚙️', roles: [UserRole.SUPER_ADMIN] },
      ]
    }
  ];

  // Top 4 Priority Tabs for Mobile Bottom Bar
  const mobileShortcuts = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'inventory', label: 'Stock', icon: '📦' },
    { id: 'approvals', label: 'Admin', icon: '🛡️', badge: pendingApprovalsCount },
    { id: 'transactions', label: 'Logs', icon: '🔄' }
  ];

  const handleMobileNav = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 text-slate-900">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-6 shadow-2xl z-20 shrink-0 print:hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black shadow-lg">S</div>
          <div>
            <h2 className="text-lg font-black tracking-tight">{systemName}</h2>
            <p className="text-indigo-400 text-[8px] font-black uppercase tracking-widest">Global Logistics</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-10">
          {sections.map((section) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={section.section} className="space-y-1">
                <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 pt-2 border-t border-slate-800/50">{section.section}</p>
                {visibleItems.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-bold text-xs tracking-tight">{tab.label}</span>
                    </div>
                    {tab.badge && tab.badge > 0 && (
                      <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-all group">
             <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700">
               <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="User" />
             </div>
             <div className="text-left">
               <p className="text-[10px] font-black truncate max-w-[100px]">{user.name}</p>
               <p className="text-[8px] font-bold text-indigo-400 uppercase">{user.role}</p>
             </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-slate-100 h-16 md:h-20 flex items-center justify-between px-6 md:px-10 shrink-0 z-30 print:hidden">
          <div className="flex items-center gap-3 md:hidden">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">S</div>
             <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{activeTab.replace('hr-', 'HR ').replace('-', ' ')}</h1>
          </div>
          <h1 className="hidden md:block text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase">{activeTab.replace('hr-', 'HR ').replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
             {lowStockCount > 0 && (
               <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100 text-[9px] font-black uppercase">
                 ⚠️ {lowStockCount} Items Low
               </div>
             )}
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCloud ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="hidden sm:inline">{isCloud ? 'Cloud Connected' : 'Local'}</span>
                <span className="sm:hidden">{isCloud ? 'Cloud' : 'Local'}</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar pb-24 md:pb-10">
          {children}
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] pb-safe">
          {mobileShortcuts.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all relative ${
                activeTab === tab.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border border-white"></span>
              )}
            </button>
          ))}
          
          {/* MENU BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${isMobileMenuOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}
          >
            <span className="text-xl">☰</span>
            <span className="text-[8px] font-black uppercase tracking-widest">More</span>
          </button>
        </nav>

        {/* MOBILE FULL SCREEN MENU (DRAWER) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-10 flex flex-col pb-40">
             <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black shadow-lg">S</div>
                   <div>
                      <h2 className="text-white text-lg font-black tracking-tight">{systemName}</h2>
                      <p className="text-indigo-400 text-[8px] font-bold uppercase tracking-widest">Full Menu</p>
                   </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white text-lg">✕</button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {sections.map((section) => {
                  const visibleItems = section.items.filter(item => item.roles.includes(user.role));
                  if (visibleItems.length === 0) return null;
                  
                  return (
                    <div key={section.section} className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">{section.section}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {visibleItems.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => handleMobileNav(tab.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                              activeTab === tab.id 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-2xl mb-2">{tab.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-tight text-center">{tab.label}</span>
                            {tab.badge && tab.badge > 0 && (
                              <span className="mt-1 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{tab.badge} New</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-6 border-t border-white/10">
                   <button onClick={onLogout} className="w-full py-4 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                      <span>🚪</span> LOGOUT (KA BAX)
                   </button>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Layout;
