
import React, { useState } from 'react';
import { Transaction, TransactionType, Branch } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  branches: Branch[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, branches }) => {
  const [filter, setFilter] = useState('ALL');

  const filtered = transactions.filter(t => filter === 'ALL' || t.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Dhaqdhaqaaqa Guud</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Dhammaan logs-ka stock-ga (In, Out, Transfer).</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl">
          {['ALL', 'IN', 'OUT', 'TRANSFER'].map(type => (
            <button 
              key={type}
              onClick={() => setFilter(type)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Product</th>
                <th className="px-10 py-6">Type</th>
                <th className="px-10 py-6">Qty</th>
                <th className="px-10 py-6">From/To</th>
                <th className="px-10 py-6">Personnel</th>
                <th className="px-10 py-6 text-right">Taariikhda (Date)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-5">
                    <p className="font-black text-slate-800 text-sm">{t.itemName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ID: {t.id.slice(-6)}</p>
                  </td>
                  <td className="px-10 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      t.type === TransactionType.IN ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      t.type === TransactionType.OUT ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                      'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-10 py-5 font-black text-slate-700">{t.quantity}</td>
                  <td className="px-10 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">
                        🏢 {branches.find(b => b.id === t.branchId)?.name || 'Central'}
                      </span>
                      {t.targetBranchId && (
                        <span className="text-[10px] text-indigo-500 font-bold">➔ {branches.find(b => b.id === t.targetBranchId)?.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-5 text-xs font-black text-slate-400 uppercase">{t.personnel || 'System'}</td>
                  <td className="px-10 py-5 text-right">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 inline-block">
                        <p className="text-xs font-black text-slate-800 leading-none">{new Date(t.timestamp).toLocaleDateString()}</p>
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-1">{new Date(t.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Ma jiraan wax xog ah oo la helay</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
