
import React, { useState } from 'react';
import { InventoryItem, Branch } from '../types';
import { numberToLetter, formatPlacement } from '../services/mappingUtils';

interface WarehouseMapProps {
  items: InventoryItem[];
  branches: Branch[];
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({ items, branches }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedItem, setSelectedItem] = useState<{item: InventoryItem | null, shelf: number, section: number} | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  
  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchItems = items.filter(i => i.branchId === selectedBranchId);

  if (!selectedBranch) return <div className="p-10 text-center">Fadlan dooro Branch.</div>;

  // Calculate stats based on actual individual shelf capacities
  let totalSlots = 0;
  for (let s = 1; s <= selectedBranch.totalShelves; s++) {
    totalSlots += selectedBranch.customSections?.[s] || selectedBranch.totalSections;
  }
  
  const occupiedSlotsCount = branchItems.length; 
  const occupancyRate = totalSlots > 0 ? ((occupiedSlotsCount / totalSlots) * 100).toFixed(1) : "0";

  const handleSlotClick = (shelf: number, section: number) => {
    const itemInSlot = branchItems.find(i => i.shelves === shelf && i.sections === section);
    setSelectedItem({
      item: itemInSlot || null,
      shelf,
      section
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Controls */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="w-full xl:w-auto">
           <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Khariidadda Iskafalada</h2>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Maamul godadka buuxa iyo kuwa faaruq ah.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
           <div className="relative w-full md:w-80">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
              <input 
                type="text"
                placeholder="Raadi alaab ku jirta map-ka..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
              />
           </div>

           <select 
             className="w-full md:w-auto px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
             value={selectedBranchId}
             onChange={(e) => setSelectedBranchId(e.target.value)}
           >
             {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
           </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wadarta Godadka (Slots)</p>
            <h4 className="text-4xl font-black text-slate-900">{totalSlots}</h4>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kuwa Buuxa (Occupied)</p>
            <div className="flex items-baseline gap-2">
               <h4 className="text-4xl font-black text-rose-600">{occupiedSlotsCount}</h4>
               <span className="text-rose-200 text-xs font-black italic">BUUXA</span>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Isticmaalka (Usage)</p>
            <div className="flex items-center gap-4">
               <h4 className="text-4xl font-black text-indigo-600">{occupancyRate}%</h4>
               <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${occupancyRate}%` }}></div>
               </div>
            </div>
         </div>
      </div>

      {/* Visual Grid */}
      <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border border-slate-100 overflow-x-auto no-scrollbar">
         <div className="flex flex-col gap-8 min-w-[800px]">
            {Array.from({ length: selectedBranch.totalShelves }).map((_, sIdx) => {
              const shelfNum = sIdx + 1;
              const shelfLetter = numberToLetter(shelfNum);
              const shelfSectionCount = selectedBranch.customSections?.[shelfNum] || selectedBranch.totalSections;
              
              return (
                <div key={shelfNum} className="flex items-start gap-4">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                      {shelfLetter}
                   </div>
                   
                   <div className="flex-1 grid grid-cols-10 gap-3">
                      {Array.from({ length: shelfSectionCount }).map((_, secIdx) => {
                        const secNum = secIdx + 1;
                        const itemInSlot = branchItems.find(i => i.shelves === shelfNum && i.sections === secNum);
                        const isOccupied = !!itemInSlot;
                        const isHighlighted = mapSearch && itemInSlot?.name.toLowerCase().includes(mapSearch.toLowerCase());

                        return (
                          <button 
                            key={secNum}
                            onClick={() => handleSlotClick(shelfNum, secNum)}
                            className={`relative h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center hover:scale-105 active:scale-95 ${
                              isHighlighted
                                ? 'bg-indigo-600 border-indigo-400 shadow-indigo-200 ring-4 ring-indigo-500/20' 
                                : isOccupied 
                                    ? 'bg-rose-50 border-rose-200 shadow-sm hover:border-rose-400' 
                                    : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-300'
                            }`}
                          >
                            <span className={`text-[10px] font-black ${isHighlighted ? 'text-indigo-200' : isOccupied ? 'text-rose-300' : 'text-emerald-300'} mb-1`}>
                              {secNum.toString().padStart(2, '0')}
                            </span>
                            
                            {isOccupied ? (
                              <div className={`text-xl ${isHighlighted ? 'scale-125' : ''}`}>📦</div>
                            ) : (
                              <div className="text-[10px] font-black text-emerald-400 opacity-40 uppercase tracking-tighter">Faruq</div>
                            )}

                            {isHighlighted && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping"></div>
                            )}
                          </button>
                        );
                      })}
                   </div>
                </div>
              );
            })}
         </div>

         <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-lg bg-emerald-50 border-2 border-emerald-200"></div>
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Faruq (Available)</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-lg bg-rose-50 border-2 border-rose-200"></div>
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Buuxa (Occupied)</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-lg bg-indigo-600 border-2 border-indigo-400"></div>
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Natiijada Raadinta</span>
            </div>
         </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div 
            className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-8 ${selectedItem.item ? 'bg-rose-50' : 'bg-slate-50'} border-b border-slate-100 flex justify-between items-center`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${selectedItem.item ? 'bg-rose-100' : 'bg-slate-200'}`}>
                  {selectedItem.item ? '📦' : '🗄️'}
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                     {formatPlacement(selectedItem.shelf, selectedItem.section)}
                   </h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Faahfaahinta Godka</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
               {selectedItem.item ? (
                 <div className="space-y-6">
                    <div className="text-center pb-6 border-b border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Magaca Alaabta</p>
                       <h4 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter">
                         {selectedItem.item.name}
                       </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-5 rounded-3xl text-center border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tirada (Qty)</p>
                          <p className="text-3xl font-black text-indigo-600">{selectedItem.item.quantity}</p>
                          <p className="text-[8px] font-bold text-indigo-300 uppercase">PCS / UNITS</p>
                       </div>
                       <div className="bg-slate-50 p-5 rounded-3xl text-center border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SKU Code</p>
                          <p className="text-sm font-black text-slate-800 mt-2">{selectedItem.item.sku}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{selectedItem.item.category}</p>
                       </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-3 border border-amber-100">
                       <span className="text-xl">📅</span>
                       <div>
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Markii u dambaysay</p>
                          <p className="text-[10px] font-bold text-amber-800">
                            {new Date(selectedItem.item.lastUpdated).toLocaleString()}
                          </p>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="py-12 text-center">
                    <div className="text-6xl mb-6 opacity-20 grayscale">🗄️</div>
                    <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Godkani waa faaruq</h4>
                    <p className="text-sm text-slate-300 font-medium mt-2">Ma jirto wax alaab ah oo hada loo qorsheeyey booskan.</p>
                 </div>
               )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <button 
                 onClick={() => setSelectedItem(null)}
                 className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest"
               >
                 Xir Pop-up-ka
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseMap;
