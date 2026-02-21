import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Branch, Xarun, User, XarunOrderRequest, XarunOrderStatus, XarunOrderItem, UserRole } from '../types';
import { API } from '../services/api';
import MultiItemSelectorModal from './MultiItemSelectorModal';

interface CrossXarunOrderHubProps {
  user: User;
  xarumo: Xarun[];
  myBranches: Branch[];
  xarunOrders: XarunOrderRequest[];
  onRefresh: () => void;
  onUpdateOrder: (orderId: string, updates: Partial<XarunOrderRequest>) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

const CrossXarunOrderHub: React.FC<CrossXarunOrderHubProps> = ({ user, xarumo, myBranches, xarunOrders, onRefresh, onUpdateOrder, onDeleteOrder }) => {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [currentOrderItems, setCurrentOrderItems] = useState<XarunOrderItem[]>([]);
  const [selectedSourceXarunId, setSelectedSourceXarunId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedTargetBranchId, setSelectedTargetBranchId] = useState('');
  const [sourceXarunItems, setSourceXarunItems] = useState<InventoryItem[]>([]);
  const [isLoadingSourceItems, setIsLoadingSourceItems] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const availableSourceXarumo = useMemo(() => xarumo.filter(x => x.id !== user.xarunId), [xarumo, user.xarunId]);
  const myXarun = useMemo(() => xarumo.find(x => x.id === user.xarunId), [xarumo, user.xarunId]);

  useEffect(() => {
    if (selectedSourceXarunId) {
      setIsLoadingSourceItems(true);
      API.items.getAll(selectedSourceXarunId)
        .then(items => setSourceXarunItems(items.filter(i => i.quantity > 0)))
        .finally(() => setIsLoadingSourceItems(false));
    } else {
      setSourceXarunItems([]);
    }
  }, [selectedSourceXarunId]);

  const handleOpenNewOrder = () => {
    setEditingOrderId(null);
    setCurrentOrderItems([]);
    setSelectedSourceXarunId('');
    setOrderNotes('');
    setSelectedTargetBranchId('');
    setIsOrderModalOpen(true);
  };

  const handleEditOrder = (order: XarunOrderRequest) => {
    setEditingOrderId(order.id);
    setCurrentOrderItems(order.items);
    setSelectedSourceXarunId(order.sourceXarunId);
    setOrderNotes(order.notes || '');
    setSelectedTargetBranchId(order.targetBranchId || '');
    setIsOrderModalOpen(true);
  };

  const handleAddItemToOrder = (item: InventoryItem, qty: number) => {
    setCurrentOrderItems(prev => {
      const existingItem = prev.find(i => i.itemId === item.id);
      if (existingItem) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        return [...prev, { itemId: item.id, itemName: item.name, quantity: qty }];
      }
    });
  };

