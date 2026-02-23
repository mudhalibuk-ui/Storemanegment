import React, { useMemo } from 'react';
import { InterBranchTransferRequest, Xarun, TransferStatus } from '../../types';
import { XIcon } from 'lucide-react';
import { differenceInHours, differenceInMinutes } from 'date-fns';

interface ManagerDashboardReportProps {
  interBranchTransferRequests: InterBranchTransferRequest[];
  xarumo: Xarun[];
  onClose: () => void;
}

const ManagerDashboardReport: React.FC<ManagerDashboardReportProps> = ({
  interBranchTransferRequests,
  xarumo,
  onClose,
}) => {
  const getXarunName = (xarunId: string) => xarumo.find(x => x.id === xarunId)?.name || 'Unknown Xarun';

  const reportData = useMemo(() => {
    const completedTransfers = interBranchTransferRequests.filter(t => t.status === TransferStatus.ARRIVED);

    const xarunLeadTimes: { [xarunId: string]: number[] } = {};

    completedTransfers.forEach(transfer => {
      const requestedTime = new Date(transfer.createdAt);
      const arrivedEntry = transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.ARRIVED);
      if (arrivedEntry) {
        const arrivedTime = new Date(arrivedEntry.timestamp);
        const leadTimeInHours = differenceInHours(arrivedTime, requestedTime);

        if (!xarunLeadTimes[transfer.sourceXarunId]) {
          xarunLeadTimes[transfer.sourceXarunId] = [];
        }
        xarunLeadTimes[transfer.sourceXarunId].push(leadTimeInHours);
      }
    });

    const aggregatedData = Object.entries(xarunLeadTimes).map(([xarunId, leadTimes]) => {
      const totalLeadTime = leadTimes.reduce((sum, time) => sum + time, 0);
      const averageLeadTime = totalLeadTime / leadTimes.length;
      return {
        xarunId,
        xarunName: getXarunName(xarunId),
        averageLeadTime: averageLeadTime,
        completedTransfersCount: leadTimes.length,
      };
    }).sort((a, b) => b.averageLeadTime - a.averageLeadTime); // Sort by longest average lead time

    return aggregatedData;
  }, [interBranchTransferRequests, xarumo]);

  const overallAverageLeadTime = useMemo(() => {
    const allLeadTimes: number[] = [];
    interBranchTransferRequests.filter(t => t.status === TransferStatus.ARRIVED).forEach(transfer => {
      const requestedTime = new Date(transfer.createdAt);
      const arrivedEntry = transfer.auditTrail?.find((h: TransferAuditEntry) => h.status === TransferStatus.ARRIVED);
      if (arrivedEntry) {
        const arrivedTime = new Date(arrivedEntry.timestamp);
        allLeadTimes.push(differenceInHours(arrivedTime, requestedTime));
      }
    });
    if (allLeadTimes.length === 0) return 0;
    const total = allLeadTimes.reduce((sum, time) => sum + time, 0);
    return total / allLeadTimes.length;
  }, [interBranchTransferRequests]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Inter-Branch Transfer Efficiency Report</h2>

        <div className="mb-6 p-4 bg-indigo-50 rounded-md">
          <p className="text-lg font-medium text-indigo-800">Overall Average Lead Time (Requested to Arrived):</p>
          <p className="text-3xl font-bold text-indigo-900">{overallAverageLeadTime.toFixed(1)} hours</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch (Source Xarun)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Lead Time (Hours)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Transfers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No completed transfers to report.</td>
                </tr>
              ) : (
                reportData.map(data => (
                  <tr key={data.xarunId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.xarunName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.averageLeadTime.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.completedTransfersCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default ManagerDashboardReport;
