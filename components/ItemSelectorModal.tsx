
import React, { useState } from 'react';
import { InventoryItem, Branch } from '../types';

interface ItemSelectorModalProps {
  items: InventoryItem[];
  branches: Branch[];
  type: 'IN' | 'OUT';
  onSelect: (item: InventoryItem) => void;
  onCancel: () => void;
}

const ItemSelectorModal: React.FC<ItemSelectorModalProps> = ({ items, branches, type, onSelect, onCancel }) => {
  const [search, setSearch] = useState('');
  
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const isOut = type === 'OUT';
  const colorClass = isOut ? 'rose' : 'emerald';

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
        <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${isOut ? 'bg-rose-50' : 'bg-emerald-50'}`}>
          <div>
            <h2 className={`text-2xl font-black ${isOut ? 'text-rose-900' : 'text-emerald-900'}`}>Dooro Alaabta ({type})</h2>
            <p className="text-sm text-slate-500 font-medium">Fadlan dooro alaabta aad rabto inaad {isOut ? 'bixiso' : 'soo galiso'}.</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
        </div>

        <div className="p-6 border-b border-slate-100">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
            <input 
              autoFocus
              type="text" 
              placeholder="Ku qor magaca ama SKU..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
          {filteredItems.map(item => (
            <button 
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-white border border-slate-100 shadow-sm group-hover:scale-110 transition-transform`}>
                  📦
                </div>
                <div>
                  <p className="font-black text-slate-800">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku} • {branches.find(b => b.id === item.branchId)?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Maduushyada</p>
                <p className="text-xl font-black text-slate-700">{item.quantity}</p>
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-bold italic">
              Wax alaab ah lama helin!
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <button onClick={onCancel} className="w-full py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all">
             JOOJI
           </button>
        </div>
      </div>
    </div>
  );
};

export default ItemSelectorModal;
