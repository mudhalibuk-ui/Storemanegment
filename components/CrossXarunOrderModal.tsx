import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Branch, Xarun, TransactionType, TransactionStatus, User } from '../types';
import { API } from '../services/api';

interface CrossXarunOrderModalProps {
  user: User;
  xarumo: Xarun[];
  myBranches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}

const CrossXarunOrderModal: React.FC<CrossXarunOrderModalProps> = ({ user, xarumo, myBranches, onClose, onSuccess }) => {
  const [sourceXarunId, setSourceXarunId] = useState('');
  const [sourceItems, setSourceItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState(1);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');

  // Filter out my own Xarun
  const availableXarumo = useMemo(() => xarumo.filter(x => x.id !== user.xarunId), [xarumo, user.xarunId]);

  useEffect(() => {
    if (sourceXarunId) {
      setIsLoadingItems(true);
      API.items.getAll(sourceXarunId)
        .then(items => {
            setSourceItems(items.filter(i => i.quantity > 0)); // Only show items with stock
        })
        .finally(() => setIsLoadingItems(false));
    } else {
      setSourceItems([]);
    }
  }, [sourceXarunId]);

  const selectedItem = useMemo(() => sourceItems.find(i => i.id === selectedItemId), [sourceItems, selectedItemId]);

  const handleSubmit = async () => {
    if (!selectedItem || !targetBranchId || !sourceXarunId) return;

    if (qty > selectedItem.quantity) {
        alert(`Tirada aad dalbatay (${qty}) way ka badan tahay inta taalo (${selectedItem.quantity})`);
        return;
    }

    try {
        await API.transactions.create({
            itemId: selectedItem.id,
            itemName: selectedItem.name,
            type: TransactionType.TRANSFER,
            quantity: qty,
            branchId: selectedItem.branchId, // Source Branch
            targetBranchId: targetBranchId, // My Branch (Destination)
            xarunId: sourceXarunId, // Source Xarun (Where the item is)
            requestedBy: user.id,
            status: TransactionStatus.PENDING,
            originOrSource: `Cross-Xarun Request from ${user.name}`,
            notes: notes
        });
        alert("Dalabkaaga waa la diray! Sug ogolaanshaha Xarunta kale.");
        onSuccess();
        onClose();
    } catch (e) {
        alert("Cilad ayaa dhacday markii la dirayay dalabka.");
        console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-10 bg-indigo-600 text-white flex justify-between items-center shrink-0">
           <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Dalbo Xarun Kale</h2>
              <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mt-1">Order items from another Headquarters</p>
           </div>
           <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl hover:bg-white/40 transition-all">✕</button>
        </div>

        <div className="p-10 overflow-y-auto no-scrollbar space-y-8 bg-slate-50/30">
            {/* 1. Select Source Xarun */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ka Dalbo (Source Xarun)</label>
                <select 
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    value={sourceXarunId}
                    onChange={e => { setSourceXarunId(e.target.value); setSelectedItemId(''); }}
                >
                    <option value="">-- Dooro Xarun --</option>
                    {availableXarumo.map(x => (
                        <option key={x.id} value={x.id}>{x.name} ({x.location})</option>
                    ))}
                </select>
            </div>

            {/* 2. Select Item (Only if Xarun selected) */}
            {sourceXarunId && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dooro Alaabta (Item)</label>
                    {isLoadingItems ? (
                        <div className="p-5 text-center text-slate-400 font-bold text-xs uppercase">Loading items...</div>
                    ) : (
                        <select 
                            className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                            value={selectedItemId}
                            onChange={e => setSelectedItemId(e.target.value)}
                        >
                            <option value="">-- Dooro Alaab --</option>
                            {sourceItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name} (Qty: {item.quantity})</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* 3. Quantity & Target Branch */}
            {selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tirada (Quantity)</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                min="1" 
                                max={selectedItem.quantity}
                                className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:border-indigo-500 text-center"
                                value={qty}
                                onChange={e => setQty(Number(e.target.value))}
                            />
                            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">/ {selectedItem.quantity} Available</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ku Deg (My Branch)</label>
                        <select 
                            className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:border-indigo-500"
                            value={targetBranchId}
                            onChange={e => setTargetBranchId(e.target.value)}
                        >
                            <option value="">-- Dooro Branch --</option>
                            {myBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* 4. Notes */}
            {selectedItem && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Faahfaahin (Notes)</label>
                    <textarea 
                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-bold text-slate-700 outline-none focus:border-indigo-500 h-24 resize-none"
                        placeholder="Sababta dalabka..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            )}
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
            <button onClick={onClose} className="flex-1 py-5 bg-white text-slate-400 font-black rounded-[2.5rem] uppercase text-[11px] border border-slate-200 hover:bg-slate-100 transition-all">JOOJI</button>
            <button 
                onClick={handleSubmit} 
                disabled={!selectedItem || !targetBranchId || qty <= 0}
                className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase text-[11px] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
                DIR DALABKA ➔
            </button>
        </div>
      </div>
    </div>
  );
};

export default CrossXarunOrderModal;
