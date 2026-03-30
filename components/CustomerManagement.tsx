
import React, { useState, useMemo } from 'react';
import { Customer, Sale, User, Payment, SystemSettings, Branch } from '../types';
import { API } from '../services/api';
import DocumentViewer from './DocumentViewer';
import { 
  Users, 
  Plus, 
  Search, 
  FileText, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Mail, 
  Phone, 
  MapPin,
  Download,
  Printer,
  Eye
} from 'lucide-react';

interface CustomerManagementProps {
  user: User;
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  settings: SystemSettings;
  branches: Branch[];
  onRefresh: () => void;
  onImport: () => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ user, customers, sales, payments, settings, branches, onRefresh, onImport }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [view, setView] = useState<'list' | 'statement'>('list');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ type: 'INVOICE' | 'QUOTATION' | 'SALES_ORDER', data: Partial<Sale> } | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'CASH',
    reference: '',
    description: ''
  });
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    balance: 0
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    
    const customerSales = sales.filter(s => s.customerId === selectedCustomer.id);
    const customerPayments = payments.filter(p => p.type === 'CUSTOMER_PAYMENT' && p.referenceId === selectedCustomer.id);
    
    const all = [
      ...customerSales.map(s => ({
        id: s.id,
        date: s.timestamp,
        type: s.type || 'SALE',
        description: `${s.type || 'Sale'} #${s.id.slice(0, 8)}`,
        amount: s.total,
        impact: (s.type === 'CREDIT_MEMO' ? -1 : 1) * s.total
      })),
      ...customerPayments.map(p => ({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        description: `Payment - ${p.description}`,
        amount: p.amount,
        impact: -p.amount
      }))
    ];
    
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer, sales, payments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.customers.save({
        ...formData,
        xarunId: user.xarunId || ''
      });
      setIsFormOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', balance: 0 });
      onRefresh();
      alert("✅ Customer saved successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await API.customerPayments.receive({
        customerId: selectedCustomer.id,
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference,
        description: paymentData.description,
        xarunId: user.xarunId || ''
      });
      
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: 0, method: 'CASH', reference: '', description: '' });
      onRefresh();
      alert("✅ Payment received and balance updated!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const renderStatement = () => {
    if (!selectedCustomer) return null;
    
    let runningBalance = 0;
    const statementLines = [...customerTransactions].reverse().map(t => {
      runningBalance += t.impact;
      return { ...t, balance: runningBalance };
    }).reverse();

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('list')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
              <History size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customer Statement</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedCustomer.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Printer size={16} /> Print Statement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Invoiced</p>
            <p className="text-3xl font-black text-slate-900">
              ${customerTransactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Paid</p>
            <p className="text-3xl font-black text-emerald-600">
              ${customerTransactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Balance</p>
            <p className={`text-3xl font-black ${selectedCustomer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ${selectedCustomer.balance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statementLines.map(line => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 text-sm font-bold text-slate-600">{new Date(line.date).toLocaleDateString()}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      line.type === 'SALE' ? 'bg-blue-50 text-blue-600' :
                      line.type === 'CREDIT_MEMO' ? 'bg-rose-50 text-rose-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {line.type}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-black text-slate-800 uppercase">{line.description}</td>
                  <td className={`p-6 text-sm font-black text-right ${line.impact > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {line.impact > 0 ? '' : '-'}${line.amount.toLocaleString()}
                  </td>
                  <td className="p-6 text-sm font-black text-slate-900 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>${line.balance.toLocaleString()}</span>
                      {(line.type === 'SALE' || line.type === 'QUOTATION' || line.type === 'SALES_ORDER') && (
                        <button 
                          onClick={() => {
                            const sale = sales.find(s => s.id === line.id);
                            if (sale) {
                              setViewingDocument({ 
                                type: sale.type === 'QUOTATION' ? 'QUOTATION' : sale.type === 'SALES_ORDER' ? 'SALES_ORDER' : 'INVOICE', 
                                data: sale 
                              });
                            }
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Document"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {viewingDocument && (
          <DocumentViewer 
            type={viewingDocument.type}
            data={viewingDocument.data}
            settings={settings}
            branch={branches.find(b => b.id === viewingDocument.data.branchId)}
            onClose={() => setViewingDocument(null)}
          />
        )}
      </div>
    );
  };

  if (view === 'statement') return renderStatement();

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Users className="text-indigo-600" /> Customer Management
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Maamulka macaamiisha iyo xisaabaadka</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search customers..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onImport}
            className="bg-white border-2 border-slate-900 text-slate-900 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Download size={16} /> Import
          </button>
          <button 
            onClick={() => { setFormData({ name: '', phone: '', email: '', address: '', balance: 0 }); setIsFormOpen(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:border-indigo-500 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                {customer.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</p>
                <p className={`text-xl font-black ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${customer.balance.toLocaleString()}
                </p>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">{customer.name}</h3>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <Phone size={14} className="text-slate-300" /> {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <Mail size={14} className="text-slate-300" /> {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <MapPin size={14} className="text-slate-300" /> {customer.address}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setSelectedCustomer(customer); setView('statement'); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
              >
                <FileText size={14} /> Statement
              </button>
              <button 
                onClick={() => { setSelectedCustomer(customer); setIsPaymentModalOpen(true); }}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
              >
                <ArrowDownRight size={14} /> Pay
              </button>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">Add New Customer</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Address</label>
                <input className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Opening Balance</label>
                <input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} />
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Receive Payment</h3>
                <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">{selectedCustomer.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleReceivePayment} className="p-10 space-y-6">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-4">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Current Balance</p>
                <p className="text-2xl font-black text-emerald-700">${selectedCustomer.balance.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Amount to Pay</label>
                <input 
                  type="number" 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg" 
                  value={paymentData.amount} 
                  onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Method</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs"
                    value={paymentData.method}
                    onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="EVC_PLUS">EVC Plus</option>
                    <option value="ZAAD">Zaad</option>
                    <option value="SAHAL">Sahal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reference</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs" 
                    placeholder="Ref #"
                    value={paymentData.reference} 
                    onChange={e => setPaymentData({...paymentData, reference: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs" 
                  placeholder="Note..."
                  value={paymentData.description} 
                  onChange={e => setPaymentData({...paymentData, description: e.target.value})} 
                />
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
