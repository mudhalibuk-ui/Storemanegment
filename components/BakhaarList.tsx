
import React from 'react';
import { Branch, Xarun } from '../types';

interface BakhaarListProps {
  branches: Branch[];
  xarumo: Xarun[];
  filterXarunId: string | null;
  onClearFilter: () => void;
  onAdd: () => void;
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
}

const BakhaarList: React.FC<BakhaarListProps> = ({ branches, xarumo, filterXarunId, onClearFilter, onAdd, onEdit, onDelete }) => {
  const filteredBranches = filterXarunId 
    ? branches.filter(b => b.xarunId === filterXarunId)
    : branches;

  const currentXarun = filterXarunId 
    ? xarumo.find(x => x.id === filterXarunId)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            {filterXarunId && (
              <button onClick={onClearFilter} className="text-indigo-600 hover:text-indigo-800 p-2 -ml-2 font-black transition-transform hover:-translate-x-1">←</button>
            )}
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {currentXarun ? `Bakhaarada: ${currentXarun.name}` : 'Maamulka Bakhaarada'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {currentXarun ? `Bakhaarada ku yaala ${currentXarun.location}.` : 'Bakhaar kasta wuxuu ka tirsan yahay Xarun gaar ah.'}
          </p>
        </div>
        <div className="flex gap-3">
          {filterXarunId && (
            <button 
              onClick={onClearFilter}
              className="bg-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all uppercase tracking-widest"
            >
              Dhammaan Xarumaha
            </button>
          )}
          <button 
            onClick={(e) => { e.preventDefault(); onAdd(); }} 
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
          >
            + BAKHAAR CUSUB
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map(b => (
          <div key={b.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-indigo-500 transition-all group">
             <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">🏢</div>
                <div className="flex gap-2">
                   <button 
                    onClick={(e) => { e.preventDefault(); onEdit(b); }} 
                    className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                   >
                     ⚙️
                   </button>
                   <button 
                    onClick={(e) => { e.preventDefault(); if(confirm('Ma hubtaa inaad tirtirto bakhaarkan?')) onDelete(b.id); }} 
                    className="p-2 text-rose-300 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                   >
                     🗑️
                   </button>
                </div>
             </div>
             
             <h3 className="text-xl font-black text-slate-800">{b.name}</h3>
             <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location:</span>
                   <span className="text-xs font-bold text-slate-600">{b.location}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xarunta:</span>
                   <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                     {xarumo.find(x => x.id === b.xarunId)?.name || 'N/A'}
                   </span>
                </div>
                <div className="pt-4 border-t border-slate-50 flex justify-between">
                   <div className="text-center">
                      <p className="text-[8px] font-black text-slate-300 uppercase">Shelves</p>
                      <p className="font-black text-slate-700">{b.totalShelves}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[8px] font-black text-slate-300 uppercase">Sections</p>
                      <p className="font-black text-slate-700">{b.totalSections}</p>
                   </div>
                </div>
             </div>
          </div>
        ))}
        {filteredBranches.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-black uppercase tracking-widest">Ma jiraan bakhaaro hoos yimaada doorashadan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BakhaarList;
