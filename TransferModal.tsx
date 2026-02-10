
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { InventoryItem, Transaction, Branch, TransactionType } from '../types';
import { generateReportSummary } from '../services/geminiService';

interface AdvancedReportsProps {
  items: InventoryItem[];
  transactions: Transaction[];
  branches: Branch[];
}

const AdvancedReports: React.FC<AdvancedReportsProps> = ({ items, transactions, branches }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Filter transactions based on selection
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.timestamp).toISOString().split('T')[0];
    const matchesDate = (!dateRange.start || tDate >= dateRange.start) && 
                        (!dateRange.end || tDate <= dateRange.end);
    const matchesBranch = selectedBranch === 'all' || t.branchId === selectedBranch;
    return matchesDate && matchesBranch;
  });

  // Calculate statistics
  const totalIn = filteredTransactions.filter(t => t.type === TransactionType.IN).reduce((acc, t) => acc + t.quantity, 0);
  const totalOut = filteredTransactions.filter(t => t.type === TransactionType.OUT).reduce((acc, t) => acc + t.quantity, 0);
  
  // Trend Data for Chart
  const trendData = filteredTransactions.reduce((acc: any[], t) => {
    const date = new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const existing = acc.find(d => d.date === date);
    if (existing) {
      if (t.type === TransactionType.IN) existing.in += t.quantity;
      else existing.out += t.quantity;
    } else {
      acc.push({ date, in: t.type === TransactionType.IN ? t.quantity : 0, out: t.type === TransactionType.OUT ? t.quantity : 0 });
    }
    return acc;
  }, []).slice(-10);

  // Top Products by Velocity
  const productVelocity = filteredTransactions.reduce((acc: any, t) => {
    acc[t.itemName] = (acc[t.itemName] || 0) + t.quantity;
    return acc;
  }, {});
  
  const topProducts = Object.entries(productVelocity)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    const summary = await generateReportSummary(filteredTransactions, items.length);
    setAiSummary(summary || '');
    setLoadingAI(false);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Item', 'Type', 'Qty', 'Branch', 'Personnel', 'Date'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.itemName,
      t.type,
      t.quantity,
      branches.find(b => b.id === t.branchId)?.name || 'Central',
      t.personnel || 'System',
      new Date(t.timestamp).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Control Panel */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
            <input 
              type="date" 
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700"
              value={dateRange.start}
              onChange={e => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
            <input 
              type="date" 
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700"
              value={dateRange.end}
              onChange={e => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Branch filter</label>
            <select 
              className="px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700 cursor-pointer"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <button 
            onClick={downloadCSV}
            className="flex-1 xl:flex-none px-6 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 font-black rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest"
          >
            📊 EXCEL (CSV)
          </button>
          <button 
            onClick={() => window.print()}
            className="flex-1 xl:flex-none px-6 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest"
          >
            🖨️ PRINT PDF
          </button>
          <button 
            onClick={handleGenerateAI}
            disabled={loadingAI}
            className="flex-1 xl:flex-none px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest disabled:opacity-50"
          >
            {loadingAI ? '⚙️ ANALYZING...' : '✨ AI SUMMARY'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Total Movements</p>
           <h4 className="text-4xl font-black text-slate-900">{filteredTransactions.length}</h4>
           <div className="mt-4 flex gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">+{totalIn} IN</span>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">-{totalOut} OUT</span>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Net Stock Change</p>
           <h4 className={`text-4xl font-black ${totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalIn - totalOut > 0 ? '+' : ''}{totalIn - totalOut}
           </h4>
           <p className="text-xs text-slate-400 mt-2 font-medium">Difference between Stock IN and OUT</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
           <div className="w-16 h-16 rounded-[1.5rem] bg-amber-50 text-amber-500 flex items-center justify-center text-3xl">⚠️</div>
           <div>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Items Need Restock</p>
             <h4 className="text-3xl font-black text-slate-900">{items.filter(i => i.quantity <= i.minThreshold).length}</h4>
           </div>
        </div>
      </div>

      {/* AI Summary Section */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-1000"></div>
           <div className="relative z-10">
             <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">✨</span>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">AI Report Falanqeyn</h3>
                   <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em]">Sirdoonka Macmalka ah (Gemini)</p>
                </div>
             </div>
             <div className="text-lg font-medium leading-relaxed opacity-90 whitespace-pre-wrap">
               {aiSummary}
             </div>
           </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-tight flex items-center gap-2">
             📈 Stock Flow Trends
             <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">LAST 10 DAYS</span>
           </h3>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                  />
                  <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                  <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-tight flex items-center gap-2">
             🔥 Top Products (Movement Volume)
             <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">TOP 5</span>
           </h3>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'black'}} width={120} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                    {topProducts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Transaction Breakdown Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50">
           <h3 className="text-xl font-black text-slate-800 tracking-tight">Movement Breakdown</h3>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed list for current report selection.</p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-10 py-6">Product</th>
                  <th className="px-10 py-6">Type</th>
                  <th className="px-10 py-6 text-center">Qty</th>
                  <th className="px-10 py-6">Branch</th>
                  <th className="px-10 py-6">Operator</th>
                  <th className="px-10 py-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-10 py-5">
                       <span className="font-black text-slate-700 text-sm">{t.itemName}</span>
                    </td>
                    <td className="px-10 py-5">
                       <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                         {t.type}
                       </span>
                    </td>
                    <td className="px-10 py-5 text-center font-black text-slate-600">{t.quantity}</td>
                    <td className="px-10 py-5 text-xs font-bold text-slate-400">
                      {branches.find(b => b.id === t.branchId)?.name || 'Central'}
                    </td>
                    <td className="px-10 py-5 text-xs font-black text-slate-700 uppercase">{t.personnel || 'System'}</td>
                    <td className="px-10 py-5 text-right font-bold text-slate-400 text-xs">
                      {new Date(t.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-300 font-black italic uppercase tracking-widest">Ma jiraan dhaqdhaqaaq xogtan ku saabsan</td>
                  </tr>
                )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedReports;
