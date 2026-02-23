import React, { useState } from 'react';
import { InventoryItem, Branch, User, Xarun, TransferStatus, InterBranchTransferRequest } from '../../types';
import { API } from '../../services/api';
import { XIcon, TruckIcon, PackageIcon, BuildingIcon, FileTextIcon } from 'lucide-react';

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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [targetXarunId, setTargetXarunId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const availableItems = items.filter(item => item.xarunId === user.xarunId && item.quantity > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQuantity = parseFloat(quantity);
    if (!selectedItem || numQuantity <= 0 || numQuantity > selectedItem.quantity || !targetXarunId || !user.xarunId) {
      alert('Fadlan hubi dhammaan goobaha la buuxinayo.');
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
        items: [{
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          quantity: numQuantity,
        }],
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
      
      // Deduct quantity from source branch and mark as reserved
      const updatedItem = { ...selectedItem, quantity: selectedItem.quantity - numQuantity, reservedQuantity: (selectedItem.reservedQuantity || 0) + numQuantity };
      await API.items.save(updatedItem);

      onSave(newTransfer);
      alert('Codsiga wareejinta waa la diray!');
    } catch (error) {
      console.error('Error creating transfer request:', error);
      alert('Cilad ayaa dhacday dirista codsiga wareejinta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">New Inter-Branch Transfer Request</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="item" className="block text-sm font-medium text-gray-700">Item</label>
            <select
              id="item"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedItem?.id || ''}
              onChange={(e) => setSelectedItem(availableItems.find(item => item.id === e.target.value) || null)}
              required
            >
              <option value="">Select an item</option>
              {availableItems.map(item => (
                <option key={item.id} value={item.id}>{item.name} (Available: {item.quantity})</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              id="quantity"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.01"
              step="any"
              max={selectedItem?.quantity || 1}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="targetXarun" className="block text-sm font-medium text-gray-700">Target Branch (Xarun)</label>
            <select
              id="targetXarun"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={targetXarunId}
              onChange={(e) => setTargetXarunId(e.target.value)}
              required
            >
              <option value="">Select target Xarun</option>
              {xarumo.filter(x => x.id !== user.xarunId).map(xarun => (
                <option key={xarun.id} value={xarun.id}>{xarun.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="notes"
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferRequestForm;
