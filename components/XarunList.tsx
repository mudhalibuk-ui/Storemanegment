
import React from 'react';
import { Xarun } from '../types';

interface XarunListProps {
  xarumo: Xarun[];
  onAdd: () => void;
  onEdit: (xarun: Xarun) => void;
  onDelete: (id: string) => void;
  onSelectXarun: (id: string) => void;
}

const XarunList: React.FC<XarunListProps> = ({ xarumo, onAdd, onEdit, onDelete, onSelectXarun }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Maamulka Xarumaha</h2>
          <p className="text-sm text-slate-500 font-medium">Halkan ku dar ama ku maamul xarumaha guud ee ganacsiga.</p>
        </div>
        <button 
          onClick={(e) => { e.preventDefault(); onAdd(); }} 
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
        >
          + XARUN CUSUB
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {xarumo.map(x => (
          <div 
            key={x.id} 
            onClick={() => onSelectXarun(x.id)}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group relative cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100/50 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10" onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">📍</div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(x); }} 
                  className="p-3 bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  title="Bedel"
                >
                  ⚙️
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm(`Ma hubtaa inaad tirtirto xarunta: ${x.name}?`)) onDelete(x.id); }} 
                  className="p-3 bg-white text-rose-500 border border-rose-100 hover:bg-rose-600 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  title="Tir-tir"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xl font-black text-slate-800">{x.name}</h3>
              <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">{x.location}</p>
              
              <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[10px] font-black text-indigo-500 hover:underline uppercase tracking-tight">Eeg Bakhaarada →</span>
                 <span className="text-[10px] text-slate-300 font-bold uppercase">ID: {x.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        ))}
        {xarumo.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-black uppercase tracking-widest">Ma jirto wax Xarun ah oo hadda diwaangashan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default XarunList;
