import React from 'react';
import { Transaction, Branch, TransactionType } from '../types';

interface BulkTransactionReceiptProps {
  transactions: Transaction[];
  branch: Branch | undefined;
  type: TransactionType;
  personnel: string;
  date: string;
  issuedBy: string;
  onClose: () => void;
}

const BulkTransactionReceipt: React.FC<BulkTransactionReceiptProps> = ({ 
  transactions, branch, type, personnel, date, issuedBy, onClose 
}) => {
  const isOut = type === TransactionType.OUT;
  const totalQty = transactions.reduce((sum, t) => sum + t.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4 print:p-0 overflow-y-auto overflow-x-hidden">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 print:shadow-none print:rounded-none print:max-w-full print:h-full my-auto border border-slate-100 print:border-none">
        {/* Invoice Header */}
        <div className="p-10 border-b-2 border-dashed border-slate-100 text-center relative bg-slate-50/50 print:bg-white print:border-b-4 print:border-black">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-200 print:hidden">
            S
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">SmartStock <span className="text-indigo-600">Pro</span></h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Bulk Transaction Manifest</p>
          
          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 print:hidden p-2 transition-colors"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Invoice Body */}
        <div className="p-10 space-y-8 print:p-12">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Manifest ID</p>
              <p className="font-mono text-base text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 inline-block print:border-2 print:border-black">
                #{transactions[0]?.id.slice(-8).toUpperCase()}-BLK
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Taariikhda</p>
              <p className="text-sm text-slate-800 font-bold">{new Date(date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 print:bg-white print:border-4 print:border-black print:rounded-none">
            <div className="grid grid-cols-2 gap-6 mb-6 border-b border-slate-200/50 pb-6 print:border-b-2 print:border-black">
               <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Nooca</p>
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${isOut ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} print:bg-none print:underline`}>
                    {isOut ? 'Stock Out (Bixid)' : 'Stock In (Soo Galid)'}
                  </span>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Branch</p>
                  <p className="text-sm font-bold text-slate-700">{branch?.name || 'Main Warehouse'}</p>
               </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 print:border-black">
                  <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                  <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={t.id} className="border-b border-slate-100 print:border-slate-300">
                    <td className="py-3 text-sm font-bold text-slate-700">
                      {idx + 1}. {t.itemName}
                    </td>
                    <td className="py-3 text-sm font-black text-slate-900 text-right">
                      {t.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 print:border-black">
                  <td className="py-4 text-xs font-black text-slate-900 uppercase tracking-widest">Total Items</td>
                  <td className="py-4 text-xl font-black text-slate-900 text-right">{totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Personnel and Signatures */}
          <div className="grid grid-cols-2 gap-10 border-t-2 border-slate-100 pt-8 print:border-t-4 print:border-black">
            <div className="space-y-4">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qofka Bixiyey/Keenay</p>
              <div className="h-10 border-b border-slate-200 font-black text-slate-800 uppercase text-sm italic print:border-black">
                {personnel || 'System'}
              </div>
              <p className="text-[8px] text-slate-300 font-bold uppercase">(Saxeexa Personnel-ka)</p>
            </div>
            <div className="space-y-4 text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Maamulka (Approved By)</p>
              <div className="h-10 border-b border-slate-200 font-black text-slate-800 uppercase text-sm print:border-black">
                {issuedBy}
              </div>
              <p className="text-[8px] text-slate-300 font-bold uppercase text-right">(Shaabada & Saxeexa)</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-10 bg-slate-900 border-t border-slate-800 flex gap-4 print:hidden">
          <button 
            onClick={onClose}
            className="flex-1 py-5 bg-slate-800 text-slate-400 font-black rounded-3xl hover:bg-slate-700 hover:text-white transition-all active:scale-95 uppercase text-[10px] tracking-widest"
          >
            XIR Foomka
          </button>
          <button 
            onClick={handlePrint}
            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-900/50 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
          >
            <span className="text-xl">🖨️</span> PRINT MANIFEST
          </button>
        </div>

        <div className="hidden print:block text-center p-12 border-t-4 border-black mt-16">
          <p className="text-sm font-black text-black tracking-tight">SmartStock Pro - Bulk Transaction Manifest</p>
          <p className="text-[10px] text-black mt-3 opacity-80 uppercase tracking-widest">Mahadsanid! Business & Logistics Solutions</p>
        </div>
      </div>
    </div>
  );
};

export default BulkTransactionReceipt;
