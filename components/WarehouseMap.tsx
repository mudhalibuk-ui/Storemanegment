
import React, { useState } from 'react';
import { InventoryItem, Branch } from '../types';
import { numberToLetter, formatPlacement } from '../services/mappingUtils';

interface WarehouseMapProps {
  items: InventoryItem[];
  branches: Branch[];
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({ items, branches }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedSlot, setSelectedSlot] = useState<{items: InventoryItem[], shelf: number, section: number} | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  
  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchItems = items.filter(i => i.branchId === selectedBranchId);

  if (!selectedBranch) return <div className="p-10 text-center">Fadlan dooro Branch.</div>;

  let totalSlots = 0;
  for (let s = 1; s <= selectedBranch.totalShelves; s++) {
    totalSlots += selectedBranch.customSections?.[s] || selectedBranch.totalSections;
  }
  
  const occupiedSlotsCount = new Set(branchItems.map(i => `${i.shelves}-${i.sections}`)).size;
  const occupancyRate = totalSlots > 0 ? ((occupiedSlotsCount / totalSlots) * 100).toFixed(1) : "0";

  const handleSlotClick = (shelf: number, section: number) => {
    const itemsInSlot = branchItems.filter(i => i.shelves === shelf && i.sections === section);
    setSelectedSlot({
      items: itemsInSlot,
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
             className="w-full md:w-auto px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none cursor-pointer"
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Godadka (Slots)</p>
            <h4 className="text-4xl font-black text-slate-900">{totalSlots}</h4>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slots Buuxa (Occupied)</p>
            <h4 className="text-4xl font-black text-rose-600">{occupiedSlotsCount}</h4>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Storage Usage</p>
            <h4 className="text-4xl font-black text-indigo-600">{occupancyRate}%</h4>
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
                        const itemsInSlot = branchItems.filter(i => i.shelves === shelfNum && i.sections === secNum);
                        const isOccupied = itemsInSlot.length > 0;
                        const isHighlighted = mapSearch && itemsInSlot.some(i => i.name.toLowerCase().includes(mapSearch.toLowerCase()) || i.sku.toLowerCase().includes(mapSearch.toLowerCase()));

                        return (
                          <button 
                            key={secNum}
                            onClick={() => handleSlotClick(shelfNum, secNum)}
                            className={`relative h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center hover:scale-105 active:scale-95 ${
                              isHighlighted
                                ? 'bg-indigo-600 border-indigo-400 shadow-indigo-200' 
                                : isOccupied 
                                    ? 'bg-rose-50 border-rose-200' 
                                    : 'bg-emerald-50 border-emerald-100'
                            }`}
                          >
                            <span className={`text-[10px] font-black ${isHighlighted ? 'text-indigo-200' : isOccupied ? 'text-rose-300' : 'text-emerald-300'} mb-1`}>
                              {secNum.toString().padStart(2, '0')}
                            </span>
                            
                            {isOccupied ? (
                              <>
                                <div className="text-xl">📦</div>
                                {itemsInSlot.length > 1 && (
                                  <span className="absolute top-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                    x{itemsInSlot.length}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="text-[10px] font-black text-emerald-400 opacity-40 uppercase tracking-tighter">Faruq</div>
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
