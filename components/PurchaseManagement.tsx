
import React, { useState } from 'react';
import { Vendor, PurchaseOrder, InventoryItem, User, POStatus, Branch, SystemSettings, POItem, PackType } from '../types';
import { API } from '../services/api';
import DocumentViewer from './DocumentViewer';

interface PurchaseManagementProps {
  user: User;
  vendors: Vendor[];
  items: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  branches: Branch[];
  settings: SystemSettings;
  onRefresh: () => void;
}

const PurchaseManagement: React.FC<PurchaseManagementProps> = ({ user, vendors, items, purchaseOrders, branches, settings, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'po'>('po');
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  
  // Vendor Form State
  const [vendorData, setVendorData] = useState<Partial<Vendor>>({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    category: '',
    address: ''
  });

  // PO Form State
  const [poData, setPoData] = useState<Partial<PurchaseOrder>>({
    vendorId: '',
    total: 0,
    items: [],
    xarunId: user.xarunId || ''
  });

  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  const addItemToPO = () => {
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const newItem: POItem = {
      id: item.id,
      name: item.name,
      packType: item.packType || PackType.PCS,
      requestedQty: itemQty,
      purchasedQty: itemQty,
      lastPurchasePrice: item.lastKnownPrice || 0,
      actualPrice: itemPrice || item.lastKnownPrice || 0,
      isPurchased: true
    };

    setPoData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem],
      total: (prev.total || 0) + (newItem.actualPrice * newItem.purchasedQty)
    }));
    
    setSelectedItemId('');
    setItemQty(1);
    setItemPrice(0);
  };

  const removeItemFromPO = (index: number) => {
    const newItems = [...(poData.items || [])];
    const removedItem = newItems.splice(index, 1)[0];
    setPoData(prev => ({
      ...prev,
      items: newItems,
      total: (prev.total || 0) - (removedItem.actualPrice * removedItem.purchasedQty)
    }));
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.vendors.save({ ...vendorData, xarunId: user.xarunId || '' });
      setIsVendorFormOpen(false);
      setVendorData({ name: '', contactName: '', phone: '', email: '', category: '', address: '' });
      onRefresh();
      alert("✅ Vendor saved successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poData.items || poData.items.length === 0) {
      alert("Please add at least one item to the PO.");
      return;
    }
    const vendor = vendors.find(v => v.id === poData.vendorId);
    try {
      await API.purchaseOrders.save({
        ...poData,
        vendorName: vendor?.name || '',
        personnel: user.name,
        status: POStatus.DRAFT,
        date: new Date().toISOString(),
      } as any);
      setIsPOFormOpen(false);
      setPoData({ vendorId: '', total: 0, items: [], xarunId: user.xarunId || '' });
      onRefresh();
      alert("✅ Purchase Order created!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateStatus = async (po: PurchaseOrder, status: POStatus) => {
    if (status === POStatus.RECEIVED && !window.confirm("Marking as RECEIVED will update Inventory and General Ledger. Continue?")) return;
    try {
      await API.purchaseOrders.save({ ...po, status });
      onRefresh();
      alert(`✅ PO status updated to ${status}`);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Purchases & Vendors</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manage supply chain and procurement</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('po')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'po' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Purchase Orders
          </button>
          <button 
            onClick={() => setActiveSubTab('vendors')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'vendors' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vendors
          </button>
        </div>
      </div>

      {activeSubTab === 'vendors' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsVendorFormOpen(true)}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
            >
              + Add New Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map(vendor => (
              <div key={vendor.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl">🏢</div>
                </div>
                <h4 className="text-xl font-black text-slate-800 uppercase leading-tight mb-2">{vendor.name}</h4>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6">{vendor.category || 'General Supplier'}</p>
                
                <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="text-sm">👤</span>
                    <span className="text-xs font-bold">{vendor.contactName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="text-sm">📞</span>
                    <span className="text-xs font-bold">{vendor.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'po' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsPOFormOpen(true)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
            >
              + Create Purchase Order
            </button>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 text-xs font-bold text-slate-500">{po.date ? new Date(po.date).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-6">
                      <p className="text-xs font-black text-slate-800 uppercase">{po.vendorName || 'Unknown'}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">PO: {po.id.slice(0,8)}</p>
                    </td>
                    <td className="p-6 text-sm font-black text-slate-900">${(po.total || 0).toLocaleString()}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        po.status === POStatus.RECEIVED ? 'bg-emerald-50 text-emerald-600' :
                        po.status === POStatus.ORDERED ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-6 text-right space-x-2">
                       <button 
                         onClick={() => setViewingPO(po)}
                         className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                       >
                         View PO
                       </button>
                       {po.status === POStatus.DRAFT && (
                         <button onClick={() => handleUpdateStatus(po, POStatus.ORDERED)} className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline">Mark Ordered</button>
                       )}
                       {po.status === POStatus.ORDERED && (
                         <button onClick={() => handleUpdateStatus(po, POStatus.RECEIVED)} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:underline">Mark Received</button>
                       )}
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <p className="text-slate-400 font-bold text-sm">No purchase orders found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Form Modal */}
      {isVendorFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">Vendor Details</h3>
              <button onClick={() => setIsVendorFormOpen(false)} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <input required placeholder="Company Name" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={vendorData.name} onChange={e => setVendorData({...vendorData, name: e.target.value})} />
                <input required placeholder="Contact Person" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={vendorData.contactName} onChange={e => setVendorData({...vendorData, contactName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <input required placeholder="Phone" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={vendorData.phone} onChange={e => setVendorData({...vendorData, phone: e.target.value})} />
                <input required placeholder="Email" type="email" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={vendorData.email} onChange={e => setVendorData({...vendorData, email: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest">Save Vendor</button>
            </form>
          </div>
        </div>
      )}

      {/* PO Form Modal */}
      {isPOFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tight">New Purchase Order</h3>
              <button onClick={() => setIsPOFormOpen(false)} className="text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Select Vendor & Branch</label>
                <div className="grid grid-cols-2 gap-4">
                  <select required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={poData.vendorId} onChange={e => setPoData({...poData, vendorId: e.target.value})}>
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <select required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={poData.xarunId} onChange={e => setPoData({...poData, xarunId: e.target.value})}>
                    <option value="">Select Branch...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Add Items</label>
                <div className="grid grid-cols-1 gap-4">
                  <select className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                    <option value="">Select Item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Qty" className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 0)} />
                    <input type="number" step="0.01" placeholder="Unit Price" className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={itemPrice} onChange={e => setItemPrice(parseFloat(e.target.value) || 0)} />
                  </div>
                  <button type="button" onClick={addItemToPO} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs">Add to List</button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Items List</label>
                <div className="space-y-2">
                  {poData.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{item.purchasedQty} x ${item.actualPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xs font-black text-slate-900">${(item.purchasedQty * item.actualPrice).toFixed(2)}</p>
                        <button type="button" onClick={() => removeItemFromPO(idx)} className="text-rose-500 hover:text-rose-700">✕</button>
                      </div>
                    </div>
                  ))}
                  {(!poData.items || poData.items.length === 0) && (
                    <p className="text-center py-6 text-slate-400 text-xs font-bold italic">No items added yet</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 uppercase">Total Amount</span>
                <span className="text-2xl font-black text-indigo-600">${(poData.total || 0).toFixed(2)}</span>
              </div>

              <button onClick={handleCreatePO} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Create Purchase Order</button>
            </div>
          </div>
        </div>
      )}
      {viewingPO && (
        <DocumentViewer 
          type="PURCHASE_ORDER"
          data={viewingPO as any}
          settings={settings}
          branch={branches.find(b => b.id === viewingPO.branchId)}
          onClose={() => setViewingPO(null)}
        />
      )}
    </div>
  );
};

export default PurchaseManagement;
