
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

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (editingBranch) {
      setFormData({
        ...editingBranch,
        customSections: editingBranch.customSections || {}
      });
      if (editingBranch.customSections && Object.keys(editingBranch.customSections).length > 0) {
        setShowAdvanced(true);
      }
    } else if (xarumo.length > 0) {
      setFormData(prev => ({ ...prev, xarunId: xarumo[0].id }));
    }
  }, [editingBranch, xarumo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.xarunId) {
      alert("CILAD: Ma xiri kartid bakhaar haddii aysan jirin Xarun. Fadlan marka hore abuur Xarun.");
      return;
    }
    if (!formData.name?.trim()) {
      alert("Fadlan qor magaca bakhaarka.");
      return;
    }
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

  const shelfCount = formData.totalShelves || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">🏢</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingBranch ? 'Bedel Bakhaarka' : 'Bakhaar Cusub'}
              </h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Nidaamka Iskafalada & Kaydinta</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {xarumo.length === 0 && (
            <div className="p-6 bg-rose-50 border-2 border-dashed border-rose-200 rounded-[2rem] text-center">
              <p className="text-rose-600 font-black uppercase text-xs tracking-widest">⚠️ Ma jiro wax Xarun ah oo hadda diwaangashan.</p>
              <p className="text-[10px] text-rose-400 font-bold mt-1">Fadlan marka hore Xarun abuur ka hor intaadan bakhaar darin.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Xogta Guud</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Xarunta (Center)</label>
                  <select 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all cursor-pointer"
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
                    placeholder="e.g. Bakhaarka Iskaafalo"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Location (Magaalada)</label>
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
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Layout-ka Guud</h3>
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-100 space-y-4">
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
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Godadka Iskafaladii (Default)</label>
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
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-sm pb-2 z-10">
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
               {editingBranch ? 'Cusboonaysii Bakhaarka' : 'Keydi Bakhaar Cusub'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchForm;
