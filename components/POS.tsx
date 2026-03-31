
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
  xarumo: Xarun[];
  settings: SystemSettings;
  onRefresh: () => void;
}

const POS: React.FC<POSProps> = ({ mode = 'pos', user, items, customers, branches, xarumo, settings, onRefresh }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [applyVat, setApplyVat] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>(mode === 'invoice' ? 'CREDIT' : 'CASH');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedXarunId, setSelectedXarunId] = useState(user.xarunId || '');
  const [selectedBranchId, setSelectedBranchId] = useState('');

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

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Left: Item Selection */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white p-4 rounded-3xl shadow-sm mb-6 flex gap-4 items-center">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search items by name or SKU..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 ring-indigo-500/20"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(user.role === UserRole.SUPER_ADMIN || !user.xarunId) && (
              <select 
                className="px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none min-w-[150px]"
                value={selectedXarunId}
                onChange={e => {
                  setSelectedXarunId(e.target.value);
                  setSelectedBranchId(''); // Reset branch when xarun changes
                }}
              >
                <option value="">Select Xarun</option>
                {xarumo.map(x => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            )}
            <select 
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none min-w-[150px]"
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
            >
              <option value="">Select Branch</option>
              {branches.filter(b => !selectedXarunId || b.xarunId === selectedXarunId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {!selectedBranchId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
              <div className="text-6xl mb-4">🏪</div>
              <h3 className="text-xl font-black text-slate-800 uppercase">Fadlan dooro Bakhaar</h3>
              <p className="text-sm font-bold text-slate-400 uppercase mt-2">Si aad u aragto alaabta halkan taal.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-black text-slate-800 uppercase">Wax alaab ah lama helin</h3>
              <p className="text-sm font-bold text-slate-400 uppercase mt-2">Bakhaarkan wax alaab ah kuma jiraan ama raadintaadu ma dhalin natiijo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white p-4 rounded-3xl shadow-sm hover:shadow-md transition-all text-left group border-2 border-transparent hover:border-indigo-500/20"
                >
                  <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">{item.sku}</p>
                  <h4 className="font-black text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors uppercase text-sm">{item.name}</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Price</p>
                      <p className="text-lg font-black text-slate-900">${item.sellingPrice || item.lastKnownPrice || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Stock</p>
                      <p className={`text-xs font-black ${item.quantity < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.quantity} PCS</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {mode === 'invoice' ? 'Invoice Builder' : 'Current Order'}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {mode === 'invoice' ? 'Standard Invoice' : 'POS Terminal #01'}
            </p>
          </div>
          <button 
            onClick={() => setIsReturnMode(!isReturnMode)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isReturnMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`}
          >
            {isReturnMode ? 'Return Mode' : 'Sale Mode'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
              <span className="text-6xl mb-4">🛒</span>
              <p className="font-black uppercase text-xs tracking-widest">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.itemId} className="flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-slate-800 text-sm uppercase leading-tight">{item.name}</h5>
                  <button onClick={() => removeFromCart(item.itemId)} className="text-rose-400 hover:text-rose-600">✕</button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        setCart(cart.map(c => c.itemId === item.itemId ? { ...c, unitPrice: newPrice, total: newPrice * c.quantity } : c));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">Qty</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateCartQuantity(item.itemId, item.quantity - 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-md flex items-center justify-center font-black text-slate-600 hover:bg-slate-100">-</button>
                      <span className="w-8 text-center font-black text-slate-800 text-sm">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.itemId, item.quantity + 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-md flex items-center justify-center font-black text-slate-600 hover:bg-slate-100">+</button>
                    </div>
                  </div>
                  <div className="text-right min-w-[60px] flex flex-col justify-end h-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Total</label>
                    <p className="font-black text-slate-900 text-sm">${item.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer</label>
            <select 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-sm"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
            >
              <option value="">Walk-in Customer</option>
              {customers.filter(c => !selectedXarunId || c.xarunId === selectedXarunId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-xs font-black text-slate-600 uppercase">Apply 15% VAT</span>
            <button 
              onClick={() => setApplyVat(!applyVat)}
              className={`w-12 h-6 rounded-full transition-all relative ${applyVat ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${applyVat ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'BANK', 'CREDIT'] as const).map(m => (
              <button 
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {applyVat && (
              <div className="flex justify-between text-slate-400 font-bold text-xs uppercase">
                <span>VAT (15%)</span>
                <span>${vatAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-black text-xl uppercase pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {mode === 'invoice' && (
              <>
                <button 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => handleProcessSale('QUOTATION')}
                  className="py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  Quotation
                </button>
                <button 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => handleProcessSale('SALES_ORDER')}
                  className="py-3 bg-amber-600 text-white font-black rounded-xl shadow-lg hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  Sales Order
                </button>
              </>
            )}
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleProcessSale('SALE')}
            className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isProcessing ? 'Processing...' : 
              (mode === 'invoice' 
                ? (isReturnMode ? 'Generate Credit Memo' : 'Generate Standard Invoice') 
                : (isReturnMode ? 'Process Return' : 'Process Sale')
              )}
          </button>
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
