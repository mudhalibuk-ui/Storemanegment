
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InventoryItem, Transaction, TransactionType, SystemSettings } from '../types';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  insights: string[];
  settings?: SystemSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ items, transactions, insights, settings }) => {
  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.quantity <= i.minThreshold).length,
    stockValue: items.reduce((acc, curr) => acc + curr.quantity, 0),
    recentOps: transactions.length
  };

  const branchData = items.reduce((acc: any[], item) => {
    const existing = acc.find(b => b.name === item.branchId);
    if (existing) {
      existing.value += item.quantity;
    } else {
      acc.push({ name: item.branchId, value: item.quantity });
    }
    return acc;
  }, []);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];
  const currency = settings?.currency || 'USD';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Wadarta SKUs', value: stats.totalItems, icon: '🏷️', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Stock-ga Yar', value: stats.lowStock, icon: '⚠️', color: 'bg-rose-50 text-rose-600' },
          { label: `Total Units`, value: stats.stockValue, icon: '📦', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Dhaqdhaqaaq', value: stats.recentOps, icon: '🔄', color: 'bg-amber-50 text-amber-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.color} flex items-center justify-center text-lg md:text-xl mb-3 md:mb-4 shadow-inner`}>
              {stat.icon}
            </div>
            <p className="text-slate-500 text-[10px] md:text-sm font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-base font-black text-slate-800 mb-6 uppercase tracking-tight">Xaaladda Branch-yada</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} hide={window.innerWidth < 768} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {branchData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">✨</span>
            <h3 className="text-lg font-black tracking-tight uppercase">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs md:text-sm leading-relaxed font-medium">
                {insight}
              </div>
            ))}
            {insights.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 opacity-40 italic text-xs font-black uppercase tracking-widest text-center">
                Falanqaynaya xogta...<br/>Hubi in AI Key uu jiro.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Dhaqdhaqaaqyadii dambe</h3>
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-4">Item</th>
                <th className="px-8 py-4">Action</th>
                <th className="px-8 py-4 text-center">Qty</th>
                <th className="px-8 py-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 font-black text-slate-700">{t.itemName}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      t.type === TransactionType.IN ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center font-black text-slate-600">{t.quantity}</td>
                  <td className="px-8 py-4 text-right text-[10px] font-black text-slate-300 uppercase">{new Date(t.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-50">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {t.type === 'IN' ? '📥' : '📤'}
                  </div>
                  <div>
                     <p className="font-black text-slate-800 text-sm leading-none mb-1">{t.itemName}</p>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleTimeString()} • {t.type}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-sm font-black text-slate-700">{t.quantity} PCS</p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
