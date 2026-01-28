
import React, { useState, useEffect } from 'react';
import { InventoryItem, Branch } from '../types';

interface InventoryFormProps {
  branches: Branch[];
  editingItem: InventoryItem | null;
  onSave: (item: Partial<InventoryItem>) => void;
  onCancel: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ branches, editingItem, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: '',
    sku: '',
    shelves: 1,
    sections: 1,
    quantity: 0,
    minThreshold: 5,
    branchId: branches[0]?.id || ''
  });

  useEffect(() => {
    if (editingItem) setFormData(editingItem);
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {editingItem ? 'Bedel Alaabta' : 'Ku dar Stock Cusub'}
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Product Details</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all">✖</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Magaca Alaabta</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                  placeholder="e.g. Heavy Duty Generator"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">SKU / Code</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                  placeholder="SKU-001"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nooca (Category)</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all"
                  placeholder="Hardware"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Initial Qty</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-black text-slate-800"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Stock Alert (Halis)</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-black text-slate-800"
                value={formData.minThreshold}
                onChange={e => setFormData({...formData, minThreshold: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
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
               {editingItem ? 'Hada Update-garee' : 'Hada Abuuro'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
