import React, { useState, useMemo } from 'react';
import { InventoryItem, Branch, User, Xarun, TransferStatus, InterBranchTransferRequest, UserRole } from '../../types';
import { API } from '../../services/api';
import { X, Search, Plus, Trash2, Truck, Package, Building2, FileText, AlertCircle } from 'lucide-react';

interface SelectedItem {
  itemId: string;
  itemName: string;
  quantity: number;
  availableQty: number;
  sku: string;
}

interface TransferRequestFormProps {
  user: User;
  xarumo: Xarun[];
  myBranches: Branch[];
  items: InventoryItem[];
  onSave: (newTransfer: InterBranchTransferRequest) => void;
  onCancel: () => void;
}

const TransferRequestForm: React.FC<TransferRequestFormProps> = ({
  user,
  xarumo,
  myBranches,
  items,
  onSave,
  onCancel,
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [targetXarunId, setTargetXarunId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableItems = useMemo(() => {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    return items.filter(item => 
      (isSuperAdmin || !user.xarunId || item.xarunId === user.xarunId) && 
      item.quantity > 0
    );
  }, [items, user.xarunId, user.role]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase().trim();
    return availableItems.filter(item => 
      !selectedItems.some(si => si.itemId === item.id) &&
      (
        (item.name?.toLowerCase() || '').includes(lower) || 
        (item.sku?.toLowerCase() || '').includes(lower)
      )
    ).slice(0, 8);
  }, [availableItems, searchTerm, selectedItems]);

  const handleAddItem = (item: InventoryItem) => {
    setSelectedItems(prev => [...prev, {
      itemId: item.id,
      itemName: item.name,
      quantity: 1,
      availableQty: item.quantity,
      sku: item.sku
    }]);
    setSearchTerm('');
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, quantity: Math.min(qty, item.availableQty) } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !targetXarunId || !user.xarunId) {
      alert('Fadlan dooro ugu yaraan hal shay iyo xarunta loo dirayo.');
      return;
    }

    setIsLoading(true);
    try {
      const sourceBranch = myBranches.find(b => b.xarunId === user.xarunId);
      const targetBranch = myBranches.find(b => b.xarunId === targetXarunId);

      if (!sourceBranch || !targetBranch) {
        alert('Cilad: Ma heli karno laanta isha ama laanta bartilmaameedka.');
        setIsLoading(false);
        return;
      }

      const newTransfer: InterBranchTransferRequest = {
        id: `transfer-${Date.now()}`,
        items: selectedItems.map(si => ({
          itemId: si.itemId,
          itemName: si.itemName,
          quantity: si.quantity,
        })),
        sourceXarunId: user.xarunId,
        sourceBranchId: sourceBranch.id,
        targetXarunId: targetXarunId,
        targetBranchId: targetBranch.id,
        requestedBy: user.id,
        status: TransferStatus.REQUESTED,
        notes: notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditTrail: [{
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          status: TransferStatus.REQUESTED,
        }],
      };

      await API.interBranchTransferRequests.create(newTransfer);
      
      // Update stock for all items
      for (const si of selectedItems) {
        const originalItem = items.find(i => i.id === si.itemId);
        if (originalItem) {
          const updatedItem = { 
            ...originalItem, 
            quantity: originalItem.quantity - si.quantity, 
            reservedQuantity: (originalItem.reservedQuantity || 0) + si.quantity 
          };
          await API.items.save(updatedItem);
        }
      }

      onSave(newTransfer);
    } catch (error) {
      console.error('Error creating transfer request:', error);
      alert('Cilad ayaa dhacday dirista codsiga wareejinta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        {/* Header */}
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Truck className="w-8 h-8" />
              Codsiga Wareejinta
            </h2>
            <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mt-1">New Logistics & Transfer Request</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
          {/* Target Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" />
              Xarunta Loo Dirayo (Target Xarun)
            </label>
            <select
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
              value={targetXarunId}
              onChange={(e) => setTargetXarunId(e.target.value)}
              required
            >
              <option value="">Dooro xarunta loo dirayo...</option>
              {xarumo.filter(x => x.id !== user.xarunId).map(xarun => (
                <option key={xarun.id} value={xarun.id}>{xarun.name}</option>
              ))}
            </select>
          </div>

          {/* Item Search */}
          <div className="space-y-3 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" />
              Raadi Alaab (Search Items)
            </label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Ku qor magaca ama SKU..."
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Search Results Dropdown */}
            {searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAddItem(item)}
                      className="w-full px-6 py-4 text-left hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-indigo-600">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU: {item.sku} • Stock: {item.quantity}</p>
                      </div>
                      <Plus className="w-5 h-5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alaab lama helin (No items found)</p>
                    {availableItems.length === 0 && (
                      <p className="text-[10px] text-rose-400 mt-1 uppercase font-bold">Xaruntan wax alaab ah kuma jiraan</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Items List */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-3 h-3" />
              Alaabta La Doortay ({selectedItems.length})
            </label>
            
            {selectedItems.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Ma jirto alaab la doortay</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map(item => (
                  <div key={item.itemId} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.itemName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU: {item.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <input
                          type="number"
                          min="1"
                          max={item.availableQty}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.itemId, Number(e.target.value))}
                          className="w-24 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center font-black text-indigo-600 focus:border-indigo-500 outline-none"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Max: {item.availableQty}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Faahfaahin Dheeraad ah (Notes)
            </label>
            <textarea
              rows={3}
              placeholder="Ku qor halkan haddii ay jiraan faahfaahin dheeraad ah..."
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
            disabled={isLoading}
          >
            Jooji (Cancel)
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            disabled={isLoading || selectedItems.length === 0 || !targetXarunId}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Dir Codsiga (Submit Request)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferRequestForm;
