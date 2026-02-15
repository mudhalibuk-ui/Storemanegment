
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

  // Sort branch data for better visuals
  branchData.sort((a, b) => b.value - a.value);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: OVERVIEW METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Wadarta SKUs', value: stats.totalItems, icon: '🏷️', color: 'bg-indigo-50 text-indigo-600', sub: 'Active Items' },
          { label: 'Stock-ga Yar', value: stats.lowStock, icon: '⚠️', color: 'bg-rose-50 text-rose-600', sub: 'Needs Restock' },
          { label: 'Wadarta Guud', value: stats.stockValue.toLocaleString(), icon: '📦', color: 'bg-emerald-50 text-emerald-600', sub: 'Total Units' },
          { label: 'Dhaqdhaqaaq', value: stats.recentOps, icon: '🔄', color: 'bg-amber-50 text-amber-600', sub: 'Transactions' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-md hover:scale-[1.02] flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-5xl grayscale`}>{stat.icon}</div>
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-xl shadow-sm z-10`}>
              {stat.icon}
            </div>
            <div className="z-10">
               <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: ANALYTICS & INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Qaybinta Bakhaarada</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stock Distribution by Branch</p>
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest animate-pulse">Live Data</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} 
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '12px 20px' }}
                />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>
                  {branchData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Sidebar */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[3rem] shadow-2xl text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl animate-pulse shadow-lg backdrop-blur-sm">✨</div>
            <div>
               <h3 className="text-lg font-black tracking-tight uppercase">AI Logistics</h3>
               <p className="text-[9px] font-bold uppercase opacity-60 tracking-[0.2em]">Smart Recommendations</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar relative z-10">
            {insights.length > 0 ? insights.map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 text-xs font-bold leading-relaxed shadow-lg hover:bg-white/20 transition-all">
                {insight}
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-50 text-center">
                 <span className="text-4xl mb-4">🔍</span>
                 <p className="text-[10px] font-black uppercase tracking-widest">Falanqaynaya xogta...</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10 relative z-10 text-center">
             <p className="text-[8px] font-black uppercase opacity-40 tracking-[0.3em]">Powered by Gemini AI</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT ACTIVITY */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dhaqdhaqaaqyadii Ugu Dambeeyay</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recent 5 Transactions</p>
            </div>
            <button className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest">
               View All
            </button>
         </div>
         
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                     <th className="py-4 pl-4">Alaabta</th>
                     <th className="py-4">Nooca</th>
                     <th className="py-4 text-center">Tirada</th>
                     <th className="py-4">Bakhaarka</th>
                     <th className="py-4">Waqtiga</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {recentTransactions.map(t => (
                     <tr key={t.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 pl-4">
                           <p className="text-xs font-black text-slate-700">{t.itemName}</p>
                        </td>
                        <td className="py-4">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 
                              t.type === 'OUT' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                           }`}>
                              {t.type}
                           </span>
                        </td>
                        <td className="py-4 text-center font-black text-slate-600">{t.quantity}</td>
                        <td className="py-4">
                           <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {branches.find(b => b.id === t.branchId)?.name || 'Unknown'}
                           </span>
                        </td>
                        <td className="py-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                        </td>
                     </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                     <tr>
                        <td colSpan={5} className="py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                           Ma jiro dhaqdhaqaaq dhowaan dhacay.
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
