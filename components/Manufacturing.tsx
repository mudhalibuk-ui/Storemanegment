
import React, { useState } from 'react';
import { BillOfMaterials, WorkOrder, WorkOrderStatus, InventoryItem, User, PackType } from '../types';
import { API } from '../services/api';

interface ManufacturingProps {
  boms: BillOfMaterials[];
  workOrders: WorkOrder[];
  items: InventoryItem[];
  currentUser: User;
  onRefresh: () => void;
}

const Manufacturing: React.FC<ManufacturingProps> = ({ boms, workOrders, items, currentUser, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'boms' | 'orders'>('orders');
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<Partial<BillOfMaterials> | null>(null);
  const [editingWo, setEditingWo] = useState<Partial<WorkOrder> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBom?.productId || !editingBom?.components?.length) return;

    setLoading(true);
    try {
      const product = items.find(i => i.id === editingBom.productId);
      await API.mrp.saveBoM({
        ...editingBom,
        productName: product?.name || 'Unknown Product',
        xarunId: currentUser.xarunId,
        totalCost: (editingBom.components || []).reduce((sum, c) => sum + (c.unitCost * c.quantity), 0) + 
                   (editingBom.laborCost || 0) + (editingBom.overheadCost || 0)
      });
      setIsBomModalOpen(false);
      setEditingBom(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving BoM:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWo?.bomId || !editingWo?.quantity) return;

    setLoading(true);
    try {
      const bom = boms.find(b => b.id === editingWo.bomId);
      await API.mrp.saveWorkOrder({
        ...editingWo,
        productId: bom?.productId,
        productName: bom?.productName,
        status: editingWo.status || WorkOrderStatus.DRAFT,
        plannedDate: editingWo.plannedDate || new Date().toISOString().split('T')[0],
        xarunId: currentUser.xarunId,
        personnel: currentUser.name
      });
      setIsWoModalOpen(false);
      setEditingWo(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving Work Order:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWoStatus = async (wo: WorkOrder, newStatus: WorkOrderStatus) => {
    try {
      await API.mrp.saveWorkOrder({ ...wo, status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating WO status:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Manufacturing (MRP)</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bills of Materials & Production Orders</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setEditingBom({ components: [] }); setIsBomModalOpen(true); }}
            className="bg-white text-slate-800 border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
          >
            <span>+</span> New BoM
          </button>
          <button
            onClick={() => { setEditingWo({}); setIsWoModalOpen(true); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <span>+</span> Plan Production
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Work Orders
        </button>
        <button
          onClick={() => setActiveTab('boms')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'boms' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bills of Materials
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workOrders.map(wo => (
            <div key={wo.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{wo.productName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Qty: {wo.quantity}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  wo.status === WorkOrderStatus.DONE ? 'bg-emerald-100 text-emerald-600' :
                  wo.status === WorkOrderStatus.IN_PROGRESS ? 'bg-indigo-100 text-indigo-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {wo.status}
                </span>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400">Planned Date</span>
                  <span className="text-slate-700">{wo.plannedDate}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-400">Personnel</span>
                  <span className="text-slate-700">{wo.personnel}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                {wo.status === WorkOrderStatus.DRAFT && (
                  <button onClick={() => updateWoStatus(wo, WorkOrderStatus.CONFIRMED)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">Confirm</button>
                )}
                {wo.status === WorkOrderStatus.CONFIRMED && (
                  <button onClick={() => updateWoStatus(wo, WorkOrderStatus.IN_PROGRESS)} className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors">Start Production</button>
                )}
                {wo.status === WorkOrderStatus.IN_PROGRESS && (
                  <button onClick={() => updateWoStatus(wo, WorkOrderStatus.DONE)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors">Mark as Done</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Components</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total Cost</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {boms.map(bom => (
                <tr key={bom.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-xs text-slate-800">{bom.reference}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-xs text-slate-800">{bom.productName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {bom.components.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500" title={c.itemName}>
                          {c.itemName.charAt(0)}
                        </div>
                      ))}
                      {bom.components.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500">
                          +{bom.components.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-xs text-indigo-600">${bom.totalCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => { setEditingBom(bom); setIsBomModalOpen(true); }} className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BOM MODAL */}
      {isBomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bill of Materials</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Define product components and costs</p>
              </div>
              <button onClick={() => setIsBomModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveBom} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Finished Product</label>
                  <select
                    required
                    value={editingBom?.productId || ''}
                    onChange={e => setEditingBom({ ...editingBom, productId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Select Product</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reference</label>
                  <input
                    type="text"
                    required
                    value={editingBom?.reference || ''}
                    onChange={e => setEditingBom({ ...editingBom, reference: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. BOM-PROD-01"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Components</h4>
                  <button
                    type="button"
                    onClick={() => setEditingBom({ ...editingBom, components: [...(editingBom?.components || []), { itemId: '', itemName: '', quantity: 1, unitCost: 0 }] })}
                    className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                  >
                    + Add Component
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                  {(editingBom?.components || []).map((comp, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <select
                          required
                          value={comp.itemId}
                          onChange={e => {
                            const item = items.find(i => i.id === e.target.value);
                            const newComps = [...(editingBom?.components || [])];
                            newComps[idx] = { ...comp, itemId: e.target.value, itemName: item?.name || '', unitCost: item?.landedCost || 0 };
                            setEditingBom({ ...editingBom, components: newComps });
                          }}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold"
                        >
                          <option value="">Select Item</option>
                          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="w-24 space-y-1">
                        <input
                          type="number"
                          required
                          value={comp.quantity}
                          onChange={e => {
                            const newComps = [...(editingBom?.components || [])];
                            newComps[idx] = { ...comp, quantity: Number(e.target.value) };
                            setEditingBom({ ...editingBom, components: newComps });
                          }}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-center"
                          placeholder="Qty"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newComps = (editingBom?.components || []).filter((_, i) => i !== idx);
                          setEditingBom({ ...editingBom, components: newComps });
                        }}
                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Labor Cost</label>
                  <input
                    type="number"
                    value={editingBom?.laborCost || ''}
                    onChange={e => setEditingBom({ ...editingBom, laborCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Overhead Cost</label>
                  <input
                    type="number"
                    value={editingBom?.overheadCost || ''}
                    onChange={e => setEditingBom({ ...editingBom, overheadCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : editingBom?.id ? 'Update BoM' : 'Create BoM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WO MODAL */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Production Order</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Plan a new manufacturing run</p>
              </div>
              <button onClick={() => setIsWoModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveWo} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select BoM</label>
                <select
                  required
                  value={editingWo?.bomId || ''}
                  onChange={e => setEditingWo({ ...editingWo, bomId: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select Bill of Materials</option>
                  {boms.map(bom => <option key={bom.id} value={bom.id}>{bom.productName} ({bom.reference})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quantity to Produce</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingWo?.quantity || ''}
                    onChange={e => setEditingWo({ ...editingWo, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Planned Date</label>
                  <input
                    type="date"
                    required
                    value={editingWo?.plannedDate || ''}
                    onChange={e => setEditingWo({ ...editingWo, plannedDate: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Planning...' : 'Confirm Production Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manufacturing;