  const handleRemoveItemFromOrder = (itemId: string) => {
    setCurrentOrderItems(prev => prev.filter(item => item.itemId !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
    setCurrentOrderItems(prev => prev.map(item => item.itemId === itemId ? { ...item, quantity: newQty } : item));
  };

  const handleSaveOrder = async () => {
    if (!selectedSourceXarunId || currentOrderItems.length === 0 || !selectedTargetBranchId) {
      alert("Fadlan buuxi dhammaan xogta dalabka.");
      return;
    }

    const newOrder: XarunOrderRequest = {
      id: editingOrderId || `XOR-${Date.now()}`,
      sourceXarunId: selectedSourceXarunId,
      targetXarunId: user.xarunId || '',
      requestedBy: user.id,
      items: currentOrderItems,
      status: XarunOrderStatus.PENDING,
      notes: orderNotes,
      createdAt: new Date().toISOString(),
      targetBranchId: selectedTargetBranchId,
    };

    try {
      if (editingOrderId) {
        await onUpdateOrder(editingOrderId, newOrder);
        alert("Dalabka waa la cusboonaysiiyey!");
      } else {
        await API.xarunOrders.create(newOrder);
        alert("Dalabkaaga waa la diray! Sug ogolaanshaha Xarunta kale.");
      }
      onRefresh();
      setIsOrderModalOpen(false);
    } catch (e) {
      alert("Cilad ayaa dhacday markii la dirayay dalabka.");
      console.error(e);
    }
  };

  const handleApproveRequest = async (orderId: string) => {
    if (!confirm("Ma hubtaa inaad ogolaato dalabkan? Alaabta waa la wareejin doonaa.")) return;
    const order = xarunOrders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // 1. Update stock in source Xarun (reduce quantity)
      for (const orderItem of order.items) {
        const itemInSource = sourceXarunItems.find(i => i.id === orderItem.itemId); // Need to re-fetch or pass current source items
        if (itemInSource && itemInSource.quantity >= orderItem.quantity) {
          await API.items.save({ ...itemInSource, quantity: itemInSource.quantity - orderItem.quantity });
        } else {
          alert(`Insufficient stock for ${orderItem.itemName} in source xarun.`);
          return; // Stop approval if any item has insufficient stock
        }
      }

      // 2. Create/Update stock in target Xarun (increase quantity)
      // This logic assumes items might already exist in the target Xarun's branches
      // For simplicity, we'll assume the item goes to the specified targetBranchId
      for (const orderItem of order.items) {
        // Find if item already exists in target branch
        const existingItemInTargetBranch = (await API.items.getAll(order.targetXarunId)).find(i => i.sku === (sourceXarunItems.find(si => si.id === orderItem.itemId)?.sku) && i.branchId === order.targetBranchId);

        if (existingItemInTargetBranch) {
          await API.items.save({ ...existingItemInTargetBranch, quantity: existingItemInTargetBranch.quantity + orderItem.quantity });
        } else {
          // If item doesn't exist, create a new one in the target branch
          const sourceItemTemplate = sourceXarunItems.find(si => si.id === orderItem.itemId);
          if (sourceItemTemplate) {
            await API.items.save({
              name: sourceItemTemplate.name,
              category: sourceItemTemplate.category,
              sku: sourceItemTemplate.sku,
              packType: sourceItemTemplate.packType,
              minThreshold: sourceItemTemplate.minThreshold,
              quantity: orderItem.quantity,
              branchId: order.targetBranchId,
              xarunId: order.targetXarunId,
              shelves: 1, // Default placement
              sections: 1, // Default placement
            });
          }
        }
      }

      // 3. Update order status to APPROVED and then COMPLETED
      await onUpdateOrder(orderId, { status: XarunOrderStatus.APPROVED, approvedBy: user.id });
      await onUpdateOrder(orderId, { status: XarunOrderStatus.COMPLETED });
      alert("Dalabka waa la ogolaaday oo alaabta waa la wareejiyey!");
      onRefresh();
    } catch (e) {
      alert("Cilad ayaa dhacday markii la ogolaanayay dalabka.");
      console.error(e);
    }
  };

  const handleRejectRequest = async (orderId: string) => {
    if (!confirm("Ma hubtaa inaad diido dalabkan?")) return;
    try {
      await onUpdateOrder(orderId, { status: XarunOrderStatus.REJECTED, approvedBy: user.id });
      alert("Dalabka waa la diiday.");
      onRefresh();
    } catch (e) {
      alert("Cilad ayaa dhacday markii la diidayay dalabka.");
      console.error(e);
    }
  };

  const pendingRequests = useMemo(() => xarunOrders.filter(o => o.status === XarunOrderStatus.PENDING && o.sourceXarunId === user.xarunId), [xarunOrders, user.xarunId]);
  const myOutgoingRequests = useMemo(() => xarunOrders.filter(o => o.requestedBy === user.id), [xarunOrders, user.id]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Xarun Orders Hub</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Maamulka dalabyada u dhexeeya Xarumaha kala duwan.
          </p>
        </div>
        {(user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER) && (
          <button onClick={handleOpenNewOrder} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all uppercase text-[11px] tracking-widest">
            + DALBO XARUN KALE 🌍
          </button>
        )}
      </div>

      {/* Pending Requests (for Source Xarun Managers) */}
      {pendingRequests.length > 0 && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER) && (
        <div className="bg-amber-50 p-6 rounded-[2.5rem] border-2 border-dashed border-amber-200">
          <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-4 ml-2">Dalabyo Sugaya Ogolaansho (Incoming)</h3>
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-amber-100 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
                <div className="flex-1">
                  <h4 className="font-black text-slate-700">Dalab ka yimid: {xarumo.find(x => x.id === order.targetXarunId)?.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase">Requested by: {user.name} • {new Date(order.createdAt).toLocaleDateString()}</p>
                  <ul className="mt-2 text-xs text-slate-600 space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx}>- {item.itemName} ({item.quantity})</li>
                    ))}
                  </ul>
                  {order.notes && <p className="text-[10px] text-slate-500 mt-2 italic">Notes: {order.notes}</p>}
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button onClick={() => handleRejectRequest(order.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">✕ Diid</button>
                  <button onClick={() => handleApproveRequest(order.id)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all">
                    ✅ Ogolow & Wareeji
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Outgoing Requests */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">My Outgoing Requests</h3>
        <div className="space-y-4">
          {myOutgoingRequests.length > 0 ? (
            myOutgoingRequests.map(order => (
              <div key={order.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
                <div className="flex-1">
                  <h4 className="font-black text-slate-700">Dalab loo diray: {xarumo.find(x => x.id === order.sourceXarunId)?.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase">Status: {order.status} • {new Date(order.createdAt).toLocaleDateString()}</p>
                  <ul className="mt-2 text-xs text-slate-600 space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx}>- {item.itemName} ({item.quantity})</li>
                    ))}
                  </ul>
                  {order.notes && <p className="text-[10px] text-slate-500 mt-2 italic">Notes: {order.notes}</p>}
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  {order.status === XarunOrderStatus.PENDING && (
                    <button onClick={() => handleEditOrder(order)} className="p-3 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">📝 Edit</button>
                  )}
                  {(order.status === XarunOrderStatus.PENDING || order.status === XarunOrderStatus.DRAFT) && (
                    <button onClick={() => onDeleteOrder(order.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">🗑️ Delete</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 font-bold uppercase text-xs py-10">Ma jiraan dalabyo aad dirtay.</p>
          )}
        </div>
      </div>

      {/* New Order Modal */}
      {isOrderModalOpen && ( 
        <MultiItemSelectorModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSave={(itemsToSave) => {
            setCurrentOrderItems(itemsToSave);
            handleSaveOrder(); // Call save after items are updated
          }}
          availableItems={sourceXarunItems}
          existingSelectedItems={currentOrderItems}
          title={editingOrderId ? "Cusboonaysii Dalabka" : "Dalab Cusub oo Xarun Kale ah"}
          description="Dooro alaabta iyo tirada aad ka dalbanayso xarunta kale."
          isLoadingItems={isLoadingSourceItems}
          customHeader={(
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ka Dalbo (Source Xarun)</label>
              <select 
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  value={selectedSourceXarunId}
                  onChange={e => { setSelectedSourceXarunId(e.target.value); setCurrentOrderItems([]); }}
                  disabled={!!editingOrderId} // Disable source xarun selection when editing
              >
                  <option value="">-- Dooro Xarun --</option>
                  {availableSourceXarumo.map(x => (
                      <option key={x.id} value={x.id}>{x.name} ({x.location})</option>
                  ))}
              </select>
            </div>
          )}
          customFooter={(
            <div className="space-y-6">
                <button 
                    onClick={handleSaveOrder} 
                    disabled={currentOrderItems.length === 0 || !selectedSourceXarunId || !selectedTargetBranchId}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase text-[11px] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                    {editingOrderId ? "CUSBOONAYSII DALABKA 📝" : "DIR DALABKA ➔"}
                </button>
            </div>
          )}
        />
      )}
    </div>
  );
};

export default CrossXarunOrderHub;
