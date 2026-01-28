
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
    Array(4).fill(null).map(() => ({ itemId: '', qty: 1 }))
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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[30000] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-auto md:max-w-4xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 md:p-8 border-b flex justify-between items-center ${type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800">Bulk Entry 🚀</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geli 4-5 shay hal mar</p>
          </div>
          
          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setType(TransactionType.IN)} 
              className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${type === 'IN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              IN 📥
            </button>
            <button 
              onClick={() => setType(TransactionType.OUT)} 
              className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${type === 'OUT' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              OUT 📤
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Bakhaarka</label>
              <select className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Shaqaalaha</label>
              <input required placeholder="Magaca qofka" className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" value={personnel} onChange={e => setPersonnel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">{type === 'IN' ? 'Xaggee laga keenay?' : 'Xaggee loo diray?'}</label>
              <input required placeholder="Source/Dest" className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" value={source} onChange={e => setSource(e.target.value)} />
            </div>
          </div>

          {/* Rows Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alaabta la galinayo (Items List):</p>
            {rows.map((row, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative group">
                <button 
                  type="button" 
                  onClick={() => removeRow(idx)}
                  className="absolute top-2 right-2 text-rose-300 hover:text-rose-600 p-1"
                >
                  ✕
                </button>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:border-indigo-500 outline-none"
                      value={row.itemId}
                      onChange={e => handleRowChange(idx, 'itemId', e.target.value)}
                    >
                      <option value="">Dooro Product...</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="md:hidden text-[9px] font-black text-slate-400 uppercase">Qty:</label>
                    <input 
                      type="number" 
                      placeholder="Qty" 
                      className="w-full md:w-24 p-3 rounded-xl border border-slate-200 text-center font-black text-sm bg-white" 
                      value={row.qty} 
                      onChange={e => handleRowChange(idx, 'qty', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              onClick={addRow} 
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all"
            >
              + KU DAR SAF KALE (ADD ROW)
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">Qoraal Dheeraad ah</label>
            <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs h-20 resize-none outline-none focus:border-indigo-500" placeholder="Notes for this bulk movement..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest">
            CANCEL
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={`flex-[2] py-4 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${type === 'IN' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
          >
            CONFIRM BULK {type} 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTransactionModal;
