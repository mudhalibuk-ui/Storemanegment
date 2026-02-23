import React, { useState } from 'react';
import { InventoryItem, Branch, User, Xarun, InterBranchTransferRequest, TransferStatus, UserRole, TransferAuditEntry } from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { ArrowRightIcon, PlusIcon, TruckIcon, CheckCircleIcon, ClockIcon, XCircleIcon, HistoryIcon, BarChart2Icon } from 'lucide-react';
import { API } from '../../services/api';
import TransferRequestForm from './TransferRequestForm';
import TransferDetailsModal from './TransferDetailsModal';
import TransferHistoryModal from './TransferHistoryModal';
import ManagerDashboardReport from './ManagerDashboardReport';

interface InterBranchTransferPageProps {
  user: User;
  xarumo: Xarun[];
  myBranches: Branch[];
  items: InventoryItem[];
  interBranchTransferRequests: InterBranchTransferRequest[];
  onRefresh: () => void;
  onUpdateTransfer: (transferId: string, updates: Partial<InterBranchTransferRequest>) => Promise<void>;
  onDeleteTransfer: (transferId: string) => Promise<void>;
}

const InterBranchTransferPage: React.FC<InterBranchTransferPageProps> = ({
  user,
  xarumo,
  myBranches,
  items,
  interBranchTransferRequests,
  onRefresh,
  onUpdateTransfer,
  onDeleteTransfer,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InterBranchTransferRequest | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isManagerReportOpen, setIsManagerReportOpen] = useState(false);

  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const isManager = user.role === UserRole.MANAGER;

  const myXarunId = user.xarunId;

  // Filter transfers relevant to the current user's xarun
  const relevantTransfers = interBranchTransferRequests.filter(transfer =>
    transfer.sourceXarunId === myXarunId || transfer.targetXarunId === myXarunId || isSuperAdmin
  );

  // Group transfers by status for display
  const requestedTransfers = relevantTransfers.filter(t => t.status === TransferStatus.REQUESTED);
  const preparingTransfers = relevantTransfers.filter(t => t.status === TransferStatus.PREPARING);
  const readyTransfers = relevantTransfers.filter(t => t.status === TransferStatus.READY);
  const onTheWayTransfers = relevantTransfers.filter(t => t.status === TransferStatus.ON_THE_WAY);
  const arrivedTransfers = relevantTransfers.filter(t => t.status === TransferStatus.ARRIVED);

  const getXarunName = (xarunId: string) => xarumo.find(x => x.id === xarunId)?.name || 'Unknown Xarun';
  const getItemName = (itemId: string) => items.find(i => i.id === itemId)?.name || 'Unknown Item';

  const handleStatusUpdate = async (transfer: InterBranchTransferRequest, newStatus: TransferStatus, user: User, rackNumber?: string, binLocation?: string) => {
    const lastAuditEntry = transfer.auditTrail[transfer.auditTrail.length - 1];
    const now = new Date();
    let leadTime = 0;

    if (lastAuditEntry) {
      const lastTimestamp = new Date(lastAuditEntry.timestamp);
      leadTime = differenceInMinutes(now, lastTimestamp);
    }

    if (newStatus === TransferStatus.ARRIVED && (!rackNumber || !binLocation)) {
      alert('Fadlan geli nambarka raafka iyo goobta kaydinta si aad u dhammaystirto imaatinka.');
      return;
    }

    const historyEntry = {
      timestamp: now.toISOString(),
      userId: user.id,
      userName: user.name,
      status: newStatus,
      leadTime: leadTime,
    };

    const updates: Partial<InterBranchTransferRequest> = {
      status: newStatus,
      auditTrail: [...transfer.auditTrail, historyEntry],
    };

    switch (newStatus) {
      case TransferStatus.PREPARING:
        updates.preparedBy = user.id;
        break;
      case TransferStatus.READY:
        // No specific field for ready, just audit trail
        break;
      case TransferStatus.ON_THE_WAY:
        updates.shippedBy = user.id;
        break;
      case TransferStatus.ARRIVED:
        updates.receivedBy = user.id;
        updates.rackNumber = rackNumber;
        updates.binLocation = binLocation;

        for (const transferItem of transfer.items) {
          const targetItem = items.find(item => item.id === transferItem.itemId && item.xarunId === transfer.targetXarunId);
          const sourceItem = items.find(item => item.id === transferItem.itemId && item.xarunId === transfer.sourceXarunId);

          if (targetItem) {
            await API.items.save({ ...targetItem, quantity: targetItem.quantity + transferItem.quantity, shelves: parseInt(rackNumber!), sections: parseInt(binLocation!) });
          } else {
            const originalItem = items.find(item => item.id === transferItem.itemId);
            if (originalItem) {
              await API.items.save({
                ...originalItem,
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                xarunId: transfer.targetXarunId,
                quantity: transferItem.quantity,
                reservedQuantity: 0,
                shelves: parseInt(rackNumber!),
                sections: parseInt(binLocation!),
              });
            }
          }

          if (sourceItem) {
            await API.items.save({ ...sourceItem, reservedQuantity: Math.max(0, (sourceItem.reservedQuantity || 0) - transferItem.quantity) });
          }
        }
        break;
    }

    await onUpdateTransfer(transfer.id, updates);
    onRefresh();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Logistics & Transfers</h1>
        <div className="flex space-x-2">
          <button
            onClick={onRefresh}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <HistoryIcon className="w-5 h-5 mr-2" />
            Refresh
          </button>
          {isManager && (
            <button
              onClick={() => setIsManagerReportOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <BarChart2Icon className="w-5 h-5 mr-2" />
              Manager Report
            </button>
          )}
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Transfer Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Requested */} 
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><ClockIcon className="w-5 h-5 mr-2 text-blue-500" />Requested ({requestedTransfers.length})</h2>
          <div className="space-y-4">
            {requestedTransfers.length === 0 ? (
              <p className="text-gray-500">No requested transfers.</p>
            ) : (
              requestedTransfers.map(transfer => (
                <div key={transfer.id} className="border border-blue-200 rounded-md p-3 bg-blue-50">
                  <p className="font-medium">
                    {getItemName(transfer.items[0].itemId)} x {transfer.items[0].quantity}
                    {transfer.items.length > 1 && <span className="text-xs text-blue-600 ml-1">+{transfer.items.length - 1} more</span>}
                  </p>
                  <p className="text-sm text-gray-600">From: {getXarunName(transfer.sourceXarunId)} <ArrowRightIcon className="inline-block w-4 h-4 mx-1" /> To: {getXarunName(transfer.targetXarunId)}</p>
                  <p className="text-xs text-gray-500">Requested: {format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    {transfer.sourceXarunId === myXarunId && user.role !== UserRole.VIEWER && (
                      <button onClick={() => handleStatusUpdate(transfer, TransferStatus.PREPARING, user)} className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600">Prepare</button>
                    )}
                    <button onClick={() => setSelectedTransfer(transfer)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preparing */} 
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><TruckIcon className="w-5 h-5 mr-2 text-yellow-500" />Preparing ({preparingTransfers.length})</h2>
          <div className="space-y-4">
            {preparingTransfers.length === 0 ? (
              <p className="text-gray-500">No transfers being prepared.</p>
            ) : (
              preparingTransfers.map(transfer => (
                <div key={transfer.id} className="border border-yellow-200 rounded-md p-3 bg-yellow-50">
                  <p className="font-medium">
                    {getItemName(transfer.items[0].itemId)} x {transfer.items[0].quantity}
                    {transfer.items.length > 1 && <span className="text-xs text-yellow-600 ml-1">+{transfer.items.length - 1} more</span>}
                  </p>
                  <p className="text-sm text-gray-600">From: {getXarunName(transfer.sourceXarunId)} <ArrowRightIcon className="inline-block w-4 h-4 mx-1" /> To: {getXarunName(transfer.targetXarunId)}</p>
                  <p className="text-xs text-gray-500">Started: {format(new Date(transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.PREPARING)?.timestamp || transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    {transfer.sourceXarunId === myXarunId && user.role !== UserRole.VIEWER && (
                      <button onClick={() => handleStatusUpdate(transfer, TransferStatus.READY, user)} className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600">Ready</button>
                    )}
                    <button onClick={() => setSelectedTransfer(transfer)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ready */} 
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2 text-emerald-500" />Ready ({readyTransfers.length})</h2>
          <div className="space-y-4">
            {readyTransfers.length === 0 ? (
              <p className="text-gray-500">No transfers ready.</p>
            ) : (
              readyTransfers.map(transfer => (
                <div key={transfer.id} className="border border-emerald-200 rounded-md p-3 bg-emerald-50">
                  <p className="font-medium">
                    {getItemName(transfer.items[0].itemId)} x {transfer.items[0].quantity}
                    {transfer.items.length > 1 && <span className="text-xs text-emerald-600 ml-1">+{transfer.items.length - 1} more</span>}
                  </p>
                  <p className="text-sm text-gray-600">From: {getXarunName(transfer.sourceXarunId)} <ArrowRightIcon className="inline-block w-4 h-4 mx-1" /> To: {getXarunName(transfer.targetXarunId)}</p>
                  <p className="text-xs text-gray-500">Ready: {format(new Date(transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.READY)?.timestamp || transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    {transfer.sourceXarunId === myXarunId && user.role !== UserRole.VIEWER && (
                      <button onClick={() => handleStatusUpdate(transfer, TransferStatus.ON_THE_WAY, user)} className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-md hover:bg-emerald-600">Ship</button>
                    )}
                    <button onClick={() => setSelectedTransfer(transfer)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* On-the-Way */} 
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><TruckIcon className="w-5 h-5 mr-2 text-purple-500" />On-the-Way ({onTheWayTransfers.length})</h2>
          <div className="space-y-4">
            {onTheWayTransfers.length === 0 ? (
              <p className="text-gray-500">No transfers on the way.</p>
            ) : (
              onTheWayTransfers.map(transfer => (
                <div key={transfer.id} className="border border-purple-200 rounded-md p-3 bg-purple-50">
                  <p className="font-medium">
                    {getItemName(transfer.items[0].itemId)} x {transfer.items[0].quantity}
                    {transfer.items.length > 1 && <span className="text-xs text-purple-600 ml-1">+{transfer.items.length - 1} more</span>}
                  </p>
                  <p className="text-sm text-gray-600">From: {getXarunName(transfer.sourceXarunId)} <ArrowRightIcon className="inline-block w-4 h-4 mx-1" /> To: {getXarunName(transfer.targetXarunId)}</p>
                  <p className="text-xs text-gray-500">Shipped: {format(new Date(transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.ON_THE_WAY)?.timestamp || transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    {transfer.targetXarunId === myXarunId && user.role !== UserRole.VIEWER && (
                      <button onClick={() => setSelectedTransfer({...transfer, status: TransferStatus.ARRIVED})} className="px-3 py-1 bg-purple-500 text-white text-xs rounded-md hover:bg-purple-600">Arrived</button>
                    )}
                    <button onClick={() => setSelectedTransfer(transfer)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Arrived */} 
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2 text-green-500" />Arrived ({arrivedTransfers.length})</h2>
          <div className="space-y-4">
            {arrivedTransfers.length === 0 ? (
              <p className="text-gray-500">No arrived transfers.</p>
            ) : (
              arrivedTransfers.map(transfer => (
                <div key={transfer.id} className="border border-green-200 rounded-md p-3 bg-green-50">
                  <p className="font-medium">
                    {getItemName(transfer.items[0].itemId)} x {transfer.items[0].quantity}
                    {transfer.items.length > 1 && <span className="text-xs text-green-600 ml-1">+{transfer.items.length - 1} more</span>}
                  </p>
                  <p className="text-sm text-gray-600">From: {getXarunName(transfer.sourceXarunId)} <ArrowRightIcon className="inline-block w-4 h-4 mx-1" /> To: {getXarunName(transfer.targetXarunId)}</p>
                  <p className="text-xs text-gray-500">Arrived: {format(new Date(transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.ARRIVED)?.timestamp || transfer.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    <button onClick={() => setSelectedTransfer(transfer)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <TransferRequestForm
          user={user}
          xarumo={xarumo}
          myBranches={myBranches}
          items={items}
          onSave={async (newTransfer) => {
            setIsFormOpen(false);
            await onRefresh();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {selectedTransfer && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          xarumo={xarumo}
          items={items}
          user={user}
          onClose={() => setSelectedTransfer(null)}
          onUpdateStatus={(transfer, newStatus, user, rackNumber, binLocation) => handleStatusUpdate(transfer, newStatus, user, rackNumber, binLocation)}
          onViewHistory={() => setIsHistoryModalOpen(true)}
          onDelete={onDeleteTransfer}
        />
      )}

      {isHistoryModalOpen && selectedTransfer && (
        <TransferHistoryModal
          transfer={selectedTransfer}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      {isManagerReportOpen && (
        <ManagerDashboardReport
          interBranchTransferRequests={interBranchTransferRequests}
          xarumo={xarumo}
          onClose={() => setIsManagerReportOpen(false)}
        />
      )}
    </div>
  );
};

export default InterBranchTransferPage;
