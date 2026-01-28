
import React, { useState } from 'react';
import { InventoryItem, Branch } from '../types';

interface TransferModalProps {
  item: InventoryItem;
  branches: Branch[];
  onTransfer: (data: { qty: number; targetBranchId: string; notes: string; personnel: string }) => void;
  onCancel: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ item, branches, onTransfer, onCancel }) => {
  const [qty, setQty] = useState(1);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [notes, setNotes] = useState('');

  const sourceBranch = branches.find(b => b.id === item.branchId);
  const otherBranches = branches.filter(b => b.id !== item.branchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty > item.quantity) {
      alert("Tirada aad wareejinayso way ka badan tahay inta aad haysato!");
      return;
    }
    if (!targetBranchId) {
      alert("Fadlan dooro branch-ga aad u rarayso alaabta.");
      return;
    }
    onTransfer({ qty, targetBranchId, notes, personnel });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🚛</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Stock Transfer</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Wareejinta Alaabta inta u dhexaysa Branch-yada</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/60 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">From Branch</p>
              <p className="text-sm font-black text-slate-700">{sourceBranch?.name}</p>
            </div>
            <div className="px-4 text-indigo-400 animate-pulse text-xl">➔</div>
            <div className="text-center flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">To Branch</p>
              <select 
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-black text-indigo-600 outline-none"
                value={targetBranchId}
                onChange={e => setTargetBranchId(e.target.value)}
              >
                <option value="">Dooro Branch...</option>
                {otherBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alaabta: <span className="text-indigo-600">{item.name}</span></label>
              <div className="flex items-center gap-3">
                 <input 
                  type="number" 
                  min="1" 
                  max={item.quantity}
                  className="flex-1 px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-black text-slate-800"
                  value={qty}
                  onChange={e => setQty(parseInt(e.target.value) || 0)}
                 />
                 <span className="text-xs font-bold text-slate-400">/ {item.quantity}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Qofka Raraya</label>
              <input 
                required
                type="text" 
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-800"
                placeholder="Magaca darawalka/shaqaalaha"
                value={personnel}
                onChange={e => setPersonnel(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Faahfaahin (Notes)</label>
            <textarea 
              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none text-sm font-medium h-24 resize-none"
              placeholder="Sababta rarka ama xog dheeraad ah..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Jooji</button>
            <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] tracking-widest">Hada Wareeji Alaabta</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;
