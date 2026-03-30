
import React, { useState } from 'react';
import { Payment, User, Account, AccountType } from '../types';
import { API } from '../services/api';

interface PaymentManagementProps {
  user: User;
  payments: Payment[];
  accounts: Account[];
  onRefresh: () => void;
}

const PaymentManagement: React.FC<PaymentManagementProps> = ({ user, payments, accounts, onRefresh }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Payment>>({
    amount: 0,
    method: 'CASH',
    type: 'EXPENSE',
    description: '',
    accountCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.payments.create({
        ...formData,
        xarunId: user.xarunId || '',
        personnel: user.name,
        date: new Date().toISOString()
      });
      setIsFormOpen(false);
      setFormData({ amount: 0, method: 'CASH', type: 'EXPENSE', description: '', accountCode: '' });
      onRefresh();
      alert("✅ Payment recorded successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filteredAccounts = accounts.filter(a => 
    formData.type === 'EXPENSE' ? a.type === AccountType.EXPENSE :
    formData.type === 'INCOME' ? a.type === AccountType.INCOME :
    true
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Payments & Expenses</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manage cash flow and business spending</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
        >
          + Record New Payment
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map(payment => (
              <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-xs font-bold text-slate-500">{new Date(payment.date).toLocaleDateString()}</td>
                <td className="p-6">
                  <p className="text-xs font-black text-slate-800 uppercase">{payment.description}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Ref: {payment.id.slice(0,8)}</p>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    payment.type === 'EXPENSE' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {payment.type}
                  </span>
                </td>
                <td className="p-6 text-xs font-bold text-slate-600">{payment.method}</td>
                <td className={`p-6 text-sm font-black ${
                  payment.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {payment.type === 'EXPENSE' ? '-' : '+'}${payment.amount.toLocaleString()}
                </td>
                <td className="p-6 text-xs font-bold text-slate-500">{payment.personnel}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                  <p className="text-slate-400 font-bold text-sm">No payment records found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Record Payment</h3>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1">Financial Transaction</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Type</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="EXPENSE">Expense (Bixid)</option>
                    <option value="INCOME">Income (Dakhli)</option>
                    <option value="VENDOR_PAYMENT">Vendor Payment</option>
                    <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Method</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                    value={formData.method}
                    onChange={e => setFormData({...formData, method: e.target.value as any})}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Account Category</label>
                <select 
                  required
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                  value={formData.accountCode}
                  onChange={e => setFormData({...formData, accountCode: e.target.value})}
                >
                  <option value="">Select Account...</option>
                  {filteredAccounts.map(acc => (
                    <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Amount ($)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                <textarea 
                  required
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all h-24"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
