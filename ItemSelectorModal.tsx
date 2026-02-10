
import React, { useState, useEffect } from 'react';
import { InventoryItem, Branch, TransactionType } from '../types';
import { formatPlacement, numberToLetter } from '../services/mappingUtils';

interface StockAdjustmentModalProps {
  item: InventoryItem;
  branches: Branch[];
  type: TransactionType.IN | TransactionType.OUT;
  onSave: (data: { qty: number; notes: string; personnel: string; source: string; placement: string; branchId: string; shelf?: number; section?: number }) => void;
  onCancel: () => void;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ item, branches, type, onSave, onCancel }) => {
  const isOut = type === TransactionType.OUT;
  const isIn = type === TransactionType.IN;
  
  const currentPlacement = formatPlacement(item.shelves, item.sections);
  
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [source, setSource] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(item.branchId);
  
  const [shelf, setShelf] = useState<number>(item.shelves || 1);
  const [section, setSection] = useState<number>(item.sections || 1);
  const [placement, setPlacement] = useState(currentPlacement);
  
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  useEffect(() => {
    setPlacement(formatPlacement(shelf, section));
  }, [shelf, section]);

  // Markay iskafalahu baddalanto, hubi in godka (section) uusan ka badneyn inta meeshaas taal
  useEffect(() => {
    if (selectedBranch) {
        const maxSections = selectedBranch.customSections?.[shelf] || selectedBranch.totalSections;
        if (section > maxSections) {
            setSection(1);
        }
    }
  }, [shelf, selectedBranch]);
  
  const headerBg = isOut ? 'bg-rose-50' : 'bg-emerald-50';
  const iconBg = isOut ? 'bg-rose-100' : 'bg-emerald-100';
  const titleColor = isOut ? 'text-rose-900' : 'text-emerald-900';
  const buttonBg = isOut ? 'bg-rose-600' : 'bg-emerald-600';
  const buttonHover = isOut ? 'hover:bg-rose-700' : 'hover:bg-emerald-700';
  const shadowColor = isOut ? 'shadow-rose-200' : 'shadow-emerald-200';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOut && qty > item.quantity) {
      alert(`Error: Ma haysid alaab kugu filan! Alaabta kuu hartay waa: ${item.quantity} kaliya.`);
      return;
    }
    onSave({ 
      qty, 
      notes, 
      personnel, 
      source, 
      placement,
      branchId: selectedBranchId,
      shelf: isIn ? shelf : undefined,
      section: isIn ? section : undefined
    });
  };

  const shelfOptions = Array.from({ length: selectedBranch?.totalShelves || 1 }, (_, i) => ({
    value: i + 1,
    label: numberToLetter(i + 1)
  }));

  // Halkan waxaan ka xisaabineynaa godadka iskafalada gaarka ah
  const currentShelfMaxSections = selectedBranch?.customSections?.[shelf] || selectedBranch?.totalSections || 1;
  const sectionOptions = Array.from({ length: currentShelfMaxSections }, (_, i) => ({
    value: i + 1,
    label: (i + 1).toString().padStart(2, '0')
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[95vh] flex flex-col border border-slate-100">
        <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${headerBg} shrink-0`}>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-[1.5rem] ${iconBg} flex items-center justify-center text-3xl shadow-sm`}>
              {isOut ? '📤' : '📥'}
            </div>
            <div>
              <h2 className={`text-2xl font-black ${titleColor} tracking-tight`}>Stock {isOut ? 'Out' : 'In'}</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{item.name}</p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-all active:scale-90"
          >
            <span className="text-xl font-bold">✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner space-y-4">
             <div className="flex justify-between items-center">
                <div>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Maduushyada Hada</p>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-slate-900">{item.quantity}</span>
                     <span className="text-xs font-bold text-slate-400">PCS</span>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Xaalada SKU</p>
                   <p className="text-[10px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-50 shadow-sm uppercase">
                      {item.sku}
                   </p>
                </div>
             </div>

             <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Branch-ga (Meesha xogtu ka socoto)</label>
                <select 
                  required
                  className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer shadow-sm"
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>🏢 {b.name} ({b.location})</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Tirada la {isOut ? 'bixinayo' : 'kordhinayo'}?</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-14 h-14 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 hover:border-indigo-200 hover:text-indigo-600 active:scale-90 transition-all bg-white shadow-sm">−</button>
                <input required type="number" min="1" className="flex-1 text-center py-4 text-3xl font-black text-slate-900 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} />
                <button type="button" onClick={() => setQty(qty + 1)} className="w-14 h-14 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 hover:border-indigo-200 hover:text-indigo-600 active:scale-90 transition-all bg-white shadow-sm">+</button>
              </div>
            </div>

            {isIn && (
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-100">
                <h3 className="text-xs font-black text-indigo-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  📍 Layout Selection (Specific for this Shelf)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Iskafalo (Shelf)</label>
                    <select 
                      className="w-full px-5 py-3.5 bg-white border-2 border-indigo-50 rounded-2xl focus:border-indigo-500 outline-none font-black text-indigo-900 shadow-sm cursor-pointer"
                      value={shelf}
                      onChange={e => setShelf(parseInt(e.target.value))}
                    >
                      {shelfOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>Iskafalo: {opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Godka (Section: 1-{currentShelfMaxSections})</label>
                    <select 
                      className="w-full px-5 py-3.5 bg-white border-2 border-indigo-50 rounded-2xl focus:border-indigo-500 outline-none font-black text-indigo-900 shadow-sm cursor-pointer"
                      value={section}
                      onChange={e => setSection(parseInt(e.target.value))}
                    >
                      {sectionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>Godka: {opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[9px] text-indigo-400 mt-3 font-bold uppercase text-center tracking-widest">
                  Hada waxaa loo qorsheeyay: <span className="text-indigo-600 underline font-black">{placement}</span>
                </p>
              </div>
            )}

            {isOut && (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                <div>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Booska Alaabta (Location)</p>
                   <p className="text-base font-black text-slate-800 tracking-tight">📍 {currentPlacement}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] text-slate-300 font-bold uppercase italic">Sida ku cad Layout-ka</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{isOut ? 'Qofka Qaadaya' : 'Qofka Keenay'}</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-800 transition-all" placeholder="Magaca qofka" value={personnel} onChange={e => setPersonnel(e.target.value)} />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{isOut ? 'Loo dirayo' : 'Laga keenay'}</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-800 transition-all" placeholder="Meesha" value={source} onChange={e => setSource(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Notes / Faahfaahin</label>
              <textarea className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none text-sm min-h-[100px] transition-all resize-none font-medium text-slate-600" placeholder="Ku qor hadii ay jiraan waxyaabo dheeraad ah..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
             <button type="button" onClick={onCancel} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
               Jooji
             </button>
             <button type="submit" className={`flex-[2] py-5 ${buttonBg} ${buttonHover} text-white font-black rounded-3xl shadow-2xl ${shadowColor} transition-all active:scale-95 uppercase text-[10px] tracking-widest`}>
               Hubi Stock {type}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;
