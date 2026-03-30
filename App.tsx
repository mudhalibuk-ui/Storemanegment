
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
import ApprovalQueue from './components/ApprovalQueue';
import TransactionReceipt from './components/TransactionReceipt';
import BulkTransactionReceipt from './components/BulkTransactionReceipt';
import CrossXarunOrderHub from './components/CrossXarunOrderHub';

// HRM Imports
import HRMEmployeeManagement from './components/HRMEmployeeManagement';
import HRMAttendanceTracker from './components/HRMAttendanceTracker';
import HRMPayroll from './components/HRMPayroll';
import HRMReports from './components/HRMReports';
import EmployeeForm from './components/EmployeeForm';

import POS from './components/POS';
import Financials from './components/Financials';
import PurchaseManagement from './components/PurchaseManagement';
import PaymentManagement from './components/PaymentManagement';
import CustomerManagement from './components/CustomerManagement';
import VendorManagement from './components/VendorManagement';
import CRM from './components/CRM';
import Manufacturing from './components/Manufacturing';
import ProjectManagement from './components/ProjectManagement';
import FleetManagement from './components/FleetManagement';
import QualityControl from './components/QualityControl';
import DocumentManagement from './components/DocumentManagement';
import CompanySetup from './components/CompanySetup';
import SaaSManager from './components/SaaSManager';
import Helpdesk from './components/Helpdesk';
import InventoryAdjustment from './components/InventoryAdjustment';
import StockTakeAudit from './components/StockTakeAudit';
import { 
  Settings2, 
  Plus, 
  Search, 
  AlertCircle,
  CheckCircle2,
  FileUp,
  Download,
  Lock,
  Clock
} from 'lucide-react';
import { API } from './services/api';
import InterBranchTransferPage from './components/InterBranchTransferPage';
import { InventoryItem, Branch, Transaction, User, TransactionStatus, TransactionType, SystemSettings, UserRole, Xarun, Employee, Attendance, Payroll, XarunOrderRequest, XarunOrderItem, InterBranchTransferRequest, TransferStatus, Customer, Vendor, Sale, LedgerEntry, Account, PurchaseOrder, Payment, JournalEntry, Lead, BillOfMaterials, WorkOrder, Project, ProjectTask, Vehicle, FuelLog, QCInspection, DMSDocument, Ticket, Currency, InventoryAdjustment as AdjustmentType, StockTakeSession, StockTakeStatus } from './types';
import { getInventoryInsights } from './services/geminiService';
import { formatPlacement } from './services/mappingUtils';

