
import React, { useState, useEffect } from 'react';
import { Employee, Branch, Xarun } from '../types';

interface EmployeeFormProps {
  branches: Branch[];
  xarumo: Xarun[];
  editingEmployee: Employee | null;
  onSave: (employee: Partial<Employee>) => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ branches, xarumo, editingEmployee, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    employeeIdCode: '',
    position: '',
    status: 'ACTIVE',
    joinedDate: new Date().toISOString().split('T')[0],
    xarunId: xarumo[0]?.id || '',
    branchId: '',
    salary: 0,
    avatar: ''
  });

  useEffect(() => {
    if (editingEmployee) {
      setFormData(editingEmployee);
    } else {
      generateNewAvatar();
    }
  }, [editingEmployee]);

  const generateNewAvatar = () => {
    setFormData(prev => ({
      ...prev,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now() + Math.random()}`
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.employeeIdCode) {
      alert("Fadlan buuxi magaca iyo ID-ga shaqaalaha.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">👥</div>
             <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {editingEmployee ? 'Bedel Xogta Shaqaalaha' : 'Diiwaangali Shaqaale Cusub'}
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">HRM Registration Form</p>
             </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          
          {/* Avatar Edit Section */}
          <div className="flex items-center gap-6 justify-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
             <img src={formData.avatar} className="w-24 h-24 rounded-[2rem] bg-white shadow-sm border-4 border-white object-cover" alt="Preview" />
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Profile Picture</p>
                <button 
                  type="button" 
                  onClick={generateNewAvatar}
                  className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  🔄 Bedel Sawirka
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Magaca Buuxa</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Code (Manual ID)</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.employeeIdCode} onChange={e => setFormData({...formData, employeeIdCode: e.target.value})} placeholder="e.g. 101" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booska (Position)</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="e.g. Manager, Security..." />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mushaharka (Base Salary $)</label>
               <input type="number" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Xarunta (Center)</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.xarunId} onChange={e => setFormData({...formData, xarunId: e.target.value})}>
                 <option value="">Dooro Xarun...</option>
                 {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bakhaarka (Branch)</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})}>
                 <option value="">(Optional) Dooro Bakhaar...</option>
                 {branches.filter(b => !formData.xarunId || b.xarunId === formData.xarunId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                 <option value="ACTIVE">ACTIVE (Shaqeeya)</option>
                 <option value="SUSPENDED">SUSPENDED (Hakad)</option>
                 <option value="TERMINATED">TERMINATED (Shaqo joojin)</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Taariikhda Billaabay</label>
               <input type="date" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.joinedDate} onChange={e => setFormData({...formData, joinedDate: e.target.value})} />
             </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
             <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Jooji</button>
             <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all">
               {editingEmployee ? 'Keydi Isbedelka' : 'Diiwaangali Shaqaalaha'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
