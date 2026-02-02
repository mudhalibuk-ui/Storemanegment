
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import InventoryForm from './components/InventoryForm';
import AIChat from './components/AIChat';
import WarehouseMap from './components/WarehouseMap';
import ApprovalQueue from './components/ApprovalQueue';
import TransactionHistory from './components/TransactionHistory';
import AdvancedReports from './components/AdvancedReports';
import UserManagement from './components/UserManagement';
import BakhaarList from './components/BakhaarList';
import XarunList from './components/XarunList';
import BranchForm from './components/BranchForm';
import Settings from './components/Settings';
import Login from './components/Login';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import TransferModal from './components/TransferModal';
import TransactionReceipt from './components/TransactionReceipt';
import ImportModal from './components/ImportModal';
import ScannerModal from './components/ScannerModal';
import BulkTransactionModal from './components/BulkTransactionModal';
import { API } from './services/api';
import { InventoryItem, Branch, Transaction, User, TransactionStatus, TransactionType, SystemSettings, UserRole, Xarun } from './types';
import { getInventoryInsights } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [xarumo, setXarumo] = useState<Xarun[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  
  const [selectedXarunFilterId, setSelectedXarunFilterId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('smartstock_settings');
    return saved ? JSON.parse(saved) : {
      systemName: 'SmartStock Pro',
      currency: 'USD',
      language: 'SO',
      primaryColor: '#4f46e5',
      lowStockGlobalThreshold: 5
    };
  });

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState<{ item: InventoryItem, type: TransactionType.IN | TransactionType.OUT } | null>(null);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBakhaarFormOpen, setIsBakhaarFormOpen] = useState(false);
  const [editingBakhaar, setEditingBakhaar] = useState<Branch | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isXarunFormOpen, setIsXarunFormOpen] = useState(false);
  const [editingXarun, setEditingXarun] = useState<Xarun | null>(null);

  useEffect(() => {
    localStorage.setItem('smartstock_settings', JSON.stringify(settings));
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }, [settings]);

  const refreshAllData = async () => {
    if (!user) return;
    setIsLoading(true);
    const filterId = user.role === UserRole.SUPER_ADMIN ? undefined : user.xarunId;
    
    try {
      const [fetchedItems, fetchedBranches, fetchedTransactions, fetchedUsers, fetchedXarumo] = await Promise.all([
        API.items.getAll(filterId),
        API.branches.getAll(filterId),
        API.transactions.getAll(filterId),
        API.users.getAll(),
        API.xarumo.getAll()
      ]);
      
      setItems(fetchedItems);
      setBranches(fetchedBranches);
      setTransactions(fetchedTransactions);
      setUsers(fetchedUsers);
      setXarumo(fetchedXarumo);

      if (fetchedItems.length > 0) {
        const aiInsights = await getInventoryInsights(fetchedItems, fetchedTransactions);
        setInsights(aiInsights);
      }
    } catch (error) {
      console.error("Refresh Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) refreshAllData();
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  const handleBulkSave = async (type: TransactionType.IN | TransactionType.OUT, data: { items: any[]; notes: string; personnel: string; source: string; branchId: string; date: string }) => {
    setIsLoading(true);
    try {
      // Create a ISO timestamp from the provided date. Add current time to preserve sort order.
      const now = new Date();
      const selectedDate = new Date(data.date);
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      const timestamp = selectedDate.toISOString();
      
      for (const entry of data.items) {
        const item = items.find(i => i.id === entry.itemId);
        if (!item) continue;

        const requiresApproval = type === TransactionType.OUT && user.role === UserRole.STAFF;
        const status = requiresApproval ? TransactionStatus.PENDING : TransactionStatus.APPROVED;

        await API.transactions.create({
          itemId: item.id,
          itemName: item.name,
          type: type,
          quantity: entry.qty,
          branchId: data.branchId,
          personnel: data.personnel,
          originOrSource: data.source,
          notes: data.notes,
          status: status,
          requestedBy: user.id,
          xarunId: user.xarunId || 'x1',
          timestamp: timestamp // Use the custom date
        });

        if (status === TransactionStatus.APPROVED) {
          const newQty = type === TransactionType.IN ? item.quantity + entry.qty : item.quantity - entry.qty;
          await API.items.save({ ...item, quantity: newQty });
        }
      }
      setIsBulkModalOpen(false);
      await refreshAllData();
      alert("Dhaqdhaqaaqa Bulk-ga si guul leh ayaa loo diwaangeliyey! ✅");
    } catch (err) {
      console.error(err);
      alert("Cilad ayaa dhacday intii hawshani socotay.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectXarun = (xarunId: string) => {
    setSelectedXarunFilterId(xarunId);
    setActiveTab('bakhaarada');
  };

  const handleSaveXarun = async (xarunData: Partial<Xarun>) => {
    await API.xarumo.save(xarunData);
    setIsXarunFormOpen(false);
    setEditingXarun(null);
    refreshAllData();
  };

  const handleDeleteXarun = async (id: string) => {
    if (confirm("Ma hubtaa inaad tirtirto xaruntan? Dhamaan bakhaarada iyo alaabta ku xiran waa la waayayaa!")) {
      await API.xarumo.delete(id);
      refreshAllData();
    }
  };

  const lowStockCount = items.filter(i => i.quantity <= i.minThreshold).length;
  const pendingApprovalsCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

  return (
    <Layout activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); if(tab !== 'bakhaarada') setSelectedXarunFilterId(null); }} user={user} onLogout={() => setUser(null)} systemName={settings.systemName} lowStockCount={lowStockCount} pendingApprovalsCount={pendingApprovalsCount}>
      {activeTab === 'dashboard' && <Dashboard items={items} transactions={transactions} insights={insights} settings={settings} />}
      {activeTab === 'inventory' && <InventoryList items={items} branches={branches} onAdd={() => { setEditingItem(null); setIsItemFormOpen(true); }} onImport={() => setIsImportModalOpen(true)} onBulkAction={() => setIsBulkModalOpen(true)} onEdit={(item) => { setEditingItem(item); setIsItemFormOpen(true); }} onTransaction={(item, type) => { setAdjustmentModal({ item, type: type as any }); }} />}
      {activeTab === 'approvals' && <ApprovalQueue transactions={transactions} onApprove={async (t) => { await API.transactions.create({ ...t, status: TransactionStatus.APPROVED, approvedBy: user.id }); refreshAllData(); }} onReject={async (id) => { refreshAllData(); }} />}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} />}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}
      {activeTab === 'reports' && <AdvancedReports items={items} transactions={transactions} branches={branches} />}
      {activeTab === 'users' && <UserManagement users={users} xarumo={xarumo} onAdd={() => { setEditingUser(null); setIsUserFormOpen(true); }} onEdit={(u) => { setEditingUser(u); setIsUserFormOpen(true); }} onSwitchUser={setUser} />}
      {activeTab === 'bakhaarada' && <BakhaarList branches={branches} xarumo={xarumo} filterXarunId={selectedXarunFilterId} onClearFilter={() => setSelectedXarunFilterId(null)} onAdd={() => { setEditingBakhaar(null); setIsBakhaarFormOpen(true); }} onEdit={(b) => { setEditingBakhaar(b); setIsBakhaarFormOpen(true); }} onDelete={async (id) => { await API.branches.delete(id); refreshAllData(); }} />}
      {activeTab === 'xarumo' && <XarunList xarumo={xarumo} onAdd={() => { setEditingXarun(null); setIsXarunFormOpen(true); }} onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }} onDelete={handleDeleteXarun} onSelectXarun={handleSelectXarun} />}
      {activeTab === 'settings' && <Settings settings={settings} onSave={setSettings} onResetData={() => { localStorage.clear(); window.location.reload(); }} items={items} branches={branches} />}
      
      {isItemFormOpen && <InventoryForm branches={branches} editingItem={editingItem} onSave={async (i) => { await API.items.save({...i, xarunId: user.xarunId}); setIsItemFormOpen(false); refreshAllData(); }} onCancel={() => setIsItemFormOpen(false)} />}
      {isBakhaarFormOpen && <BranchForm xarumo={xarumo} editingBranch={editingBakhaar} onSave={async (b) => { await API.branches.save(b); setIsBakhaarFormOpen(false); refreshAllData(); }} onCancel={() => setIsBakhaarFormOpen(false)} />}
      {isBulkModalOpen && <BulkTransactionModal items={items} branches={branches} onSave={handleBulkSave} onCancel={() => setIsBulkModalOpen(false)} />}
      
      {isXarunFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">{editingXarun ? 'Bedel Xarunta' : 'Xarun Cusub'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSaveXarun({ id: editingXarun?.id, name: fd.get('name') as string, location: fd.get('location') as string }); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Magaca Xarunta</label>
                <input name="name" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingXarun?.name} placeholder="e.g. Xarunta Hodan" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Location (Magaalada)</label>
                <input name="location" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingXarun?.location} placeholder="e.g. Mogadishu" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsXarunFormOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">JOOJI</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">KEYDI XOGTA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in duration-300">
             <h2 className="text-2xl font-black text-slate-800 mb-6">{editingUser ? 'Bedel Macluumaadka' : 'User Cusub'}</h2>
             <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); API.users.save({ id: editingUser?.id, name: fd.get('name') as string, username: fd.get('username') as string, password: fd.get('password') as string, role: fd.get('role') as UserRole, xarunId: fd.get('xarunId') as string }).then(() => { setIsUserFormOpen(false); refreshAllData(); }); }} className="space-y-4">
               <input name="name" required placeholder="Magaca" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingUser?.name} />
               <input name="username" required placeholder="Username" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingUser?.username} />
               <input name="password" required type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingUser?.password} />
               <select name="role" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingUser?.role || UserRole.STAFF}>
                 <option value={UserRole.STAFF}>STAFF</option>
                 <option value={UserRole.MANAGER}>MANAGER</option>
                 <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
               </select>
               <select name="xarunId" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" defaultValue={editingUser?.xarunId}>
                 <option value="">Dooro Xarunta...</option>
                 {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
               </select>
               <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsUserFormOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">JOOJI</button>
                 <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">KEYDI XOGTA</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {adjustmentModal && <StockAdjustmentModal item={adjustmentModal.item} branches={branches} type={adjustmentModal.type} onSave={async (data) => {
        const requiresApproval = adjustmentModal.type === TransactionType.OUT && user.role === UserRole.STAFF;
        const status = requiresApproval ? TransactionStatus.PENDING : TransactionStatus.APPROVED;
        const now = new Date().toISOString();

        const transaction = await API.transactions.create({
          itemId: adjustmentModal.item.id, itemName: adjustmentModal.item.name, type: adjustmentModal.type, quantity: data.qty,
          branchId: data.branchId, personnel: data.personnel, originOrSource: data.source,
          placementInfo: data.placement, notes: data.notes, status: status,
          requestedBy: user.id, xarunId: user.xarunId || 'x1', timestamp: now
        });

        if (status === TransactionStatus.APPROVED) {
          const newQty = adjustmentModal.type === TransactionType.IN ? adjustmentModal.item.quantity + data.qty : adjustmentModal.item.quantity - data.qty;
          await API.items.save({ ...adjustmentModal.item, quantity: newQty, shelves: data.shelf || adjustmentModal.item.shelves, sections: data.section || adjustmentModal.item.sections, branchId: data.branchId });
          setReceipt(transaction);
        }
        setAdjustmentModal(null);
        refreshAllData();
      }} onCancel={() => setAdjustmentModal(null)} />}
      
      {receipt && <TransactionReceipt transaction={receipt} item={items.find(i => i.id === receipt.itemId)} branch={branches.find(b => b.id === receipt.branchId)} issuedBy={user.name} onClose={() => setReceipt(null)} />}
    </Layout>
  );
};

export default App;
