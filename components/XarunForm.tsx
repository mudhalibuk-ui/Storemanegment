
import React, { useState, useEffect } from 'react';
import { Xarun } from '../types';

interface XarunFormProps {
  editingXarun: Xarun | null;
  onSave: (xarun: Partial<Xarun>) => void;
  onCancel: () => void;
}

const XarunForm: React.FC<XarunFormProps> = ({ editingXarun, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (editingXarun) {
      setName(editingXarun.name);
      setLocation(editingXarun.location);
      setEmail(editingXarun.email || '');
      setPhone(editingXarun.phone || '');
      setAddress(editingXarun.address || '');
      setCurrency(editingXarun.currency || 'USD');
    }
  }, [editingXarun]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      alert("Fadlan buuxi magaca iyo magaalada!");
      return;
    }
    onSave({
      id: editingXarun?.id,
      name: name.trim(),
      location: location.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency
    });
  };

  return (
    <div className="fixed inset-0 z-[40000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">📍</div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                  {editingXarun ? 'Bedel Xarunta' : 'Xarun Cusub'}
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Center Registration</p>
              </div>
           </div>
           <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-2 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Magaca Shirkadda/Xarunta</label>
              <input 
                autoFocus
                required
                type="text"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                placeholder="e.g. Center A"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Magaalada (Location)</label>
              <input 
                required
                type="text"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                placeholder="e.g. Mogadishu"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email</label>
              <input 
                type="email"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                placeholder="info@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Taleefan</label>
              <input 
                type="text"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                placeholder="+252..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cinwaanka (Address)</label>
              <textarea 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[80px]"
                placeholder="Street, District..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Currency</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="SOS">SOS (Sh.So)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-6 sticky bottom-0 bg-white">
             <button 
               type="button" 
               onClick={onCancel} 
               className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all active:scale-95"
             >
               Jooji
             </button>
             <button 
               type="submit" 
               className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
             >
               {editingXarun ? 'Cusboonaysii' : 'Keydi Xarunta'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default XarunForm;
