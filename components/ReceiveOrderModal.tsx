import React, { useState, useEffect } from 'react';
import { XarunOrderRequest, Branch, XarunOrderItem } from '../types';
import { numberToLetter } from '../services/mappingUtils';

interface ReceiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: XarunOrderRequest;
  branches: Branch[];
  onReceive: (itemsWithLocation: { itemId: string, quantity: number, branchId: string, shelves: number, sections: number }[]) => Promise<void>;
}

const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({ isOpen, onClose, order, branches, onReceive }) => {
  const [itemLocations, setItemLocations] = useState<{ [itemId: string]: { branchId: string, shelves: number, sections: number } }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order && branches.length > 0) {
      const initialLocations: { [itemId: string]: { branchId: string, shelves: number, sections: number } } = {};
      order.items.forEach(item => {
        initialLocations[item.itemId] = {
          branchId: branches[0].id,
          shelves: 1,
          sections: 1
        };
      });
      setItemLocations(initialLocations);
    }
  }, [order, branches]);

  const handleLocationChange = (itemId: string, field: 'branchId' | 'shelves' | 'sections', value: any) => {
    setItemLocations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const itemsWithLocation = order.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        ...itemLocations[item.itemId]
      }));
      await onReceive(itemsWithLocation);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Cilad ayaa dhacday markii la keydinayay alaabta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Alaabta La Helay (Receive Items)
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              Fadlan dooro bakhaarka iyo goobta la dhigayo alaabta.
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center">✕</button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          {order.items.map((item) => {
            const location = itemLocations[item.itemId] || { branchId: branches[0]?.id || '', shelves: 1, sections: 1 };
            const selectedBranch = branches.find(b => b.id === location.branchId);
            
            const shelfOptions = selectedBranch 
                ? Array.from({ length: selectedBranch.totalShelves }, (_, i) => ({
                    value: i + 1,
                    label: numberToLetter(i + 1)
                }))
                : [{ value: 1, label: 'A' }];

            const maxSections = selectedBranch?.customSections?.[location.shelves] || selectedBranch?.totalSections || 1;
            const sectionOptions = Array.from({ length: maxSections }, (_, i) => ({
                value: i + 1,
                label: (i + 1).toString().padStart(2, '0')
            }));

            return (
              <div key={item.itemId} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h3 className="font-black text-slate-700 text-lg mb-4">{item.itemName} (Qty: {item.quantity})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Bakhaarka</label>
                    <select 
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                      value={location.branchId}
                      onChange={(e) => handleLocationChange(item.itemId, 'branchId', e.target.value)}
                    >
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Iskafalo (Shelf)</label>
                    <select 
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                      value={location.shelves}
                      onChange={(e) => handleLocationChange(item.itemId, 'shelves', parseInt(e.target.value))}
                    >
                      {shelfOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Godka (Section)</label>
                    <select 
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                      value={location.sections}
                      onChange={(e) => handleLocationChange(item.itemId, 'sections', parseInt(e.target.value))}
                    >
                      {sectionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
          <button onClick={onClose} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">
            Jooji
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? 'Keydinaya...' : 'Dhameystir & Keydi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveOrderModal;
