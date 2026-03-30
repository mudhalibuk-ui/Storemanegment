
import React, { useState } from 'react';
import { Lead, LeadStatus, User, UserRole } from '../types';
import { API } from '../services/api';

interface CRMProps {
  leads: Lead[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

const CRM: React.FC<CRMProps> = ({ leads, users, currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<Lead> | null>(null);
  const [loading, setLoading] = useState(false);

  const statuses = Object.values(LeadStatus);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead?.title || !editingLead?.contactName) return;

    setLoading(true);
    try {
      await API.crm.saveLead({
        ...editingLead,
        xarunId: currentUser.xarunId,
        ownerId: editingLead.ownerId || currentUser.id,
        status: editingLead.status || LeadStatus.NEW,
        probability: editingLead.probability || 10,
        expectedRevenue: Number(editingLead.expectedRevenue || 0),
        priority: editingLead.priority || 2
      });
      setIsModalOpen(false);
      setEditingLead(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      await API.crm.saveLead({ ...lead, status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">CRM PIPELINE</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manage your sales opportunities</p>
        </div>
        <button
          onClick={() => { setEditingLead({}); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span>+</span> New Opportunity
        </button>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar min-h-[600px]">
        {statuses.map(status => (
          <div key={status} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-[2rem] p-4 border border-slate-200/50 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{status}</h3>
              <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">
                {leads.filter(l => l.status === status).length}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {leads.filter(l => l.status === status).map(lead => (
                <div
                  key={lead.id}
                  onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{lead.title}</h4>
                    <div className={`w-2 h-2 rounded-full ${
                      lead.priority === 3 ? 'bg-rose-500' : lead.priority === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-3">{lead.contactName} {lead.companyName ? `• ${lead.companyName}` : ''}</p>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                    <div className="text-xs font-black text-indigo-600">${lead.expectedRevenue.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-slate-400">{lead.probability}% Prob.</div>
                  </div>

                  <div className="mt-3 flex gap-1">
                    {statuses.filter(s => s !== status).slice(0, 2).map(nextStatus => (
                      <button
                        key={nextStatus}
                        onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead, nextStatus as LeadStatus); }}
                        className="text-[8px] font-black uppercase tracking-tighter bg-slate-50 text-slate-400 px-2 py-1 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100"
                      >
                        Move to {nextStatus}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {editingLead?.id ? 'Edit Opportunity' : 'New Opportunity'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveLead} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Opportunity Title</label>
                  <input
                    type="text"
                    required
                    value={editingLead?.title || ''}
                    onChange={e => setEditingLead({ ...editingLead, title: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. 500 Units Bulk Order"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={editingLead?.contactName || ''}
                    onChange={e => setEditingLead({ ...editingLead, contactName: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Company</label>
                  <input
                    type="text"
                    value={editingLead?.companyName || ''}
                    onChange={e => setEditingLead({ ...editingLead, companyName: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Expected Revenue</label>
                  <input
                    type="number"
                    value={editingLead?.expectedRevenue || ''}
                    onChange={e => setEditingLead({ ...editingLead, expectedRevenue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingLead?.probability || ''}
                    onChange={e => setEditingLead({ ...editingLead, probability: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
                  <select
                    value={editingLead?.status || LeadStatus.NEW}
                    onChange={e => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority</label>
                  <select
                    value={editingLead?.priority || 2}
                    onChange={e => setEditingLead({ ...editingLead, priority: Number(e.target.value) as 1|2|3 })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : editingLead?.id ? 'Update Opportunity' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
