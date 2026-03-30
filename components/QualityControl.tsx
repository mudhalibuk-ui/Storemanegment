
import React, { useState } from 'react';
import { QCInspection, QCStatus, User, UserRole } from '../types';
import { API } from '../services/api';

interface QualityControlProps {
  inspections: QCInspection[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

const QualityControl: React.FC<QualityControlProps> = ({ inspections, users, currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Partial<QCInspection> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspection?.entityId || !editingInspection?.entityType) return;

    setLoading(true);
    try {
      await API.qc.saveInspection({
        ...editingInspection,
        inspectorId: currentUser.id,
        inspectorName: currentUser.name,
        date: new Date().toISOString().split('T')[0],
        status: editingInspection.status || QCStatus.PENDING,
        checklist: editingInspection.checklist || {}
      });
      setIsModalOpen(false);
      setEditingInspection(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving inspection:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Quality Control (QC)</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspections, Compliance & Standards</p>
        </div>
        <button
          onClick={() => { setEditingInspection({ checklist: { 'Visual Check': false, 'Quantity Match': false, 'Packaging Intact': false } }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span>+</span> New Inspection
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspector</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {inspections.map(inspection => (
              <tr key={inspection.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 font-bold text-xs text-slate-800">{inspection.date}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-xs text-slate-800">{inspection.entityName}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase">ID: {inspection.entityId}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                    {inspection.entityType}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-xs text-slate-600">{inspection.inspectorName}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    inspection.status === QCStatus.PASSED ? 'bg-emerald-100 text-emerald-600' :
                    inspection.status === QCStatus.FAILED ? 'bg-rose-100 text-rose-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {inspection.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditingInspection(inspection); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">QC Inspection</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Verify quality standards</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveInspection} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entity Type</label>
                  <select
                    required
                    value={editingInspection?.entityType || ''}
                    onChange={e => setEditingInspection({ ...editingInspection, entityType: e.target.value as any })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Select Type</option>
                    <option value="ITEM">Inventory Item</option>
                    <option value="PO">Purchase Order</option>
                    <option value="WO">Work Order</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entity Name / ID</label>
                  <input
                    type="text"
                    required
                    value={editingInspection?.entityName || ''}
                    onChange={e => setEditingInspection({ ...editingInspection, entityName: e.target.value, entityId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. PO-2024-001"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Checklist</h4>
                <div className="space-y-3">
                  {Object.entries(editingInspection?.checklist || {}).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={e => setEditingInspection({ ...editingInspection, checklist: { ...editingInspection?.checklist, [key]: e.target.checked } })}
                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Final Status</label>
                <select
                  required
                  value={editingInspection?.status || QCStatus.PENDING}
                  onChange={e => setEditingInspection({ ...editingInspection, status: e.target.value as QCStatus })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {Object.values(QCStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControl;
