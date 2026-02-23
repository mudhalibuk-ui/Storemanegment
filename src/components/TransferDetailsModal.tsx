import React, { useState } from 'react';
import { InventoryItem, Branch, User, Xarun, InterBranchTransferRequest, TransferStatus, UserRole } from '../../types';
import { format } from 'date-fns';
import { XIcon, TruckIcon, CheckCircleIcon, HistoryIcon, XCircleIcon } from 'lucide-react';
import { API } from '../../services/api';

interface TransferDetailsModalProps {
  transfer: InterBranchTransferRequest;
  xarumo: Xarun[];
  items: InventoryItem[];
  user: User;
  onClose: () => void;
  onUpdateStatus: (transfer: InterBranchTransferRequest, newStatus: TransferStatus, user: User, rackNumber?: string, binLocation?: string) => Promise<void>;
  onViewHistory: () => void;
  onDelete: (transferId: string) => Promise<void>;
}

const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  transfer,
  xarumo,
  items,
  user,
  onClose,
  onUpdateStatus,
  onViewHistory,
  onDelete,
}) => {
  const [rackNumber, setRackNumber] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const getXarunName = (xarunId: string) => xarumo.find(x => x.id === xarunId)?.name || 'Unknown Xarun';
  const getItemName = (itemId: string) => items.find(i => i.id === itemId)?.name || 'Unknown Item';

  const isSourceXarun = user.xarunId === transfer.sourceXarunId;
  const isTargetXarun = user.xarunId === transfer.targetXarunId;
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  const handleStatusChange = async (newStatus: TransferStatus) => {
    await onUpdateStatus(transfer, newStatus, user, rackNumber, binLocation);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('Ma hubtaa inaad tirtirto codsigan wareejinta?')) {
      setIsDeleting(true);
      try {
        // Release reserved quantity if the transfer was not yet arrived
        if (transfer.status !== TransferStatus.ARRIVED) {
          for (const transferItem of transfer.items) {
            const sourceItem = items.find(item => item.id === transferItem.itemId && item.xarunId === transfer.sourceXarunId);
            if (sourceItem) {
              await API.items.save({ ...sourceItem, reservedQuantity: Math.max(0, (sourceItem.reservedQuantity || 0) - transferItem.quantity) });
            }
          }
        }
        await onDelete(transfer.id);
        onClose();
      } catch (error) {
        console.error('Error deleting transfer:', error);
        alert('Cilad ayaa dhacday tirtiridda wareejinta.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const renderStatusButton = () => {
    if (user.role === UserRole.VIEWER) return null;

    switch (transfer.status) {
      case TransferStatus.REQUESTED:
        if (isSourceXarun || isSuperAdmin) {
          return (
            <button
              onClick={() => handleStatusChange(TransferStatus.PREPARING)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <TruckIcon className="w-5 h-5 inline-block mr-2" /> Prepare for Shipment
            </button>
          );
        }
        break;
      case TransferStatus.PREPARING:
        if (isSourceXarun || isSuperAdmin) {
          return (
            <button
              onClick={() => handleStatusChange(TransferStatus.READY)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              <CheckCircleIcon className="w-5 h-5 inline-block mr-2" /> Mark Ready
            </button>
          );
        }
        break;
      case TransferStatus.READY:
        if (isSourceXarun || isSuperAdmin) {
          return (
            <button
              onClick={() => handleStatusChange(TransferStatus.ON_THE_WAY)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              <TruckIcon className="w-5 h-5 inline-block mr-2" /> Mark On-the-Way
            </button>
          );
        }
        break;
      case TransferStatus.ON_THE_WAY:
        if (isTargetXarun || isSuperAdmin) {
          return (
            <div className="flex flex-col space-y-3">
              <input
                type="text"
                placeholder="Rack Number"
                value={rackNumber}
                onChange={(e) => setRackNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="text"
                placeholder="Bin/Slot Location"
                value={binLocation}
                onChange={(e) => setBinLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <button
                onClick={() => handleStatusChange(TransferStatus.ARRIVED)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={!rackNumber || !binLocation}
              >
                <CheckCircleIcon className="w-5 h-5 inline-block mr-2" /> Mark Arrived & Store
              </button>
            </div>
          );
        }
        break;
      case TransferStatus.ARRIVED:
        return <span className="text-green-600 font-medium">Transfer Completed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Transfer Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
            <div className="bg-gray-50 rounded-md p-3 space-y-2">
              {transfer.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="font-medium">{item.itemName}</span>
                  <span className="text-gray-600">x {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Source Xarun</p>
            <p className="text-lg text-gray-900">{getXarunName(transfer.sourceXarunId)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Target Xarun</p>
            <p className="text-lg text-gray-900">{getXarunName(transfer.targetXarunId)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Request Date</p>
            <p className="text-lg text-gray-900">{format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Status</p>
            <p className={`text-lg font-semibold ${transfer.status === TransferStatus.REQUESTED ? 'text-blue-600'
              : transfer.status === TransferStatus.PREPARING ? 'text-yellow-600'
              : transfer.status === TransferStatus.READY ? 'text-emerald-600'
              : transfer.status === TransferStatus.ON_THE_WAY ? 'text-purple-600'
              : 'text-green-600'}`}>{transfer.status}</p>
          </div>
          {transfer.rackNumber && (
            <div>
              <p className="text-sm font-medium text-gray-500">Rack Number</p>
              <p className="text-lg text-gray-900">{transfer.rackNumber}</p>
            </div>
          )}
          {transfer.binLocation && (
            <div>
              <p className="text-sm font-medium text-gray-500">Bin/Slot Location</p>
              <p className="text-lg text-gray-900">{transfer.binLocation}</p>
            </div>
          )}
          {transfer.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="text-lg text-gray-900">{transfer.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={onViewHistory}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              <HistoryIcon className="w-5 h-5 inline-block mr-2" /> View History
            </button>
            {(isSourceXarun || isTargetXarun || isSuperAdmin) && transfer.status !== TransferStatus.ARRIVED && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                disabled={isDeleting}
              >
                <XCircleIcon className="w-5 h-5 inline-block mr-2" /> {isDeleting ? 'Deleting...' : 'Delete Transfer'}
              </button>
            )}
          </div>
          {renderStatusButton()}
        </div>
      </div>
    </div>
  );
};

export default TransferDetailsModal;
