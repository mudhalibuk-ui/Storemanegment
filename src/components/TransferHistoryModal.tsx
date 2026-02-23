import React from 'react';
import { InterBranchTransferRequest, TransferStatus } from '../../types';
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { XIcon } from 'lucide-react';

interface TransferHistoryModalProps {
  transfer: InterBranchTransferRequest;
  onClose: () => void;
}

const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  transfer,
  onClose,
}) => {

  const calculateLeadTime = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const minutes = differenceInMinutes(endDate, startDate);
    if (minutes < 60) return `${minutes} min`;
    const hours = differenceInHours(endDate, startDate);
    if (hours < 24) return `${hours} hr ${minutes % 60} min`;
    const days = differenceInDays(endDate, startDate);
    return `${days} day ${hours % 24} hr`;
  };

  // Sort history by timestamp ascending
  const sortedHistory = [...(transfer.auditTrail || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Transfer History for {transfer.items[0].itemName}</h2>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {sortedHistory.length === 0 ? (
            <p className="text-gray-500">No history available for this transfer.</p>
          ) : (
            sortedHistory.map((entry, index) => {
              const previousEntry = index > 0 ? sortedHistory[index - 1] : null;
              const leadTime = previousEntry ? calculateLeadTime(previousEntry.timestamp, entry.timestamp) : 'N/A';

              return (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <p className="text-lg font-medium text-gray-800">Status: {entry.status}</p>
                  <p className="text-sm text-gray-600">By: {entry.userName}</p>
                  <p className="text-sm text-gray-600">At: {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}</p>
                  {previousEntry && (
                    <p className="text-sm text-gray-600">Lead Time from previous stage: <span className="font-semibold">{leadTime}</span></p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferHistoryModal;
