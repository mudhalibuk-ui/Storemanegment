
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Customer, Sale, SaleItem, User, Branch, TransactionType, TransactionStatus, SystemSettings, Xarun, UserRole } from '../types';
import { API } from '../services/api';
import DocumentViewer from './DocumentViewer';

interface POSProps {
  mode?: 'pos' | 'invoice';
  user: User;
  items: InventoryItem[];
  customers: Customer[];
  branches: Branch[];
  initialBranchId?: string;
  xarumo: Xarun[];
  settings: SystemSettings;
  onRefresh: () => void;
  recordAuditLog?: (action: string, entityType: string, entityId: string, details: string) => void;
}

const POS: React.FC<POSProps> = ({ mode = 'pos', user, items, customers, branches, initialBranchId, xarumo, settings, onRefresh, recordAuditLog }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [applyVat, setApplyVat] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>(mode === 'invoice' ? 'CREDIT' : 'CASH');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedXarunId, setSelectedXarunId] = useState(user.xarunId || '');
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId || '');

  useEffect(() => {
    if (initialBranchId) {
      setSelectedBranchId(initialBranchId);
    }
  }, [initialBranchId]);

  useEffect(() => {
    if (mode === 'invoice') {
      setPaymentMethod('CREDIT');
    } else {
      setPaymentMethod('CASH');
    }
  }, [mode]);

  // Auto-select branch if user has xarunId and there's only one branch or just pick the first one
  useEffect(() => {
    if (selectedXarunId && !selectedBranchId) {
      const xarunBranches = branches.filter(b => b.xarunId === selectedXarunId);
      if (xarunBranches.length > 0) {
        setSelectedBranchId(xarunBranches[0].id);
      }
    }
  }, [selectedXarunId, branches]);

  const [isReturnMode, setIsReturnMode] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ type: 'INVOICE' | 'QUOTATION' | 'SALES_ORDER', data: Partial<Sale> } | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter(i => 
      i.branchId === selectedBranchId && 
      (i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [items, searchQuery, selectedBranchId]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const vatAmount = applyVat ? subtotal * 0.15 : 0; // Assuming 15% VAT
  const total = subtotal + vatAmount;

  const addToCart = (item: InventoryItem) => {
    const existing = cart.find(c => c.itemId === item.id);
    if (existing) {
      if (!isReturnMode && existing.quantity >= item.quantity) {
        alert("Stock kuma filna!");
        return;
      }
      setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c));
    } else {
      if (!isReturnMode && item.quantity <= 0) {
        alert("Stock-ga waa eber!");
        return;
      }
      setCart([...cart, {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: 1,
        unitPrice: item.sellingPrice || item.lastKnownPrice || 0,
        total: item.sellingPrice || item.lastKnownPrice || 0
      }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const updateCartQuantity = (itemId: string, qty: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    if (!isReturnMode && qty > item.quantity) {
      alert("Stock kuma filna!");
      return;
    }
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(c => c.itemId === itemId ? { ...c, quantity: qty, total: qty * c.unitPrice } : c));
  };

  const handlePreview = () => {
    if (cart.length === 0) return;
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    const sale: Partial<Sale> = {
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      items: cart,
      subtotal,
      vatAmount,
      total,
      applyVat,
      paymentMethod,
      branchId: selectedBranchId,
      xarunId: selectedXarunId,
      personnel: user.name,
      isVatSale: applyVat,
      type: isReturnMode ? 'CREDIT_MEMO' : 'SALE',
      timestamp: new Date().toISOString()
    };

    setViewingDocument({ 
      type: 'INVOICE', 
      data: sale 
    });
  };

  const handleProcessSale = async (type: 'SALE' | 'QUOTATION' | 'SALES_ORDER' = 'SALE') => {
    if (cart.length === 0) return;
    if (!selectedBranchId) {
      alert("Fadlan dooro Branch!");
      return;
    }
    if (mode === 'invoice' && !selectedCustomerId) {
      alert("Fadlan dooro Customer si aad u samayso Invoice!");
      return;
    }

    setIsProcessing(true);
    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      
      const sale: Partial<Sale> = {
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        items: cart,
        subtotal,
        vatAmount,
        total,
        applyVat,
        paymentMethod,
        branchId: selectedBranchId,
        xarunId: selectedXarunId,
        personnel: user.name,
        isVatSale: applyVat,
        type: isReturnMode ? 'CREDIT_MEMO' : type
      };

      // 1. Create Sale/Quote Record
      const result = await API.sales.create(sale);
      const saleWithId = { ...sale, id: result.id, timestamp: new Date().toISOString() };

      // Audit Log
      if (recordAuditLog) {
        recordAuditLog(
          isReturnMode ? 'RETURN' : 'SALE',
          'SALE',
          result.id,
          `${isReturnMode ? 'Celis' : 'Iib'} ${sale.total.toFixed(2)} - ${sale.customerName}`
        );
      }

      // 2. Create Transactions ONLY if it's a real sale or sales order (depending on business logic)
      // Usually Quotations don't deduct stock. Sales Orders might reserve it, but for simplicity:
      if (type === 'SALE' || isReturnMode) {
        for (const cartItem of cart) {
          await API.transactions.create({
            itemId: cartItem.itemId,
            itemName: cartItem.name,
            type: isReturnMode ? TransactionType.IN : TransactionType.OUT,
            quantity: cartItem.quantity,
            branchId: selectedBranchId,
            personnel: user.name,
            notes: `POS ${isReturnMode ? 'Return' : 'Sale'} to ${sale.customerName}`,
            status: TransactionStatus.APPROVED,
            requestedBy: user.id,
            xarunId: user.xarunId || '',
            referenceId: result.id
          });
        }
      }

      // Show document for printing
      setViewingDocument({ 
        type: type === 'QUOTATION' ? 'QUOTATION' : type === 'SALES_ORDER' ? 'SALES_ORDER' : 'INVOICE', 
        data: saleWithId 
      });

      setCart([]);
      setSelectedCustomerId('');
      setIsReturnMode(false);
      onRefresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const topItems = useMemo(() => {
    // Logic to select top items based on items or lastSoldDate
    return items.filter(i => i.branchId === selectedBranchId).slice(0, 8);
  }, [items, selectedBranchId]);

  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const changeAmount = useMemo(() => {
    const val = parseFloat(receivedAmount) || 0;
    return val > total ? val - total : 0;
  }, [receivedAmount, total]);

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Left: Item Selection */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm mb-6 flex gap-6 items-center border border-slate-100">
          <div className="flex-1 relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Search items by name or SKU..." 
              className="w-full pl-14 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-indigo-500/5 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            {(user.role === UserRole.SUPER_ADMIN || !user.xarunId) && (
              <select 
                className="px-5 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-800 outline-none min-w-[170px] uppercase text-[10px] tracking-widest cursor-pointer"
                value={selectedXarunId}
                onChange={e => {
                  setSelectedXarunId(e.target.value);
                  setSelectedBranchId(''); 
                }}
              >
                <option value="">HUB Selection</option>
                {xarumo.map(x => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            )}
            <select 
              className="px-5 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-800 outline-none min-w-[170px] uppercase text-[10px] tracking-widest cursor-pointer"
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
            >
              <option value="">Branch Location</option>
              {branches.filter(b => !selectedXarunId || b.xarunId === selectedXarunId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SMART TOP ITEMS SECTION */}
        {selectedBranchId && !searchQuery && (
          <div className="mb-8 animate-in slide-in-from-top duration-500">
             <div className="flex items-center justify-between mb-4 px-2">
                <div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Qaybta Degdegga ah (Quick Items)</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Frequently Sold Items</p>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase">Live Recommendations</span>
                </div>
             </div>
             <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {topItems.map(item => (
                   <button 
                    key={item.id} 
                    onClick={() => addToCart(item)}
                    className="aspect-square bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center p-3 text-center transition-all hover:scale-105 hover:shadow-xl hover:border-indigo-500/20 active:scale-95 group shadow-sm"
                   >
                    <span className="text-xl mb-1 group-hover:scale-125 transition-transform">📦</span>
                    <span className="text-[9px] font-black leading-tight text-slate-700 uppercase line-clamp-2">{item.name}</span>
                    <span className="text-[10px] font-black text-indigo-600 mt-1">${item.sellingPrice || 0}</span>
                   </button>
                ))}
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {!selectedBranchId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
              <div className="w-24 h-24 bg-slate-200 rounded-[2.5rem] flex items-center justify-center text-5xl mb-6 shadow-inner ring-8 ring-slate-100">🏪</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Fadlan dooro Bakhaar</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Select hub to start selling</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
              <div className="w-24 h-24 bg-slate-200 rounded-[2.5rem] flex items-center justify-center text-5xl mb-6 shadow-inner ring-8 ring-slate-100">🚫</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Wax alaab ah lama helin</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">No matching items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white p-5 rounded-[2.2rem] shadow-sm hover:shadow-2xl transition-all text-left group border-2 border-transparent hover:border-indigo-500/20 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-lg">+</div>
                  </div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase mb-1 tracking-widest">{item.sku}</p>
                  <h4 className="font-black text-slate-800 leading-tight mb-4 group-hover:text-indigo-600 transition-colors uppercase text-xs h-8 line-clamp-2">{item.name}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</p>
                      <p className="text-lg font-black text-slate-900 tracking-tighter">${item.sellingPrice || item.lastKnownPrice || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stock</p>
                      <p className={`text-[10px] font-black ${item.quantity < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.quantity} PCS</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-[450px] bg-white border-l border-slate-100 flex flex-col shadow-2xl z-50">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              {mode === 'invoice' ? 'Invoice' : 'POS TERMINAL'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
              {mode === 'invoice' ? 'Advanced Billing' : `Station #${user.id.slice(0,4)}`}
            </p>
          </div>
          <button 
            onClick={() => setIsReturnMode(!isReturnMode)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest ${isReturnMode ? 'bg-rose-600 text-white shadow-xl shadow-rose-100' : 'bg-slate-50 text-slate-400'}`}
          >
            {isReturnMode ? 'Return' : 'Sale'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-5 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 animate-pulse">
              <span className="text-8xl mb-6">🛒</span>
              <p className="font-black uppercase text-[10px] tracking-[0.34em]">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.itemId} className="flex flex-col gap-3 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                     <h5 className="font-black text-slate-800 text-sm uppercase leading-tight">{item.name}</h5>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{item.sku}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.itemId)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
                <div className="flex items-center gap-6 mt-1">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Price</label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                       <input 
                         type="number" 
                         step="0.01"
                         className="w-full bg-white border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                         value={item.unitPrice}
                         onChange={(e) => {
                           const newPrice = parseFloat(e.target.value) || 0;
                           setCart(cart.map(c => c.itemId === item.itemId ? { ...c, unitPrice: newPrice, total: newPrice * c.quantity } : c));
                         }}
                       />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block text-center">Qty</label>
                    <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl p-1">
                      <button onClick={() => updateCartQuantity(item.itemId, item.quantity - 1)} className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center font-black text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-xs">-</button>
                      <span className="w-10 text-center font-black text-slate-800 text-sm">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.itemId, item.quantity + 1)} className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center font-black text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-xs">+</button>
                    </div>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Total</label>
                    <p className="font-black text-slate-900 text-base tracking-tighter">${item.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          
          <div className="space-y-4">
             <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Macmiilka</label>
                   <select 
                     className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-black text-white outline-none text-xs appearance-none cursor-pointer"
                     value={selectedCustomerId}
                     onChange={e => setSelectedCustomerId(e.target.value)}
                   >
                     <option value="" className="bg-slate-900">Walk-in Customer</option>
                     {customers.filter(c => !selectedXarunId || c.xarunId === selectedXarunId).map(c => (
                       <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                     ))}
                   </select>
                </div>
                <div className="w-24 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">VAT</label>
                   <button 
                     onClick={() => setApplyVat(!applyVat)}
                     className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase transition-all ${applyVat ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/40'}`}
                   >
                     {applyVat ? '15%' : 'OFF'}
                   </button>
                </div>
             </div>

             {paymentMethod === 'CASH' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom duration-300">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Received ($)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl font-black text-white outline-none text-lg"
                        value={receivedAmount}
                        onChange={e => setReceivedAmount(e.target.value)}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1 italic">Tafsiilka (Change)</label>
                      <div className="w-full p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center">
                         <span className="text-2xl font-black text-indigo-400">$</span>
                         <span className="text-2xl font-black text-indigo-400 ml-1">{changeAmount.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             )}

             <div className="flex gap-2">
               {(['CASH', 'BANK', 'CREDIT'] as const).map(m => (
                 <button 
                   key={m}
                   onClick={() => setPaymentMethod(m)}
                   className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all border ${paymentMethod === m ? 'bg-white text-slate-900 border-white' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                 >
                   {m}
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/10">
            <div className="flex justify-between items-baseline">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Khadka Koowaad (Total Due)</span>
               <div className="flex items-center">
                  <span className="text-sm font-black text-indigo-400 mr-2">$</span>
                  <span className="text-5xl font-black tracking-tighter">{total.toFixed(2)}</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4">
            <button 
              disabled={cart.length === 0}
              onClick={handlePreview}
              className="py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-[1.8rem] transition-all uppercase text-[10px] tracking-[0.2em] border border-white/5 disabled:opacity-30"
            >
              Preview
            </button>
            <button 
              disabled={cart.length === 0 || isProcessing}
              onClick={() => handleProcessSale('SALE')}
              className="py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.8rem] shadow-2xl shadow-indigo-500/20 transition-all uppercase text-[10px] tracking-[0.2em] transform active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {isProcessing ? 'Processing...' : 'Complete Order'}
            </button>
          </div>
        </div>
      </div>

      {viewingDocument && (
        <DocumentViewer 
          type={viewingDocument.type}
          data={viewingDocument.data}
          settings={settings}
          branch={branches.find(b => b.id === viewingDocument.data.branchId)}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default POS;
