
import React, { useState } from 'react';
import { InventoryItem, Branch, TransactionType } from '../types';

interface BulkRow {
  itemId: string;
  qty: number;
  shelf?: number;
  section?: number;
}

interface BulkTransactionModalProps {
  items: InventoryItem[];
  branches: Branch[];
  onSave: (type: TransactionType.IN | TransactionType.OUT, data: { items: BulkRow[]; notes: string; personnel: string; source: string; branchId: string }) => void;
  onCancel: () => void;
}

const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({ items, branches, onSave, onCancel }) => {
  const [type, setType] = useState<TransactionType.IN | TransactionType.OUT>(TransactionType.IN);
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [personnel, setPersonnel] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  
  const [rows, setRows] = useState<BulkRow[]>(
    Array(3).fill(null).map(() => ({ itemId: '', qty: 1 }))
  );

  const handleRowChange = (index: number, field: keyof BulkRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { itemId: '', qty: 1 }]);
  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.itemId && r.qty > 0);
    if (validRows.length === 0) {
      alert("Fadlan dooro ugu yaraan hal alaab oo tiri leh!");
      return;
    }
    onSave(type, { items: validRows, notes, personnel, source, branchId: selectedBranchId });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
        {/* Header */}
        <div className={`px-8 py-5 border-b flex justify-between items-center ${type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Bulk Transaction 🚀</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Multi-Item Entry Mode</p>
          </div>
          
          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setType(TransactionType.IN)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${type === 'IN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              IN 📥
            </button>
            <button 
              onClick={() => setType(TransactionType.OUT)} 
              className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${type === 'OUT' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              OUT 📤
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          {/* Metadata Section - Compact Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Bakhaarka</label>
              <select className="w-full p-3 rounded-xl border-2 border-slate-100 font-bold text-[11px] bg-slate-50 focus:border-indigo-500 outline-none" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Operator</label>
              <input required placeholder="Magaca" className="w-full p-3 rounded-xl border-2 border-slate-100 font-bold text-[11px] bg-slate-50 focus:border-indigo-500 outline-none" value={personnel} onChange={e => setPersonnel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{type === 'IN' ? 'Laga keenay' : 'Loo diray'}</label>
              <input required placeholder="Source/Dest" className="w-full p-3 rounded-xl border-2 border-slate-100 font-bold text-[11px] bg-slate-50 focus:border-indigo-500 outline-none" value={source} onChange={e => setSource(e.target.value)} />
            </div>
          </div>

          {/* Rows Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Items List</p>
              <button 
                type="button" 
                onClick={addRow} 
                className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
              >
                + ADD ROW
              </button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              {rows.map((row, idx) => (
                <div key={idx} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3 relative animate-in slide-in-from-left-2 duration-300">
                  <div className="flex-1">
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 font-black text-[11px] bg-white focus:border-indigo-500 outline-none"
                      value={row.itemId}
                      onChange={e => handleRowChange(idx, 'itemId', e.target.value)}
                    >
                      <option value="">Dooro Product...</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input 
                      type="number" 
                      placeholder="Qty" 
                      className="w-full p-3 rounded-xl border border-slate-200 text-center font-black text-xs bg-white focus:border-indigo-500 outline-none" 
                      value={row.qty} 
                      onChange={e => handleRowChange(idx, 'qty', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeRow(idx)}
                    className="p-2 text-rose-300 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Notes</label>
            <textarea className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-[11px] font-medium h-16 resize-none outline-none focus:border-indigo-500" placeholder="Faahfaahin kooban..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all">
            CANCEL
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={`flex-[2] py-4 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${type === 'IN' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
          >
            HUBI BULK {type} 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTransactionModal;
