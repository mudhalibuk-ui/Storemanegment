
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
  
  // Reorganized Sections: Organization items merged into Inventory Management
  const sections = [
    { 
      section: 'OVERVIEW', 
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
      ]
    },
    { 
      section: 'INVENTORY MANAGEMENT', // Stock, Movements, Map, Locations
      items: [
        { id: 'inventory', label: 'Stock Items', icon: '📦', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'transactions', label: 'Dhaqdhaqaaqa', icon: '🔄', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'map', label: 'Warehouse Map', icon: '🗺️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.STAFF] },
        { id: 'xarumo', label: 'Xarumaha (Centers)', icon: '📍', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'bakhaarada', label: 'Bakhaarada', icon: '🏢', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
      ]
    },
    { 
      section: 'PROCUREMENT', // Procurement Separated
      items: [
        { id: 'procurement', label: 'Logistics & Buying', icon: '🛒', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.BUYER] },
      ]
    },
    { 
      section: 'HUMAN RESOURCES', // HRM Full Suite
      items: [
        { id: 'hr-employees', label: 'Shaqaalaha', icon: '👥', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-attendance', label: 'Iimaanshaha', icon: '☝️', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-payroll', label: 'Mushaharka', icon: '💰', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        { id: 'hr-reports', label: 'HR Reports', icon: '📈', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
      ]
    },
    { 
      section: 'SYSTEM CONTROL', // Admin Tools
      items: [
        { id: 'users', label: 'User Control', icon: '🔐', roles: [UserRole.SUPER_ADMIN] },
        { id: 'settings', label: 'Settings', icon: '⚙️', roles: [UserRole.SUPER_ADMIN] },
      ]
    }
  ];

  const mobileTabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'inventory', label: 'Stock', icon: '📦' },
    { id: 'transactions', label: 'Moves', icon: '🔄' },
    { id: 'hr-employees', label: 'HR', icon: '👤' },
    { id: 'procurement', label: 'Buy', icon: '🛒' }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 text-slate-900">
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

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-slate-100 h-16 md:h-20 flex items-center justify-between px-6 md:px-10 shrink-0 z-30 print:hidden">
          <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase">{activeTab.replace('hr-', 'HR ').replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isCloud ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>{isCloud ? 'Cloud Connected' : 'Local'}</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar pb-24 md:pb-10">
          {children}
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
          {mobileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                activeTab === tab.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
