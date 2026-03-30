
import React, { useState } from 'react';
import { Ticket, TicketStatus, User, UserRole } from '../types';
import { API } from '../services/api';

interface HelpdeskProps {
  tickets: Ticket[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

const Helpdesk: React.FC<HelpdeskProps> = ({ tickets, users, currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Partial<Ticket> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<TicketStatus | 'ALL'>('ALL');

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket?.subject || !editingTicket?.customerId) return;

    setLoading(true);
    try {
      await API.helpdesk.saveTicket({
        ...editingTicket,
        status: editingTicket.status || TicketStatus.NEW,
        priority: editingTicket.priority || 'MEDIUM',
        xarunId: currentUser.xarunId
      });
      setIsModalOpen(false);
      setEditingTicket(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = activeStatus === 'ALL' ? tickets : tickets.filter(t => t.status === activeStatus);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Helpdesk & Support</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Tickets & Issue Tracking</p>
        </div>
        <button
          onClick={() => { setEditingTicket({}); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span>+</span> Create Ticket
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', ...Object.values(TicketStatus)].map(s => (
          <button
            key={s}
            onClick={() => setActiveStatus(s as any)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeStatus === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                ticket.priority === 'URGENT' ? 'bg-rose-50' :
                ticket.priority === 'HIGH' ? 'bg-amber-50' :
                'bg-slate-50'
              }`}>
                {ticket.status === TicketStatus.CLOSED ? '✅' : '🎫'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{ticket.subject}</h4>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    ticket.priority === 'URGENT' ? 'bg-rose-100 text-rose-600' :
                    ticket.priority === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  From: {ticket.customerName} • {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</p>
                <p className="text-xs font-bold text-slate-700 uppercase">{ticket.assignedName || 'Unassigned'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  ticket.status === TicketStatus.NEW ? 'bg-indigo-100 text-indigo-600' :
                  ticket.status === TicketStatus.RESOLVED ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {ticket.status}
                </span>
                <button 
                  onClick={() => { setEditingTicket(ticket); setIsModalOpen(true); }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-indigo-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Support Ticket</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manage customer support requests</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveTicket} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editingTicket?.customerName || ''}
                    onChange={e => setEditingTicket({ ...editingTicket, customerName: e.target.value, customerId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. Ahmed Ali"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={editingTicket?.subject || ''}
                    onChange={e => setEditingTicket({ ...editingTicket, subject: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. Delivery Delay"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={editingTicket?.description || ''}
                  onChange={e => setEditingTicket({ ...editingTicket, description: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority</label>
                  <select
                    value={editingTicket?.priority || 'MEDIUM'}
                    onChange={e => setEditingTicket({ ...editingTicket, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
                  <select
                    value={editingTicket?.status || TicketStatus.NEW}
                    onChange={e => setEditingTicket({ ...editingTicket, status: e.target.value as TicketStatus })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Assign To</label>
                  <select
                    value={editingTicket?.assignedTo || ''}
                    onChange={e => {
                      const user = users.find(u => u.id === e.target.value);
                      setEditingTicket({ ...editingTicket, assignedTo: e.target.value, assignedName: user?.name });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingTicket?.id ? 'Update Ticket' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Helpdesk;
