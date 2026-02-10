
import React from 'react';
import { User, UserRole, Xarun } from '../types';

interface UserManagementProps {
  users: User[];
  xarumo: Xarun[];
  onAdd: () => void;
  onEdit: (u: User) => void;
  onSwitchUser: (u: User) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, xarumo, onAdd, onEdit, onSwitchUser }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Maamulka Shaqaalaha</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Halkan ku dar ama wax ka badal Users-ka.</p>
        </div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">
          + USER CUSUB
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:border-indigo-500 transition-all group relative">
             <button 
               onClick={() => onEdit(u)}
               className="absolute top-6 right-6 p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
             >
               ⚙️
             </button>
             
             <div className="flex items-center gap-5 mb-6">
               <div className="relative">
                 <img src={u.avatar} className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm" alt="" />
                 <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white text-white ${
                   u.role === UserRole.SUPER_ADMIN ? 'bg-amber-500' : u.role === UserRole.MANAGER ? 'bg-indigo-500' : 'bg-slate-500'
                 }`}>
                   {u.role.charAt(0)}
                 </span>
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-800">{u.name}</h3>
                 <div className="flex flex-col">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                     {u.role}
                   </p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">
                     {xarumo.find(x => x.id === u.xarunId)?.name || 'Dhamaan Xarumaha'}
                   </p>
                 </div>
               </div>
             </div>
             <div className="pt-4 border-t border-slate-50">
               <button onClick={() => onSwitchUser(u)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">KALA BEDEL LOGIN-KA</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
