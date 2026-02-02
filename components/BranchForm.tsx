
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
      // Automatically show advanced if custom sections exist
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
      alert("Fadlan dooro Xarunta uu Bakhaarku ka tirsan yahay!");
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
          {/* General Information Section */}
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

          {/* Advanced Shelf Configuration */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Qoondaynta Iskafalada (Shelf Mapping)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">U qoondee godad (sections) u gaar ah iskaafalo kasta.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest border-2 ${showAdvanced ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
              >
                {showAdvanced ? 'Xir Custom View' : 'Bedel Godadka'}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                {Array.from({ length: shelfCount }).map((_, idx) => {
                  const shelfNum = idx + 1;
                  const letter = numberToLetter(shelfNum);
                  return (
                    <div key={shelfNum} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-indigo-200 transition-colors group">
                      <div className="flex justify-between items-center px-1">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                          {letter}
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase">Godadka</span>
                      </div>
                      <input 
                        type="number"
                        min="1"
                        placeholder={formData.totalSections?.toString()}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                        value={formData.customSections?.[shelfNum] || ''}
                        onChange={e => handleCustomSectionChange(shelfNum, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            
            {!showAdvanced && (
              <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                <span className="text-3xl opacity-20">📐</span>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Dhammaan iskafalada waxay isticmaali doonaan {formData.totalSections} god (Default).</p>
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(true)}
                  className="text-[10px] font-black text-indigo-600 hover:underline uppercase"
                >
                  Guji halkan si aad u bedesho hal-hal
                </button>
              </div>
            )}
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
               className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase text-[10px] tracking-widest active:scale-95"
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
