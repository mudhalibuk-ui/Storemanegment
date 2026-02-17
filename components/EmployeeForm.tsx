
import React, { useState, useEffect } from 'react';
import { Employee, Branch, Xarun, Shift } from '../types';
import { API } from '../services/api';

interface EmployeeFormProps {
  branches: Branch[];
  xarumo: Xarun[];
  editingEmployee: Employee | null;
  onSave: (employee: Partial<Employee>) => Promise<void>; // Updated signature to Promise
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ branches, xarumo, editingEmployee, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    employeeIdCode: '',
    position: '',
    department: '',
    status: 'ACTIVE',
    joinedDate: new Date().toISOString().split('T')[0],
    xarunId: xarumo[0]?.id || '',
    branchId: '',
    shiftId: '',
    salary: 0,
    avatar: '',
    phone: '',
    email: ''
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictUser, setConflictUser] = useState<Employee | null>(null);

  useEffect(() => {
    API.shifts.getAll().then(setShifts);
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

  const handleClaimId = async () => {
    if (!conflictUser || !formData.employeeIdCode) return;
    
    if (!confirm(`Ma hubtaa inaad kala wareegto ID-ga ${formData.employeeIdCode}?\n\n- ${conflictUser.name} wuxuu qaadan doonaa ID cusub.\n- ${formData.name} wuxuu qaadan doonaa ID ${formData.employeeIdCode}.`)) return;

    setIsSaving(true);
    try {
        // 1. Change Conflict User's ID to something else
        const tempId = `${conflictUser.employeeIdCode}_OLD_${Math.floor(Math.random()*1000)}`;
        await API.employees.save({ ...conflictUser, employeeIdCode: tempId });
        
        // 2. Save Current User with the Desired ID
        await API.employees.save(formData);
        
        alert("✅ Guul: ID-ga waa la kala wareejiyay. Fadlan riix 'Sync Users' si aaladda loo saxo.");
        onCancel(); // Close form
    } catch (e: any) {
        alert("Cilad: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictUser(null);

    if (!formData.name || !formData.employeeIdCode) {
      alert("Fadlan buuxi magaca iyo ID-ga shaqaalaha.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (err: any) {
      console.error(err);
      if (err.message === "DUPLICATE_ID") {
        // Fetch the user who has this ID
        const existing = await API.employees.getByCode(formData.employeeIdCode || '');
        if (existing) {
            setConflictUser(existing);
        } else {
            alert(`CILAD: ID-ga ${formData.employeeIdCode} horey ayuu u jiraa, laakiin ma helin xogta qofka heysta.`);
        }
      } else {
        alert("Cilad ayaa dhacday: " + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">👥</div>
             <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {editingEmployee ? 'Bedel Xogta Shaqaalaha' : 'Diiwaangali Shaqaale Cusub'}
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Professional HR Profile</p>
             </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          
          {/* CONFLICT RESOLUTION ALERT */}
          {conflictUser && (
              <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl animate-in slide-in-from-top-4">
                  <div className="flex items-start gap-4">
                      <span className="text-3xl">⚠️</span>
                      <div>
                          <h3 className="text-rose-700 font-black text-lg">Cilad: ID-gan waa la isticmaalay!</h3>
                          <p className="text-rose-600 text-sm mt-1">
                              ID-ga <strong>{formData.employeeIdCode}</strong> waxaa hadda heysta shaqaale kale oo la yiraahdo:
                          </p>
                          <div className="bg-white p-3 rounded-xl border border-rose-100 mt-3 flex items-center gap-3">
                              <img src={conflictUser.avatar} className="w-10 h-10 rounded-full" alt="" />
                              <div>
                                  <p className="font-black text-slate-800">{conflictUser.name}</p>
                                  <p className="text-xs text-slate-500">{conflictUser.position}</p>
                              </div>
                          </div>
                          
                          <div className="mt-4 flex gap-3">
                              <button 
                                type="button" 
                                onClick={handleClaimId}
                                className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-rose-700 transition-all shadow-lg"
                              >
                                  Kala Wareeg ID-ga (Swap)
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setConflictUser(null)}
                                className="bg-white text-rose-600 border border-rose-200 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-rose-50 transition-all"
                              >
                                  Iska Dhaaf
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
             <img src={formData.avatar} className="w-24 h-24 rounded-[2rem] bg-white shadow-sm border-4 border-white object-cover" alt="Preview" />
             <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Profile Picture</p>
                <div className="flex gap-3">
                    <button type="button" onClick={generateNewAvatar} className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    🔄 Generate Random
                    </button>
                    <input type="text" placeholder="Or paste image URL..." className="flex-1 px-4 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Magaca Buuxa</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Code (ZKTeco User ID)</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.employeeIdCode} onChange={e => setFormData({...formData, employeeIdCode: e.target.value})} placeholder="e.g. 101" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
               <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+252..." />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
               <input type="email" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booska (Position)</label>
               <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="e.g. Manager" />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Waaxda (Department)</label>
               <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Logistics" />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Salary ($)</label>
               <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shift (Waqtiga Shaqada)</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.shiftId} onChange={e => setFormData({...formData, shiftId: e.target.value})}>
                 <option value="">-- Dooro Shift --</option>
                 {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Xarunta (Center)</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.xarunId} onChange={e => setFormData({...formData, xarunId: e.target.value})}>
                 <option value="">Dooro Xarun...</option>
                 {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
               </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
               <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                 <option value="ACTIVE">ACTIVE</option>
                 <option value="ON_LEAVE">ON LEAVE (Fasax)</option>
                 <option value="SUSPENDED">SUSPENDED</option>
                 <option value="TERMINATED">TERMINATED</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Taariikhda Billaabay</label>
               <input type="date" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" value={formData.joinedDate} onChange={e => setFormData({...formData, joinedDate: e.target.value})} />
             </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
             <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Jooji</button>
             <button 
               type="submit" 
               disabled={isSaving}
               className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
             >
               {isSaving ? 'Keydinaya...' : (editingEmployee ? 'Keydi Isbedelka' : 'Diiwaangali Shaqaalaha')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
