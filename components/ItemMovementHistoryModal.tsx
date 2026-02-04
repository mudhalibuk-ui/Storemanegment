
import React from 'react';
import { InventoryItem, Transaction, Branch, TransactionType } from '../types';

interface ItemMovementHistoryModalProps {
  item: InventoryItem;
  transactions: Transaction[];
  branches: Branch[];
  onClose: () => void;
}

const ItemMovementHistoryModal: React.FC<ItemMovementHistoryModalProps> = ({ item, transactions, branches, onClose }) => {
  const itemTransactions = transactions
    .filter(t => t.itemId === item.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalIn = itemTransactions.filter(t => t.type === TransactionType.IN).reduce((acc, t) => acc + t.quantity, 0);
  const totalOut = itemTransactions.filter(t => t.type === TransactionType.OUT).reduce((acc, t) => acc + t.quantity, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in duration-300 border border-slate-100">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📊</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Dhaqdhaqaaqa Alaabta</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">History: {item.name} ({item.sku})</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 flex items-center justify-center transition-colors">✕</button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock-ga Hadda</p>
            <p className="text-3xl font-black text-slate-900">{item.quantity}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Wadarta Soo gashay</p>
            <p className="text-3xl font-black text-emerald-600">+{totalIn}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Wadarta Baxday</p>
            <p className="text-3xl font-black text-rose-600">-{totalOut}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-4">
          {itemTransactions.length > 0 ? (
            itemTransactions.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 flex-1">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                     t.type === TransactionType.IN ? 'bg-emerald-50 text-emerald-600' : 
                     t.type === TransactionType.OUT ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                   }`}>
                     {t.type === TransactionType.IN ? '📥' : t.type === TransactionType.OUT ? '📤' : '🚛'}
                   </div>
                   <div>
                     <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                       {t.type} - {t.quantity} Units
                     </p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                       {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                   </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Location & Personnel</p>
                   <p className="text-xs font-bold text-slate-600">🏢 {branches.find(b => b.id === t.branchId)?.name || 'N/A'}</p>
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tight mt-0.5">👤 {t.personnel || 'System'}</p>
                </div>

                <div className="flex-1 text-right max-w-[200px]">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Notes</p>
                   <p className="text-[10px] font-medium text-slate-400 italic leading-tight truncate" title={t.notes}>
                     {t.notes || 'No extra notes.'}
                   </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-30 italic">
               <p className="text-4xl mb-4">🔄</p>
               <p className="font-black uppercase tracking-widest text-xs">Ma jiro dhaqdhaqaaq weli la diwaangaliyay.</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
           <button onClick={onClose} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">
             XIR TAARIIKHDA
           </button>
        </div>
      </div>
    </div>
  );
};

export default ItemMovementHistoryModal;
