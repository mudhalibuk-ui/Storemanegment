
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import InventoryForm from './components/InventoryForm';
import WarehouseMap from './components/WarehouseMap';
import TransactionHistory from './components/TransactionHistory';
import UserManagement from './components/UserManagement';
import UserForm from './components/UserForm';
import Settings from './components/Settings';
import Login from './components/Login';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import LogisticsProcurement from './components/LogisticsProcurement';
import XarunList from './components/XarunList';
import XarunForm from './components/XarunForm';
import BakhaarList from './components/BakhaarList';
import BranchForm from './components/BranchForm';
import ItemMovementHistoryModal from './components/ItemMovementHistoryModal';
import TransferModal from './components/TransferModal';
import ImportModal from './components/ImportModal';
import BulkTransactionModal from './components/BulkTransactionModal';

// HRM Imports
import HRMEmployeeManagement from './components/HRMEmployeeManagement';
import HRMAttendanceTracker from './components/HRMAttendanceTracker';
import HRMPayroll from './components/HRMPayroll';
import HRMReports from './components/HRMReports';

import { API } from './services/api';
import { InventoryItem, Branch, Transaction, User, TransactionStatus, TransactionType, SystemSettings, UserRole, Xarun, Employee, Attendance, Payroll } from './types';
import { getInventoryInsights } from './services/geminiService';
import { formatPlacement } from './services/mappingUtils';

