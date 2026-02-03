
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import InventoryForm from './components/InventoryForm';
import WarehouseMap from './components/WarehouseMap';
import ApprovalQueue from './components/ApprovalQueue';
import TransactionHistory from './components/TransactionHistory';
import AdvancedReports from './components/AdvancedReports';
import UserManagement from './components/UserManagement';
import UserForm from './components/UserForm';
import BakhaarList from './components/BakhaarList';
import XarunList from './components/XarunList';
import BranchForm from './components/BranchForm';
import Settings from './components/Settings';
import Login from './components/Login';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import TransferModal from './components/TransferModal';
import TransactionReceipt from './components/TransactionReceipt';
import BulkTransactionModal from './components/BulkTransactionModal';
import ImportModal from './components/ImportModal';
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
  
  const [filterXarunId, setFilterXarunId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState<{ item: InventoryItem; type: TransactionType.IN | TransactionType.OUT } | null>(null);
  const [transferModalItem, setTransferModalItem] = useState<InventoryItem | null>(null);
  const [editingBakhaar, setEditingBakhaar] = useState<Branch | null>(null);
  const [isBakhaarFormOpen, setIsBakhaarFormOpen] = useState(false);
  const [editingXarun, setEditingXarun] = useState<Xarun | null>(null);
  const [isXarunFormOpen, setIsXarunFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

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

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    const xarunIdFilter = user.role === UserRole.SUPER_ADMIN ? undefined : user.xarunId;
    
    try {
      const fetchedXarumo = await API.xarumo.getAll();
      setXarumo(fetchedXarumo);

      const [fetchedItems, fetchedBranches, fetchedTransactions, fetchedUsers] = await Promise.all([
        API.items.getAll(xarunIdFilter),
        API.branches.getAll(xarunIdFilter),
        API.transactions.getAll(xarunIdFilter),
        API.users.getAll()
      ]);

      setItems(fetchedItems);
      setBranches(fetchedBranches);
      setTransactions(fetchedTransactions);
      setUsers(fetchedUsers);
      
      if (fetchedItems.length > 0) {
        getInventoryInsights(fetchedItems, fetchedTransactions)
          .then(setInsights)
          .catch(() => setInsights(["AI Insights lama heli karo hadda."]));
      }
    } catch (error) {
      console.error("Critical Refresh Failure:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshAllData();
  }, [user, refreshAllData]);

  const handleTransfer = async (data: { qty: number; targetBranchId: string; notes: string; personnel: string }) => {
    if (!transferModalItem || !user) return;

    const sourceItem = transferModalItem;
    const targetBranch = branches.find(b => b.id === data.targetBranchId);
    
    if (!targetBranch) return;

    // 1. Create Transfer Transaction
    const transaction = await API.transactions.create({
      itemId: sourceItem.id,
      itemName: sourceItem.name,
      type: TransactionType.TRANSFER,
      quantity: data.qty,
      branchId: sourceItem.branchId,
      targetBranchId: data.targetBranchId,
      notes: data.notes,
      personnel: data.personnel,
      status: TransactionStatus.APPROVED,
      requestedBy: user.id,
      xarunId: sourceItem.xarunId
    });

    // 2. Decrease Qty in Source
    await API.items.save({
      ...sourceItem,
      quantity: sourceItem.quantity - data.qty
    });

    // 3. Update or Create Item in Target
    // Find item with same SKU in target branch
    const allItems = await API.items.getAll();
    const targetItem = allItems.find(i => i.sku === sourceItem.sku && i.branchId === data.targetBranchId);

    if (targetItem) {
      await API.items.save({
        ...targetItem,
        quantity: targetItem.quantity + data.qty
      });
    } else {
      await API.items.save({
        name: sourceItem.name,
        category: sourceItem.category,
        sku: sourceItem.sku,
        shelves: 1,
        sections: 1,
        quantity: data.qty,
        branchId: data.targetBranchId,
        minThreshold: sourceItem.minThreshold,
        xarunId: sourceItem.xarunId,
        id: `i-move-${Date.now()}`
      });
    }

    setTransferModalItem(null);
    setReceipt(transaction);
    await refreshAllData();
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} 
      systemName={settings.systemName} lowStockCount={items.filter(i => i.quantity <= i.minThreshold).length} 
      pendingApprovalsCount={transactions.filter(t => t.status === TransactionStatus.PENDING).length}
    >
      {activeTab === 'dashboard' && <Dashboard items={items} transactions={transactions} insights={insights} settings={settings} />}
      {activeTab === 'inventory' && (
        <InventoryList 
          items={items} branches={branches} onAdd={() => { setEditingItem(null); setIsItemFormOpen(true); }} 
          onImport={() => setIsImportModalOpen(true)} onBulkAction={() => setIsBulkModalOpen(true)} 
          onEdit={(item) => { setEditingItem(item); setIsItemFormOpen(true); }} 
          onTransaction={(item, type) => { 
            if (type === 'TRANSFER') {
              setTransferModalItem(item);
            } else {
              setAdjustmentModal({ item, type: type as any }); 
            }
          }} 
        />
      )}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} />}
      {activeTab === 'approvals' && (
        <ApprovalQueue 
          transactions={transactions} 
          onApprove={async (t) => { 
            const item = items.find(i => i.id === t.itemId);
            if(item) {
              const newQty = t.type === TransactionType.IN ? item.quantity + t.quantity : item.quantity - t.quantity;
              await API.items.save({ ...item, quantity: newQty });
            }
            await API.transactions.create({ ...t, status: TransactionStatus.APPROVED, approvedBy: user.id }); 
            await refreshAllData(); 
          }} 
          onReject={async (id) => { await refreshAllData(); }} 
        />
      )}
      {activeTab === 'reports' && <AdvancedReports items={items} transactions={transactions} branches={branches} />}
      {activeTab === 'users' && <UserManagement users={users} xarumo={xarumo} onAdd={() => { setEditingUser(null); setIsUserFormOpen(true); }} onEdit={(u) => { setEditingUser(u); setIsUserFormOpen(true); }} onSwitchUser={setUser} />}
      {activeTab === 'bakhaarada' && (
        <BakhaarList 
          branches={branches} xarumo={xarumo} filterXarunId={filterXarunId} onClearFilter={() => setFilterXarunId(null)} 
          onAdd={() => { 
            if (xarumo.length === 0) {
              alert("Fadlan marka hore Xarun abuur ka hor intaadan Bakhaar darin.");
              setActiveTab('xarumo');
              return;
            }
            setEditingBakhaar(null); 
            setIsBakhaarFormOpen(true); 
          }} 
          onEdit={(b) => { setEditingBakhaar(b); setIsBakhaarFormOpen(true); }} 
          onDelete={async (id) => { if(confirm('Ma hubtaa?')) { await API.branches.delete(id); await refreshAllData(); } }} 
        />
      )}
      {activeTab === 'xarumo' && (
        <XarunList 
          xarumo={xarumo} onAdd={() => { setEditingXarun(null); setIsXarunFormOpen(true); }} 
          onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }} 
          onDelete={async (id) => { if(confirm('Ma hubtaa?')) { await API.xarumo.delete(id); await refreshAllData(); } }} 
          onSelectXarun={(id) => { setFilterXarunId(id); setActiveTab('bakhaarada'); }} 
        />
      )}
      {activeTab === 'settings' && <Settings settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} onResetData={() => {}} items={items} branches={branches} />}

      {(isItemFormOpen || isBakhaarFormOpen || isXarunFormOpen || isUserFormOpen || isBulkModalOpen || isImportModalOpen || adjustmentModal || transferModalItem) && (
        <div className="fixed inset-0 bg-slate-900/40 z-[9998] backdrop-blur-sm animate-in fade-in duration-300" />
      )}
      
      {isItemFormOpen && <InventoryForm branches={branches} editingItem={editingItem} onSave={async (i) => { 
        const selectedBranch = branches.find(b => b.id === i.branchId);
        const centerId = selectedBranch?.xarunId || user.xarunId || xarumo[0]?.id;
        if(!centerId) { alert("Cilad: Xarun lama helin. Hubi in xarun ay jirto."); return; }
        await API.items.save({...i, xarunId: centerId}); 
        setIsItemFormOpen(false); 
        await refreshAllData(); 
      }} onCancel={() => setIsItemFormOpen(false)} />}
      
      {isBakhaarFormOpen && <BranchForm xarumo={xarumo} editingBranch={editingBakhaar} onSave={async (b) => { 
        await API.branches.save(b); 
        setIsBakhaarFormOpen(false); 
        await refreshAllData(); 
      }} onCancel={() => setIsBakhaarFormOpen(false)} />}
      
      {isXarunFormOpen && (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in duration-300">
            <h2 className="text-xl font-black mb-4 tracking-tighter uppercase">{editingXarun ? 'Bedel Xarun' : 'Xarun Cusub'}</h2>
            <div className="space-y-4">
              <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none" placeholder="Magaca Xarunta" defaultValue={editingXarun?.name} id="xname" />
              <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none" placeholder="Location" defaultValue={editingXarun?.location} id="xloc" />
            </div>
            <div className="flex gap-3 mt-8">
               <button onClick={() => setIsXarunFormOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black uppercase text-[10px] tracking-widest">Jooji</button>
               <button onClick={async () => {
                 const nameInput = (document.getElementById('xname') as HTMLInputElement);
                 const locationInput = (document.getElementById('xloc') as HTMLInputElement);
                 if(!nameInput.value.trim()){ alert("Fadlan qor magaca!"); return; }
                 await API.xarumo.save({ 
                   id: editingXarun?.id || `x${Date.now()}`, 
                   name: nameInput.value, 
                   location: locationInput.value 
                 });
                 setIsXarunFormOpen(false);
                 await refreshAllData();
               }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Keydi</button>
            </div>
          </div>
        </div>
      )}

      {isUserFormOpen && <UserForm xarumo={xarumo} editingUser={editingUser} onSave={async (u) => { await API.users.save(u); setIsUserFormOpen(false); await refreshAllData(); }} onCancel={() => setIsUserFormOpen(false)} />}
      
      {isBulkModalOpen && <BulkTransactionModal items={items} branches={branches} onSave={async (type, data) => {
          for (const row of data.items) {
            const item = items.find(i => i.id === row.itemId);
            if (item) {
              const status = (type === TransactionType.OUT && user?.role === UserRole.STAFF) ? TransactionStatus.PENDING : TransactionStatus.APPROVED;
              await API.transactions.create({
                itemId: item.id, itemName: item.name, type: type, quantity: row.qty,
                branchId: data.branchId, personnel: data.personnel, originOrSource: data.source,
                notes: data.notes, status: status,
                requestedBy: user?.id || 'system', xarunId: item.xarunId
              });
              if (status === TransactionStatus.APPROVED) {
                const newQty = type === TransactionType.IN ? item.quantity + row.qty : item.quantity - row.qty;
                await API.items.save({ ...item, quantity: newQty });
              }
            }
          }
          setIsBulkModalOpen(false);
          await refreshAllData();
      }} onCancel={() => setIsBulkModalOpen(false)} />}
      
      {isImportModalOpen && <ImportModal branches={branches} onImport={async (newItems) => {
          for (const item of newItems) {
            const centerId = user?.xarunId || xarumo[0]?.id;
            await API.items.save({ ...item, xarunId: centerId });
          }
          setIsImportModalOpen(false);
          await refreshAllData();
      }} onCancel={() => setIsImportModalOpen(false)} />}

      {adjustmentModal && <StockAdjustmentModal item={adjustmentModal.item} branches={branches} type={adjustmentModal.type} onSave={async (data) => {
        const status = (adjustmentModal.type === TransactionType.OUT && user.role === UserRole.STAFF) ? TransactionStatus.PENDING : TransactionStatus.APPROVED;
        
        const transaction = await API.transactions.create({
          itemId: adjustmentModal.item.id, itemName: adjustmentModal.item.name, type: adjustmentModal.type, quantity: data.qty,
          branchId: data.branchId, personnel: data.personnel, originOrSource: data.source,
          placementInfo: data.placement, notes: data.notes, status: status,
          requestedBy: user.id, xarunId: adjustmentModal.item.xarunId
        });

        if (status === TransactionStatus.APPROVED) {
          const newQty = adjustmentModal.type === TransactionType.IN ? adjustmentModal.item.quantity + data.qty : adjustmentModal.item.quantity - data.qty;
          const updatedItem: Partial<InventoryItem> = { ...adjustmentModal.item, quantity: newQty, branchId: data.branchId };
          if (adjustmentModal.type === TransactionType.IN && data.shelf !== undefined && data.section !== undefined) {
             updatedItem.shelves = data.shelf;
             updatedItem.sections = data.section;
          }
          await API.items.save(updatedItem);
          setReceipt(transaction);
        }
        
        setAdjustmentModal(null);
        await refreshAllData();
      }} onCancel={() => setAdjustmentModal(null)} />}

      {transferModalItem && (
        <TransferModal 
          item={transferModalItem} 
          branches={branches} 
          onTransfer={handleTransfer} 
          onCancel={() => setTransferModalItem(null)} 
        />
      )}
      
      {receipt && <TransactionReceipt transaction={receipt} item={items.find(i => i.id === receipt.itemId)} branch={branches.find(b => b.id === receipt.branchId)} issuedBy={user.name} onClose={() => setReceipt(null)} />}
    </Layout>
  );
};

export default App;
