
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
import XarunForm from './components/XarunForm';
import BranchForm from './components/BranchForm';
import Settings from './components/Settings';
import Login from './components/Login';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import TransferModal from './components/TransferModal';
import TransactionReceipt from './components/TransactionReceipt';
import BulkTransactionModal from './components/BulkTransactionModal';
import ImportModal from './components/ImportModal';
import ItemMovementHistoryModal from './components/ItemMovementHistoryModal';

// HRM Components
import HRMEmployeeManagement from './components/HRMEmployeeManagement';
import HRMAttendanceTracker from './components/HRMAttendanceTracker';
import HRMPayroll from './components/HRMPayroll';

import { API } from './services/api';
import { onDbError } from './services/supabaseClient';
import { InventoryItem, Branch, Transaction, User, TransactionStatus, TransactionType, SystemSettings, UserRole, Xarun, Employee, Attendance, Payroll } from './types';
import { getInventoryInsights } from './services/geminiService';

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
  const [dbError, setDbError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [filterXarunId, setFilterXarunId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState<{ item: InventoryItem; type: TransactionType.IN | TransactionType.OUT } | null>(null);
  const [transferModalItem, setTransferModalItem] = useState<InventoryItem | null>(null);
  const [editingBakhaar, setEditingBakhaar] = useState<Branch | null>(null);
  const [isBakhaarOpen, setIsBakhaarOpen] = useState(false);
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

  // Listen for database errors
  useEffect(() => {
    onDbError((msg) => {
      setDbError(msg);
      // Automatically clear after 10 seconds
      setTimeout(() => setDbError(null), 10000);
    });
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setDbError(null);
    
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

      const today = new Date().toISOString().split('T')[0];
      const fAttendance = await API.attendance.getByDate(today);
      setAttendance(fAttendance || []);
      
      if (fItems && fItems.length > 0) {
        getInventoryInsights(fItems, fTransactions || [])
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

  const handleDeleteAllItems = async () => {
    const confirmed = confirm("KA TAXADAR: Ma hubtaa inaad masaxdo DHAMMAAN alaabta? Xogtan lama soo celin karo.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Super Admins can clear everything, others only their center
      const xarunIdToClear = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.xarunId;
      const success = await API.items.deleteAll(xarunIdToClear);
      
      if (success) {
        setItems([]); 
        alert("Waa lagu guuleystay! Dhammaan alaabtii waa la tirtiray.");
        await refreshAllData();
      } else {
        alert("Masaxiddu ma dhicin. Hubi permissions-kaaga.");
      }
    } catch (error) {
      console.error("Delete all failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} 
      systemName={settings.systemName} lowStockCount={items.filter(i => i.quantity <= i.minThreshold).length} 
      pendingApprovalsCount={transactions.filter(t => t.status === TransactionStatus.PENDING).length}
    >
      {/* ERROR DISPLAY */}
      {dbError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-2xl bg-rose-600 text-white p-4 rounded-2xl shadow-2xl animate-bounce border-2 border-white/20">
          <div className="flex items-start gap-3">
             <span className="text-xl">⚠️</span>
             <div className="flex-1">
                <p className="font-black text-[10px] uppercase tracking-widest opacity-70 mb-1">Cilad Database-ka ah:</p>
                <p className="font-bold text-xs">{dbError}</p>
             </div>
             <button onClick={() => setDbError(null)} className="font-black text-sm p-1">✕</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-indigo-100 z-[99999]">
          <div className="h-full bg-indigo-600 animate-[loading_2s_infinite_linear]" style={{width: '30%'}}></div>
        </div>
      )}
      
      {activeTab === 'dashboard' && <Dashboard items={items} transactions={transactions} insights={insights} branches={branches} settings={settings} />}
      {activeTab === 'inventory' && (
        <InventoryList 
          items={items} branches={branches} 
          onAdd={() => { setEditingItem(null); setIsItemFormOpen(true); }} 
          onImport={() => setIsImportModalOpen(true)} 
          onBulkAction={() => setIsBulkModalOpen(true)} 
          onEdit={(item) => { setEditingItem(item); setIsItemFormOpen(true); }} 
          onTransaction={(item, type) => { 
            if (type === 'TRANSFER') setTransferModalItem(item);
            else setAdjustmentModal({ item, type: type as any }); 
          }} 
          onViewHistory={(item) => setHistoryItem(item)}
          onRefresh={() => refreshAllData()}
          onDeleteAll={handleDeleteAllItems}
        />
      )}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} />}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}
      {activeTab === 'reports' && <AdvancedReports items={items} transactions={transactions} branches={branches} />}
      
      {activeTab === 'hr-staff' && (
        <HRMEmployeeManagement 
          employees={employees} branches={branches} xarumo={xarumo} 
          attendance={attendance} payrolls={payrolls} hardwareUrl={settings.hardwareAgentUrl}
          onAdd={() => alert("Shaqaale cusub waxaa lagu daraa Settings ama HRM Form.")}
          onEdit={(e) => alert("Edit is under construction.")}
          onDelete={async (id) => { if(confirm('Ma hubtaa?')) { await API.employees.delete(id); refreshAllData(); } }}
        />
      )}
      {activeTab === 'hr-attendance' && (
        <HRMAttendanceTracker 
          employees={employees} xarumo={xarumo} hardwareUrl={settings.hardwareAgentUrl}
          zkIp={settings.zkDeviceIp} zkPort={settings.zkDevicePort}
        />
      )}
      {activeTab === 'hr-payroll' && <HRMPayroll employees={employees} xarumo={xarumo} />}
      
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
            refreshAllData(); 
          }} 
          onReject={async () => refreshAllData()} 
        />
      )}
      {activeTab === 'users' && <UserManagement users={users} xarumo={xarumo} onAdd={() => { setEditingUser(null); setIsUserFormOpen(true); }} onEdit={(u) => { setEditingUser(u); setIsUserFormOpen(true); }} onSwitchUser={setUser} />}
      {activeTab === 'xarumo' && <XarunList xarumo={xarumo} onAdd={() => { setEditingXarun(null); setIsXarunFormOpen(true); }} onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }} onDelete={async (id) => { await API.xarumo.delete(id); refreshAllData(); }} onSelectXarun={id => { setFilterXarunId(id); setActiveTab('bakhaarada'); }} />}
      {activeTab === 'bakhaarada' && (
        <BakhaarList 
          branches={branches} xarumo={xarumo} filterXarunId={filterXarunId} 
          onClearFilter={() => setFilterXarunId(null)} 
          onAdd={() => { setEditingBakhaar(null); setIsBakhaarOpen(true); }} 
          onEdit={(b) => { setEditingBakhaar(b); setIsBakhaarOpen(true); }}
          onDelete={async (id) => { if(confirm('Ma hubtaa?')) { await API.branches.delete(id); refreshAllData(); } }}
        />
      )}
      {activeTab === 'settings' && <Settings settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} items={items} branches={branches} onResetData={() => {}} />}

      {(isItemFormOpen || isBakhaarOpen || isXarunFormOpen || isUserFormOpen || isBulkModalOpen || isImportModalOpen || adjustmentModal || transferModalItem || historyItem) && (
        <div className="fixed inset-0 bg-slate-900/40 z-[9998] backdrop-blur-sm animate-in fade-in duration-300" />
      )}

      {isItemFormOpen && (
        <InventoryForm 
          branches={branches} editingItem={editingItem} 
          onSave={async (item) => { await API.items.save(item); setIsItemFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsItemFormOpen(false)} 
        />
      )}
      {historyItem && (
        <ItemMovementHistoryModal 
          item={historyItem} 
          transactions={transactions} 
          branches={branches} 
          onClose={() => setHistoryItem(null)} 
        />
      )}
      {adjustmentModal && (
        <StockAdjustmentModal 
          item={adjustmentModal.item} branches={branches} type={adjustmentModal.type}
          onSave={async (data) => {
            const t = await API.transactions.create({
              itemId: adjustmentModal.item.id,
              itemName: adjustmentModal.item.name,
              type: adjustmentModal.type,
              quantity: data.qty,
              branchId: data.branchId,
              personnel: data.personnel,
              originOrSource: data.source,
              placementInfo: data.placement,
              status: TransactionStatus.APPROVED,
              requestedBy: user.id,
              notes: data.notes,
              xarunId: adjustmentModal.item.xarunId
            });
            const newQty = adjustmentModal.type === TransactionType.IN 
              ? adjustmentModal.item.quantity + data.qty 
              : adjustmentModal.item.quantity - data.qty;
            await API.items.save({ ...adjustmentModal.item, quantity: newQty, shelves: data.shelf || adjustmentModal.item.shelves, sections: data.section || adjustmentModal.item.sections });
            setAdjustmentModal(null);
            setReceipt(t);
            refreshAllData();
          }}
          onCancel={() => setAdjustmentModal(null)}
        />
      )}
      {transferModalItem && (
        <TransferModal 
          item={transferModalItem} branches={branches}
          onTransfer={async (data) => {
            await API.transactions.create({
              itemId: transferModalItem.id,
              itemName: transferModalItem.name,
              type: TransactionType.OUT,
              quantity: data.qty,
              branchId: transferModalItem.branchId,
              targetBranchId: data.targetBranchId,
              personnel: data.personnel,
              notes: `Transfer to ${branches.find(b => b.id === data.targetBranchId)?.name}. ${data.notes}`,
              status: TransactionStatus.APPROVED,
              requestedBy: user.id,
              xarunId: transferModalItem.xarunId
            });
            await API.items.save({ ...transferModalItem, quantity: transferModalItem.quantity - data.qty });
            setTransferModalItem(null);
            refreshAllData();
          }}
          onCancel={() => setTransferModalItem(null)}
        />
      )}
      {isBakhaarOpen && (
        <BranchForm 
          xarumo={xarumo} editingBranch={editingBakhaar} 
          onSave={async (b) => { await API.branches.save(b); setIsBakhaarOpen(false); refreshAllData(); }}
          onCancel={() => setIsBakhaarOpen(false)}
        />
      )}
      {isXarunFormOpen && (
        <XarunForm 
          editingXarun={editingXarun}
          onSave={async (x) => { await API.xarumo.save(x); setIsXarunFormOpen(false); refreshAllData(); }}
          onCancel={() => setIsXarunFormOpen(false)}
        />
      )}
      {isUserFormOpen && (
        <UserForm 
          xarumo={xarumo} editingUser={editingUser} 
          onSave={async (u) => { await API.users.save(u); setIsUserFormOpen(false); refreshAllData(); }}
          onCancel={() => setIsUserFormOpen(false)}
        />
      )}
      {isBulkModalOpen && (
        <BulkTransactionModal 
          items={items} branches={branches}
          onSave={async (type, data) => {
            for (const row of data.items) {
              const item = items.find(i => i.id === row.itemId);
              if (item) {
                await API.transactions.create({
                  itemId: item.id, itemName: item.name, type, quantity: row.qty,
                  branchId: data.branchId, personnel: data.personnel, originOrSource: data.source,
                  status: TransactionStatus.APPROVED, requestedBy: user.id, notes: data.notes,
                  xarunId: item.xarunId
                });
                const newQty = type === TransactionType.IN ? item.quantity + row.qty : item.quantity - row.qty;
                await API.items.save({ ...item, quantity: newQty });
              }
            }
            setIsBulkModalOpen(false);
            refreshAllData();
          }}
          onCancel={() => setIsBulkModalOpen(false)}
        />
      )}
      {isImportModalOpen && (
        <ImportModal 
          branches={branches} 
          userXarunId={user?.xarunId}
          onImport={async (newItems) => { 
            try {
              const success = await API.items.bulkSave(newItems); 
              if (success) {
                await refreshAllData(); 
                return true;
              }
              return false;
            } catch (err: any) {
              console.error("Bulk Import Failure:", err);
              return false;
            }
          }}
          onCancel={() => setIsImportModalOpen(false)}
        />
      )}
      {receipt && (
        <TransactionReceipt 
          transaction={receipt} 
          item={items.find(i => i.id === receipt.itemId)} 
          branch={branches.find(b => b.id === receipt.branchId)} 
          issuedBy={user.name} 
          onClose={() => setReceipt(null)} 
        />
      )}
    </Layout>
  );
};

export default App;
