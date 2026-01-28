
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
import BranchList from './components/BranchList';
import BranchForm from './components/BranchForm';
import Settings from './components/Settings';
import Login from './components/Login';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import TransferModal from './components/TransferModal';
import TransactionReceipt from './components/TransactionReceipt';
import ImportModal from './components/ImportModal';
import ScannerModal from './components/ScannerModal';
import { API } from './services/api';
import { InventoryItem, Branch, Transaction, User, TransactionStatus, TransactionType, SystemSettings, UserRole } from './types';
import { getInventoryInsights } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('smartstock_settings');
    return saved ? JSON.parse(saved) : {
      systemName: 'SmartStock Pro',
      currency: 'USD',
      language: 'EN',
      primaryColor: '#4f46e5',
      lowStockGlobalThreshold: 5
    };
  });

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState<{ item: InventoryItem, type: TransactionType.IN | TransactionType.OUT } | null>(null);
  const [transferModal, setTransferModal] = useState<InventoryItem | null>(null);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  useEffect(() => {
    localStorage.setItem('smartstock_settings', JSON.stringify(settings));
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }, [settings]);

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      const [fetchedItems, fetchedBranches, fetchedTransactions, fetchedUsers] = await Promise.all([
        API.items.getAll(),
        API.branches.getAll(),
        API.transactions.getAll(),
        API.users.getAll()
      ]);
      setItems(fetchedItems);
      setBranches(fetchedBranches);
      setTransactions(fetchedTransactions);
      setUsers(fetchedUsers);

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
    if (user) {
      refreshAllData();
    }
  }, [user]);

  useEffect(() => {
    (window as any).toggleScanner = () => setIsScannerOpen(true);
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    await API.items.save(itemData);
    setIsItemFormOpen(false);
    setEditingItem(null);
    refreshAllData();
  };

  const handleStockAdjustment = async (data: any) => {
    if (!adjustmentModal) return;
    const { item, type } = adjustmentModal;
    const transaction = await API.transactions.create({
      itemId: item.id,
      itemName: item.name,
      type: type,
      quantity: data.qty,
      branchId: data.branchId,
      personnel: data.personnel,
      originOrSource: data.source,
      placementInfo: data.placement,
      notes: data.notes,
      status: TransactionStatus.APPROVED,
      requestedBy: user.id
    });
    const newQty = type === TransactionType.IN ? item.quantity + data.qty : item.quantity - data.qty;
    await API.items.save({
      ...item,
      quantity: newQty,
      shelves: data.shelf || item.shelves,
      sections: data.section || item.sections,
      branchId: data.branchId
    });
    setAdjustmentModal(null);
    setReceipt(transaction);
    refreshAllData();
  };

  const handleTransfer = async (data: any) => {
    if (!transferModal) return;
    const item = transferModal;
    const transaction = await API.transactions.create({
      itemId: item.id,
      itemName: item.name,
      type: TransactionType.TRANSFER,
      quantity: data.qty,
      branchId: item.branchId,
      targetBranchId: data.targetBranchId,
      personnel: data.personnel,
      notes: data.notes,
      status: TransactionStatus.APPROVED,
      requestedBy: user.id
    });
    await API.items.save({ ...item, quantity: item.quantity - data.qty });
    const targetItems = await API.items.getAll();
    const existingInTarget = targetItems.find(i => i.sku === item.sku && i.branchId === data.targetBranchId);
    if (existingInTarget) {
      await API.items.save({ ...existingInTarget, quantity: existingInTarget.quantity + data.qty });
    } else {
      await API.items.save({ ...item, id: undefined, branchId: data.targetBranchId, quantity: data.qty });
    }
    setTransferModal(null);
    setReceipt(transaction);
    refreshAllData();
  };

  const handleAddUser = async (userData: Partial<User>) => {
    await API.users.save(userData);
    refreshAllData();
  };

  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
  };

  const lowStockCount = items.filter(i => i.quantity <= i.minThreshold).length;
  const pendingApprovalsCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} systemName={settings.systemName} lowStockCount={lowStockCount} pendingApprovalsCount={pendingApprovalsCount}>
      {isLoading && activeTab !== 'chat' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-black animate-bounce shadow-xl">
          Cusboonaysiinaya Xogta...
        </div>
      )}
      {activeTab === 'dashboard' && <Dashboard items={items} transactions={transactions} insights={insights} settings={settings} />}
      {activeTab === 'inventory' && <InventoryList items={items} branches={branches} onAdd={() => setIsItemFormOpen(true)} onImport={() => setIsImportModalOpen(true)} onEdit={(item) => { setEditingItem(item); setIsItemFormOpen(true); }} onTransaction={(item, type) => { if (type === 'TRANSFER') setTransferModal(item); else setAdjustmentModal({ item, type: type as any }); }} />}
      {activeTab === 'chat' && <AIChat items={items} transactions={transactions} onDataChange={refreshAllData} />}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} />}
      {activeTab === 'reports' && <AdvancedReports items={items} transactions={transactions} branches={branches} />}
      {activeTab === 'approvals' && <ApprovalQueue transactions={transactions} onApprove={async (t) => { await API.transactions.updateStatus(t.id, TransactionStatus.APPROVED, user.id); refreshAllData(); }} onReject={async (id) => { await API.transactions.updateStatus(id, TransactionStatus.REJECTED, user.id); refreshAllData(); }} />}
      {activeTab === 'branches' && <BranchList branches={branches} onAdd={() => { setIsBranchFormOpen(true); setEditingBranch(null); }} onEdit={(branch) => { setEditingBranch(branch); setIsBranchFormOpen(true); }} onDelete={async (id) => { refreshAllData(); }} />}
      {activeTab === 'users' && <UserManagement users={users} onAdd={handleAddUser} onSwitchUser={(u) => { setUser(u); setActiveTab('dashboard'); }} />}
      {activeTab === 'settings' && <Settings settings={settings} onSave={handleSaveSettings} onResetData={() => { localStorage.clear(); window.location.reload(); }} />}
      {isItemFormOpen && <InventoryForm branches={branches} editingItem={editingItem} onSave={handleSaveItem} onCancel={() => { setIsItemFormOpen(false); setEditingItem(null); }} />}
      {adjustmentModal && <StockAdjustmentModal item={adjustmentModal.item} branches={branches} type={adjustmentModal.type} onSave={handleStockAdjustment} onCancel={() => setAdjustmentModal(null)} />}
      {transferModal && <TransferModal item={transferModal} branches={branches} onTransfer={handleTransfer} onCancel={() => setTransferModal(null)} />}
      {receipt && <TransactionReceipt transaction={receipt} item={items.find(i => i.id === receipt.itemId)} branch={branches.find(b => b.id === receipt.branchId)} issuedBy={user.name} onClose={() => setReceipt(null)} />}
      {isImportModalOpen && <ImportModal branches={branches} onImport={async (newItems) => { await API.items.updateBulk(newItems); setIsImportModalOpen(false); refreshAllData(); }} onCancel={() => setIsImportModalOpen(false)} />}
      {isScannerOpen && <ScannerModal onScan={(code) => { setIsScannerOpen(false); }} onCancel={() => setIsScannerOpen(false)} />}
      {isBranchFormOpen && <BranchForm editingBranch={editingBranch} onSave={async (branchData) => { await API.branches.save(branchData); setIsBranchFormOpen(false); refreshAllData(); }} onCancel={() => setIsBranchFormOpen(false)} />}
    </Layout>
  );
};

export default App;
