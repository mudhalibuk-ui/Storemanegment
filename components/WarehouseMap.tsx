
import React, { useState, useMemo } from 'react';
import { InventoryItem, Branch, User, UserRole } from '../types';
import { numberToLetter, formatPlacement } from '../services/mappingUtils';

interface WarehouseMapProps {
  user: User;
  items: InventoryItem[];
  branches: Branch[];
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({ user, items, branches }) => {
  const filteredBranches = useMemo(() => {
    if (user.role === UserRole.SUPER_ADMIN) return branches;
    return branches.filter(b => b.xarunId === user.xarunId);
  }, [branches, user]);

  const [selectedBranchId, setSelectedBranchId] = useState(filteredBranches[0]?.id || '');
  const [selectedSlot, setSelectedSlot] = useState<{items: InventoryItem[], shelf: number, section: number} | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP'); // Mobile Toggle State
  
  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchItems = items.filter(i => i.branchId === selectedBranchId);

  if (!selectedBranch) return <div className="p-10 text-center">Fadlan dooro Branch.</div>;

  const q = mapSearch.toLowerCase().trim();

  const handleSlotClick = (shelf: number, section: number) => {
    const itemsInSlot = branchItems.filter(i => i.shelves === shelf && i.sections === section);
    setSelectedSlot({
      items: itemsInSlot,
      shelf,
      section
    });
  };

  const getShelfStats = (shelfNum: number) => {
    const totalSections = selectedBranch.customSections?.[shelfNum] || selectedBranch.totalSections;
    const occupiedSections = new Set(branchItems.filter(i => i.shelves === shelfNum).map(i => i.sections)).size;
    return { total: totalSections, occupied: occupiedSections };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28">
      {/* Header & Controls */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="w-full xl:w-auto text-center xl:text-left">
           <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">Khariidadda Bakhaarka</h2>
           <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 hidden md:block">Visual Warehouse Management</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
           {/* Mobile View Toggle */}
           <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto lg:hidden">
              <button onClick={() => setViewMode('MAP')} className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MAP' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>🗺️ Map</button>
              <button onClick={() => setViewMode('LIST')} className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>📋 List</button>
           </div>

           <div className="relative w-full md:w-64">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
              <input 
                type="text"
                placeholder="Raadi..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
              />
           </div>

           <select 
             className="w-full md:w-auto px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs text-slate-700 outline-none cursor-pointer"
             value={selectedBranchId}
             onChange={(e) => setSelectedBranchId(e.target.value)}
           >
             {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
           </select>
        </div>
      </div>

      {/* VIEW: MAP (GRID) */}
      <div className={`bg-white p-4 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden ${viewMode === 'LIST' ? 'hidden lg:block' : 'block'}`}>
         <div className="overflow-x-auto no-scrollbar pb-4">
             <div className="flex flex-col gap-6 md:gap-8 min-w-[600px] md:min-w-[800px]">
                {Array.from({ length: selectedBranch.totalShelves }).map((_, sIdx) => {
                  const shelfNum = sIdx + 1;
                  const shelfLetter = numberToLetter(shelfNum);
                  const shelfSectionCount = selectedBranch.customSections?.[shelfNum] || selectedBranch.totalSections;
                  
                  return (
                    <div key={shelfNum} className="flex items-start gap-3 md:gap-4">
                       <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shrink-0">
                          {shelfLetter}
                       </div>
                       
                       <div className="flex-1 grid grid-cols-10 gap-2 md:gap-3">
                          {Array.from({ length: shelfSectionCount }).map((_, secIdx) => {
                            const secNum = secIdx + 1;
                            const itemsInSlot = branchItems.filter(i => i.shelves === shelfNum && i.sections === secNum);
                            const isHighlighted = q && itemsInSlot.some(i => 
                              (i.name || '').toLowerCase().includes(q) || 
                              (i.sku || '').toLowerCase().includes(q)
                            );
                            const isOccupied = itemsInSlot.length > 0;

                            return (
                              <button 
                                key={secNum}
                                onClick={() => handleSlotClick(shelfNum, secNum)}
                                className={`relative h-14 md:h-20 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center justify-center hover:scale-105 active:scale-95 ${
                                  isHighlighted ? 'bg-indigo-600 border-indigo-400 shadow-lg ring-2 ring-indigo-500/20 z-10' : 
                                  isOccupied ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-100'
                                }`}
                              >
                                <span className={`text-[8px] md:text-[10px] font-black ${isHighlighted ? 'text-indigo-100' : isOccupied ? 'text-rose-300' : 'text-emerald-300'} mb-0.5`}>
                                  {secNum.toString().padStart(2, '0')}
                                </span>
                                {isOccupied ? (
                                  <span className="text-sm md:text-xl">📦</span>
                                ) : (
                                  <span className="hidden md:inline text-[8px] font-black text-emerald-400 opacity-40 uppercase tracking-tighter">Free</span>
                                )}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  );
                })}
             </div>
         </div>
         <p className="text-center text-[9px] font-bold text-slate-300 uppercase mt-4 md:hidden">← Jiid si aad u aragto qaybaha kale (Scroll) →</p>
      </div>

      {/* VIEW: LIST (MOBILE ONLY OPTIMIZED) */}
      <div className={`space-y-4 lg:hidden ${viewMode === 'LIST' ? 'block' : 'hidden'}`}>
         {Array.from({ length: selectedBranch.totalShelves }).map((_, sIdx) => {
            const shelfNum = sIdx + 1;
            const stats = getShelfStats(shelfNum);
            const shelfItems = branchItems.filter(i => i.shelves === shelfNum);
            
            return (
               <div key={shelfNum} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">{numberToLetter(shelfNum)}</div>
                        <div>
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Iskafalo {numberToLetter(shelfNum)}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">{stats.occupied} / {stats.total} Occupied</p>
                        </div>
                     </div>
                     <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(stats.occupied/stats.total)*100}%`}}></div>
                     </div>
                  </div>
                  
                  {/* Mini Grid for Shelf */}
                  <div className="grid grid-cols-5 gap-2">
                     {Array.from({ length: stats.total }).map((_, secIdx) => {
                        const secNum = secIdx + 1;
                        const itemsInSlot = shelfItems.filter(i => i.sections === secNum);
                        const isOccupied = itemsInSlot.length > 0;
                        return (
                           <button 
                              key={secNum}
                              onClick={() => handleSlotClick(shelfNum, secNum)}
                              className={`h-10 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                                 isOccupied ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-300'
                              }`}
                           >
                              {secNum}
                           </button>
                        );
                     })}
                  </div>
               </div>
            );
         })}
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedSlot(null)}>
          <div 
            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center`}>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                  Booska: {formatPlacement(selectedSlot.shelf, selectedSlot.section)}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedSlot.items.length} Product(s) found</p>
              </div>
              <button onClick={() => setSelectedSlot(null)} className="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-slate-400">✕</button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 no-scrollbar">
               {selectedSlot.items.length > 0 ? (
                 selectedSlot.items.map(item => (
                    <div key={item.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center">
                       <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">{item.sku}</p>
                          <h4 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter">{item.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">CAT: {item.category}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-slate-800">{item.quantity}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">PCS</p>
                       </div>
                    </div>
                 ))
               ) : (
                 <div className="py-20 text-center">
                    <div className="text-6xl mb-6 opacity-20">🗄️</div>
                    <h4 className="text-xl font-black text-slate-400 uppercase">GODKAN WAA FAARUQ</h4>
                 </div>
               )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <button onClick={() => setSelectedSlot(null)} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[10px]">XIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseMap;
