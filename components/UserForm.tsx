
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
    xarunId: xarumo[0]?.id || '',
    permissions: []
  });

  const allPermissions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'crm', label: 'CRM' },
    { id: 'mrp', label: 'Manufacturing' },
    { id: 'projects', label: 'Projects' },
    { id: 'fleet', label: 'Fleet' },
    { id: 'qc', label: 'Quality Control' },
    { id: 'dms', label: 'Documents' },
    { id: 'helpdesk', label: 'Helpdesk' },
    { id: 'pos', label: 'POS' },
    { id: 'customers', label: 'Customers' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'payments', label: 'Payments' },
    { id: 'financials', label: 'Financials' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'inventory-adjustment', label: 'Inventory Adjustment' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'map', label: 'Warehouse Map' },
    { id: 'xarumo', label: 'Centers' },
    { id: 'bakhaarada', label: 'Warehouses' },
    { id: 'inter-branch-transfers', label: 'Logistics' },
    { id: 'hr-employees', label: 'HR Employees' },
    { id: 'hr-attendance', label: 'HR Attendance' },
    { id: 'hr-payroll', label: 'HR Payroll' },
    { id: 'hr-reports', label: 'HR Reports' },
  ];

  useEffect(() => {
    if (editingUser) {
      setFormData({
        ...editingUser,
        name: editingUser.name || '',
        username: editingUser.username || '',
        password: editingUser.password || '',
        xarunId: editingUser.xarunId || '',
        permissions: editingUser.permissions || []
      });
    }
  }, [editingUser]);

  const togglePermission = (id: string) => {
    const current = formData.permissions || [];
    if (current.includes(id)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== id) });
    } else {
      setFormData({ ...formData, permissions: [...current, id] });
    }
  };

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

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Permissions (Features)</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl no-scrollbar border-2 border-slate-100">
                {allPermissions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePermission(p.id)}
                    className={`p-3 rounded-xl text-[9px] font-black uppercase text-left transition-all ${
                      formData.permissions?.includes(p.id)
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-slate-400 font-bold italic px-2">* Haddii eedan waxba dooran, doorka (Role) ayaa go'aaminaya waxa uu arkayo.</p>
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
