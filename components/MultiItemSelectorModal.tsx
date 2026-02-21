import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Branch } from '../types';

interface SelectedItemWithQuantity extends InventoryItem {
  selectedQuantity: number;
}

interface MultiItemSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: { itemId: string; itemName: string; quantity: number }[]) => void;
  availableItems: InventoryItem[];
  existingSelectedItems?: { itemId: string; itemName: string; quantity: number }[];
  title: string;
  description: string;
  isLoadingItems?: boolean;
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
  maxQuantityPerItem?: boolean; // If true, quantity input max will be item.quantity
}

const MultiItemSelectorModal: React.FC<MultiItemSelectorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableItems,
  existingSelectedItems = [],
  title,
  description,
  isLoadingItems = false,
  customHeader,
  customFooter,
  maxQuantityPerItem = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItemWithQuantity[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Initialize selected items from existingSelectedItems prop
      const initialSelected = existingSelectedItems.map(exItem => {
        const item = availableItems.find(avItem => avItem.id === exItem.itemId);
        return item ? { ...item, selectedQuantity: exItem.quantity } : null;
      }).filter(Boolean) as SelectedItemWithQuantity[];
      setSelectedItems(initialSelected);
      setSearchTerm(''); // Clear search on open
    }
  }, [isOpen, existingSelectedItems, availableItems]);

  const filteredAvailableItems = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    return availableItems.filter(item =>
      (item.name?.toLowerCase().includes(lowerCaseSearch) ||
       item.sku?.toLowerCase().includes(lowerCaseSearch))
    ).filter(item => !selectedItems.some(sItem => sItem.id === item.id)); // Exclude already selected items
  }, [availableItems, searchTerm, selectedItems]);

  const handleAddItem = (item: InventoryItem) => {
    setSelectedItems(prev => [...prev, { ...item, selectedQuantity: 1 }]);
    setSearchTerm(''); // Clear search after adding
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, selectedQuantity: quantity } : item
      )
    );
  };

  const handleSave = () => {
    const itemsToSave = selectedItems.map(item => ({
      itemId: item.id,
      itemName: item.name,
      quantity: item.selectedQuantity,
    }));
    onSave(itemsToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-10 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{title}</h2>
            <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-black text-xl hover:bg-white/40 transition-all">✕</button>
        </div>

        <div className="p-10 overflow-y-auto no-scrollbar space-y-8 bg-slate-50/30 flex-1">
          {customHeader}

          {/* Search for items to add */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dooro Alaab (Add Item)</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Ku qor magaca alaabta si aad u raadiso..."
                className="w-full pl-14 pr-12 py-4 bg-white border-2 border-slate-100 rounded-[3rem] focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isLoadingItems ? (
              <div className="p-5 text-center text-slate-400 font-bold text-xs uppercase">Loading items...</div>
            ) : (
              searchTerm && filteredAvailableItems.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-lg mt-2 max-h-48 overflow-y-auto no-scrollbar">
                  {filteredAvailableItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">SKU: {item.sku} (Available: {item.quantity})</p>
                      </div>
                      <span className="text-indigo-600 text-xl">+</span>
                    </button>
                  ))}
                </div>
              )
            )}
            {searchTerm && filteredAvailableItems.length === 0 && !isLoadingItems && (
              <p className="text-center text-slate-400 font-bold text-xs uppercase py-4">Ma jiraan alaab la helay ama dhammaan waa la doortay.</p>
            )}
          </div>

          {/* Selected Items List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Alaabta La Doortay ({selectedItems.length})</h3>
            {selectedItems.length === 0 ? (
              <p className="text-center text-slate-400 font-bold text-xs uppercase py-10">Fadlan dooro alaab aad ku darto dalabka.</p>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={maxQuantityPerItem ? item.quantity : undefined}
                        value={item.selectedQuantity}
                        onChange={e => handleQuantityChange(item.id, Number(e.target.value))}
                        className="w-24 p-2 border border-slate-200 rounded-lg text-center font-bold"
                      />
                      {maxQuantityPerItem && <span className="text-xs text-slate-500">/ {item.quantity}</span>}
                      <button onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:text-rose-700 p-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {customFooter}
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
        </div>
      </div>
    </div>
  );
};

export default MultiItemSelectorModal;
