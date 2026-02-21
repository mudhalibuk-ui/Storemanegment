
import React, { useState, useEffect } from 'react';
import { PurchaseOrder, POItem, POStatus, Container, PackType, User, UserRole, InventoryItem, SystemSettings, Branch, POTransfer } from '../types';
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
  const [activeTab, setActiveTab] = useState<'orders' | 'finance' | 'container' | 'customs' | 'arrivals'>('orders');
  
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [newPOTitle, setNewPOTitle] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [poItems, setPoItems] = useState<Partial<POItem>[]>([{ id: '1', name: '', requestedQty: 1, lastPurchasePrice: 0, packType: PackType.BOX }]);
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ amount: 0, ref: '', method: 'Hawala', poId: '' });

  // Pricing Modal State
  const [pricingPO, setPricingPO] = useState<PurchaseOrder | null>(null);
  const [pricingValues, setPricingValues] = useState<Record<string, number>>({});

  // Container Modal State
  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);
  const [newContainer, setNewContainer] = useState<Partial<Container>>({
    number: '',
    type: '40FT',
    status: 'LOADING',
    poId: '',
    items: [],
    freightCost: 0,
    taxPaid: 0
  });

  // Customs Modal State
  const [clearingContainer, setClearingContainer] = useState<Container | null>(null);
  const [clearanceForm, setClearanceForm] = useState({ taxAmount: 0, notes: '' });

  // Live Auto-Refresh (Polling)
  useEffect(() => {
    const syncData = () => {
      try {
        const savedPO = localStorage.getItem('smartstock_pos');
        const savedContainers = localStorage.getItem('smartstock_containers');
        
        if (savedPO) {
          const parsedPOs = JSON.parse(savedPO);
          const safePOs = Array.isArray(parsedPOs) ? parsedPOs.map((p: any) => ({
            ...p,
            items: Array.isArray(p.items) ? p.items : [],
            transfers: Array.isArray(p.transfers) ? p.transfers : []
          })) : [];
          
          setPos(prev => {
             // Only update if data changed to avoid re-renders (Live Sync)
             return JSON.stringify(prev) !== JSON.stringify(safePOs) ? safePOs : prev;
          });
        }
        
        if (savedContainers) {
          const parsedContainers = JSON.parse(savedContainers);
          setContainers(prev => {
             return JSON.stringify(prev) !== JSON.stringify(parsedContainers) ? parsedContainers : prev;
          });
        }
      } catch (error) {
        console.error("Failed to sync procurement data:", error);
      }
    };

    syncData(); // Initial load
    const interval = setInterval(syncData, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const saveAll = (updatedPOs: PurchaseOrder[], updatedContainers: Container[]) => {
    setPos(updatedPOs);
    setContainers(updatedContainers);
    localStorage.setItem('smartstock_pos', JSON.stringify(updatedPOs));
    localStorage.setItem('smartstock_containers', JSON.stringify(updatedContainers));
  };

  const isBuyer = user.role === UserRole.BUYER;
  
  // Dynamic Notifications
  const unreadOrders = pos.filter(p => p.buyerId === user.id && !p.isReadByBuyer).length;
  const pendingReceivedMoney = pos.filter(p => p.buyerId === user.id && (p.transfers || []).some(t => t.status === 'SENT')).length;
  const pricedOrdersToConfirm = pos.filter(p => !isBuyer && p.status === POStatus.PRICED && !p.isReadByManager).length;
  const containersAtPort = containers.filter(c => c.status === 'ARRIVED').length;

  const calculateFinance = (po: PurchaseOrder) => {
    const transfers = Array.isArray(po.transfers) ? po.transfers : [];
    const items = Array.isArray(po.items) ? po.items : [];

    const sent = transfers.filter(t => t.status === 'SENT' || t.status === 'RECEIVED').reduce((acc, t) => acc + (t.amount || 0), 0);
    const received = transfers.filter(t => t.status === 'RECEIVED').reduce((acc, t) => acc + (t.amount || 0), 0);
    const spent = items.filter(i => i.isPurchased).reduce((acc, i) => acc + ((i.actualPrice || 0) * (i.requestedQty || 0)), 0);
    const estimatedTotal = items.reduce((acc, i) => acc + ((i.actualPrice || i.lastPurchasePrice || 0) * (i.requestedQty || 0)), 0);
    
    return { sent, received, spent, balance: received - spent, estimatedTotal };
  };

  // Aggregated Finance for Wallet View
  const getGlobalWallet = (buyerId: string) => {
    const buyerPOs = pos.filter(p => p.buyerId === buyerId);
    let totalReceived = 0;
    let totalSpent = 0;
    
    buyerPOs.forEach(po => {
       const stats = calculateFinance(po);
       totalReceived += stats.received;
       totalSpent += stats.spent;
    });

    return { totalReceived, totalSpent, balance: totalReceived - totalSpent };
  };

  const [showHistory, setShowHistory] = useState(false);

  const handleSendOrder = (isDraft: boolean = false) => {
    if (!newPOTitle || !selectedBuyerId || poItems.length === 0) {
      alert("Fadlan buuxi xogta Order-ka.");
      return;
    }
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      creatorId: user.id,
      buyerId: selectedBuyerId,
      title: newPOTitle,
      status: isDraft ? POStatus.DRAFT : POStatus.NEW,
      totalFundsSent: 0,
      transfers: [],
      isReadByBuyer: !isDraft, // Drafts are not sent yet
      isReadByManager: true,
      createdAt: new Date().toISOString(),
      items: poItems.map(i => ({
        id: Math.random().toString(36).substr(2, 9),
        name: i.name || 'Unknown Item',
        packType: i.packType || PackType.BOX,
        requestedQty: i.requestedQty || 0,
        purchasedQty: 0,
        lastPurchasePrice: i.lastPurchasePrice || 0,
        actualPrice: 0,
        isPurchased: false
      }))
    };
    saveAll([...pos, newPO], containers);
    setIsPOModalOpen(false);
    setNewPOTitle('');
    setSelectedBuyerId('');
    setPoItems([{ id: '1', name: '', requestedQty: 1, lastPurchasePrice: 0, packType: PackType.BOX }]);
    alert(isDraft ? "Order-ka waa la keydiyey (Draft)!" : "Order-ka waa la diray! Buyer-ka ayaa loo sheegi doonaa.");
  };

  const handlePublishDraft = (poId: string) => {
      const updatedPOs = pos.map(p => p.id === poId ? { ...p, status: POStatus.NEW, isReadByBuyer: false } : p);
      saveAll(updatedPOs, containers);
      alert("Draft-ka waa la diray hadda!");
  };

  const handleDeletePO = (poId: string) => {
    if (window.confirm("DIGNIIN: Ma hubtaa inaad tirtirto Order-kan? Tani dib looma soo celin karo.")) {
      const updatedPOs = pos.filter(p => p.id !== poId);
      // Optional: Filter out containers related to this PO if needed, but keeping for history might be safer.
      saveAll(updatedPOs, containers);
    }
  };

  const openPricingModal = (po: PurchaseOrder) => {
    setPricingPO(po);
    const initialValues: Record<string, number> = {};
    (po.items || []).forEach(item => {
      initialValues[item.id] = item.actualPrice || item.lastPurchasePrice || 0;
    });
    setPricingValues(initialValues);
  };

  const handleSavePrices = () => {
    if (!pricingPO) return;
    const updatedItems = (pricingPO.items || []).map(item => ({ ...item, actualPrice: pricingValues[item.id] || 0 }));
    const updatedPOs = pos.map(p => p.id === pricingPO.id ? { ...p, items: updatedItems, status: POStatus.PRICED, isReadByManager: false, isReadByBuyer: true } : p);
    saveAll(updatedPOs, containers);
    setPricingPO(null);
    alert("Qiimaha waa la xaqiijiyey! Manager-ka ayaa hadda looga fadhiyaa inuu ogolaado (Confirm).");
  };

  const handleApproveOrder = (poId: string) => {
    const updatedPOs = pos.map(p => p.id === poId ? { ...p, status: POStatus.PURCHASING, isReadByBuyer: false } : p);
    saveAll(updatedPOs, containers);
    alert("Order-ka waa la ogolaaday! Buyer-ku hadda wuu soo adeegi karaa (Purchasing Mode Active).");
  };

  const handleSendMoney = () => {
    if (transferForm.amount <= 0 || !transferForm.poId) {
      alert("Fadlan dooro Order-ka iyo lacagta.");
      return;
    }
    const updatedPOs = pos.map(p => {
      if (p.id !== transferForm.poId) return p;
      const newT: POTransfer = { id: `TR-${Date.now()}`, amount: transferForm.amount, date: new Date().toISOString(), reference: transferForm.ref, method: transferForm.method, status: 'SENT' };
      const currentTransfers = Array.isArray(p.transfers) ? p.transfers : [];
      // Status doesn't change to AWAITING_FUNDS because buying is decoupled
      return { ...p, transfers: [...currentTransfers, newT], isReadByBuyer: false }; 
    });
    saveAll(updatedPOs, containers);
    setIsTransferModalOpen(false);
    setTransferForm({ amount: 0, ref: '', method: 'Hawala', poId: '' });
    alert("Lacagta waa la diray!");
  };

  const handleReceiveMoney = (poId: string, transferId: string) => {
    const updatedPOs = pos.map(p => {
      if (p.id !== poId) return p;
      const currentTransfers = Array.isArray(p.transfers) ? p.transfers : [];
      return { ...p, transfers: currentTransfers.map(t => t.id === transferId ? { ...t, status: 'RECEIVED' as any } : t) };
    });
    saveAll(updatedPOs, containers);
    alert("Lacagta waa la xaqiijiyey!");
  };

  const handleDeleteTransfer = (poId: string, transferId: string) => {
    if(!window.confirm("Ma hubtaa inaad tirtirto xawilaadan?")) return;
    
    const updatedPOs = pos.map(p => {
      if (p.id !== poId) return p;
      const updatedTransfers = (p.transfers || []).filter(t => t.id !== transferId);
      return { ...p, transfers: updatedTransfers };
    });
    saveAll(updatedPOs, containers);
  };

  const handleMarkPurchased = (poId: string, itemId: string) => {
    const po = pos.find(p => p.id === poId);
    if (!po) return;
    
    // ALLOW NEGATIVE BALANCE (Credit System) - No balance check here
    
    const updatedPOs = pos.map(p => {
      if (p.id !== poId) return p;
      return {
        ...p,
        items: p.items.map(i => i.id === itemId ? { ...i, isPurchased: !i.isPurchased } : i)
      };
    });
    saveAll(updatedPOs, containers);
  };

  const printPurchaseOrder = (po: PurchaseOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Fadlan ogolow Pop-ups");

    const itemsHtml = po.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">${index + 1}</td>
        <td style="padding: 12px; font-weight: bold;">${item.name}</td>
        <td style="padding: 12px; text-align: center;">${item.packType}</td>
        <td style="padding: 12px; text-align: center; font-weight: bold;">${item.requestedQty}</td>
        <td style="padding: 12px; text-align: right;">$${item.actualPrice > 0 ? item.actualPrice : '____'}</td>
        <td style="padding: 12px; text-align: right;">$${item.actualPrice > 0 ? (item.actualPrice * item.requestedQty).toLocaleString() : '____'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order - ${po.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .meta { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; background: #f8f8f8; padding: 12px; border-bottom: 2px solid #ddd; }
            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${settings.systemName}</h1>
              <p>Logistics & Procurement Department</p>
            </div>
            <div style="text-align: right;">
              <h2>PURCHASE ORDER</h2>
              <p class="meta">PO Ref: ${po.id}</p>
              <p class="meta">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 10px;">
            <strong style="display:block; margin-bottom: 5px; text-transform: uppercase; font-size: 12px;">Order Title:</strong>
            <span style="font-size: 16px; font-weight: bold;">${po.title}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="40%">Item Description</th>
                <th width="10%" style="text-align: center;">Unit</th>
                <th width="15%" style="text-align: center;">Qty</th>
                <th width="15%" style="text-align: right;">Est. Price</th>
                <th width="15%" style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p>Please purchase items as specified. Ensure quality checks before shipment.</p>
            <p>Authorized Signature: __________________________</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreateContainer = () => {
    if (!newContainer.number || !newContainer.poId || newContainer.items?.length === 0) {
      return alert("Fadlan buuxi lambarka kuntenarka, doora PO, oo xulo alaabta.");
    }
    const container: Container = {
      id: `CT-${Date.now()}`,
      number: newContainer.number!,
      type: newContainer.type as any,
      poId: newContainer.poId!,
      items: newContainer.items!,
      status: 'LOADING',
      freightCost: newContainer.freightCost || 0,
      taxPaid: 0
    };
    
    const updatedPOs = pos.map(p => p.id === container.poId ? { ...p, status: POStatus.SHIPPED } : p);
    
    saveAll(updatedPOs, [...containers, container]);
    setIsContainerModalOpen(false);
    setNewContainer({ number: '', type: '40FT', status: 'LOADING', poId: '', items: [], freightCost: 0, taxPaid: 0 });
    alert("Kuntenarkii waa la abuuray! Logistics-ka ayuu ku jiraa hadda.");
  };

  const updateContainerStatus = (id: string, status: any) => {
    const updated = containers.map(c => c.id === id ? { ...c, status } : c);
    saveAll(pos, updated);
  };

  const handleClearCustoms = () => {
    if (!clearingContainer || clearanceForm.taxAmount <= 0) return alert("Fadlan gali lacagta canshuurta.");
    
    const updated = containers.map(c => c.id === clearingContainer.id ? { 
        ...c, 
        status: 'CLEARED' as any,
        taxPaid: clearanceForm.taxAmount 
    } : c);
    
    saveAll(pos, updated);
    setClearingContainer(null);
    setClearanceForm({ taxAmount: 0, notes: '' });
    alert("Kuntenarka waa la canshuuray! Hadda wuxuu yaalaa Main Arrivals.");
  };

  const getTrackingStep = (status: string) => {
    switch (status) {
        case 'LOADING': return 1;
        case 'ON_SEA': return 2;
        case 'ARRIVED': return 3;
        case 'CLEARED': return 4;
        default: return 1;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Tab Navigation with Refresh */}
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 gap-2 overflow-x-auto no-scrollbar relative items-center">
        {[
          {id: 'orders', label: 'Order Hub', icon: '📝', notify: isBuyer ? unreadOrders : pricedOrdersToConfirm},
          {id: 'finance', label: 'Financial Hub', icon: '💰', notify: isBuyer ? pendingReceivedMoney : 0},
          {id: 'container', label: 'Logistics & Track', icon: '🚢', notify: 0},
          {id: 'customs', label: 'Canshuuraha (Customs)', icon: '🛃', notify: containersAtPort},
          {id: 'arrivals', label: 'Main Arrivals', icon: '🏢', notify: 0}
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 min-w-[150px] px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 relative ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.notify > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] animate-bounce border-2 border-white">{tab.notify}</span>
            )}
          </button>
        ))}
        
        {/* REFRESH BUTTON */}
        <button 
          onClick={onRefresh}
          className="px-6 py-4 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
          title="Refresh Data"
        >
          <span className="text-lg">🔄</span>
        </button>
      </div>

      {/* 1. Order Hub Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Order Hub</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                   {isBuyer ? 'U sameey qiimayn (Pricing) alaabta Manager-ku dalbaday.' : 'Diri dalab cusub, kadibna Ogolow (Confirm) markii lasoo qiimeeyo.'}
                </p>
              </div>
              <div className="flex gap-4">
                  <button 
                    onClick={() => setShowHistory(!showHistory)} 
                    className={`px-6 py-4 rounded-2xl font-black shadow-sm transition-all uppercase text-[10px] tracking-widest border ${showHistory ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {showHistory ? 'Hide History 📜' : 'Show History 📜'}
                  </button>
                  {!isBuyer && (
                    <button onClick={() => setIsPOModalOpen(true)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all uppercase text-[11px] tracking-widest">
                      + DIR DALAB CUSUB 🚀
                    </button>
                  )}
              </div>
           </div>

           {/* DRAFTS SECTION (Manager Only) */}
           {!isBuyer && pos.some(p => p.status === POStatus.DRAFT) && !showHistory && (
               <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Draft Orders (Not Sent)</h3>
                   <div className="grid grid-cols-1 gap-4">
                       {pos.filter(p => p.status === POStatus.DRAFT).map(po => (
                           <div key={po.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
                               <div>
                                   <h4 className="font-black text-slate-700">{po.title}</h4>
                                   <p className="text-[10px] text-slate-400 uppercase">{po.items.length} Items • Created: {new Date(po.createdAt).toLocaleDateString()}</p>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => handleDeletePO(po.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">🗑️</button>
                                   <button onClick={() => handlePublishDraft(po.id)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 transition-all">
                                       PUBLISH & SEND 🚀
                                   </button>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           <div className="grid grid-cols-1 gap-6">
              {pos
                .filter(p => (!isBuyer || p.buyerId === user.id))
                .filter(p => p.status !== POStatus.DRAFT) // Hide drafts from main list
                .filter(p => showHistory ? (p.status === POStatus.COMPLETED || p.status === POStatus.ARRIVED) : (p.status !== POStatus.COMPLETED && p.status !== POStatus.ARRIVED))
                .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
                .map(po => {
                const { estimatedTotal } = calculateFinance(po);
                return (
                  <div key={po.id} className={`bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group ${po.status === POStatus.COMPLETED ? 'opacity-75 grayscale' : ''}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8 border-b border-slate-50 pb-6">
                       <div className="flex-1">
                          <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase">{po.id}</span>
                             <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${po.status === POStatus.NEW ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                               {po.status}
                             </span>
                             {/* DELETE BUTTON FOR MANAGERS */}
                             {!isBuyer && (
                                <button 
                                  onClick={() => handleDeletePO(po.id)} 
                                  className="ml-2 bg-rose-50 text-rose-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                  title="Delete Order"
                                >
                                  🗑️
                                </button>
                             )}
                          </div>
                          <h3 className="text-2xl font-black text-slate-800 mt-3">{po.title}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lagu abuuray: {new Date(po.createdAt).toLocaleDateString()}</p>
                       </div>

                       <div className="flex flex-wrap gap-4 items-center">
                          <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 text-center min-w-[140px]">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estimated Total</p>
                             <p className="text-xl font-black text-slate-700">${estimatedTotal.toLocaleString()}</p>
                          </div>
                          {/* NEW PDF PRINT BUTTON */}
                          <button onClick={() => printPurchaseOrder(po)} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all flex items-center gap-2">
                             <span>🖨️</span> PDF
                          </button>

                          {isBuyer && po.status === POStatus.NEW && (
                            <button onClick={() => openPricingModal(po)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                              <span>💰</span> SII QIIMAHA ➔
                            </button>
                          )}
                          
                          {/* MANAGER APPROVE BUTTON (Replaces "Send Money" forcing) */}
                          {!isBuyer && po.status === POStatus.PRICED && (
                            <button onClick={() => handleApproveOrder(po.id)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all animate-pulse">
                               ✅ OGOLOW (CONFIRM)
                            </button>
                          )}
                          
                          {/* Indicator if Purchasing Active */}
                          {(po.status === POStatus.PURCHASING || po.status === POStatus.SHIPPED) && (
                             <div className="bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase">
                                Active Purchasing
                             </div>
                          )}
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {(po.items || []).map(item => (
                         <div key={item.id} className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center">
                            <div>
                               <p className="font-black text-slate-700 text-sm uppercase">{item.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Dalabka: {item.requestedQty} {item.packType}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-indigo-400 uppercase">Unit Price</p>
                               <p className="font-black text-slate-800">${item.actualPrice || item.lastPurchasePrice || 0}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Empty State */}
              {pos.filter(p => !isBuyer || p.buyerId === user.id).filter(p => showHistory ? (p.status === POStatus.COMPLETED || p.status === POStatus.ARRIVED) : (p.status !== POStatus.COMPLETED && p.status !== POStatus.ARRIVED && p.status !== POStatus.DRAFT)).length === 0 && (
                  <div className="py-32 text-center text-slate-300 font-black uppercase tracking-widest bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                      {showHistory ? 'Ma jiro taariikh hore (No History).' : 'Ma jiraan dalabyo cusub.'}
                  </div>
              )}
           </div>
        </div>
      )}

      {/* 2. Financial Hub Tab (Separate Global Wallet) */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Global Wallet Summary */}
           <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-800 text-white relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                 <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">Financial Hub</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maamulka Lacagaha & Xisaabta Buyer-ka.</p>
                 </div>
                 
                 {/* BUYER SELECTOR (Manager Only) */}
                 {!isBuyer && (
                     <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase text-slate-400">Select Buyer Account:</span>
                         <select 
                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold outline-none border border-slate-700"
                            value={selectedBuyerId}
                            onChange={(e) => setSelectedBuyerId(e.target.value)}
                         >
                             <option value="">-- All Buyers --</option>
                             {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                     </div>
                 )}

                 {!isBuyer && (
                   <button 
                     onClick={() => setIsTransferModalOpen(true)} 
                     className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-xs uppercase tracking-widest"
                   >
                     <span>💳</span> DIR LACAG (SEND FUNDS)
                   </button>
                 )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                 {/* Calculate total aggregated wallet for the view context */}
                 {(() => {
                    // If Manager, show Total of all Buyers or specific if filtered
                    const targetBuyerId = isBuyer ? user.id : (selectedBuyerId || '');
                    // If no buyer selected (Manager view all), we sum everything? Or just show global.
                    // Let's show Global if no buyer selected, or Specific if selected.
                    
                    let totalReceived = 0;
                    let totalSpent = 0;

                    const relevantPOs = pos.filter(p => targetBuyerId ? p.buyerId === targetBuyerId : true);
                    
                    relevantPOs.forEach(po => {
                       const stats = calculateFinance(po);
                       totalReceived += stats.received;
                       totalSpent += stats.spent;
                    });

                    const balance = totalReceived - totalSpent;
                    const isNegative = balance < 0;
                    
                    return (
                      <>
                        <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Total Received</p>
                           <p className="text-2xl font-black">${totalReceived.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                           <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Spent (Purchases)</p>
                           <p className="text-2xl font-black">${totalSpent.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl border ${isNegative ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'}`}>
                           <p className="text-[9px] font-black text-white/80 uppercase tracking-widest">Current Balance</p>
                           <p className="text-3xl font-black">${balance.toLocaleString()}</p>
                           {isNegative && <span className="text-[8px] font-bold bg-white/20 px-2 py-1 rounded uppercase">Credit / Deyn</span>}
                        </div>
                      </>
                    );
                 })()}
              </div>
           </div>

           {/* Transaction History List */}
           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Transaction History</h3>
               <div className="space-y-3">
                   {(() => {
                       const targetBuyerId = isBuyer ? user.id : (selectedBuyerId || '');
                       const relevantPOs = pos.filter(p => targetBuyerId ? p.buyerId === targetBuyerId : true);
                       
                       // Flatten all transfers
                       const allTransfers = relevantPOs.flatMap(p => (p.transfers || []).map(t => ({ ...t, poTitle: p.title, poId: p.id })));
                       
                       if (allTransfers.length === 0) {
                           return <p className="text-center text-slate-400 font-bold uppercase text-xs py-10">No transactions found.</p>;
                       }

                       return allTransfers.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                           <div key={t.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all">
                               <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${t.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                       {t.status === 'RECEIVED' ? '✓' : '⏳'}
                                   </div>
                                   <div>
                                       <p className="font-black text-slate-800 text-sm">${t.amount.toLocaleString()}</p>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase">{t.method} • {new Date(t.date).toLocaleDateString()}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className="text-[10px] font-black text-indigo-500 uppercase">{t.poTitle}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">Ref: {t.reference}</p>
                               </div>
                           </div>
                       ));
                   })()}
               </div>
           </div>
        </div>
      )}

      {/* 3. Logistics & Live Tracking Tab */}
      {activeTab === 'container' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Logistics & Tracking</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">La soco xaaladda rarka iyo kuntenarada.</p>
            </div>
            {isBuyer && (
              <button onClick={() => setIsContainerModalOpen(true)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all uppercase text-[11px] tracking-widest">
                + ABUUR KUNTENAR CUSUB 🏗️
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {containers.filter(c => c.status !== 'CLEARED').map(c => {
                const currentStep = getTrackingStep(c.status);
                return (
                  <div key={c.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex flex-col lg:flex-row justify-between gap-10 mb-8 border-b border-slate-50 pb-6">
                       <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner font-black">📦</div>
                          <div>
                             <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase">{c.type} Container</span>
                             <h3 className="text-2xl font-black text-slate-800 mt-2 uppercase tracking-tighter">{c.number}</h3>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">PO: {pos.find(p=>p.id===c.poId)?.title || 'N/A'}</p>
                          </div>
                       </div>

                       {!isBuyer && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update Status</label>
                            <select 
                              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={c.status}
                              onChange={(e) => updateContainerStatus(c.id, e.target.value)}
                            >
                               <option value="LOADING">LOADING (China)</option>
                               <option value="ON_SEA">ON SEA (Badda) 🚢</option>
                               <option value="ARRIVED">ARRIVED (Dekedda) ⚓</option>
                            </select>
                        </div>
                       )}
                    </div>

                    {/* LIVE TRACKER VISUALIZATION */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-6">
                        <div className="flex items-center justify-between relative">
                            {/* Connector Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -z-0 rounded-full mx-10"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-indigo-500 -z-0 rounded-full mx-10 transition-all duration-700" style={{width: `${(currentStep - 1) * 33}%`}}></div>

                            {['LOADING', 'ON_SEA', 'ARRIVED', 'CUSTOMS'].map((step, idx) => {
                                const stepNum = idx + 1;
                                const isActive = currentStep >= stepNum;
                                return (
                                    <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all border-4 ${isActive ? 'bg-indigo-600 border-indigo-200 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                            {idx + 1}
                                        </div>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}>{step.replace('_', ' ')}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                       {(c.items || []).map(item => (
                         <div key={item.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                            <div>
                               <p className="font-black text-slate-700 text-xs uppercase">{item.name}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase">Qty: {item.requestedQty} {item.packType}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                );
            })}
            {containers.filter(c => c.status !== 'CLEARED').length === 0 && <div className="py-32 text-center text-slate-300 font-black uppercase tracking-widest bg-white rounded-[3rem] border-2 border-dashed border-slate-100">Ma jiraan Kuntenaro saaran badda.</div>}
          </div>
        </div>
      )}

      {/* 4. CUSTOMS TAB (New Feature) */}
      {activeTab === 'customs' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Customs Clearance (Canshuuraha)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Bixi canshuurta kuntenarada soo gaaray dekedda si loo fasaxo.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {containers.filter(c => c.status === 'ARRIVED').map(c => (
                  <div key={c.id} className="bg-white p-8 rounded-[3rem] border-2 border-amber-100 shadow-sm relative">
                      <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl font-black">⚓</div>
                              <div>
                                  <h3 className="text-xl font-black text-slate-800">{c.number}</h3>
                                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">Waiting for Clearance</p>
                              </div>
                          </div>
                          <button 
                            onClick={() => setClearingContainer(c)}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                          >
                            Bixi Canshuurta (Clear Customs) ➔
                          </button>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-4 overflow-x-auto">
                          {(c.items || []).map(i => (
                              <span key={i.id} className="text-[9px] font-bold bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-500 whitespace-nowrap">{i.name} ({i.requestedQty})</span>
                          ))}
                      </div>
                  </div>
              ))}
              {containers.filter(c => c.status === 'ARRIVED').length === 0 && (
                  <div className="py-32 text-center text-slate-300 font-black uppercase tracking-widest bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                      Ma jiraan kuntenaro soo gaaray dekedda oo sugaya canshuur.
                  </div>
              )}
           </div>
        </div>
      )}

      {/* 5. Arrivals Tab */}
      {activeTab === 'arrivals' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Main Arrivals (Bakhaarka Dhexe)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kuntenarada la canshuuray ee diyaar u ah dejinta.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {containers.filter(c => c.status === 'CLEARED').map(c => {
                  const itemsCost = c.items.reduce((sum, item) => sum + (item.actualPrice * item.requestedQty), 0);
                  const totalLandedCost = itemsCost + c.freightCost + c.taxPaid;

                  return (
                  <div key={c.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group hover:border-emerald-200 transition-all">
                      <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl font-black">✅</div>
                              <div>
                                  <h3 className="text-xl font-black text-slate-800">{c.number}</h3>
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Cleared & Ready to Unload</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Total Landed Cost</p>
                              <p className="text-lg font-black text-emerald-600">${totalLandedCost.toLocaleString()}</p>
                              <p className="text-[8px] font-bold text-slate-300">(Goods: ${itemsCost.toLocaleString()} + Freight: ${c.freightCost} + Tax: ${c.taxPaid})</p>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                          <p className="text-slate-400 font-bold text-xs uppercase">Please go to "Stock Items" to process inventory check-in.</p>
                      </div>
                  </div>
              )})}
              {containers.filter(c => c.status === 'CLEARED').length === 0 && (
                  <div className="py-32 text-center text-slate-300 font-black uppercase tracking-widest bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                      Ma jiraan kuntenaro la fasaxay.
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Container Creation Modal */}
      {isContainerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60000] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
              <div className="p-10 bg-indigo-600 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Abuura Kuntenar Cusub</h2>
                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mt-1">Ku dar alaabta aad soo iibsatay rarka.</p>
                 </div>
                 <button onClick={() => setIsContainerModalOpen(false)} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl hover:bg-white/40">✕</button>
              </div>

              <div className="p-10 overflow-y-auto no-scrollbar space-y-8 bg-slate-50/30">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Container Number</label>
                       <input className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500" placeholder="e.g. MSCU123456" value={newContainer.number} onChange={e => setNewContainer({...newContainer, number: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nooca (Size)</label>
                       <select className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none" value={newContainer.type} onChange={e => setNewContainer({...newContainer, type: e.target.value as any})}>
                          <option value="20FT">20 FT Standard</option>
                          <option value="40FT">40 FT Standard</option>
                          <option value="40HQ">40 HQ High Cube</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dooro Dalabka (PO)</label>
                       <select className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none" value={newContainer.poId} onChange={e => {
                          const poId = e.target.value;
                          const po = pos.find(p => p.id === poId);
                          setNewContainer({...newContainer, poId, items: (po?.items || []).filter(i => i.isPurchased) || []});
                       }}>
                          <option value="">-- Dooro PO --</option>
                          {pos.filter(p => p.buyerId === user.id && (p.status === POStatus.PURCHASING || p.status === POStatus.PRICED)).map(p => (
                             <option key={p.id} value={p.id}>{p.title} ({p.id})</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 {newContainer.poId && (
                   <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Alaabta la rarayo (Purchased Only)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(newContainer.items || []).map(item => (
                           <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                              <div>
                                 <p className="font-black text-slate-700 text-sm uppercase">{item.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">Tirada: {item.requestedQty} {item.packType}</p>
                              </div>
                              <span className="text-emerald-500 font-black text-xs">✓ READY</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Freight Cost ($)</label>
                       <input type="number" className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none" value={newContainer.freightCost} onChange={e => setNewContainer({...newContainer, freightCost: Number(e.target.value)})} />
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                 <button onClick={() => setIsContainerModalOpen(false)} className="flex-1 py-5 bg-white text-slate-400 font-black rounded-[2.5rem] uppercase text-[11px] border border-slate-200">JOOJI</button>
                 <button onClick={handleCreateContainer} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase text-[11px] hover:bg-indigo-700 transition-all active:scale-95">XAQUJI RARKA KUNTENARKA ➔</button>
              </div>
           </div>
        </div>
      )}

      {/* Pricing Modal */}
      {pricingPO && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Sii Qiimaha Alaabta</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Diiwaangali qiimaha dhabta ah ee alaab kasta</p>
               </div>
               <button onClick={() => setPricingPO(null)} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 flex items-center justify-center">✕</button>
            </div>
            <div className="p-8 overflow-y-auto no-scrollbar space-y-4">
              {(pricingPO.items || []).map(item => (
                <div key={item.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-black text-slate-700 text-sm uppercase">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dalabka: {item.requestedQty} {item.packType}</p>
                  </div>
                  <div className="w-full sm:w-48 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                    <input type="number" className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-indigo-600 outline-none focus:border-indigo-500" value={pricingValues[item.id] || 0} onChange={(e) => setPricingValues({ ...pricingValues, [item.id]: Number(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
               <button onClick={() => setPricingPO(null)} className="flex-1 py-4 bg-white text-slate-400 font-black rounded-2xl uppercase text-[10px]">Jooji</button>
               <button onClick={handleSavePrices} className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] hover:bg-emerald-700">XAQIIJI QIIMAHA GUUD ➔</button>
            </div>
          </div>
        </div>
      )}

      {/* Customs Clearance Modal */}
      {clearingContainer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70000] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-8 bg-slate-900 text-white text-center">
                 <h2 className="text-xl font-black uppercase">Canshuurta & Fasaxa</h2>
                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Customs Clearance - {clearingContainer.number}</p>
              </div>
              <div className="p-10 space-y-6 bg-slate-50/50">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase px-2 text-slate-400">Total Tax Amount ($)</label>
                    <input type="number" className="w-full p-6 bg-white border-2 border-slate-100 rounded-3xl font-black text-3xl text-emerald-600 outline-none text-center shadow-inner" value={clearanceForm.taxAmount} onChange={e => setClearanceForm({...clearanceForm, taxAmount: Number(e.target.value)})} autoFocus />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase px-2 text-slate-400">Customs Reference / Notes</label>
                    <textarea className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-24 resize-none outline-none" placeholder="Lambarka waraaqda canshuurta..." value={clearanceForm.notes} onChange={e => setClearanceForm({...clearanceForm, notes: e.target.value})} />
                 </div>
                 
                 <div className="pt-4 flex flex-col gap-3">
                    <button onClick={handleClearCustoms} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase text-[11px] tracking-widest active:scale-95 hover:bg-indigo-700">Fasax & Gudbi (Clear) ➔</button>
                    <button onClick={() => setClearingContainer(null)} className="w-full text-[10px] font-black text-slate-400 uppercase text-center hover:text-slate-600">Jooji</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PO Creation Modal (Send Order) */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60000] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
              <div className="p-10 bg-indigo-600 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Dir Dalab Cusub (Order)</h2>
                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mt-1">Diiwaangali alaabta aad rabto in Buyer-ku soo qiimeeyo.</p>
                 </div>
                 <button onClick={() => setIsPOModalOpen(false)} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl hover:bg-white/40 transition-all font-black text-xl">✕</button>
              </div>
              <div className="p-10 overflow-y-auto no-scrollbar space-y-8 bg-slate-50/30">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-black px-2 uppercase text-slate-400">Title</label><input className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none" value={newPOTitle} onChange={e => setNewPOTitle(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black px-2 uppercase text-slate-400">Buyer</label><select className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-slate-800 outline-none" value={selectedBuyerId} onChange={e => setSelectedBuyerId(e.target.value)}><option value="">-- Select Buyer --</option>{buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                 </div>
                 <div className="space-y-3">
                    {poItems.map((item, idx) => (
                      <div key={item.id} className="flex gap-4 bg-white p-4 rounded-3xl border border-slate-100 items-center">
                         <input className="flex-1 p-3 bg-slate-50 rounded-2xl font-bold" placeholder="Item Name" value={item.name} onChange={e => { const n = [...poItems]; n[idx].name = e.target.value; setPoItems(n); }} />
                         <input type="number" className="w-24 p-3 bg-slate-50 rounded-2xl font-bold text-center" value={item.requestedQty} onChange={e => { const n = [...poItems]; n[idx].requestedQty = parseInt(e.target.value) || 0; setPoItems(n); }} />
                         <button onClick={() => setPoItems(poItems.filter(i => i.id !== item.id))} className="text-rose-500 font-bold p-2">✕</button>
                      </div>
                    ))}
                    <button onClick={() => setPoItems([...poItems, { id: Date.now().toString(), name: '', requestedQty: 1, lastPurchasePrice: 0, packType: PackType.BOX }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black text-slate-400">+ Add New Item</button>
                 </div>
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                 <button onClick={() => setIsPOModalOpen(false)} className="flex-1 py-5 bg-white text-slate-400 font-black rounded-[2.5rem] uppercase text-[11px]">JOOJI</button>
                 <button onClick={() => handleSendOrder(true)} className="flex-1 py-5 bg-slate-200 text-slate-600 font-black rounded-[2.5rem] uppercase text-[11px] hover:bg-slate-300">SAVE DRAFT 💾</button>
                 <button onClick={() => handleSendOrder(false)} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase text-[11px] hover:bg-indigo-700">DIR DALABKA ➔</button>
              </div>
           </div>
        </div>
      )}

      {/* Send Money Modal (Global) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70000] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 bg-emerald-600 text-white text-center">
                 <h2 className="text-xl font-black uppercase">Dir Lacag Cusub</h2>
                 <p className="text-[9px] font-bold uppercase opacity-80 mt-1">Fund Transfer (Global Wallet)</p>
              </div>
              <div className="p-10 space-y-6 bg-slate-50/50">
                 {/* Buyer Selection for Money Transfer */}
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase px-2 text-slate-400">Dooro Buyer-ka (Account)</label>
                    <select 
                        className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none" 
                        value={selectedBuyerId} 
                        onChange={e => {
                            setSelectedBuyerId(e.target.value);
                            setTransferForm({...transferForm, poId: ''}); // Reset PO when buyer changes
                        }}
                    >
                        <option value="">-- Select Buyer Account --</option>
                        {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase px-2 text-slate-400">Dooro Order-ka (Reference)</label>
                    <select 
                        className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none" 
                        value={transferForm.poId} 
                        onChange={e => setTransferForm({...transferForm, poId: e.target.value})}
                        disabled={!selectedBuyerId}
                    >
                        <option value="">-- Select Order --</option>
                        {pos
                            .filter(p => !isBuyer) // Manager view
                            .filter(p => selectedBuyerId ? p.buyerId === selectedBuyerId : true)
                            .map(p => (
                            <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                        ))}
                    </select>
                 </div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase px-2 text-slate-400">Amount ($)</label><input type="number" className="w-full p-6 bg-white border-2 border-slate-100 rounded-3xl font-black text-3xl text-emerald-600 outline-none text-center" value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase px-2 text-slate-400">Method</label><input className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={transferForm.method} onChange={e => setTransferForm({...transferForm, method: e.target.value})} /></div>
                 
                 <div className="pt-4 flex flex-col gap-3">
                    <button onClick={handleSendMoney} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase text-[11px]">SEND FUNDS ➔</button>
                    <button onClick={() => setIsTransferModalOpen(false)} className="w-full text-[10px] font-black text-slate-300 uppercase text-center">Jooji</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsProcurement;
