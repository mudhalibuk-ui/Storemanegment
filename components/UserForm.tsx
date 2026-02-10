
import React, { useState, useEffect } from 'react';
import { User, UserRole, Xarun } from '../types';

interface UserFormProps {
  xarumo: Xarun[];
  editingUser: User | null;
  onSave: (user: Partial<User>) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ xarumo, editingUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    role: UserRole.STAFF,
    xarunId: xarumo[0]?.id || ''
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        ...editingUser,
        password: editingUser.password || ''
      });
    }
  }, [editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return alert("Fadlan buuxi meelaha bannaan");
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {editingUser ? 'Bedel Macluumaadka' : 'User Cusub'}
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">System Access Control</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Magaca Shaqaalaha</label>
              <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Username</label>
              <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Password</label>
              <input required type="password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Role (Doorka)</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.STAFF}>STAFF</option>
                  <option value={UserRole.MANAGER}>MANAGER</option>
                  <option value={UserRole.BUYER}>BUYER (Overseas)</option>
                  <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Xarunta</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none cursor-pointer" value={formData.xarunId} onChange={e => setFormData({...formData, xarunId: e.target.value})}>
                  <option value="">Dhammaan</option>
                  {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
             <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Jooji</button>
             <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest">Keydi Hadda</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
