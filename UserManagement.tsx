
import React from 'react';
import { Transaction, TransactionStatus } from '../types';

interface ApprovalQueueProps {
  transactions: Transaction[];
  onApprove: (t: Transaction) => void;
  onReject: (id: string) => void;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ transactions, onApprove, onReject }) => {
  const pending = transactions.filter(t => t.status === TransactionStatus.PENDING);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
           <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Ogolaanshaha Admin-ka</h2>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Codsiyada bixidda (Stock Out) ee sugeya hubinta.</p>
        </div>
        <div className="bg-amber-50 px-6 py-4 rounded-[2rem] text-center border border-amber-100">
           <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Wadarta Sugaysa</p>
           <p className="text-3xl font-black text-amber-600">{pending.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pending.map(t => (
          <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 rounded-[2rem] bg-amber-50 flex items-center justify-center text-4xl shadow-inner">
                  {t.type === 'OUT' ? '📤' : '📦'}
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-800">{t.itemName}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                     <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-lg uppercase">Qty: {t.quantity}</span>
                     <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase">By: {t.personnel}</span>
                     <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-lg uppercase">To: {t.originOrSource}</span>
                  </div>
                  {t.notes && <p className="mt-4 text-xs font-medium text-slate-400 italic">"{t.notes}"</p>}
               </div>
            </div>

            <div className="flex gap-4 shrink-0">
               <button 
                onClick={() => onReject(t.id)}
                className="px-8 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all"
               >
                 Diidmo (Reject)
               </button>
               <button 
                onClick={() => onApprove(t)}
                className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"
               >
                 Ogolaansho (Approve)
               </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <div className="text-6xl grayscale opacity-20 mb-6">🛡️</div>
             <p className="text-slate-300 font-black uppercase tracking-widest">Lama hayo codsiyo sugeya ogolaansho</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
