
import React, { useState } from 'react';
import { InventoryItem, Branch, User, UserRole } from '../types';
import { formatPlacement } from '../services/mappingUtils';
import QRCode from 'qrcode';

interface InventoryListProps {
  user: User;
  items: InventoryItem[];
  branches: Branch[];
  onAdd: () => void;
  onImport: () => void;
  onBulkAction: () => void;
  onEdit: (item: InventoryItem) => void;
  onTransaction: (item: InventoryItem, type: 'IN' | 'OUT' | 'TRANSFER') => void;
  onViewHistory: (item: InventoryItem) => void;
  onRefresh?: () => void; 
  onDeleteAll?: () => void;
  onDelete?: (id: string) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ 
  user, items, branches, onAdd, onImport, onBulkAction, onEdit, onTransaction, onViewHistory, onRefresh, onDeleteAll, onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories: string[] = Array.from(new Set(items.map(item => item.category))).filter(Boolean) as string[];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === 'all' || item.branchId === branchFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesBranch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical Sort A-Z

  const isFilterActive = searchTerm !== '' || branchFilter !== 'all' || categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setBranchFilter('all');
    setCategoryFilter('all');
  };

  const handleDeleteClick = (id: string) => {
    if (onDelete) {
      setDeletingId(id);
      // Timeout fallback just in case onDelete is cancelled or fails silently
      setTimeout(() => setDeletingId(null), 5000);
      onDelete(id);
    }
  };

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

  // Permission Logic
  const canDelete = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Controls Card */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
            <input 
              type="text" 
              placeholder="Raadi alaabta ama SKU..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onRefresh}
            className="bg-indigo-50 text-indigo-600 p-3.5 rounded-xl border border-indigo-100 shadow-sm active:scale-90 transition-all font-bold hover:bg-indigo-600 hover:text-white"
            title="Refresh Data"
          >
            🔄
          </button>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2">
          <button 
            onClick={onBulkAction}
            className="col-span-2 bg-indigo-600 text-white p-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            🚀 BULK ACTION
          </button>
          <button 
            onClick={onAdd}
            className="bg-slate-900 text-white p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 flex-1"
          >
            ➕ Cusub
          </button>
          <button 
            onClick={onImport}
            className="bg-emerald-50 text-emerald-600 border border-emerald-100 p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1"
          >
            📥 Import
          </button>
          
          <div className="col-span-2 grid grid-cols-2 gap-2 mt-2 md:mt-0 md:flex md:flex-1">
            <select 
              className={`border-2 rounded-xl px-3 py-2 text-[10px] font-black outline-none cursor-pointer transition-all ${categoryFilter !== 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">NOOCYADA</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
            </select>
            <select 
              className={`border-2 rounded-xl px-3 py-2 text-[10px] font-black outline-none cursor-pointer transition-all ${branchFilter !== 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">BAKHAARADA</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isLow = item.quantity <= item.minThreshold;
            const branch = branches.find(b => b.id === item.branchId);
            return (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{item.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sku} • {branch?.name || 'Central'}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl flex flex-col items-center justify-center ${isLow ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <span className={`text-2xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Unit</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase">
                    {formatPlacement(item.shelves, item.sections)}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 uppercase">
                    {item.category}
                  </span>
                </div>

                <div className={`grid ${canDelete ? 'grid-cols-5' : 'grid-cols-4'} gap-2 pt-4 border-t border-slate-50`}>
                   <button onClick={() => onTransaction(item, 'IN')} className="flex flex-col items-center gap-1 p-2 bg-emerald-50 text-emerald-600 rounded-2xl active:scale-95 transition-all">
                      <span className="text-xl">📥</span>
                      <span className="text-[8px] font-black uppercase">IN</span>
                   </button>
                   <button onClick={() => onTransaction(item, 'OUT')} className="flex flex-col items-center gap-1 p-2 bg-rose-50 text-rose-600 rounded-2xl active:scale-95 transition-all">
                      <span className="text-xl">📤</span>
                      <span className="text-[8px] font-black uppercase">OUT</span>
                   </button>
                   <button onClick={() => onViewHistory(item)} className="flex flex-col items-center gap-1 p-2 bg-slate-100 text-slate-600 rounded-2xl active:scale-95 transition-all">
                      <span className="text-xl">📊</span>
                      <span className="text-[8px] font-black uppercase">Log</span>
                   </button>
                   <button onClick={() => onEdit(item)} className="flex flex-col items-center gap-1 p-2 bg-indigo-50 text-indigo-600 rounded-2xl active:scale-95 transition-all">
                      <span className="text-xl">📝</span>
                      <span className="text-[8px] font-black uppercase">Edit</span>
                   </button>
                   {canDelete && onDelete && (
                     <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="flex flex-col items-center gap-1 p-2 bg-rose-50 text-rose-600 rounded-2xl active:scale-95 transition-all border border-rose-100">
                        <span className="text-xl">{deletingId === item.id ? '⌛' : '🗑️'}</span>
                        <span className="text-[8px] font-black uppercase">Del</span>
                     </button>
                   )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Wax alaab ah lama helin</p>
             {isFilterActive && (
               <button onClick={clearFilters} className="mt-4 text-indigo-600 text-[10px] font-black uppercase underline">Nadiifi Filter-ka</button>
             )}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Product</th>
                <th className="px-8 py-6">Placement</th>
                <th className="px-8 py-6">Qty</th>
                <th className="px-8 py-6">Updated</th>
                <th className="px-8 py-6 text-center">Controls</th>
                <th className="px-8 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
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
                         <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(item.lastUpdated).toLocaleDateString()}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); onTransaction(item, 'IN'); }} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock In">📥</button>
                          <button onClick={(e) => { e.stopPropagation(); onTransaction(item, 'OUT'); }} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock Out">📤</button>
                          <button onClick={(e) => { e.stopPropagation(); onTransaction(item, 'TRANSFER'); }} className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" title="Transfer to Branch">🚛</button>
                          <button onClick={(e) => { e.stopPropagation(); onViewHistory(item); }} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="History (Graph)">📊</button>
                          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" title="Edit">📝</button>
                          {canDelete && onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 border border-rose-100" title="Delete Item">
                              {deletingId === item.id ? '⌛' : '🗑️'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={(e) => { e.stopPropagation(); printQRLabel(item); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Print QR Label">🖨️</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                      <div className="text-7xl mb-4 grayscale opacity-20">📦</div>
                      <p className="font-black uppercase tracking-[0.3em] text-xs text-slate-500">Xog lama helin</p>
                      {isFilterActive && (
                        <button onClick={clearFilters} className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Nadiifi Filter-ka</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
