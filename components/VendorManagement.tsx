
import React, { useState, useMemo } from 'react';
import { Vendor, User, PurchaseOrder, Payment } from '../types';
import { API } from '../services/api';
import { 
  Truck, 
  Plus, 
  Search, 
  FileText, 
  History, 
  Mail, 
  Phone, 
  MapPin,
  Download,
  Printer,
  Package
} from 'lucide-react';

interface VendorManagementProps {
  user: User;
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  payments: Payment[];
  onRefresh: () => void;
  onImport: () => void;
}

const VendorManagement: React.FC<VendorManagementProps> = ({ user, vendors, purchaseOrders, payments, onRefresh, onImport }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [view, setView] = useState<'list' | 'statement'>('list');
  
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    balance: 0
  });

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm)
    );
  }, [vendors, searchTerm]);

  const vendorTransactions = useMemo(() => {
    if (!selectedVendor) return [];
    
    const vendorPOs = purchaseOrders.filter(po => po.vendorId === selectedVendor.id && po.status === 'RECEIVED');
    const vendorPayments = payments.filter(p => p.type === 'VENDOR_PAYMENT' && p.referenceId === selectedVendor.id);
    
    const all = [
      ...vendorPOs.map(po => ({
        id: po.id,
        date: po.date || po.createdAt || new Date().toISOString(),
        type: 'PURCHASE',
        description: `Purchase Order #${po.id.slice(0, 8)}`,
        amount: po.total || 0,
        impact: po.total || 0
      })),
      ...vendorPayments.map(p => ({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        description: `Payment - ${p.description}`,
        amount: p.amount,
        impact: -p.amount
      }))
    ];
    
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedVendor, purchaseOrders, payments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await API.vendors.save({
        ...formData,
        xarunId: user.xarunId || ''
      });
      setIsFormOpen(false);
      setFormData({ name: '', contactName: '', phone: '', email: '', address: '', category: '', balance: 0 });
      onRefresh();
      alert("✅ Vendor saved successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const renderStatement = () => {
    if (!selectedVendor) return null;
    
    let runningBalance = 0;
    const statementLines = [...vendorTransactions].reverse().map(t => {
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
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Vendor Statement</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedVendor.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Printer size={16} /> Print
            </button>
            <button className="p-4 bg-slate-900 text-white rounded-2xl hover:scale-105 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Purchases</p>
            <p className="text-3xl font-black text-slate-900">
              ${vendorTransactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Paid</p>
            <p className="text-3xl font-black text-emerald-600">
              ${vendorTransactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Balance</p>
            <p className={`text-3xl font-black ${selectedVendor.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ${selectedVendor.balance.toLocaleString()}
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
                      line.type === 'PURCHASE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {line.type}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-black text-slate-800 uppercase">{line.description}</td>
                  <td className={`p-6 text-sm font-black text-right ${line.impact > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {line.impact > 0 ? '' : '-'}${line.amount.toLocaleString()}
                  </td>
                  <td className="p-6 text-sm font-black text-slate-900 text-right">
                    ${line.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (view === 'statement') return renderStatement();

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Truck className="text-indigo-600" /> Vendor Management
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Maamulka iibiyeyaasha iyo xisaabaadka</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search vendors..."
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
            onClick={() => { setFormData({ name: '', contactName: '', phone: '', email: '', address: '', category: '', balance: 0 }); setIsFormOpen(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map(vendor => (
          <div key={vendor.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:border-indigo-500 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                {vendor.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</p>
                <p className={`text-xl font-black ${vendor.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${vendor.balance.toLocaleString()}
                </p>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">{vendor.name}</h3>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <Phone size={14} className="text-slate-300" /> {vendor.phone}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <Mail size={14} className="text-slate-300" /> {vendor.email}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <Package size={14} className="text-slate-300" /> {vendor.category || 'General'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setSelectedVendor(vendor); setView('statement'); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
              >
                <FileText size={14} /> Statement
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                <History size={14} /> Orders
              </button>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">Add New Vendor</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vendor Name</label>
                <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contact Name</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Opening Balance</label>
                <input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} />
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
