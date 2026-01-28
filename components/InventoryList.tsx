
import React, { useState } from 'react';
import { InventoryItem, Branch } from '../types';
import { formatPlacement } from '../services/mappingUtils';
import QRCode from 'qrcode';

interface InventoryListProps {
  items: InventoryItem[];
  branches: Branch[];
  onAdd: () => void;
  onImport: () => void;
  onBulkAction: () => void;
  onEdit: (item: InventoryItem) => void;
  onTransaction: (item: InventoryItem, type: 'IN' | 'OUT' | 'TRANSFER') => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ items, branches, onAdd, onImport, onBulkAction, onEdit, onTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || item.branchId === branchFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesBranch && matchesCategory;
  });

  const printQRLabel = async (item: InventoryItem) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(item.sku);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Print Label - ${item.name}</title></head>
            <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="border: 2px solid black; padding: 20px; border-radius: 10px; text-align: center; width: 200px;">
                <h2 style="margin: 0 0 10px 0; font-size: 16px;">${item.name}</h2>
                <img src="${qrDataUrl}" style="width: 150px; height: 150px;" />
                <p style="margin: 10px 0 0 0; font-weight: bold; font-size: 14px;">SKU: ${item.sku}</p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">Slot: ${formatPlacement(item.shelves, item.sections)}</p>
              </div>
              <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200">
        <div className="relative group flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Raadi alaabta ama sku..."
              className="w-full pl-10 md:pl-14 pr-4 py-3 md:py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => (window as any).toggleScanner?.()}
            className="bg-indigo-600 p-3 rounded-xl shadow-lg text-white active:scale-90 transition-all flex items-center gap-2"
          >
            <span className="text-xl">📷</span>
            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Scan SKU</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <select 
            className="flex-1 min-w-[120px] bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3.5 text-xs md:text-sm font-bold text-slate-600 outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Noocyada (Categories)</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select 
            className="flex-1 min-w-[120px] bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3.5 text-xs md:text-sm font-bold text-slate-600 outline-none"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">Branch-yada</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={onBulkAction}
              className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 border border-indigo-100 px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-sm transition-all active:scale-95 uppercase tracking-widest"
            >
              🚀 Bulk Action
            </button>
            <button 
              onClick={onImport}
              className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-sm transition-all active:scale-95 uppercase tracking-widest"
            >
              📥 Import Excel
            </button>
            <button 
              onClick={onAdd}
              className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest"
            >
              ➕ Alaab Cusub
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Product</th>
                <th className="px-8 py-6">Placement</th>
                <th className="px-8 py-6">Qty</th>
                <th className="px-8 py-6 text-center">Controls</th>
                <th className="px-8 py-6 text-right">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.minThreshold;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-base">{item.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase">
                        {formatPlacement(item.shelves, item.sections)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-2xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onTransaction(item, 'IN')} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock In">📥</button>
                        <button onClick={() => onTransaction(item, 'OUT')} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock Out">📤</button>
                        <button onClick={() => onEdit(item)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" title="Edit">⚙️</button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => printQRLabel(item)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Print QR Label">🖨️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
             <div className="flex justify-between items-start">
                <div>
                   <h3 className="font-black text-slate-800 text-lg leading-tight">{item.name}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sku}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-center ${item.quantity <= item.minThreshold ? 'bg-rose-50' : 'bg-slate-50'}`}>
                   <p className="text-xl font-black">{item.quantity}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase">PCS</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => onTransaction(item, 'IN')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Stock In</button>
                <button onClick={() => onTransaction(item, 'OUT')} className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Stock Out</button>
                <button onClick={() => printQRLabel(item)} className="p-3 bg-slate-100 rounded-xl text-lg">🖨️</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryList;
