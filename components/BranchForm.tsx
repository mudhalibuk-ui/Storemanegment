
import React, { useState, useEffect } from 'react';
import { Branch } from '../types';
import { numberToLetter } from '../services/mappingUtils';

interface BranchFormProps {
  editingBranch: Branch | null;
  onSave: (branch: Partial<Branch>) => void;
  onCancel: () => void;
}

const BranchForm: React.FC<BranchFormProps> = ({ editingBranch, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    location: '',
    totalShelves: 1,
    totalSections: 1,
    customSections: {}
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (editingBranch) {
      setFormData({
        ...editingBranch,
        customSections: editingBranch.customSections || {}
      });
    }
  }, [editingBranch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCustomSectionChange = (shelfNum: number, count: number) => {
    setFormData(prev => ({
      ...prev,
      customSections: {
        ...prev.customSections,
        [shelfNum]: count
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {editingBranch ? 'Bedel Branch-ga' : 'Kudar Branch Cusub'}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Branch & Storage Layout</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all">✖</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Magaca Branch-ga</label>
              <input 
                required
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                placeholder="e.g. Main Warehouse"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Location (Magaalada)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">📍</span>
                <input 
                  required
                  type="text" 
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                  placeholder="e.g. Mogadishu"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-100">
            <h3 className="text-xs font-black text-indigo-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
              📏 General Storage Layout
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Wadarta Iskafalada (Shelves)</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  className="w-full px-5 py-4 bg-white border-2 border-indigo-50 rounded-2xl focus:border-indigo-500 outline-none font-black text-indigo-900 shadow-sm"
                  value={formData.totalShelves}
                  onChange={e => setFormData({...formData, totalShelves: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Godadka Iskafalo kasta (Default)</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  className="w-full px-5 py-4 bg-white border-2 border-indigo-50 rounded-2xl focus:border-indigo-500 outline-none font-black text-indigo-900 shadow-sm"
                  value={formData.totalSections}
                  onChange={e => setFormData({...formData, totalSections: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button 
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-50 transition-all"
              >
                {showAdvanced ? 'DHAX-GALI KHARIIDADA GAARKA AH ⬆️' : 'U QOONDEE GODAD KALA DUWAN ISKAFALADA ⬇️'}
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Custom Section Counts per Shelf</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: formData.totalShelves || 0 }).map((_, idx) => {
                  const shelfNum = idx + 1;
                  return (
                    <div key={shelfNum} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                        {numberToLetter(shelfNum)}
                      </span>
                      <input 
                        type="number"
                        min="1"
                        placeholder={formData.totalSections?.toString()}
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none"
                        value={formData.customSections?.[shelfNum] || ''}
                        onChange={e => handleCustomSectionChange(shelfNum, parseInt(e.target.value))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white pb-2">
             <button 
               type="button" 
               onClick={onCancel}
               className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
             >
               Jooji
             </button>
             <button 
               type="submit"
               className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase text-[10px] tracking-widest"
             >
               {editingBranch ? 'Hada Bedel' : 'Hada Sameey'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchForm;
