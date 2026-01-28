
import React from 'react';
import { Transaction, InventoryItem, Branch, TransactionType } from '../types';

interface TransactionReceiptProps {
  transaction: Transaction;
  item: InventoryItem | undefined;
  branch: Branch | undefined;
  issuedBy: string;
  onClose: () => void;
}

const TransactionReceipt: React.FC<TransactionReceiptProps> = ({ transaction, item, branch, issuedBy, onClose }) => {
  const isOut = transaction.type === TransactionType.OUT;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4 print:p-0 overflow-y-auto overflow-x-hidden">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 print:shadow-none print:rounded-none print:max-w-full print:h-full my-auto border border-slate-100 print:border-none">
        {/* Invoice Header */}
        <div className="p-10 border-b-2 border-dashed border-slate-100 text-center relative bg-slate-50/50 print:bg-white print:border-b-4 print:border-black">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-200 print:hidden">
            S
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">SmartStock <span className="text-indigo-600">Pro</span></h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Inventory Management Invoice</p>
          
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
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tixraaca Risidka</p>
              <p className="font-mono text-base text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 inline-block print:border-2 print:border-black">
                #{transaction.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Taariikhda</p>
              <p className="text-sm text-slate-800 font-bold">{new Date(transaction.timestamp).toLocaleDateString()}</p>
              <p className="text-[10px] text-slate-400 font-medium">{new Date(transaction.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 print:bg-white print:border-4 print:border-black print:rounded-none">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3 print:border-b-2 print:border-black">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nooca Dhaqdhaqaaqa</span>
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${isOut ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} print:bg-none print:underline`}>
                  {isOut ? 'Stock Out (Bixid)' : 'Stock In (Soo Galid)'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3 print:border-b-2 print:border-black">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Magaca Alaabta</span>
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{transaction.itemName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3 print:border-b-2 print:border-black">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Branch-ga</span>
                <span className="text-sm font-bold text-slate-700">{branch?.name || 'Main Warehouse'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3 print:border-b-2 print:border-black">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{isOut ? 'Meesha loo diray' : 'Meesha laga keenay'}</span>
                <span className="text-sm font-black text-indigo-600 italic underline underline-offset-4 decoration-indigo-200 print:text-black">{transaction.originOrSource || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Meesha la dhigay (Storage)</span>
                <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-100 print:border-2 print:border-black">
                  {transaction.placementInfo || `Iskafalo: ${item?.shelves}, Dog: ${item?.sections}`}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center py-6 bg-gradient-to-b from-white to-slate-50 rounded-b-[3rem] print:bg-none print:to-white">
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">Tirada Guud (Total Qty)</p>
            <div className="relative inline-block">
               <span className="text-7xl font-black text-slate-900 tracking-tighter">{transaction.quantity}</span>
               <span className="absolute -right-8 bottom-2 text-xs font-bold text-slate-400 uppercase">PCS</span>
            </div>
          </div>

          {/* Personnel and Signatures */}
          <div className="grid grid-cols-2 gap-10 border-t-2 border-slate-100 pt-8 print:border-t-4 print:border-black">
            <div className="space-y-4">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qofka Bixiyey/Keenay</p>
              <div className="h-10 border-b border-slate-200 font-black text-slate-800 uppercase text-sm italic print:border-black">
                {transaction.personnel || 'System'}
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

          {transaction.notes && (
            <div className="bg-amber-50/70 p-6 rounded-[2rem] border-2 border-amber-100 italic text-[11px] text-amber-900 print:bg-white print:border-black print:rounded-none mt-6 shadow-inner">
              <span className="font-black block not-italic uppercase tracking-tighter mb-2 text-amber-600">Qoraal Dheeraad ah (Notes):</span>
              "{transaction.notes}"
            </div>
          )}
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
            <span className="text-xl">🖨️</span> PRINT INVOICE
          </button>
        </div>

        <div className="hidden print:block text-center p-12 border-t-4 border-black mt-16">
          <p className="text-sm font-black text-black tracking-tight">SmartStock Pro - System Managed Inventory Management</p>
          <p className="text-[10px] text-black mt-3 opacity-80 uppercase tracking-widest">Mahadsanid! Business & Logistics Solutions</p>
          <p className="text-[9px] text-black mt-6 font-mono">Invoice ID: {transaction.id}</p>
        </div>
      </div>
    </div>
  );
};

export default TransactionReceipt;
