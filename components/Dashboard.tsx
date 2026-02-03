
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InventoryItem, Transaction, TransactionType, SystemSettings, Branch } from '../types';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  insights: string[];
  branches: Branch[];
  settings?: SystemSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ items, transactions, insights, branches, settings }) => {
  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.quantity <= i.minThreshold).length,
    stockValue: items.reduce((acc, curr) => acc + curr.quantity, 0),
    recentOps: transactions.length
  };

  const branchData = items.reduce((acc: any[], item) => {
    const branch = branches.find(b => b.id === item.branchId);
    const branchName = branch ? branch.name : (item.branchId || 'Unknown');
    
    const existing = acc.find(b => b.name === branchName);
    if (existing) {
      existing.value += item.quantity;
    } else {
      acc.push({ name: branchName, value: item.quantity });
    }
    return acc;
  }, []);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const currency = settings?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Wadarta SKUs', value: stats.totalItems, icon: '🏷️', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Stock-ga Yar', value: stats.lowStock, icon: '⚠️', color: 'bg-rose-50 text-rose-600' },
          { label: `Total Units`, value: stats.stockValue.toLocaleString(), icon: '📦', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Dhaqdhaqaaq', value: stats.recentOps, icon: '🔄', color: 'bg-amber-50 text-amber-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.color} flex items-center justify-center text-lg md:text-xl mb-3 md:mb-4 shadow-inner`}>
              {stat.icon}
            </div>
            <p className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-tight">{stat.label}</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Stock-ga Bakhaarada</h3>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">Live Sync</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} 
                  hide={window.innerWidth < 768} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={45}>
                  {branchData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Sidebar */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl animate-pulse">✨</div>
            <h3 className="text-lg font-black tracking-tight uppercase">AI Logistics</h3>
          </div>
          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-[11px] md:text-xs leading-relaxed font-bold">
                {insight}
              </div>
            ))}
            {insights.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 opacity-40 italic text-xs font-black uppercase tracking-[0.2em] text-center">
                <div className="mb-4">🔍</div>
                Falanqaynaya xogta cusub...<br/>Hubi internet-kaaga.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Dhaqdhaqaaqyadii Ugu Dambeeyay</h3>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-5">Product Name</th>
                <th className="px-10 py-5">Action</th>
                <th className="px-10 py-5 text-center">Quantity</th>
                <th className="px-10 py-5">Branch</th>
                <th className="px-10 py-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm leading-tight">{t.itemName}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {t.id.slice(-6)}</span>
                    </div>
                  </td>
                  <td className="px-10 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      t.type === TransactionType.IN ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      t.type === TransactionType.OUT ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-10 py-4 text-center font-black text-slate-700">{t.quantity}</td>
                  <td className="px-10 py-4">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      🏢 {branches.find(b => b.id === t.branchId)?.name || 'Central'}
                    </span>
                  </td>
                  <td className="px-10 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-slate-800 uppercase">{new Date(t.timestamp).toLocaleDateString()}</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                    Ma jiro dhaqdhaqaaq weli la diwaangaliyay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
