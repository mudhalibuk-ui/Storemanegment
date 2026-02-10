
import React, { useState } from 'react';
import { Transaction, TransactionType, Branch, InventoryItem } from '../types';
import { API } from '../services/api';

interface TransactionHistoryProps {
  transactions: Transaction[];
  branches: Branch[];
  items?: InventoryItem[];
  onRefresh?: () => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, branches, items = [], onRefresh }) => {
  const [filter, setFilter] = useState('ALL');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [itemSearch, setItemSearch] = useState('');
  const [isSearchingItem, setIsSearchingItem] = useState(false);

  const filtered = transactions.filter(t => filter === 'ALL' || t.type === filter);

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm(`Ma hubtaa inaad tirtirto dhaqdhaqaaqan? \n${transaction.itemName} - ${transaction.quantity} Units`)) return;
    
    setIsDeleting(transaction.id);
    try {
      const item = items.find(i => i.id === transaction.itemId);
      if (item) {
        let revertedQty = item.quantity;
        if (transaction.type === TransactionType.IN) {
          revertedQty -= transaction.quantity;
        } else if (transaction.type === TransactionType.OUT) {
          revertedQty += transaction.quantity;
        }
        await API.items.save({ ...item, quantity: revertedQty });
      }

      await API.transactions.delete(transaction.id);
      if (onRefresh) onRefresh();
      alert("Dhaqdhaqaaqii waa la tirtiray, stock-giina waa la saxay.");
    } catch (err) {
      alert("Cilad ayaa dhacday markii la tirtirayay.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const original = transactions.find(t => t.id === editingTransaction.id);
    if (!original) return;
    
    setIsSaving(true);
    try {
      const oldItem = items.find(i => i.id === original.itemId);
      if (oldItem) {
        let revertedQty = oldItem.quantity;
        if (original.type === TransactionType.IN) revertedQty -= original.quantity;
        else if (original.type === TransactionType.OUT) revertedQty += original.quantity;
        await API.items.save({ ...oldItem, quantity: revertedQty });
      }

      const newItem = items.find(i => i.id === editingTransaction.itemId);
      if (newItem) {
        let baseQty = newItem.quantity;
        if (oldItem && newItem.id === oldItem.id) {
          if (original.type === TransactionType.IN) baseQty -= original.quantity;
          else if (original.type === TransactionType.OUT) baseQty += original.quantity;
        }

        let finalQty = baseQty;
        if (editingTransaction.type === TransactionType.IN) finalQty += editingTransaction.quantity;
        else if (editingTransaction.type === TransactionType.OUT) finalQty -= editingTransaction.quantity;
        
        await API.items.save({ ...newItem, quantity: finalQty });
      }

      await API.transactions.update(editingTransaction.id, {
        itemId: editingTransaction.itemId,
        itemName: editingTransaction.itemName,
        quantity: editingTransaction.quantity,
        notes: editingTransaction.notes,
        personnel: editingTransaction.personnel,
        originOrSource: editingTransaction.originOrSource
      });

      setEditingTransaction(null);
      if (onRefresh) onRefresh();
      alert("Dhaqdhaqaaqa iyo stock-ga waa la saxay.");
    } catch (err) {
      console.error(err);
      alert("Cusboonaysiintu way fashilantay.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingTransaction({ ...t });
    setItemSearch(t.itemName);
    setIsSearchingItem(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">Dhaqdhaqaaqa Guud</h2>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Logs-ka Stock-ga & Taariikhda.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 md:p-2 rounded-2xl w-full md:w-auto">
          {['ALL', 'IN', 'OUT', 'TRANSFER'].map(type => (
            <button 
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${filter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-6 md:px-10 py-6">Product</th>
                <th className="px-6 md:px-10 py-6">Type</th>
                <th className="px-6 md:px-10 py-6 text-center">Qty</th>
                <th className="px-6 md:px-10 py-6">Branch</th>
                <th className="px-6 md:px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 md:px-10 py-5">
                    <p className="font-black text-slate-800 text-sm">{t.itemName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ID: {t.id.slice(-6)} • {new Date(t.timestamp).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 md:px-10 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      t.type === TransactionType.IN ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      t.type === TransactionType.OUT ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                      'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 md:px-10 py-5 font-black text-slate-700 text-center">{t.quantity}</td>
                  <td className="px-6 md:px-10 py-5">
                    <span className="text-xs font-bold text-slate-600">
                      🏢 {branches.find(b => b.id === t.branchId)?.name || 'Central'}
                    </span>
                  </td>
                  <td className="px-6 md:px-10 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => startEdit(t)}
                        className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                       >
                         📝
                       </button>
                       <button 
                        onClick={() => handleDelete(t)}
                        disabled={isDeleting === t.id}
                        className="p-2.5 bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                       >
                         {isDeleting === t.id ? '⌛' : '🗑️'}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[50000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Bedel Log-ga & Stock-ga</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Editing Trans #{editingTransaction.id.slice(-6)}</p>
               </div>
               <button onClick={() => setEditingTransaction(null)} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 flex items-center justify-center transition-all">✕</button>
             </div>
             
             <form onSubmit={handleUpdate} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                <div className="space-y-1 relative">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alaabta (Product)</label>
                   <div className="relative">
                      <input 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" 
                        value={itemSearch} 
                        onFocus={() => {
                          setIsSearchingItem(true);
                          setItemSearch(''); // Clear to show all items on focus
                        }}
                        onChange={e => {
                          setItemSearch(e.target.value);
                          setIsSearchingItem(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            if (!itemSearch && editingTransaction.itemName) {
                              setItemSearch(editingTransaction.itemName);
                            }
                            setIsSearchingItem(false);
                          }, 300);
                        }}
                      />
                      {isSearchingItem && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[60001] max-h-72 overflow-y-auto no-scrollbar ring-4 ring-indigo-500/5 animate-in slide-in-from-top-2 duration-200">
                          {(itemSearch.trim() ? items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase())) : [...items])
                            .sort((a, b) => a.name.localeCompare(b.name)) // Full List A-Z
                            .map(item => (
                            <button 
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditingTransaction({...editingTransaction, itemId: item.id, itemName: item.name});
                                setItemSearch(item.name);
                                setIsSearchingItem(false);
                              }}
                              className="w-full p-4 text-left hover:bg-indigo-50 border-b border-slate-50 flex justify-between items-center group"
                            >
                              <div>
                                <span className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{item.name}</span>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.sku}</p>
                              </div>
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded">STOCK: {item.quantity}</span>
                            </button>
                          ))}
                        </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tirada (Qty)</label>
                    <input 
                      type="number"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" 
                      value={editingTransaction.quantity} 
                      onChange={e => setEditingTransaction({...editingTransaction, quantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nooca (Type)</label>
                    <div className={`w-full p-4 rounded-2xl font-black text-center text-xs border-2 ${editingTransaction.type === 'IN' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                      {editingTransaction.type}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qofka Personnel-ka</label>
                   <input 
                    required
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" 
                    value={editingTransaction.personnel || ''} 
                    onChange={e => setEditingTransaction({...editingTransaction, personnel: e.target.value})}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Source / Destination</label>
                   <input 
                    required
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" 
                    value={editingTransaction.originOrSource || ''} 
                    onChange={e => setEditingTransaction({...editingTransaction, originOrSource: e.target.value})}
                   />
                </div>

                <div className="space-y-1 pb-20">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notes</label>
                   <textarea 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold h-20 resize-none focus:border-indigo-500 outline-none transition-all" 
                    value={editingTransaction.notes || ''} 
                    onChange={e => setEditingTransaction({...editingTransaction, notes: e.target.value})}
                   />
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2 shrink-0">
                   <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95">XIR</button>
                   <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-indigo-100 disabled:opacity-50">
                     {isSaving ? 'KEYDINAYA...' : 'CUSBOONAY SII LOG-GA'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