type AdjustmentModalState = { item: InventoryItem; type: TransactionType.IN | TransactionType.OUT | TransactionType.MOVE } | null;

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
  const [selectedXarunId, setSelectedXarunId] = useState<string | undefined>(undefined);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
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
  const [importModalType, setImportModalType] = useState<'inventory' | 'customer' | 'vendor' | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [bulkReceiptData, setBulkReceiptData] = useState<{ transactions: Transaction[], type: TransactionType, branch: Branch | undefined, personnel: string, date: string } | null>(null);
  const [xarunOrders, setXarunOrders] = useState<XarunOrderRequest[]>([]);
  const [interBranchTransferRequests, setInterBranchTransferRequests] = useState<InterBranchTransferRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [dmsDocuments, setDmsDocuments] = useState<DMSDocument[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<AdjustmentType[]>([]);
  const [stockTakeSessions, setStockTakeSessions] = useState<StockTakeSession[]>([]);
  const [isAuditMode, setIsAuditMode] = useState(false);


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
      mainStoreId: '',
      zkDeviceIp: '192.168.100.201',
      zkDevicePort: 4370,
      enabledFeatures: [
        'dashboard', 'inventory', 'pos', 'financials', 'hr', 'crm', 'mrp', 'projects', 'fleet', 'qc', 'dms', 'helpdesk', 'procurement', 'inter-branch', 'stock-take', 'saas'
      ]
    };
  });

  // Calculate Hardware URL dynamically based on current browser location
  const getHardwareUrl = () => {
    try {
      const hostname = window.location.hostname;
      if (!hostname) return 'http://localhost:5050';
      return `http://${hostname}:5050`;
    } catch (e) {
      return 'http://localhost:5050';
    }
  };
  const hardwareUrl = getHardwareUrl();

  const refreshAllData = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    
    const xarunIdFilter = user.role === UserRole.SUPER_ADMIN ? selectedXarunId : user.xarunId;
    
    try {
      // Use a safer approach: wrap each call in a try-catch or ensure fetchAllPages doesn't throw
      const [fXarumo, fItems, fBranches, fTransactions, fUsers, fEmployees, fPayrolls, fAttendance, fXarunOrders, fInterBranchTransferRequests, fCustomers, fVendors, fSales, fLedger, fAccounts, fPurchaseOrders, fPayments, fJournalEntries, fLeads, fBoMs, fWorkOrders, fProjects, fTasks, fVehicles, fFuel, fInspections, fDms, fTickets, fCurrencies, fAdjustments, fStockTakes] = await Promise.all([
        API.xarumo.getAll().catch(() => []),
        API.items.getAll().catch(() => []),
        API.branches.getAll().catch(() => []),
        API.transactions.getAll(xarunIdFilter).catch(() => []),
        API.users.getAll().catch(() => []),
        API.employees.getAll(user.role === UserRole.SUPER_ADMIN ? undefined : xarunIdFilter).catch(() => []),
        API.payroll.getAll().catch(() => []),
        API.attendance.getAll().catch(() => []),
        API.xarunOrders.getAll(xarunIdFilter).catch(() => []),
        API.interBranchTransferRequests.getAll(xarunIdFilter).catch(() => []),
        API.customers.getAll(xarunIdFilter).catch(() => []),
        API.vendors.getAll(xarunIdFilter).catch(() => []),
        API.sales.getAll(xarunIdFilter).catch(() => []),
        API.ledger.getAll(xarunIdFilter).catch(() => []),
        API.accounts.getAll(xarunIdFilter).catch(() => []),
        API.purchaseOrders.getAll(xarunIdFilter).catch(() => []),
        API.payments.getAll(xarunIdFilter).catch(() => []),
        API.journalEntries.getAll(xarunIdFilter).catch(() => []),
        API.crm.getAllLeads(xarunIdFilter).catch(() => []),
        API.mrp.getAllBoMs(xarunIdFilter).catch(() => []),
        API.mrp.getAllWorkOrders(xarunIdFilter).catch(() => []),
        API.projects.getAllProjects(xarunIdFilter).catch(() => []),
        API.projects.getAllTasks().catch(() => []),
        API.fleet.getAllVehicles(xarunIdFilter).catch(() => []),
        API.fleet.getFuelLogs().catch(() => []),
        API.qc.getAllInspections().catch(() => []),
        API.dms.getAllDocuments(xarunIdFilter).catch(() => []),
        API.helpdesk.getAllTickets(xarunIdFilter).catch(() => []),
        API.currencies.getAll().catch(() => []),
        API.inventoryAdjustments.getAll(xarunIdFilter).catch(() => []),
        API.stockTakeSessions.getAll(xarunIdFilter).catch(() => [])
      ]);

      setXarumo(fXarumo || []);
      setItems(fItems || []);
      setBranches(fBranches || []);
      setTransactions(fTransactions || []);
      setUsers(fUsers || []);
      setEmployees(fEmployees || []);
      setPayrolls(fPayrolls || []);
      setAttendance(fAttendance || []);
      setXarunOrders(fXarunOrders || []);
      setInterBranchTransferRequests(fInterBranchTransferRequests || []);
      setCustomers(fCustomers || []);
      setVendors(fVendors || []);
      setSales(fSales || []);
      setLedger(fLedger || []);
      setAccounts(fAccounts || []);
      setPurchaseOrders(fPurchaseOrders || []);
      setPayments(fPayments || []);
      setJournalEntries(fJournalEntries || []);
      setLeads(fLeads || []);
      setBoms(fBoMs || []);
      setWorkOrders(fWorkOrders || []);
      setProjects(fProjects || []);
      setProjectTasks(fTasks || []);
      setVehicles(fVehicles || []);
      setFuelLogs(fFuel || []);
      setInspections(fInspections || []);
      setDmsDocuments(fDms || []);
      setTickets(fTickets || []);
      setCurrencies(fCurrencies || []);
      setInventoryAdjustments(fAdjustments || []);
      setStockTakeSessions(fStockTakes || []);

      // Data Recovery Script for old localStorage keys
      if (fItems && fItems.length === 0) {
        const oldItemsStr = localStorage.getItem('stock_local_items') || localStorage.getItem('smartstock_items') || localStorage.getItem('stock_local_products');
        if (oldItemsStr) {
          try {
            const oldItems = JSON.parse(oldItemsStr);
            if (Array.isArray(oldItems) && oldItems.length > 0) {
              console.log("Recovering old items from localStorage...", oldItems.length);
              const success = await API.items.bulkSave(oldItems);
              if (success) {
                const updatedItems = await API.items.getAll();
                setItems(updatedItems || []);
              }
            }
          } catch (e) { console.error("Error recovering items", e); }
        }
      }

      if (fTransactions && fTransactions.length === 0) {
        const oldTransStr = localStorage.getItem('stock_local_transactions') || localStorage.getItem('smartstock_transactions');
        if (oldTransStr) {
          try {
            const oldTrans = JSON.parse(oldTransStr);
            if (Array.isArray(oldTrans) && oldTrans.length > 0) {
              console.log("Recovering old transactions from localStorage...", oldTrans.length);
              // Bulk save transactions
              for (const t of oldTrans) {
                await API.transactions.create(t);
              }
              const updatedTrans = await API.transactions.getAll(xarunIdFilter);
              setTransactions(updatedTrans || []);
            }
          } catch (e) { console.error("Error recovering transactions", e); }
        }
      }

      // QuickBooks Logic: Auto-setup accounts for new Xarun
      // Only run if we actually fetched accounts successfully (not an empty array from a catch)
      // and if we haven't already tried to setup in this session (simple flag)
      if (user && user.xarunId && fAccounts && fAccounts.length === 0 && !isBackground) {
        console.log("Setting up default QuickBooks accounts...");
        try {
          await API.accounts.setupDefaultAccounts(user.xarunId);
          // Refresh after setup to get the new accounts
          const updatedAccounts = await API.accounts.getAll(user.xarunId);
          setAccounts(updatedAccounts);
        } catch (e) {
          console.error("Failed to setup default accounts:", e);
        }
      }


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
  }, [user, refreshAllData, selectedXarunId]);

  // One-time migration for Bariire Hierarchy
  useEffect(() => {
    const runMigration = async () => {
      if (user?.role !== UserRole.SUPER_ADMIN || xarumo.length === 0) return;
      
      const bariireLocations = [
        "Bariire Bakaaro",
        "Ramadan Zoope",
        "Bakharka x,jajab",
        "Bin Ramadan",
        "Bariire Xamar weyne"
      ];

      const foundLocations = xarumo.filter(x => 
        bariireLocations.some(loc => loc.toLowerCase() === x.name.toLowerCase())
      );

      if (foundLocations.length > 0) {
        console.log("Running Bariire Hierarchy Migration...");
        try {
          let bariireCompany = xarumo.find(x => x.name.toLowerCase() === "bariire");
          if (!bariireCompany) {
            bariireCompany = await API.xarumo.save({
              name: "Bariire",
              location: "Mogadishu",
              status: 'ACTIVE',
              plan: 'PRO',
              currency: 'USD',
              createdAt: new Date().toISOString()
            } as Xarun);
          }

          const bariireId = bariireCompany.id;

          for (const loc of foundLocations) {
            // Create branch
            await API.branches.save({
              name: loc.name,
              location: loc.location || "Mogadishu",
              xarunId: bariireId,
              totalShelves: 10,
              totalSections: 5
            });

            // Update users
            const companyUsers = users.filter(u => u.xarunId === loc.id);
            for (const u of companyUsers) {
              await API.users.save({ ...u, xarunId: bariireId });
            }

            // Delete separate company
            await API.xarumo.delete(loc.id);
          }
          refreshAllData(true);
        } catch (e) {
          console.error("Migration failed:", e);
        }
      }
    };

    runMigration();
  }, [user, xarumo, users, refreshAllData]);

  const handleApprove = async (t: Transaction) => {
    const item = items.find(i => i.id === t.itemId);
    if (!item) return;

    // Apply the transaction effect to stock
    let newQty = item.quantity;
    if (t.type === TransactionType.IN) newQty += t.quantity;
    else if (t.type === TransactionType.OUT) newQty -= t.quantity;
    else if (t.type === TransactionType.TRANSFER) newQty -= t.quantity;

    try {
      await API.items.save({ ...item, quantity: newQty });
      await API.transactions.update(t.id, { status: TransactionStatus.APPROVED, approvedBy: user?.id });
      refreshAllData(true);
      setReceiptTransaction(t);
    } catch (err) {
      alert("Cilad ayaa dhacday ogolaanshaha!");
    }
  };

  const handleReject = async (id: string) => {
    if(!confirm("Ma hubtaa inaad diido rarkan?")) return;
    try {
      await API.transactions.update(id, { status: TransactionStatus.REJECTED });
      refreshAllData(true);
    } catch (err) {
      alert("Cilad ayaa dhacday diidmada!");
    }
  };

  const handleLogin = (u: User, isAudit: boolean = false) => {
    setUser(u);
    setIsAuditMode(isAudit);
    if (u.role === UserRole.SUPER_ADMIN) {
      setActiveTab('saas-manager');
    } else {
      setActiveTab('dashboard');
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderMainContent = () => {
    // Check if branch is locked for audit
    const activeAudit = stockTakeSessions.find(s => 
      s.xarunId === user.xarunId && 
      (s.status === StockTakeStatus.OPEN || s.status === StockTakeStatus.IN_PROGRESS)
    );

    const isLocked = !!activeAudit;
    const lockedTabs = ['pos', 'inventory', 'inventory-adjustment', 'approvals', 'inter-branch-transfers', 'purchases', 'procurement', 'mrp'];

    if (isLocked && lockedTabs.includes(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center p-10 bg-white rounded-[3rem] shadow-sm border border-slate-100">
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl animate-bounce">
            <Lock size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Xarunta waa xiran tahay (Locked)</h2>
          <p className="text-slate-500 max-w-md font-bold">
            Xaruntan waxaa ka socda xisaab-xir (Year-End Audit). Dhammaan dhaqdhaqaaqyada alaabta waa la hakiyey ilaa laga dhammaystiro xisaabta.
          </p>
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Clock size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Audit Session</p>
              <p className="text-sm font-black text-slate-900">Started by {activeAudit.createdBy}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('stock-take')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Go to Audit Page
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} items={items} transactions={transactions} insights={insights} branches={branches} settings={settings} />;
      case 'inventory':
        return (
          <InventoryList 
            user={user}
            items={items} branches={branches} 
            initialBranchFilter={selectedBranchId}
            onAdd={() => { setEditingItem(null); setIsItemFormOpen(true); }} 
            onImport={() => setImportModalType('inventory')} 
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
                  }
                } catch (err) { alert("Cilad tirtiridda!"); }
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
        );
      case 'stock-take':
        return <StockTakeAudit user={user} inventory={items} sessions={stockTakeSessions} onRefresh={refreshAllData} />;
      case 'inventory-adjustment':
        return <InventoryAdjustment user={user} inventory={items} adjustments={inventoryAdjustments} onRefresh={refreshAllData} />;
      case 'approvals':
        return <ApprovalQueue transactions={transactions} onApprove={handleApprove} onReject={handleReject} />;
      case 'transactions':
        return <TransactionHistory transactions={transactions} branches={branches} items={items} sales={sales} settings={settings} onRefresh={refreshAllData} />;
      case 'map':
        return <WarehouseMap user={user} items={items} branches={branches} initialBranchId={selectedBranchId} onRefresh={refreshAllData} />;
      case 'inter-branch-transfers':
        return (
          <InterBranchTransferPage 
            user={user} 
            xarumo={xarumo}
            myBranches={branches}
            items={items} 
            interBranchTransferRequests={interBranchTransferRequests}
            onRefresh={refreshAllData} 
            onUpdateTransfer={async (transferId: string, updates: Partial<InterBranchTransferRequest>) => { await API.interBranchTransferRequests.update(transferId, updates); refreshAllData(true); }}
            onDeleteTransfer={async (transferId: string) => { await API.interBranchTransferRequests.delete(transferId); refreshAllData(true); }}
          />
        );
      case 'procurement':
        return (
          <LogisticsProcurement 
            user={user} 
            masterItems={items} 
            buyers={users.filter(u => u.role === UserRole.BUYER)} 
            settings={settings}
            branches={branches}
            onRefresh={refreshAllData}
          />
        );
      case 'xarumo':
        return (
          <XarunList 
            xarumo={xarumo}
            onAdd={() => { setEditingXarun(null); setIsXarunFormOpen(true); }}
            onEdit={(x) => { setEditingXarun(x); setIsXarunFormOpen(true); }}
            onDelete={async (id) => { await API.xarumo.delete(id); refreshAllData(); }}
            onSelectXarun={(id) => {
              setSelectedXarunId(id);
              setActiveTab('bakhaarada');
            }}
          />
        );
      case 'bakhaarada':
        return (
          <BakhaarList 
            branches={user.role === UserRole.SUPER_ADMIN ? branches : branches.filter(b => b.xarunId === user.xarunId)} 
            xarumo={xarumo} 
            filterXarunId={selectedXarunId || null} 
            onClearFilter={() => setSelectedXarunId(undefined)} 
            onAdd={() => { setEditingBranch(null); setIsBranchFormOpen(true); }} 
            onEdit={(b) => { setEditingBranch(b); setIsBranchFormOpen(true); }} 
            onDelete={async (id) => { await API.branches.delete(id); refreshAllData(); }} 
            onViewInventory={(branchId) => {
              setSelectedBranchId(branchId);
              setActiveTab('inventory');
            }}
            onViewMap={(branchId) => {
              setSelectedBranchId(branchId);
              setActiveTab('map');
            }}
          />
        );
      case 'hr-employees':
        return (
          <HRMEmployeeManagement 
            employees={employees} 
            branches={branches} 
            xarumo={xarumo} 
            attendance={attendance} 
            payrolls={payrolls} 
            settings={settings}
            hardwareUrl={hardwareUrl}
            onAdd={() => { setEditingEmployee(null); setIsEmployeeFormOpen(true); }} 
            onEdit={(e) => { setEditingEmployee(e); setIsEmployeeFormOpen(true); }} 
            onDelete={async (id) => { await API.employees.delete(id); refreshAllData(); }} 
          />
        );
      case 'hr-attendance':
        return <HRMAttendanceTracker employees={employees} xarumo={xarumo} hardwareUrl={hardwareUrl} />;
      case 'hr-payroll':
        return <HRMPayroll employees={employees} xarumo={xarumo} />;
      case 'hr-reports':
        return <HRMReports employees={employees} attendance={attendance} payrolls={payrolls} xarumo={xarumo} />;
      case 'users':
        return (
          <UserManagement 
            users={users} 
            xarumo={xarumo} 
            onAdd={() => { setEditingUser(null); setIsUserFormOpen(true); }} 
            onEdit={(u) => { setEditingUser(u); setIsUserFormOpen(true); }} 
            onSwitchUser={(u) => {
              setUser(u);
              localStorage.setItem('smartstock_user', JSON.stringify(u));
              setActiveTab('dashboard');
            }} 
          />
        );
      case 'pos':
        return <POS mode="pos" user={user} items={items} customers={customers} branches={branches} xarumo={xarumo} onRefresh={refreshAllData} settings={settings} />;
      case 'invoice':
        return <POS mode="invoice" user={user} items={items} customers={customers} branches={branches} xarumo={xarumo} onRefresh={refreshAllData} settings={settings} />;
      case 'customers':
        return (
          <CustomerManagement 
            user={user} 
            customers={customers} 
            sales={sales} 
            payments={payments} 
            onRefresh={refreshAllData} 
            settings={settings} 
            branches={branches} 
            onImport={() => setImportModalType('customer')}
          />
        );
      case 'vendors':
        return (
          <VendorManagement 
            user={user} 
            vendors={vendors} 
            purchaseOrders={purchaseOrders} 
            payments={payments} 
            onRefresh={refreshAllData} 
            onImport={() => setImportModalType('vendor')}
          />
        );
      case 'purchases':
        return <PurchaseManagement user={user} vendors={vendors} items={items} purchaseOrders={purchaseOrders} branches={branches} settings={settings} onRefresh={refreshAllData} />;
      case 'payments':
        return <PaymentManagement user={user} payments={payments} accounts={accounts} onRefresh={refreshAllData} />;
      case 'financials':
        return <Financials user={user} ledger={ledger} sales={sales} accounts={accounts} journalEntries={journalEntries} isAuditMode={isAuditMode} onRefresh={refreshAllData} settings={settings} items={items} />;
      case 'crm':
        return <CRM leads={leads} users={users} currentUser={user} onRefresh={refreshAllData} />;
      case 'mrp':
        return <Manufacturing boms={boms} workOrders={workOrders} items={items} currentUser={user} onRefresh={refreshAllData} />;
      case 'projects':
        return <ProjectManagement projects={projects} tasks={projectTasks} users={users} currentUser={user} onRefresh={refreshAllData} />;
      case 'fleet':
        return <FleetManagement vehicles={vehicles} fuelLogs={fuelLogs} users={users} currentUser={user} onRefresh={refreshAllData} />;
      case 'qc':
        return <QualityControl inspections={inspections} users={users} currentUser={user} onRefresh={refreshAllData} />;
      case 'dms':
        return <DocumentManagement documents={dmsDocuments} currentUser={user} onRefresh={refreshAllData} />;
      case 'saas-manager':
        return (
          <SaaSManager 
            xarumo={xarumo} 
            users={users} 
            onRefresh={refreshAllData} 
            onSelectCompany={(id) => {
              setSelectedXarunId(id);
              setActiveTab('dashboard');
            }}
          />
        );
      case 'company-setup':
        return (
          <CompanySetup 
            settings={settings} 
            onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} 
            currentUser={user!}
            documents={dmsDocuments}
            onRefresh={refreshAllData}
            xarumo={xarumo}
            onUpdateXarun={async (x) => { 
              try {
                await API.xarumo.save(x); 
                refreshAllData(true); 
              } catch (err: any) {
                alert("Khalad ayaa dhacay markii la cusboonaysiinayay xarunta: " + err.message);
              }
            }}
          />
        );
      case 'helpdesk':
        return <Helpdesk tickets={tickets} users={users} currentUser={user} onRefresh={refreshAllData} />;
      case 'settings':
        return (
          <Settings 
            settings={settings} 
            onSave={(s) => { setSettings(s); localStorage.setItem('smartstock_settings', JSON.stringify(s)); }} 
            onResetData={() => {}} 
            items={items} 
            branches={branches}
            xarumo={xarumo}
            transactions={transactions}
            users={users}
            employees={employees}
            attendance={attendance}
            payrolls={payrolls}
          />
        );
      default:
        return <Dashboard user={user} items={items} transactions={transactions} insights={insights} branches={branches} settings={settings} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={() => setUser(null)} 
        systemName={settings.systemName || "Bariire Building Material"} lowStockCount={items.filter(i => i.quantity <= i.minThreshold).length} 
        pendingApprovalsCount={transactions.filter(t => t.status === TransactionStatus.PENDING).length}
        interBranchTransferCount={interBranchTransferRequests.filter(t => t.status === TransferStatus.REQUESTED && t.targetXarunId === user.xarunId).length}
        isAuditMode={isAuditMode}
        enabledFeatures={settings.enabledFeatures}
        xarumo={xarumo}
        selectedXarunId={selectedXarunId}
        onSelectXarun={setSelectedXarunId}
      >
        {renderMainContent()}
      </Layout>

      {/* FORM MODALS */}
      {isUserFormOpen && <UserForm xarumo={xarumo} editingUser={editingUser} onSave={async (u) => { await API.users.save(u); setIsUserFormOpen(false); refreshAllData(); }} onCancel={() => setIsUserFormOpen(false)} />}
      {isXarunFormOpen && <XarunForm editingXarun={editingXarun} onSave={async (x) => { 
        try {
          await API.xarumo.save(x); 
          setIsXarunFormOpen(false); 
          refreshAllData(); 
        } catch (err: any) {
          alert("Khalad ayaa dhacay markii la kaydinayay xarunta: " + err.message);
        }
      }} onCancel={() => setIsXarunFormOpen(false)} />}
      {isBranchFormOpen && <BranchForm xarumo={xarumo} user={user} editingBranch={editingBranch} onSave={async (b) => { await API.branches.save(b); setIsBranchFormOpen(false); refreshAllData(); }} onCancel={() => setIsBranchFormOpen(false)} />}
      {isItemFormOpen && <InventoryForm branches={branches} editingItem={editingItem} onSave={async (item, updateAll) => { 
        // FIX: Ensure xarunId is set based on the selected branch
        const selectedBranch = branches.find(b => b.id === item.branchId);
        const validXarunId = selectedBranch?.xarunId || user.xarunId || '';
        const itemWithXarun = { ...item, xarunId: validXarunId };
        
        if (!editingItem && updateAll && item.sku) {
            // New item, add to all branches
            for (const b of branches) {
                await API.items.save({
                    ...itemWithXarun,
                    branchId: b.id,
                    xarunId: b.xarunId || validXarunId
                });
            }
        } else {
            await API.items.save(itemWithXarun); 

            if (updateAll && item.sku) {
                // Find all other items with same SKU and update their master details
                const relatedItems = items.filter(i => i.sku === item.sku && i.id !== item.id);
                for (const related of relatedItems) {
                    await API.items.save({
                        ...related,
                        name: item.name,
                        category: item.category,
                        supplier: item.supplier,
                        packType: item.packType,
                        minThreshold: item.minThreshold,
                        lastKnownPrice: item.lastKnownPrice,
                        landedCost: item.landedCost
                    });
                }
            }
        }

        setIsItemFormOpen(false); 
        refreshAllData(); 
      }} onCancel={() => setIsItemFormOpen(false)} />}
      {isEmployeeFormOpen && <EmployeeForm branches={branches} xarumo={xarumo} editingEmployee={editingEmployee} onSave={async (emp) => { await API.employees.save(emp); setIsEmployeeFormOpen(false); refreshAllData(); }} onCancel={() => setIsEmployeeFormOpen(false)} />}
      


      {adjustmentModal && (
        <StockAdjustmentModal 
          item={adjustmentModal.item} 
          branches={branches} 
          type={adjustmentModal.type}
          userRole={user.role} // Pass prop
          onSave={async (data) => { 
            const type = adjustmentModal.type;
            const item = adjustmentModal.item;
            
            // Logic for status: IF (OUT or MOVE) and NOT privileged, must be PENDING. Otherwise APPROVED.
            const isPrivileged = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER;
            const status = ((type === TransactionType.OUT || type === TransactionType.MOVE) && !isPrivileged) ? TransactionStatus.PENDING : TransactionStatus.APPROVED;
            
            // CRITICAL FIX: Ensure XarunID is retrieved from the BRANCH, not just the user.
            const targetBranch = branches.find(b => b.id === data.branchId);
            const validXarunId = targetBranch?.xarunId || user.xarunId || '';

            const trans = await API.transactions.create({
              itemId: item.id,
              itemName: item.name,
              type: type,
              quantity: data.qty,
              unitCost: data.unitCost,
              branchId: data.branchId,
              personnel: data.personnel,
              originOrSource: data.source,
              placementInfo: data.placement,
              status: status,
              requestedBy: user.id,
              xarunId: validXarunId // Uses Branch Xarun ID to ensure visibility
            });

            // If Approved (IN always approved, OUT approved for Admin), update stock
            if (status === TransactionStatus.APPROVED) {
                const targetBranchId = data.branchId;
                const sourceItem = adjustmentModal.item;
                
                // Find if the item exists in the target branch (by SKU)
                // We use the 'items' state which contains all items
                const existingTargetItem = items.find(i => i.sku === sourceItem.sku && i.branchId === targetBranchId);

                if (type === TransactionType.IN) {
                    if (existingTargetItem) {
                        // Update existing item in target branch
                        await API.items.save({ 
                            ...existingTargetItem, 
                            quantity: existingTargetItem.quantity + data.qty,
                            shelves: data.shelf || existingTargetItem.shelves,
                            sections: data.section || existingTargetItem.sections
                        });
                    } else {
                        // Create new item in target branch
                        const foundTargetBranch = branches.find(b => b.id === targetBranchId);
                        await API.items.save({
                            name: sourceItem.name,
                            category: sourceItem.category,
                            sku: sourceItem.sku,
                            quantity: data.qty,
                            branchId: targetBranchId,
                            minThreshold: sourceItem.minThreshold,
                            xarunId: foundTargetBranch?.xarunId || user.xarunId || '',
                            shelves: data.shelf || 1,
                            sections: data.section || 1,
                            packType: sourceItem.packType,
                            supplier: sourceItem.supplier,
                            lastKnownPrice: sourceItem.lastKnownPrice,
                            landedCost: sourceItem.landedCost
                        });
                    }
                } else if (type === TransactionType.OUT || type === TransactionType.MOVE) {
                    if (existingTargetItem) {
                        if (type === TransactionType.OUT && existingTargetItem.quantity < data.qty) {
                            alert(`Error: Not enough stock in ${branches.find(b => b.id === targetBranchId)?.name}. Available: ${existingTargetItem.quantity}`);
                            return;
                        }
                        
                        const updates: any = { ...existingTargetItem };
                        if (type === TransactionType.OUT) {
                            updates.quantity = existingTargetItem.quantity - data.qty;
                        } else if (type === TransactionType.MOVE && data.shelf !== undefined && data.section !== undefined) {
                            updates.shelves = data.shelf;
                            updates.sections = data.section;
                        }
                        
                        await API.items.save(updates);
                    } else {
                        alert(`Error: Item "${sourceItem.name}" does not exist in the selected branch.`);
                        return;
                    }
                }
                
                setReceiptTransaction(trans); // Show receipt
            } else {
                alert("Codsiga bixinta waa la diray. Sug ogolaanshaha Admin-ka.");
            }

            setAdjustmentModal(null); 
            refreshAllData(true); // Force update to show new request in queues if visible
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
            // FIX: Get correct xarunId from source branch
            const sourceBranch = branches.find(b => b.id === item.branchId);
            const validXarunId = sourceBranch?.xarunId || user.xarunId || '';

            const trans = await API.transactions.create({
              itemId: item.id,
              itemName: item.name,
              type: TransactionType.TRANSFER,
              quantity: data.qty,
              branchId: item.branchId,
              targetBranchId: data.targetBranchId,
              personnel: data.personnel,
              originOrSource: `To: ${branches.find(b=>b.id===data.targetBranchId)?.name}`,
              placementInfo: `Target: ${formatPlacement(data.targetShelf, data.targetSection)}`,
              notes: data.notes,
              status: TransactionStatus.PENDING,
              requestedBy: user.id,
              xarunId: validXarunId
            });
            setTransferModalItem(null);
            refreshAllData(true);
            alert("Transfer request sent for approval!");
          }}
        />
      )}

      {receiptTransaction && (
        <TransactionReceipt 
            transaction={receiptTransaction} 
            item={items.find(i => i.id === receiptTransaction.itemId)}
            branch={branches.find(b => b.id === receiptTransaction.branchId)}
            issuedBy={user.name}
            onClose={() => setReceiptTransaction(null)}
        />
      )}

      {historyModalItem && <ItemMovementHistoryModal item={historyModalItem} transactions={transactions} branches={branches} onClose={() => setHistoryModalItem(null)} />}
      {importModalType && (
        <ImportModal 
          type={importModalType}
          branches={branches} 
          xarumo={xarumo}
          userXarunId={user.xarunId} 
          onImport={async (data) => { 
            let success = false;
            if (importModalType === 'inventory') {
              success = await API.items.bulkSave(data);
            } else if (importModalType === 'customer') {
              success = await API.customers.bulkSave(data);
            } else if (importModalType === 'vendor') {
              success = await API.vendors.bulkSave(data);
            }
            
            if (success) { 
              setImportModalType(null); 
              refreshAllData(); 
            } 
            return success; 
          }} 
          onCancel={() => setImportModalType(null)} 
        />
      )}
      {isBulkModalOpen && <BulkTransactionModal items={items} branches={branches} onSave={async (type, data) => { 
          // FIX: Get correct xarunId from the selected branch for bulk ops
          const targetBranch = branches.find(b => b.id === data.branchId);
          const validXarunId = targetBranch?.xarunId || user.xarunId || '';
          const isPrivileged = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGER;

          if (type === 'MOVE') {
              for (const row of data.items) {
                  const item = items.find(i => i.id === row.itemId);
                  if (item && row.shelf !== undefined && row.section !== undefined) {
                      await API.items.save({
                          ...item,
                          shelves: row.shelf,
                          sections: row.section
                      });
                  }
              }
              setIsBulkModalOpen(false);
              refreshAllData(true);
              alert("Goobaha alaabta waa la bedelay!");
              return;
          }

          const createdTransactions: Transaction[] = [];

          for (const row of data.items) {
              const item = items.find(i => i.id === row.itemId);
              if (item) {
                const status = (type === TransactionType.OUT && !isPrivileged) ? TransactionStatus.PENDING : TransactionStatus.APPROVED;
                
                const newTrans = await API.transactions.create({
                  itemId: item.id, itemName: item.name, type: type as TransactionType, quantity: row.qty, branchId: data.branchId, 
                  personnel: data.personnel, originOrSource: data.source, notes: data.notes, status: status, 
                  requestedBy: user.id, xarunId: validXarunId
                });
                createdTransactions.push(newTrans);
                
                if (status === TransactionStatus.APPROVED) {
                    let newQty = item.quantity;
                    if (type === TransactionType.IN) newQty += row.qty;
                    else if (type === TransactionType.OUT) newQty -= row.qty;
                    await API.items.save({ ...item, quantity: newQty });
                }
              }
          }
          setIsBulkModalOpen(false); 
          refreshAllData(true); 
          
          if (createdTransactions.length > 0) {
             setBulkReceiptData({
                transactions: createdTransactions,
                type: type as TransactionType,
                branch: targetBranch,
                personnel: data.personnel,
                date: data.date
             });
          } else {
             alert(type === TransactionType.OUT && !isPrivileged ? "Bulk OUT requests sent for approval!" : "Bulk Operation Processed!");
          }
      }} onCancel={() => setIsBulkModalOpen(false)} />}

      {bulkReceiptData && (
        <BulkTransactionReceipt 
          transactions={bulkReceiptData.transactions}
          branch={bulkReceiptData.branch}
          type={bulkReceiptData.type}
          personnel={bulkReceiptData.personnel}
          date={bulkReceiptData.date}
          issuedBy={user.name}
          onClose={() => setBulkReceiptData(null)}
        />
      )}
    </>
  );
};

export default App;
