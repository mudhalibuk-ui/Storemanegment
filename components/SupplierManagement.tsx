
import React, { useState } from 'react';
import { Supplier } from '../types';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onAdd: (s: Partial<Supplier>) => void;
  onDelete: (id: string) => void;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({ suppliers, onAdd, onDelete }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contactName: '', email: '', phone: '', category: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ name: '', contactName: '', email: '', phone: '', category: '' });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Iibiyeyaasha (Suppliers)</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Maamulka shirkadaha alaabta kuu keena.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <span className="text-xl">🤝</span> CUSUB
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all group relative">
            <button onClick={() => onDelete(s.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 transition-all">🗑️</button>
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner font-black">
              {s.name.charAt(0)}
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{s.name}</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">{s.category || 'General Supplier'}</p>
            
            <div className="space-y-3 pt-4 border-t border-slate-50">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                 <span className="opacity-40">👤</span> {s.contactName}
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                 <span className="opacity-40">📞</span> {s.phone}
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                 <span className="opacity-40">✉️</span> {s.email}
               </div>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full py-32 text-center text-slate-300 font-black italic uppercase tracking-widest">Ma jiraan iibiyeyaal la keydiyey</div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">Ku dar Iibiye Cusub</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
               <input required placeholder="Magaca Shirkadda" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               <input required placeholder="Magaca Qofka xiriirka" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                 <input placeholder="Email-ka" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                 <input placeholder="Tel-ka" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
               </div>
               <input placeholder="Nooca Alaabta (Category)" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
               
               <div className="pt-6 flex gap-4">
                 <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Jooji</button>
                 <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest">Keydi Xogta</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
