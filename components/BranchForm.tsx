
import React, { useState, useEffect } from 'react';
import { Branch, Xarun } from '../types';
import { numberToLetter } from '../services/mappingUtils';

interface BranchFormProps {
  xarumo: Xarun[];
  editingBranch: Branch | null;
  onSave: (branch: Partial<Branch>) => void;
  onCancel: () => void;
}

const BranchForm: React.FC<BranchFormProps> = ({ xarumo, editingBranch, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    location: '',
    totalShelves: 5,
    totalSections: 10,
    customSections: {},
    xarunId: ''
  });

  useEffect(() => {
    if (editingBranch) {
      setFormData({
        ...editingBranch,
        customSections: editingBranch.customSections || {}
      });
    } else if (xarumo.length > 0) {
      setFormData(prev => ({ ...prev, xarunId: xarumo[0].id }));
    }
  }, [editingBranch, xarumo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.xarunId) {
      alert("CILAD: Fadlan marka hore abuur Xarun.");
      return;
    }
    if (!formData.name?.trim()) {
      alert("Fadlan qor magaca bakhaarka.");
      return;
    }
    onSave(formData);
  };

  const handleShelfCountChange = (val: number) => {
    const newVal = Math.max(1, Math.min(100, val));
    setFormData(prev => {
      const newCustom = { ...prev.customSections };
      // Remove custom values for removed shelves
      Object.keys(newCustom).forEach(key => {
        if (parseInt(key) > newVal) delete newCustom[parseInt(key)];
      });
      return { ...prev, totalShelves: newVal, customSections: newCustom };
    });
  };

  const handleCustomSectionChange = (shelfNum: number, count: number) => {
    setFormData(prev => ({
      ...prev,
      customSections: {
        ...prev.customSections,
        [shelfNum]: Math.max(1, count)
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">🏢</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingBranch ? 'Bedel Bakhaarka' : 'Bakhaar Cusub'}
              </h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Layout-ka Iskafalada & Godadka</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Xogta Guud</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Xarunta (Center)</label>
                  <select 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                    value={formData.xarunId}
                    onChange={e => setFormData({...formData, xarunId: e.target.value})}
                  >
                    <option value="">Dooro Xarun...</option>
                    {xarumo.map(x => (
                      <option key={x.id} value={x.id}>{x.name} ({x.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Magaca Bakhaarka</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                    placeholder="e.g. Bakhaarka 01"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Magaalada</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                    placeholder="e.g. Mogadishu"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border-2 border-dashed border-indigo-100 space-y-4">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Default Setup</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Wadarta Iskafalada</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-white border-2 border-indigo-50 rounded-2xl font-black text-indigo-900"
                      value={formData.totalShelves}
                      onChange={e => handleShelfCountChange(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Godadka (Default)</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-white border-2 border-indigo-50 rounded-2xl font-black text-indigo-900"
                      value={formData.totalSections}
                      onChange={e => setFormData({...formData, totalSections: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-indigo-400 font-bold italic leading-relaxed">
                  * Tani waa heerka caadiga ah. Haddii iskafalo kasta ay gooni tahay, isticmaal qaybta midig.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Layout-ka Iskafalada (Shelf Distribution)</h3>
                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">CUSTOMIZE ALL</span>
              </div>
              <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-6 overflow-y-auto max-h-[400px] no-scrollbar space-y-3">
                {Array.from({ length: formData.totalShelves || 0 }).map((_, idx) => {
                  const shelfNum = idx + 1;
                  const currentCount = formData.customSections?.[shelfNum] || formData.totalSections || 0;
                  return (
                    <div key={shelfNum} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">{numberToLetter(shelfNum)}</div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Iskafalo {numberToLetter(shelfNum)}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-slate-300 uppercase">Godadka:</span>
                          <input 
                            type="number" 
                            className="w-20 px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-center font-black text-indigo-600 outline-none focus:border-indigo-400 transition-all"
                            value={currentCount}
                            onChange={e => handleCustomSectionChange(shelfNum, parseInt(e.target.value) || 0)}
                          />
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-sm pb-2">
             <button 
               type="button" 
               onClick={onCancel}
               className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest active:scale-95"
             >
               Jooji
             </button>
             <button 
               type="submit"
               disabled={xarumo.length === 0}
               className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase text-[10px] tracking-widest active:scale-95 disabled:opacity-50"
             >
               {editingBranch ? 'Cusboonaysii Bakhaarka' : 'Keydi Bakhaarka'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchForm;
