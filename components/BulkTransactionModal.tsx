
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
    Array(5).fill(null).map(() => ({ itemId: '', qty: 1 }))
  );

  const handleRowChange = (index: number, field: keyof BulkRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { itemId: '', qty: 1 }]);
  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.itemId && r.qty > 0);
    if (validRows.length === 0) {
      alert("Fadlan dooro ugu yaraan hal alaab!");
      return;
    }
    onSave(type, { items: validRows, notes, personnel, source, branchId: selectedBranchId });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-8 border-b flex justify-between items-center ${type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <h2 className="text-2xl font-black uppercase tracking-tight">Bulk Entry (4-5 Items) 🚀</h2>
          <div className="flex bg-white/50 p-1 rounded-xl">
            <button onClick={() => setType(TransactionType.IN)} className={`px-4 py-2 rounded-lg text-xs font-bold ${type === 'IN' ? 'bg-emerald-600 text-white' : ''}`}>IN</button>
            <button onClick={() => setType(TransactionType.OUT)} className={`px-4 py-2 rounded-lg text-xs font-bold ${type === 'OUT' ? 'bg-rose-600 text-white' : ''}`}>OUT</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-3xl">
            <input required placeholder="Personnel" className="p-3 rounded-xl border" value={personnel} onChange={e => setPersonnel(e.target.value)} />
            <input required placeholder="Source/Dest" className="p-3 rounded-xl border" value={source} onChange={e => setSource(e.target.value)} />
            <select className="p-3 rounded-xl border" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <select 
                  className="flex-1 p-3 rounded-xl border font-bold text-xs"
                  value={row.itemId}
                  onChange={e => handleRowChange(idx, 'itemId', e.target.value)}
                >
                  <option value="">Dooro Product...</option>
                  {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
                </select>
                <input type="number" placeholder="Qty" className="w-24 p-3 rounded-xl border text-center font-bold" value={row.qty} onChange={e => handleRowChange(idx, 'qty', parseInt(e.target.value))} />
                <button type="button" onClick={() => removeRow(idx)} className="text-rose-500 p-2">✕</button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="w-full py-3 border-2 border-dashed rounded-2xl text-slate-400 font-bold text-xs">+ ADD ROW</button>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">CANCEL</button>
            <button type="submit" className={`flex-1 py-4 text-white rounded-2xl font-bold ${type === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'}`}>SAVE ALL 🚀</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkTransactionModal;
