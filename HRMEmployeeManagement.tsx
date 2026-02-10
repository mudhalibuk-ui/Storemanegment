
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
              {currentXarun ? `Bakhaarada: ${currentXarun.name}` : 'Bakhaarada (Warehouses)'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {currentXarun ? `Bakhaarada ku yaala ${currentXarun.location}.` : 'Halkan ka maamul dhamaan bakhaarada jira.'}
          </p>
        </div>
        <div className="flex gap-3">
          {filterXarunId && (
            <button 
              onClick={onClearFilter}
              className="bg-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all uppercase tracking-widest"
            >
              Dhammaan
            </button>
          )}
          <button 
            onClick={onAdd} 
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
          >
            + Bakhaar Cusub
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map(b => {
          const center = xarumo.find(x => x.id === b.xarunId);
          return (
            <div key={b.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-indigo-500 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-50 transition-colors"></div>
               
               <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">🏢</div>
                  <div className="flex gap-2">
                     <button 
                      onClick={() => onEdit(b)} 
                      className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                     >
                       ⚙️
                     </button>
                     <button 
                      onClick={() => onDelete(b.id)} 
                      className="p-2 text-rose-300 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                     >
                       🗑️
                     </button>
                  </div>
               </div>
               
               <div className="relative z-10">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">{b.name}</h3>
                 <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Magaalada:</span>
                       <span className="text-xs font-bold text-slate-600">{b.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xarunta:</span>
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${center ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                         {center ? center.name : 'Xarun lama xirin'}
                       </span>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex justify-between">
                       <div className="text-center">
                          <p className="text-[8px] font-black text-slate-300 uppercase">Iskafalo</p>
                          <p className="font-black text-slate-700">{b.totalShelves}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[8px] font-black text-slate-300 uppercase">Godad</p>
                          <p className="font-black text-slate-700">{b.totalSections}</p>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          );
        })}
        {filteredBranches.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-black uppercase tracking-widest">Ma jiraan bakhaaro halkaan ku jira.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BakhaarList;
