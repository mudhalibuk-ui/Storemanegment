
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
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {editingUser ? 'Bedel User-ka' : 'User Cusub'}
            </h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Magaca Buuxa</label>
              <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
              <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <input required type="password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doorka (Role)</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.STAFF}>STAFF</option>
                  <option value={UserRole.MANAGER}>MANAGER</option>
                  <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Xarunta</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.xarunId} onChange={e => setFormData({...formData, xarunId: e.target.value})}>
                  <option value="">Dhamaan</option>
                  {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
             <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]">Jooji</button>
             <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px]">Keydi</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
