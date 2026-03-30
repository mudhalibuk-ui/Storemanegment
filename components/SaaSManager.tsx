import React, { useState } from 'react';
import { Xarun, User, UserRole } from '../types';
import { API } from '../services/api';
import { supabaseFetch } from '../services/supabaseClient';

interface SaaSManagerProps {
  xarumo: Xarun[];
  users: User[];
  onRefresh: () => void;
  onSelectCompany: (id: string) => void;
}

const SaaSManager: React.FC<SaaSManagerProps> = ({ xarumo, users, onRefresh, onSelectCompany }) => {
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Xarun>>({
    status: 'ACTIVE',
    plan: 'BASIC',
    currency: 'USD'
  });
  const [adminUser, setAdminUser] = useState({
    name: '',
    username: '',
    password: ''
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !adminUser.username || !adminUser.password) {
      alert("Fadlan buuxi dhammaan xogta muhiimka ah.");
      return;
    }

    try {
      // 1. Create the Company (Tenant)
      const savedXarun = await API.xarumo.save({
        ...newCompany,
        createdAt: new Date().toISOString()
      } as Xarun);

      // 2. Create the Admin User for this Company
      await API.users.save({
        name: adminUser.name,
        username: adminUser.username,
        password: adminUser.password,
        role: UserRole.MANAGER,
        xarunId: savedXarun.id,
        permissions: ['dashboard', 'inventory', 'sales', 'hr', 'financials'] // Default permissions
      } as User);

      alert(`Shirkadda ${savedXarun.name} waa la kireeyay! Admin-ka waa ${adminUser.username}`);
      setIsAddingCompany(false);
      onRefresh();
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Khalad ayaa dhacay intii lagu guda jiray abuurista shirkadda.");
    }
  };

  const getCompanyUsersCount = (xarunId: string) => {
    return users.filter(u => u.xarunId === xarunId).length;
  };

  const handleFixHierarchy = async () => {
    const bariireLocations = [
      "Bariire Bakaaro",
      "Ramadan Zoope",
      "Bakharka x,jajab",
      "Bin Ramadan",
      "Bariire Xamar weyne"
    ];

    try {
      // 1. Find or create the main "Bariire" company
      let bariireCompany = xarumo.find(x => x.name.toLowerCase() === "bariire");
      if (!bariireCompany) {
        bariireCompany = await API.xarumo.save({
          name: "Bariire",
          location: "Mogadishu",
          status: 'ACTIVE',
          plan: 'PRO',
          currency: 'USD',
          createdAt: new Date().toISOString()
        } as Xarun);
      }

      const bariireId = bariireCompany.id;

      // 2. Process each location
      for (const locName of bariireLocations) {
        const existingXarun = xarumo.find(x => x.name.toLowerCase() === locName.toLowerCase());
        if (existingXarun) {
          // a. Create a branch under Bariire
          await API.branches.save({
            name: existingXarun.name,
            location: existingXarun.location || "Mogadishu",
            xarunId: bariireId,
            totalShelves: 10,
            totalSections: 5
          });

          // b. Update users of this xarun to the main Bariire company
          const companyUsers = users.filter(u => u.xarunId === existingXarun.id);
          for (const u of companyUsers) {
            await API.users.save({ ...u, xarunId: bariireId });
          }

          // c. Delete the separate company
          await API.xarumo.delete(existingXarun.id);
        }
      }

      alert("Hierarchy fixed! Bariire is now the main company with 5 branches.");
      onRefresh();
    } catch (error) {
      console.error("Error fixing hierarchy:", error);
      alert("Khalad ayaa dhacay intii lagu guda jiray saxitaanka hierarchy-ga.");
    }
  };

  const handleRecoverData = async () => {
    if (!confirm("Ma hubtaa inaad rabto inaad soo celiso xogtii hore ee luntay (Items, Sales, Customers, etc.)?")) return;
    
    try {
      const bariireCompany = xarumo.find(x => x.name.toLowerCase().includes("bariire"));
      if (!bariireCompany) {
        alert("Fadlan marka hore abuur shirkad la yiraahdo 'Bariire'");
        return;
      }
      
      const validIds = xarumo.map(x => `"${x.id}"`).join(',');
      const targetId = bariireCompany.id;
      
      const tables = [
        'inventory_items', 'transactions', 'customers', 'vendors', 
        'sales', 'employees', 'users_registry', 'chart_of_accounts', 
        'ledger', 'journal_entries', 'purchase_orders', 'payments'
      ];
      
      for (const table of tables) {
        // Update all records where xarun_id is not in validIds
        await supabaseFetch(`${table}?xarun_id=not.in.(${validIds})`, {
          method: 'PATCH',
          body: JSON.stringify({ xarun_id: targetId })
        });
      }
      
      alert("Xogtii hore si guul leh ayaa loogu soo celiyay shirkadda Bariire!");
      onRefresh();
    } catch (error) {
      console.error("Recovery error:", error);
      alert("Cilad ayaa dhacday xilliga soo celinta xogta.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section matching screenshot */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Maamulka Shirkadaha (SaaS)</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={handleFixHierarchy}
              className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              Fix Bariire Hierarchy
            </button>
            <button 
              onClick={handleRecoverData}
              className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
            >
              Soo Celi Xogti Hore (Recover Data)
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button className="px-4 py-2 bg-white text-indigo-600 shadow-sm border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest">
              Dhammaan Shirkadaha
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Dooro Shirkad..."
                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none px-2 w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[9px] font-black uppercase shadow-sm">
            <span className="text-xs">⚠️</span> 652 Items Low
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-[9px] font-black uppercase shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Cloud Connected
          </div>

          <button 
            onClick={() => setIsAddingCompany(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            + Shirkad Cusub (Tenant)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wadarta Shirkadaha</p>
          <h3 className="text-4xl font-black text-slate-800">{xarumo.length}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Subscriptions</p>
          <h3 className="text-4xl font-black text-emerald-600">{xarumo.filter(x => x.status === 'ACTIVE').length}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expiring Soon</p>
          <h3 className="text-4xl font-black text-amber-500">
            {xarumo.filter(x => x.expiryDate && new Date(x.expiryDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000).length}
          </h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Platform Users</p>
          <h3 className="text-4xl font-black text-indigo-600">{users.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Magaca Shirkadda</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Users</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {xarumo.map(x => (
              <tr key={x.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">🏢</div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{x.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{x.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    x.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-600' : 
                    x.plan === 'PRO' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {x.plan}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    x.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {x.status}
                  </span>
                </td>
                <td className="px-8 py-6 font-bold text-slate-600 text-sm">{getCompanyUsersCount(x.id)}</td>
                <td className="px-8 py-6 font-bold text-slate-400 text-[10px] uppercase">{x.expiryDate || 'N/A'}</td>
                <td className="px-8 py-6">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onSelectCompany(x.id)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest"
                    >
                      Gali Shirkadda
                    </button>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all">⚙️</button>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg hover:border-rose-500 hover:text-rose-600 transition-all">🚫</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD COMPANY MODAL */}
      {isAddingCompany && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-3xl border border-slate-100 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Onboard New Company</h2>
              <button onClick={() => setIsAddingCompany(false)} className="text-slate-300 hover:text-slate-500 transition-colors">✕</button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Company Details</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Company Name</label>
                    <input 
                      required
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newCompany.name || ''}
                      onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Location</label>
                    <input 
                      required
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newCompany.location || ''}
                      onChange={e => setNewCompany({...newCompany, location: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Plan</label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none"
                        value={newCompany.plan}
                        onChange={e => setNewCompany({...newCompany, plan: e.target.value as any})}
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Currency</label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none"
                        value={newCompany.currency}
                        onChange={e => setNewCompany({...newCompany, currency: e.target.value})}
                      >
                        <option value="USD">USD</option>
                        <option value="SOS">SOS</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Admin User Info</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Admin Full Name</label>
                    <input 
                      required
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={adminUser.name}
                      onChange={e => setAdminUser({...adminUser, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Username (Login)</label>
                    <input 
                      required
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={adminUser.username}
                      onChange={e => setAdminUser({...adminUser, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={adminUser.password}
                      onChange={e => setAdminUser({...adminUser, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCompany(false)} 
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Create Company & Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSManager;