type AdjustmentModalState = { item: InventoryItem; type: TransactionType.IN | TransactionType.OUT } | null;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [xarumo, setXarumo] = useState<Xarun[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingXarun, setEditingXarun] = useState<Xarun | null>(null);
  const [isXarunFormOpen, setIsXarunFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [filterXarunId, setFilterXarunId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  
  // Modals
  const [adjustmentModal, setAdjustmentModal] = useState<AdjustmentModalState>(null);
  const [transferModalItem, setTransferModalItem] = useState<InventoryItem | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<InventoryItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('smartstock_settings');
    return saved ? JSON.parse(saved) : {
      systemName: 'SmartStock Pro',
      currency: 'USD',
      language: 'SO',
      primaryColor: '#4f46e5',
      lowStockGlobalThreshold: 5,
      taxPerBox: 2,
      taxPerKiish: 1,
      taxPerDram: 5,
      taxPerFalag: 10,
      mainStoreId: ''
    };
  });

  const refreshAllData = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    
    const xarunIdFilter = user.role === UserRole.SUPER_ADMIN ? undefined : user.xarunId;
    
    try {
      const [fXarumo, fItems, fBranches, fTransactions, fUsers, fEmployees, fPayrolls] = await Promise.all([
        API.xarumo.getAll(),
        API.items.getAll(xarunIdFilter),
        API.branches.getAll(xarunIdFilter),
        API.transactions.getAll(xarunIdFilter),
        API.users.getAll(),
        API.employees.getAll(xarunIdFilter),
        API.payroll.getAll()
      ]);

      setXarumo(fXarumo || []);
      setItems(fItems || []);
      setBranches(fBranches || []);
      setTransactions(fTransactions || []);
      setUsers(fUsers || []);
      setEmployees(fEmployees || []);
      setPayrolls(fPayrolls || []);

      if (fItems && fItems.length > 0 && !isBackground && activeTab === 'dashboard') {
        getInventoryInsights(fItems, fTransactions || [])
          .then(setInsights)
          .catch(() => setInsights(["Falanqaynta AI-ga hadda lama heli karo."]));
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      refreshAllData();
      const syncInterval = setInterval(() => {
        if (!document.hidden) refreshAllData(true);
      }, 30000); 
      return () => clearInterval(syncInterval);
    }
  }, [user, refreshAllData]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} 
      systemName={settings.systemName} lowStockCount={items.filter(i => i.quantity <= i.minThreshold).length} 
      pendingApprovalsCount={transactions.filter(t => t.status === TransactionStatus.PENDING).length}
    >
      {activeTab === 'dashboard' && <Dashboard items={items} transactions={transactions} insights={insights} branches={branches} settings={settings} />}
      {activeTab === 'inventory' && (
        <InventoryList 
          items={items} branches={branches} 
          onAdd={() => { setEditingItem(null); setIsItemFormOpen(true); }} 
          onImport={() => setIsImportModalOpen(true)} 
          onBulkAction={() => setIsBulkModalOpen(true)} 
          onEdit={(item) => { setEditingItem(item); setIsItemFormOpen(true); }} 
          onDelete={async (id) => { 
            const itemToDelete = items.find(i => i.id === id);
            if(window.confirm(`Ma hubtaa inaad tirtirto alaabtan: "${itemToDelete?.name}"?`)) { 
              try {
                const result = await API.items.delete(id); 
                if (result.success) {
                  setItems(prev => prev.filter(i => i.id !== id));
                  refreshAllData(true);
                } else {
                  throw new Error(result.error || "Unknown error");
                }
              } catch (err: any) {
                alert(`CILAD DATABASE: ${err.message || 'Error'}`);
              }
            } 
          }}
          onTransaction={(item, type) => {
            if (type === 'TRANSFER') {
              setTransferModalItem(item);
            } else {
              setAdjustmentModal({ item, type: type as any });
            }
          }} 
          onViewHistory={(item) => setHistoryModalItem(item)}
          onRefresh={() => refreshAllData()}
        />
      )}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} items={items} onRefresh={refreshAllData} />}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}

      {activeTab === 'procurement' && (
        <LogisticsProcurement 
          user={user} 
          masterItems={items} 
          buyers={users.filter(u => u.role === UserRole.BUYER)} 
          settings={settings}
          branches={branches}
          onRefresh={refreshAllData}
        />
      )}

      {activeTab === 'xarumo' && (
        <XarunList 
          xarumo={xarumo} 
          onAdd={() => { setEditingXarun(null); setIsXarunFormOpen(true); }} 
          onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }} 
          onDelete={async (id) => { await API.xarumo.delete(id); refreshAllData(); }} 
          onSelectXarun={(id) => { setFilterXarunId(id); setActiveTab('bakhaarada'); }} 
        />
      )}
      {activeTab === 'bakhaarada' && (
        <BakhaarList 
          branches={branches} 
          xarumo={xarumo} 
          filterXarunId={filterXarunId} 
          onClearFilter={() => setFilterXarunId(null)} 
          onAdd={() => { setEditingBranch(null); setIsBranchFormOpen(true); }} 
          onEdit={(b) => { setEditingBranch(b); setIsBranchFormOpen(true); }} 
          onDelete={async (id) => { await API.branches.delete(id); refreshAllData(); }} 
        />
      )}

      {activeTab === 'hr-employees' && (
        <HRMEmployeeManagement 
          employees={employees} 
          branches={branches} 
          xarumo={xarumo} 
          attendance={attendance} 
          payrolls={payrolls} 
          onAdd={() => { setEditingEmployee(null); setIsEmployeeFormOpen(true); }} 
          onEdit={(e) => { setEditingEmployee(e); setIsEmployeeFormOpen(true); }} 
          onDelete={async (id) => { if(confirm('Tir-tir shaqaalahan?')) { await API.employees.delete(id); refreshAllData(); } }} 
        />
      )}
      {activeTab === 'hr-attendance' && (
        <HRMAttendanceTracker 
          employees={employees} 
          xarumo={xarumo} 
        />
      )}
      {activeTab === 'hr-payroll' && <HRMPayroll employees={employees} xarumo={xarumo} />}
      {activeTab === 'hr-reports' && <HRMReports employees={employees} attendance={attendance} payrolls={payrolls} xarumo={xarumo} />}

      {activeTab === 'users' && (
        <UserManagement 
          users={users} 
          xarumo={xarumo} 
          onAdd={() => { setEditingUser(null); setIsUserFormOpen(true); }} 
          onEdit={(u) => { setEditingUser(u); setIsUserFormOpen(true); }} 
          onSwitchUser={() => {}} 
        />
      )}
      {activeTab === 'settings' && <Settings settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} items={items} branches={branches} onResetData={() => {}} />}

      {isUserFormOpen && (
        <UserForm 
          xarumo={xarumo} 
          editingUser={editingUser} 
          onSave={async (u) => { await API.users.save(u); setIsUserFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsUserFormOpen(false)} 
        />
      )}

      {isXarunFormOpen && (
        <XarunForm 
          editingXarun={editingXarun} 
          onSave={async (x) => { await API.xarumo.save(x); setIsXarunFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsXarunFormOpen(false)} 
        />
      )}

      {isBranchFormOpen && (
        <BranchForm 
          xarumo={xarumo} 
          editingBranch={editingBranch} 
          onSave={async (b) => { await API.branches.save(b); setIsBranchFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsBranchFormOpen(false)} 
        />
      )}

      {isItemFormOpen && (
        <InventoryForm 
          branches={branches} 
          editingItem={editingItem} 
          onSave={async (item) => { await API.items.save(item); setIsItemFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsItemFormOpen(false)} 
        />
      )}

      {adjustmentModal && (
        <StockAdjustmentModal 
          item={adjustmentModal.item} 
          branches={branches} 
          type={adjustmentModal.type} 
          onSave={async (data) => { 
            const type = adjustmentModal.type;
            const item = adjustmentModal.item;
            const newQty = type === TransactionType.IN ? item.quantity + data.qty : item.quantity - data.qty;
            
            await API.transactions.create({
              itemId: item.id,
              itemName: item.name,
              type: type,
              quantity: data.qty,
              branchId: data.branchId,
              personnel: data.personnel,
              originOrSource: data.source,
              placementInfo: data.placement,
              status: TransactionStatus.APPROVED,
              requestedBy: user.id,
              xarunId: user.xarunId || ''
            });

            await API.items.save({ ...item, quantity: newQty, shelves: data.shelf || item.shelves, sections: data.section || item.sections });
            setAdjustmentModal(null); 
            refreshAllData(); 
          }} 
          onCancel={() => setAdjustmentModal(null)} 
        />
      )}

      {transferModalItem && (
        <TransferModal 
          item={transferModalItem} 
          branches={branches} 
          onCancel={() => setTransferModalItem(null)} 
          onTransfer={async (data) => {
            const item = transferModalItem;
            if (!item || !user) return;

            const targetBranch = branches.find(b => b.id === data.targetBranchId);
            const targetXarunId = targetBranch?.xarunId || user.xarunId || '';
            
            const newSourceQty = item.quantity - data.qty;
            await API.items.save({ ...item, quantity: newSourceQty });

            const existingTargetItem = items.find(i => 
              i.sku === item.sku && i.branchId === data.targetBranchId
            );

            if (existingTargetItem) {
              await API.items.save({
                ...existingTargetItem,
                quantity: existingTargetItem.quantity + data.qty,
                shelves: data.targetShelf,
                sections: data.targetSection
              });
            } else {
              await API.items.save({
                name: item.name,
                category: item.category,
                sku: item.sku,
                shelves: data.targetShelf,
                sections: data.targetSection,
                quantity: data.qty,
                minThreshold: item.minThreshold,
                branchId: data.targetBranchId,
                xarunId: targetXarunId,
                packType: item.packType,
                lastKnownPrice: item.lastKnownPrice
              });
            }

            const placementLabel = formatPlacement(data.targetShelf, data.targetSection);
            await API.transactions.create({
              itemId: item.id,
              itemName: item.name,
              type: TransactionType.TRANSFER,
              quantity: data.qty,
              branchId: item.branchId,
              targetBranchId: data.targetBranchId,
              personnel: data.personnel,
              originOrSource: `To: ${targetBranch?.name}`,
              placementInfo: `Target: ${placementLabel}`,
              notes: data.notes,
              status: TransactionStatus.APPROVED,
              requestedBy: user.id,
              xarunId: user.xarunId || ''
            });

            setTransferModalItem(null);
            refreshAllData();
            alert("Transfer Completed Successfully!");
          }}
        />
      )}

      {historyModalItem && (
        <ItemMovementHistoryModal 
          item={historyModalItem} 
          transactions={transactions} 
          branches={branches} 
          onClose={() => setHistoryModalItem(null)} 
        />
      )}

      {isImportModalOpen && (
        <ImportModal 
          branches={branches} 
          userXarunId={user.xarunId}
          onImport={async (newItems) => {
            const success = await API.items.bulkSave(newItems);
            if (success) {
              setIsImportModalOpen(false);
              refreshAllData();
            }
            return success;
          }}
          onCancel={() => setIsImportModalOpen(false)}
        />
      )}

      {isBulkModalOpen && (
        <BulkTransactionModal 
          items={items} 
          branches={branches}
          onSave={async (type, data) => {
            for (const row of data.items) {
              const item = items.find(i => i.id === row.itemId);
              if (item) {
                const newQty = type === TransactionType.IN ? item.quantity + row.qty : item.quantity - row.qty;
                
                await API.transactions.create({
                  itemId: item.id,
                  itemName: item.name,
                  type: type,
                  quantity: row.qty,
                  branchId: data.branchId,
                  personnel: data.personnel,
                  originOrSource: data.source,
                  notes: data.notes,
                  status: TransactionStatus.APPROVED,
                  requestedBy: user.id,
                  xarunId: user.xarunId || ''
                });

                await API.items.save({ ...item, quantity: newQty });
              }
            }
            setIsBulkModalOpen(false);
            refreshAllData();
            alert("Bulk Transactions Processed Successfully!");
          }}
          onCancel={() => setIsBulkModalOpen(false)}
        />
      )}
    </Layout>
  );
};

export default App;
