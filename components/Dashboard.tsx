
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { InventoryItem, Transaction, TransactionType, SystemSettings, Branch, User, Sale, PurchaseOrder } from '../types';
import { getSmartInsights } from '../services/geminiService';

interface DashboardProps {
  user: User;
  items: InventoryItem[];
  transactions: Transaction[];
  sales?: Sale[];
  purchaseOrders?: PurchaseOrder[];
  branches: Branch[];
  settings?: SystemSettings;
  insights?: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, items = [], transactions = [], sales = [], purchaseOrders = [], branches = [], settings }) => {
  const [smartInsights, setSmartInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.quantity <= i.minThreshold).length,
    stockValue: items.reduce((acc, curr) => acc + curr.quantity, 0),
    recentOps: transactions.length,
    dailyProfit: sales.reduce((sum, s) => sum + s.total, 0) // Mock logic for quick stats
  };

  const fetchSmartInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const data = await getSmartInsights(items, transactions, sales, purchaseOrders);
      setSmartInsights(data);
    } catch (e) {
      console.error("Insights Error", e);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [items, transactions, sales, purchaseOrders]);

  useEffect(() => {
    fetchSmartInsights();
  }, [fetchSmartInsights]);

  const cashflowData = [
    { name: 'Maanta', value: 4500, projected: 4500 },
    { name: '2 Maalmood', value: 5200, projected: 6100 },
    { name: '5 Maalmood', value: 4800, projected: 8400 },
    { name: '10 Maalmood', value: 6000, projected: 12000 },
    { name: '15 Maalmood', value: 5500, projected: 15000 },
  ];

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

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* SECTION 1: OVERVIEW METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Wadarta SKUs', value: stats.totalItems, icon: '🏷️', color: 'bg-amber-50 text-amber-600' },
          { label: 'Stock-ga Yar', value: stats.lowStock, icon: '⚠️', color: 'bg-rose-50 text-rose-600' },
          { label: 'Wadarta Iibka', value: `$${stats.dailyProfit.toLocaleString()}`, icon: '💰', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Dhaqdhaqaaq', value: stats.recentOps, icon: '🔄', color: 'bg-indigo-50 text-indigo-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between h-44 relative overflow-hidden group">
            <div className="z-10 flex items-start justify-between">
               <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-xl shadow-sm border border-current/5`}>
                 {stat.icon}
               </div>
               <span className="text-[10px] font-black p-2 bg-slate-50 rounded-lg text-slate-400">LIVE</span>
            </div>
            <div className="z-10">
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: SMART FORECASTING HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predictive Cashflow Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Saadaalinta Khasnadda (Cashflow)</h3>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">15-Day AI Projected Revenue</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Actual</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-200 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">AI Projected</span>
               </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                <Tooltip />
                <Area type="monotone" dataKey="projected" stroke="#e0e7ff" fill="#f8fafc" strokeWidth={4} strokeDasharray="10 10" />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl text-white flex flex-col border border-slate-800">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20">✨</div>
              <div>
                 <h3 className="text-xl font-black tracking-tight uppercase">Smart Hub</h3>
                 <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Manager AI Insights</p>
              </div>
           </div>

           <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
              {isLoadingInsights ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 text-center animate-pulse">
                    <span className="text-4xl mb-4">🌀</span>
                    <p className="text-[11px] font-black uppercase tracking-widest">Processing Data...</p>
                 </div>
              ) : smartInsights.length > 0 ? smartInsights.map((insight, idx) => (
                 <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          insight.type === 'FORECAST' ? 'bg-amber-500 text-amber-950' :
                          insight.type === 'EXPIRY' ? 'bg-rose-500 text-rose-950' :
                          insight.type === 'TRANSFER' ? 'bg-indigo-500 text-indigo-950' : 'bg-emerald-500 text-emerald-950'
                       }`}>
                          {insight.type}
                       </span>
                    </div>
                    <h4 className="text-sm font-black mb-1 group-hover:text-indigo-300 transition-colors">{insight.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-bold">{insight.description}</p>
                    <button className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 hover:gap-3 transition-all">
                       {insight.actionLabel} <span>→</span>
                    </button>
                 </div>
              )) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">No Smart Alerts Today</p>
                 </div>
              )}
           </div>

           <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest uppercase">Autonomous Management Ready</p>
           </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
