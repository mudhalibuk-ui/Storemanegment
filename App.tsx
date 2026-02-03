
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

// HRM Components
import HRMEmployeeManagement from './components/HRMEmployeeManagement';
import HRMAttendanceTracker from './components/HRMAttendanceTracker';
import HRMPayroll from './components/HRMPayroll';
import HRMReports from './components/HRMReports';

import { API } from './services/api';
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
      const [fXarumo, fItems, fBranches, fTransactions, fUsers, fEmployees, fPayrolls] = await Promise.all([
        API.xarumo.getAll(),
        API.items.getAll(xarunIdFilter),
        API.branches.getAll(xarunIdFilter),
        API.transactions.getAll(xarunIdFilter),
        API.users.getAll(),
        API.employees.getAll(xarunIdFilter),
        API.payroll.getAll()
      ]);

      setXarumo(fXarumo);
      setItems(fItems || []);
      setBranches(fBranches || []);
      setTransactions(fTransactions || []);
      setUsers(fUsers || []);
      setEmployees(fEmployees || []);
      setPayrolls(fPayrolls || []);

      // Fetch attendance for today
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

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} 
      systemName={settings.systemName} lowStockCount={items.filter(i => i.quantity <= i.minThreshold).length} 
      pendingApprovalsCount={transactions.filter(t => t.status === TransactionStatus.PENDING).length}
    >
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
        />
      )}
      {activeTab === 'transactions' && <TransactionHistory transactions={transactions} branches={branches} />}
      {activeTab === 'map' && <WarehouseMap items={items} branches={branches} />}
      {activeTab === 'reports' && <AdvancedReports items={items} transactions={transactions} branches={branches} />}
      
      {/* HRM Section */}
      {activeTab === 'hr-staff' && (
        <HRMEmployeeManagement 
          employees={employees} branches={branches} xarumo={xarumo} 
          attendance={attendance} payrolls={payrolls} hardwareUrl={settings.hardwareAgentUrl}
          onAdd={() => alert("Shaqaale cusub waxaa lagu daraa 'Xogta Guud' ee Settings ama HRM Form.")}
          onEdit={(e) => alert("Edit is currently under construction for HRM.")}
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
      
      {/* System Section */}
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
      {activeTab === 'xarumo' && <XarunList xarumo={xarumo} onAdd={() => setIsXarunFormOpen(true)} onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }} onDelete={async (id) => { await API.xarumo.delete(id); refreshAllData(); }} onSelectXarun={id => { setFilterXarunId(id); setActiveTab('bakhaarada'); }} />}
      {activeTab === 'bakhaarada' && (
        <BakhaarList 
          branches={branches} xarumo={xarumo} filterXarunId={filterXarunId} 
          onClearFilter={() => setFilterXarunId(null)} 
          onAdd={() => setIsBakhaarFormOpen(true)} 
          onEdit={(b) => { setEditingBakhaar(b); setIsBakhaarFormOpen(true); }}
          onDelete={async (id) => { if(confirm('Ma hubtaa?')) { await API.branches.delete(id); refreshAllData(); } }}
        />
      )}
      {activeTab === 'settings' && <Settings settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} items={items} branches={branches} onResetData={() => {}} />}

      {/* Modals Overlay */}
      {(isItemFormOpen || isBakhaarFormOpen || isXarunFormOpen || isUserFormOpen || isBulkModalOpen || isImportModalOpen || adjustmentModal || transferModalItem) && (
        <div className="fixed inset-0 bg-slate-900/40 z-[9998] backdrop-blur-sm animate-in fade-in duration-300" />
      )}

      {/* Modals Rendering */}
      {isItemFormOpen && (
        <InventoryForm 
          branches={branches} editingItem={editingItem} 
          onSave={async (item) => { await API.items.save(item); setIsItemFormOpen(false); refreshAllData(); }} 
          onCancel={() => setIsItemFormOpen(false)} 
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
            // Register movement as OUT
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
            // Update quantity
            await API.items.save({ ...transferModalItem, quantity: transferModalItem.quantity - data.qty });
            setTransferModalItem(null);
            refreshAllData();
          }}
          onCancel={() => setTransferModalItem(null)}
        />
      )}
      {isBakhaarFormOpen && (
        <BranchForm 
          xarumo={xarumo} editingBranch={editingBakhaar} 
          onSave={async (b) => { await API.branches.save(b); setIsBakhaarFormOpen(false); refreshAllData(); }}
          onCancel={() => setIsBakhaarFormOpen(false)}
        />
      )}
      {isXarunFormOpen && (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
            <h2 className="text-xl font-black mb-4 uppercase">{editingXarun ? 'Bedel Xarun' : 'Xarun Cusub'}</h2>
            <div className="space-y-4">
              <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" placeholder="Magaca Xarunta" id="xname" defaultValue={editingXarun?.name} />
              <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" placeholder="Magaalada" id="xloc" defaultValue={editingXarun?.location} />
            </div>
            <div className="flex gap-3 mt-8">
               <button onClick={() => setIsXarunFormOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black uppercase text-[10px]">Jooji</button>
               <button onClick={async () => {
                 const n = (document.getElementById('xname') as HTMLInputElement).value;
                 const l = (document.getElementById('xloc') as HTMLInputElement).value;
                 await API.xarumo.save({ id: editingXarun?.id, name: n, location: l });
                 setIsXarunFormOpen(false);
                 refreshAllData();
               }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">Keydi</button>
            </div>
          </div>
        </div>
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
          onImport={async (newItems) => { 
            await API.items.bulkSave(newItems); 
            setIsImportModalOpen(false); 
            refreshAllData(); 
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
