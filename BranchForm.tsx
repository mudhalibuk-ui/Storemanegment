
import React from 'react';
import { Branch } from '../types';

interface BranchListProps {
  branches: Branch[];
  onAdd: () => void;
  onEdit: (branch: Branch) => void;
  onDelete: (id: string) => void;
}

const BranchList: React.FC<BranchListProps> = ({ branches, onAdd, onEdit, onDelete }) => {
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Maamulka Branch-yada</h2>
          <p className="text-sm text-slate-500 font-medium">Kudar, wax ka badal, ama tirtir branch-yada ka tirsan system-ka.</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95 shrink-0"
        >
          <span className="text-lg">🏢</span> BRANCH CUSUB
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Magaca Branch-ga</th>
                <th className="px-10 py-6">Location (Magaalada)</th>
                <th className="px-10 py-6 text-center">Iskafalo (Capacity)</th>
                <th className="px-10 py-6 text-center">Godka (Sections)</th>
                <th className="px-10 py-6 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold border border-indigo-100">
                        🏢
                      </div>
                      <span className="font-black text-slate-800 text-base">{branch.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500">📍</span>
                      <span className="text-slate-600 font-bold">{branch.location}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className="text-lg font-black text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      {branch.totalShelves}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className="text-lg font-black text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      {branch.totalSections}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(branch)}
                        className="p-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Wax ka badal"
                      >
                        ⚙️
                      </button>
                      <button 
                        onClick={() => onDelete(branch.id)}
                        className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Tirtir"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {branches.length === 0 && (
          <div className="py-32 text-center bg-white">
             <div className="text-6xl mb-6 grayscale opacity-20">🏢</div>
             <p className="text-slate-800 font-black text-xl">Ma jiro wax branch ah oo jira!</p>
             <p className="text-slate-400 font-medium mt-2">Fadlan ku dar branch cusub si aad u bilowdo maamulka.</p>
             <button onClick={onAdd} className="mt-8 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
               KU DAR BRANCH HADA
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchList;
