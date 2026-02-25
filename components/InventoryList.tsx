
import React, { useState, useMemo } from 'react';
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

  const categories = useMemo(() => 
    Array.from(new Set(items.map(item => item.category))).filter(Boolean) as string[]
  , [items]);

  const filteredBranches = useMemo(() => {
    if (user.role === UserRole.SUPER_ADMIN) return branches;
    return branches.filter(b => b.xarunId === user.xarunId);
  }, [branches, user]);

  // NIDAAMKA RAADINTA - (STRICT FILTERING & DEDUPLICATION)
  // GROUP BY SKU
  const groupedItems = useMemo(() => {
    // console.log("InventoryList: items count:", items.length);
    const q = searchTerm.toLowerCase().trim();
    const groups = new Map<string, InventoryItem[]>();

    items.forEach(item => {
      // 0. SCOPE CHECK: Only show items from user's xarun if not Super Admin
      // If item.xarunId is missing, we check if it belongs to a branch in the user's xarun.
      if (user.role !== UserRole.SUPER_ADMIN && user.xarunId) {
          if (item.xarunId && item.xarunId !== user.xarunId) return;
          
          // Fallback: If xarunId is missing, check branch ownership
          if (!item.xarunId) {
             const foundBranch = branches.find(b => b.id === item.branchId);
             if (foundBranch && foundBranch.xarunId !== user.xarunId) return;
             // If branch not found or branch has no xarunId, maybe hide it? 
             // Let's be safe and hide unless we are sure.
             if (!foundBranch) return; 
          }
      }

      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const supplier = (item.supplier || '').toLowerCase();

      const matchesSearch = q === '' || name.includes(q) || sku.includes(q) || category.includes(q) || supplier.includes(q);
      const matchesBranch = branchFilter === 'all' || item.branchId === branchFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

      if (matchesSearch && matchesBranch && matchesCategory) {
        const key = item.sku || item.name; // Group by SKU preferably, fallback to name
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)?.push(item);
      }
    });

    return Array.from(groups.values()).sort((a, b) => (a[0].name || '').localeCompare(b[0].name || ''));
  }, [items, searchTerm, branchFilter, categoryFilter, user]);

  const clearFilters = () => {
    setSearchTerm('');
    setBranchFilter('all');
    setCategoryFilter('all');
  };

  const handleDeleteClick = (id: string) => {
    if (onDelete && window.confirm("Ma hubtaa inaad tirtirto alaabtan?")) {
      setDeletingId(id);
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

  const canDelete = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER;

  return (
    <div className="space-y-6">
      {/* STICKY HEADER SECTION */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 md:-mx-10 md:-mt-10 p-4 md:p-10 bg-slate-50/95 backdrop-blur-md transition-all">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-md border border-slate-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              <input 
                type="text" 
                placeholder="Raadi Magaca, SKU, Category ama Supplier..."
                className="w-full pl-14 pr-12 py-4 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-[3rem] focus:border-indigo-500 focus:bg-white outline-none font-bold text-sm md:text-base transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <button 
              onClick={onRefresh}
              className="bg-slate-50 text-indigo-600 p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm active:scale-90 transition-all font-bold hover:bg-indigo-600 hover:text-white"
              title="Cusboonaysii"
            >
              🔄
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={onBulkAction}
                className="bg-[#6366f1] text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-[0.1em] shadow-lg shadow-indigo-100 flex items-center gap-3 active:scale-95 transition-all"
              >
                🚀 BULK ACTION
              </button>
              <button 
                onClick={onAdd}
                className="bg-[#1e293b] text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-[0.1em] shadow-lg flex items-center gap-3 active:scale-95 transition-all"
              >
                <span>+</span> CUSUB
              </button>
              <button 
                onClick={onImport}
                className="bg-[#ecfdf5] text-[#059669] px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-[0.1em] border border-[#d1fae5] flex items-center gap-3 active:scale-95 transition-all shadow-sm"
              >
                📥 IMPORT
              </button>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className={`flex-1 md:flex-none border-2 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black outline-none cursor-pointer transition-all ${categoryFilter !== 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">DHAMAAN NOOCYADA</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
              </select>
              <select 
                className={`flex-1 md:flex-none border-2 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-black outline-none cursor-pointer transition-all ${branchFilter !== 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">DHAMAAN BAKHAARADA</option>
                {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          
          {searchTerm && (
             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 animate-pulse">
               🔎 Natiijada la helay: {groupedItems.length} items (Grouped)
             </p>
          )}
        </div>
      </div>

      {/* MAIN TABLE SECTION - USING groupedItems */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-6 md:px-10 py-6">Product & Details</th>
                <th className="px-6 md:px-10 py-6">Stock Locations</th>
                <th className="px-6 md:px-10 py-6 text-center">Total Qty</th>
                <th className="px-6 md:px-10 py-6 text-center">Controls</th>
                <th className="px-6 md:px-10 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedItems.length > 0 ? (
                groupedItems.map((group) => {
                  const item = group[0]; // Representative item
                  const totalQty = group.reduce((sum, i) => sum + i.quantity, 0);
                  const isLow = totalQty <= item.minThreshold;
                  
                  return (
                    <tr key={item.sku || item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 md:px-10 py-6 align-top">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tighter">{item.name}</span>
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sku}</span>
                            <span className="text-[8px] md:text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">{item.category}</span>
                            {item.supplier && (
                              <span className="text-[8px] md:text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">🏭 {item.supplier}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 align-top">
                        <div className="flex flex-col gap-2">
                          {group.map(variant => {
                            const branch = branches.find(b => b.id === variant.branchId);
                            return (
                              <div key={variant.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase">🏢 {branch?.name || 'Unknown'}</span>
                                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                                    {formatPlacement(variant.shelves, variant.sections)}
                                  </span>
                                </div>
                                <span className={`text-xs font-black ${variant.quantity <= variant.minThreshold ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {variant.quantity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-center align-top">
                        <span className={`text-2xl md:text-3xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{totalQty}</span>
                      </td>
                      <td className="px-6 md:px-10 py-6 align-top">
                        <div className="flex items-center justify-center gap-1.5 md:gap-2">
                          {/* We pass the first item, but the modal should ideally handle branch selection if needed. 
                              Currently StockAdjustmentModal allows branch selection but defaults to item.branchId. 
                              Since we have multiple branches, we might want to pass the item corresponding to the user's preferred branch or just the first one.
                          */}
                          <button onClick={() => onTransaction(item, 'IN')} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock In">📥</button>
                          <button onClick={() => onTransaction(item, 'OUT')} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" title="Stock Out">📤</button>
                          <button onClick={() => onTransaction(item, 'TRANSFER')} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90" title="Transfer to Branch">🚛</button>
                          <button onClick={() => onViewHistory(item)} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="History (Graph)">📊</button>
                          <button onClick={() => onEdit(item)} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90" title="Edit">📝</button>
                          {canDelete && onDelete && (
                            <button onClick={() => handleDeleteClick(item.id)} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 border border-rose-100" title="Delete Item">
                              {deletingId === item.id ? '⌛' : '🗑️'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-right align-top">
                        <button onClick={() => printQRLabel(item)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Print QR Label">🖨️</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                      <div className="text-8xl mb-6 grayscale opacity-20">📦</div>
                      <p className="font-black uppercase tracking-[0.3em] text-sm text-slate-400 px-6 text-center">
                        {searchTerm ? `Lama helin alaab magaceedu yahay "${searchTerm}"` : "Ma jiro wax alaab ah oo hadda diwaangashan"}
                      </p>
                      {(searchTerm || branchFilter !== 'all' || categoryFilter !== 'all') && (
                        <button onClick={clearFilters} className="mt-8 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">DIB U SOO CELI DHAMAAN</button>
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
