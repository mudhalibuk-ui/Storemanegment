
import React, { useState, useEffect } from 'react';
import { InventoryItem, Branch, TransactionType } from '../types';

interface BulkRow {
  id: string; // Added unique ID for better React rendering and stability
  itemId: string;
  qty: number;
  searchTerm: string;
  isSearching: boolean;
}

interface BulkTransactionModalProps {
  items: InventoryItem[];
  branches: Branch[];
  onSave: (type: TransactionType.IN | TransactionType.OUT, data: { items: BulkRow[]; notes: string; personnel: string; source: string; branchId: string; date: string }) => void;
  onCancel: () => void;
}

const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({ items, branches, onSave, onCancel }) => {
  const [type, setType] = useState<TransactionType.IN | TransactionType.OUT>(TransactionType.IN);
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [personnel, setPersonnel] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Set default to 5 rows as requested
  const [rows, setRows] = useState<BulkRow[]>(
    Array(5).fill(null).map((_, idx) => ({ 
      id: `row-${Date.now()}-${idx}`, 
      itemId: '', 
      qty: 1, 
      searchTerm: '', 
      isSearching: false 
    }))
  );

  const handleRowChange = (index: number, field: keyof BulkRow, value: any) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  const addRow = () => {
    setRows(prev => [
      ...prev, 
      { id: `row-${Date.now()}-${prev.length}`, itemId: '', qty: 1, searchTerm: '', isSearching: false }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const selectItem = (index: number, item: InventoryItem) => {
    const newRows = [...rows];
    newRows[index] = { 
      ...newRows[index], 
      itemId: item.id, 
      searchTerm: item.name, 
      isSearching: false 
    };
    setRows(newRows);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.itemId && r.qty > 0);
    if (validRows.length === 0) {
      alert("Fadlan dooro ugu yaraan hal alaab oo tiri leh!");
      return;
    }
    onSave(type, { 
      items: validRows, 
      notes, 
      personnel, 
      source, 
      branchId: selectedBranchId,
      date: transactionDate
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/10 animate-in zoom-in duration-300">
        {/* Header */}
        <div className={`px-8 py-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg">🚀</div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Bulk Transaction</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maamulka alaabta badan (Full A-Z List)</p>
            </div>
          </div>
          
          <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200">
            <button 
              type="button"
              onClick={() => setType(TransactionType.IN)} 
              className={`px-6 py-2 rounded-lg text-[9px] font-black transition-all ${type === 'IN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              IN 📥
            </button>
            <button 
              type="button"
              onClick={() => setType(TransactionType.OUT)} 
              className={`px-6 py-2 rounded-lg text-[9px] font-black transition-all ${type === 'OUT' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              OUT 📤
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shrink-0">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Taariikhda</label>
              <input 
                type="date" 
                className="w-full p-3.5 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus:border-indigo-500 outline-none shadow-sm" 
                value={transactionDate} 
                onChange={e => setTransactionDate(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Bakhaarka</label>
              <select className="w-full p-3.5 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus:border-indigo-500 outline-none cursor-pointer shadow-sm" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Personnel-ka</label>
              <input required placeholder="Magaca qofka..." className="w-full p-3.5 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus:border-indigo-500 outline-none shadow-sm" value={personnel} onChange={e => setPersonnel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{type === 'IN' ? 'Laga keenay' : 'Loo diray'}</label>
              <input required placeholder="Source/Destination..." className="w-full p-3.5 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus:border-indigo-500 outline-none shadow-sm" value={source} onChange={e => setSource(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alaabta aad Process gareynayso</p>
              <button 
                type="button" 
                onClick={addRow} 
                className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
              >
                <span>+</span> KU DAR ROW
              </button>
            </div>
            
            {/* Added massive bottom padding pb-48 to ensure last item's dropdown is fully visible */}
            <div className="space-y-4 min-h-[400px] pb-48">
              {rows.map((row, idx) => {
                const searchResults = row.searchTerm.trim() ? items.filter(i => 
                   i.name.toLowerCase().includes(row.searchTerm.toLowerCase()) || 
                   i.sku.toLowerCase().includes(row.searchTerm.toLowerCase())
                ).sort((a, b) => a.name.localeCompare(b.name)) : (row.isSearching ? [...items].sort((a, b) => a.name.localeCompare(b.name)) : []);

                return (
                  <div key={row.id} className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-4 relative animate-in slide-in-from-left-2 duration-200">
                    <div className="flex-1 w-full relative">
                      <div className="relative group">
                        <input 
                          placeholder="Raadi alaabta magaceeda..." 
                          className={`w-full p-4 rounded-2xl border-2 font-bold text-sm transition-all outline-none ${row.itemId ? 'bg-indigo-50/30 border-indigo-200 text-indigo-800' : 'bg-white border-slate-200 focus:border-indigo-500'}`} 
                          value={row.searchTerm}
                          onFocus={() => {
                            handleRowChange(idx, 'isSearching', true);
                            if (row.itemId) handleRowChange(idx, 'searchTerm', ''); 
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              handleRowChange(idx, 'isSearching', false);
                              if (row.itemId && !row.searchTerm) {
                                const item = items.find(i => i.id === row.itemId);
                                if (item) handleRowChange(idx, 'searchTerm', item.name);
                              }
                            }, 300);
                          }}
                          onChange={e => {
                            handleRowChange(idx, 'searchTerm', e.target.value);
                            if (row.itemId) handleRowChange(idx, 'itemId', ''); 
                          }}
                        />
                        {row.itemId && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-lg uppercase shadow-sm">OK ✅</span>
                        )}
                      </div>

                      {row.isSearching && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[70000] h-72 overflow-y-auto no-scrollbar ring-4 ring-indigo-500/5 animate-in slide-in-from-top-2 duration-200">
                          {searchResults.length > 0 ? (
                            <div className="p-2 space-y-1">
                              {searchResults.map(item => (
                                <div 
                                  key={item.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                    selectItem(idx, item);
                                  }}
                                  className="w-full p-4 text-left hover:bg-indigo-50 rounded-2xl flex justify-between items-center transition-colors cursor-pointer group"
                                >
                                  <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600">{item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border ${item.quantity <= item.minThreshold ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}>
                                      STOCK: {item.quantity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                              <span className="text-3xl mb-2">🔎</span>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ma jiro wax alaab ah.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full md:w-32 flex flex-col gap-1 shrink-0">
                       <label className="md:hidden text-[8px] font-black text-slate-400 uppercase ml-1">Tirada</label>
                       <input 
                        type="number" 
                        placeholder="Qty" 
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 text-center font-black text-lg bg-white focus:border-indigo-500 outline-none transition-all shadow-sm" 
                        value={row.qty} 
                        onChange={e => handleRowChange(idx, 'qty', parseInt(e.target.value) || 0)} 
                      />
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeRow(idx)}
                      className="p-4 text-rose-300 hover:text-rose-600 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-90 shrink-0"
                    >
                      <span className="text-lg font-bold">✕</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 shrink-0">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Qoraal Dheeraad ah (Notes)</label>
            <textarea className="w-full p-5 bg-white border-2 border-slate-200 rounded-[2.5rem] text-sm font-medium h-24 resize-none outline-none focus:border-indigo-500 transition-all shadow-sm" placeholder="Halkan ku qor faahfaahin..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </form>

        {/* Footer - Matches screenshot buttons better */}
        <div className="px-8 py-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 shrink-0">
          <button type="button" onClick={onCancel} className="flex-1 py-5 bg-slate-200 text-slate-500 font-black rounded-3xl uppercase text-[11px] tracking-[0.2em] hover:bg-slate-300 transition-all active:scale-95 shadow-sm">
            CANCEL
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={`flex-[3] py-5 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.1em] shadow-2xl transition-all active:scale-95 ${type === 'IN' ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'}`}
          >
            HUBI BULK {type === 'IN' ? 'IN MOVE' : 'OUT MOVE'} 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTransactionModal;
