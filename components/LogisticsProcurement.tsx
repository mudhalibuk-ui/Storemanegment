
import React, { useState, useEffect } from 'react';
import { PurchaseOrder, POItem, POStatus, Container, PackType, User, UserRole, InventoryItem, SystemSettings, Branch } from '../types';
import { API } from '../services/api';

interface LogisticsProcurementProps {
  user: User;
  masterItems: InventoryItem[];
  buyers: User[];
  settings: SystemSettings;
  branches: Branch[];
  onRefresh: () => void;
}

const LogisticsProcurement: React.FC<LogisticsProcurementProps> = ({ user, masterItems, buyers, settings, branches, onRefresh }) => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [activeTab, setActiveTab] = useState<'quotation' | 'purchasing' | 'container' | 'arrivals'>('quotation');
  
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [newPOTitle, setNewPOTitle] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [poItems, setPoItems] = useState<Partial<POItem>[]>([{ id: '1', name: '', requestedQty: 1, lastPurchasePrice: 0, packType: PackType.BOX }]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);
  const [containerForm, setContainerForm] = useState({ name: '', number: '', freight: 0, tracking: '', type: '20FT' as '20FT' | '40FT' });
  const [selectedForContainer, setSelectedForContainer] = useState<string[]>([]);

  useEffect(() => {
    const savedPO = localStorage.getItem('smartstock_pos');
    const savedContainers = localStorage.getItem('smartstock_containers');
    if (savedPO) setPos(JSON.parse(savedPO));
    if (savedContainers) setContainers(JSON.parse(savedContainers));
  }, []);

  const saveAll = (updatedPOs: PurchaseOrder[], updatedContainers: Container[]) => {
    setPos(updatedPOs);
    setContainers(updatedContainers);
    localStorage.setItem('smartstock_pos', JSON.stringify(updatedPOs));
    localStorage.setItem('smartstock_containers', JSON.stringify(updatedContainers));
  };

  const getTaxForPackType = (pt: PackType) => {
    switch (pt) {
      case PackType.BOX: return settings.taxPerBox || 0;
      case PackType.KIISH: return settings.taxPerKiish || 0;
      case PackType.DRAM: return settings.taxPerDram || 0;
      case PackType.FALAG: return settings.taxPerFalag || 0;
      default: return 0;
    }
  };

  const handleProcessArrival = async (containerId: string) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    if (!settings.mainStoreId) {
      alert("Fadlan deji 'Main Store' gudaha Settings ka hor intaadan alaabta qaabilin.");
      return;
    }

    if (!confirm("Ma hubtaa inaad alaabtan u gudbiso Main Store oo aad xisaabiso canshuurta?")) return;

    for (const item of container.items) {
      const tax = getTaxForPackType(item.packType);
      const landedPrice = item.actualPrice + tax;

      // Update or Create in Inventory
      const existing = masterItems.find(mi => mi.name === item.name && mi.branchId === settings.mainStoreId);
      
      if (existing) {
        await API.items.save({
          ...existing,
          quantity: existing.quantity + item.requestedQty,
          landedCost: landedPrice,
          lastKnownPrice: item.actualPrice,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await API.items.save({
          name: item.name,
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          category: 'General',
          quantity: item.requestedQty,
          branchId: settings.mainStoreId,
          xarunId: branches.find(b => b.id === settings.mainStoreId)?.xarunId || 'x1',
          minThreshold: 5,
          shelves: 1,
          sections: 1,
          landedCost: landedPrice,
          lastKnownPrice: item.actualPrice,
          packType: item.packType
        });
      }

      // Create Transaction
      await API.transactions.create({
        itemId: item.id,
        itemName: item.name,
        type: 'IN' as any,
        quantity: item.requestedQty,
        branchId: settings.mainStoreId,
        personnel: user.name,
        notes: `Arrived from Container ${container.number}`,
        xarunId: branches.find(b => b.id === settings.mainStoreId)?.xarunId || 'x1'
      });
    }

    const updatedContainers = containers.map(c => c.id === containerId ? { ...c, status: 'CLEARED' as any } : c);
    saveAll(pos, updatedContainers);
    alert("Alaabtii si guul leh ayaa loogu daray Main Store, Unit Price-kana waa la xisaabiyey!");
    onRefresh();
  };

  const handleCreatePO = () => {
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      creatorId: user.id,
      buyerId: selectedBuyerId,
      title: newPOTitle,
      status: POStatus.PENDING_PRICING,
      totalFundsSent: 0,
      createdAt: new Date().toISOString(),
      items: poItems.map(i => ({
        id: Math.random().toString(36).substr(2, 9),
        name: i.name!,
        packType: i.packType!,
        requestedQty: i.requestedQty!,
        purchasedQty: 0,
        lastPurchasePrice: i.lastPurchasePrice!,
        actualPrice: 0,
        isPurchased: false
      }))
    };
    saveAll([...pos, newPO], containers);
    setIsPOModalOpen(false);
  };

  const submitQuotation = (poId: string) => {
    const updatedPOs = pos.map(p => p.id === poId ? { ...p, status: POStatus.AWAITING_APPROVAL } : p);
    saveAll(updatedPOs, containers);
    alert("Quotation-ka waa la diray.");
  };

  const handleManagerApprove = (poId: string) => {
    const funds = prompt("Gali lacagta (Funds) loo diray Buyer-ka:", "0");
    const updatedPOs = pos.map(p => p.id === poId ? { ...p, status: POStatus.PURCHASING, totalFundsSent: Number(funds) || 0 } : p);
    saveAll(updatedPOs, containers);
  };

  const togglePurchased = (poId: string, itemId: string) => {
    const updatedPOs = pos.map(p => {
      if (p.id !== poId) return p;
      return {
        ...p,
        items: p.items.map(i => i.id === itemId ? { ...i, isPurchased: !i.isPurchased } : i)
      };
    });
    saveAll(updatedPOs, containers);
  };

  const handleCreateContainer = () => {
    if (!containerForm.number || selectedForContainer.length === 0) return;
    const allPurchasedItems: POItem[] = [];
    pos.forEach(p => {
      p.items.forEach(i => { if (selectedForContainer.includes(i.id)) allPurchasedItems.push(i); });
    });
    const newContainer: Container = {
      id: `CONT-${Date.now()}`,
      number: containerForm.number,
      type: containerForm.type,
      poId: 'MULTIPLE', 
      items: allPurchasedItems,
      status: 'LOADING',
      freightCost: containerForm.freight,
      taxPaid: 0
    };
    saveAll(pos, [...containers, newContainer]);
    setIsContainerModalOpen(false);
    setSelectedForContainer([]);
  };

  const buyerPOs = pos.filter(p => p.buyerId === user.id || user.role === UserRole.SUPER_ADMIN);

  const selectExistingItem = (idx: number, item: InventoryItem) => {
    const newItems = [...poItems];
    newItems[idx] = { 
      ...newItems[idx], 
      name: item.name, 
      lastPurchasePrice: item.landedCost || item.lastKnownPrice || 0, 
      packType: item.packType || PackType.BOX 
    };
    setPoItems(newItems);
    setActiveSearchIndex(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 gap-2 overflow-x-auto no-scrollbar">
        {['quotation', 'purchasing', 'container', 'arrivals'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 min-w-[120px] px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'quotation' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Quotation Management</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Diiwaangali qiimaha alaabta laga soo helay dibadda.</p>
              </div>
              {(user.role === UserRole.MANAGER || user.role === UserRole.SUPER_ADMIN) && (
                <button onClick={() => setIsPOModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">+ Abuur PO Cusub</button>
              )}
           </div>

           <div className="grid grid-cols-1 gap-6">
              {buyerPOs.filter(p => p.status === POStatus.PENDING_PRICING || p.status === POStatus.AWAITING_APPROVAL).map(po => (
                <div key={po.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase tracking-widest">{po.id}</span>
                         <h3 className="text-xl font-black text-slate-800 mt-2">{po.title}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${po.status === POStatus.PENDING_PRICING ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {po.status === POStatus.PENDING_PRICING ? 'Sugaya Qiimeyn' : 'Sugaya Approval'}
                        </span>
                        {(user.role === UserRole.MANAGER || user.role === UserRole.SUPER_ADMIN) && po.status === POStatus.AWAITING_APPROVAL && (
                          <button onClick={() => handleManagerApprove(po.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-emerald-700">Approve & Send $ ✅</button>
                        )}
                      </div>
                   </div>

                   <div className="space-y-3">
                      {po.items.map(item => (
                        <div key={item.id} className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <div className="flex-1 text-sm font-black text-slate-700 uppercase">{item.name} ({item.requestedQty} {item.packType})</div>
                           <div className="w-full md:w-48 relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input type="number" className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-indigo-600 outline-none" placeholder="Actual Price" disabled={po.status === POStatus.AWAITING_APPROVAL} value={item.actualPrice || ''} onChange={(e) => {
                                const newPOs = pos.map(p => p.id === po.id ? {...p, items: p.items.map(i => i.id === item.id ? {...i, actualPrice: Number(e.target.value)} : i)} : p);
                                setPos(newPOs);
                              }} />
                           </div>
                        </div>
                      ))}
                   </div>
                   {po.status === POStatus.PENDING_PRICING && (
                     <div className="mt-8 flex justify-end">
                        <button onClick={() => submitQuotation(po.id)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-600 transition-all">Submit Quotation to Manager 🚀</button>
                     </div>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'purchasing' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Purchasing Checklist</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Calaamadi alaabta aad suuqa kasoo iibsatay.</p>
           </div>
           <div className="grid grid-cols-1 gap-6">
              {buyerPOs.filter(p => p.status === POStatus.PURCHASING).map(po => (
                <div key={po.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-slate-800 uppercase">{po.title}</h3>
                      <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">Received: ${po.totalFundsSent}</div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {po.items.map(item => (
                        <button key={item.id} onClick={() => togglePurchased(po.id, item.id)} className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all text-left ${item.isPurchased ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-white border-slate-100 shadow-sm'}`}>
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${item.isPurchased ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{item.isPurchased ? '✓' : '🛒'}</div>
                              <div><p className={`font-black uppercase text-sm ${item.isPurchased ? 'text-emerald-900 line-through opacity-50' : 'text-slate-800'}`}>{item.name}</p></div>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'arrivals' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Arrivals & Taxing</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Xaqiiji alaabta soo gaartay dekada ama main store.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {containers.filter(c => c.status !== 'CLEARED').map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner">🛳️</div>
                         <div><h3 className="text-xl font-black text-slate-800">#{c.number}</h3><p className="text-[10px] font-bold text-slate-400 uppercase">{c.type} Container</p></div>
                      </div>
                      <button onClick={() => handleProcessArrival(c.id)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-[0.2em]">QAABIL ALAABTA (TAX & STORE) ✅</button>
                   </div>
                   
                   <div className="space-y-3">
                      {c.items.map(item => {
                        const tax = getTaxForPackType(item.packType);
                        return (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black bg-white px-3 py-1 rounded border border-slate-100 uppercase">{item.packType}</span>
                                <span className="font-black text-slate-700 text-sm">{item.name} (x{item.requestedQty})</span>
                             </div>
                             <div className="flex gap-10">
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-slate-400 uppercase">Purchase</p>
                                   <p className="font-black text-slate-800">${item.actualPrice}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-emerald-400 uppercase">Est. Tax</p>
                                   <p className="font-black text-emerald-600">+${tax}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-indigo-400 uppercase">Unit Landed Cost</p>
                                   <p className="font-black text-indigo-600 underline">${item.actualPrice + tax}</p>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* PO Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60000] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Abuur Dalabka Alaabta (PO)</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kaliya Manager-ka ayaa qaban kara.</p>
                 </div>
                 <button onClick={() => setIsPOModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white text-slate-400 flex items-center justify-center text-xl font-bold transition-all">✕</button>
              </div>

              <div className="p-8 overflow-y-auto no-scrollbar space-y-8 min-h-[400px]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cinwaanka (PO Title)</label>
                       <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 outline-none" placeholder="Adeega Shiinaha..." value={newPOTitle} onChange={e => setNewPOTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qofka Soo Adeegaya (Buyer)</label>
                       <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none cursor-pointer" value={selectedBuyerId} onChange={e => setSelectedBuyerId(e.target.value)}>
                          <option value="">Dooro Buyer...</option>
                          {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                       <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alaabta Dalabka (Items)</h3>
                       <button onClick={() => setPoItems([...poItems, { id: Date.now().toString(), name: '', requestedQty: 1, lastPurchasePrice: 0, packType: PackType.BOX }])} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">+ Ku dar Row</button>
                    </div>
                    
                    <div className="space-y-3 pb-32">
                       {poItems.map((item, idx) => {
                         // Improved search matching: Case insensitive, searches both name and SKU
                         const matches = item.name ? masterItems.filter(m => 
                           m.name.toLowerCase().includes(item.name!.toLowerCase()) || 
                           m.sku.toLowerCase().includes(item.name!.toLowerCase())
                         ).slice(0, 5) : [];
                         
                         return (
                           <div key={item.id} className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-start md:items-center">
                              <div className="flex-1 w-full relative">
                                 <input 
                                   className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none" 
                                   placeholder="Magaca Alaabta (Search or Type New)..." 
                                   value={item.name} 
                                   onFocus={() => setActiveSearchIndex(idx)}
                                   onBlur={() => setTimeout(() => setActiveSearchIndex(null), 300)}
                                   onChange={e => {
                                      const newItems = [...poItems];
                                      newItems[idx] = { ...newItems[idx], name: e.target.value };
                                      setPoItems(newItems);
                                   }} 
                                 />
                                 
                                 {/* Search Dropdown */}
                                 {activeSearchIndex === idx && matches.length > 0 && (
                                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden ring-4 ring-indigo-500/10">
                                      {matches.map(m => (
                                        <div 
                                          key={m.id} 
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectExistingItem(idx, m);
                                          }}
                                          className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                                        >
                                           <span className="text-xs font-bold text-slate-700">{m.name}</span>
                                           <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">{m.sku}</span>
                                        </div>
                                      ))}
                                   </div>
                                 )}
                                 
                                 {/* New Item Indicator */}
                                 {activeSearchIndex === idx && item.name && matches.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-emerald-50 rounded-xl shadow-xl border border-emerald-100 z-50 p-3 flex items-center gap-2">
                                       <span className="text-emerald-600 text-lg">✨</span>
                                       <div>
                                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">New Item</p>
                                          <p className="text-[10px] font-bold text-emerald-600">"{item.name}" will be auto-created on arrival.</p>
                                       </div>
                                    </div>
                                 )}
                              </div>
                              <div className="w-24 shrink-0">
                                 <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center" placeholder="Qty" value={item.requestedQty} onChange={e => {
                                    const newItems = [...poItems];
                                    newItems[idx].requestedQty = parseInt(e.target.value) || 0;
                                    setPoItems(newItems);
                                 }} />
                              </div>
                              <div className="w-32 shrink-0">
                                 <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={item.packType} onChange={e => {
                                    const newItems = [...poItems];
                                    newItems[idx].packType = e.target.value as PackType;
                                    setPoItems(newItems);
                                 }}>
                                    {Object.values(PackType).map(v => <option key={v} value={v}>{v}</option>)}
                                 </select>
                              </div>
                              <button onClick={() => setPoItems(poItems.filter(i => i.id !== item.id))} className="text-rose-300 hover:text-rose-600 px-2 font-bold shrink-0">✕</button>
                           </div>
                         );
                       })}
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                 <button onClick={() => setIsPOModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Jooji</button>
                 <button onClick={handleCreatePO} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all">Gali Dalabka Cusub 🚀</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsProcurement;
