
import React, { useMemo, useState } from 'react';
import { LedgerEntry, Sale, User, UserRole, Account, AccountType, JournalEntry, AuditLog, SystemSettings, InventoryItem } from '../types';
import { API } from '../services/api';
import DocumentViewer from './DocumentViewer';
import { 
  BarChart3, 
  Wallet, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  PieChart, 
  ListTree, 
  History,
  Download,
  Filter,
  Search,
  BookOpen
} from 'lucide-react';
import JournalEntries from './JournalEntries';

interface FinancialsProps {
  user: User;
  ledger: LedgerEntry[];
  sales: Sale[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  isAuditMode: boolean;
  onRefresh: () => void;
  settings?: SystemSettings;
  items: InventoryItem[];
}

type TabType = 'dashboard' | 'sales' | 'ledger' | 'income' | 'balance' | 'cashflow' | 'coa' | 'journal' | 'audit' | 'aging';

const Financials: React.FC<FinancialsProps> = ({ user, ledger, sales, accounts, journalEntries, isAuditMode, onRefresh, settings, items }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{ type: 'INVOICE' | 'QUOTATION' | 'SALES_ORDER', data: Partial<Sale> } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  React.useEffect(() => {
    if (activeTab === 'audit') {
      API.auditLogs.getAll(user.xarunId).then(setAuditLogs);
    }
  }, [activeTab, user.xarunId]);

  const filteredSales = useMemo(() => {
    if (isAuditMode) return sales.filter(s => s.isVatSale);
    return sales;
  }, [sales, isAuditMode]);

  const filteredLedger = useMemo(() => {
    let data = ledger;
    if (isAuditMode) {
      const vatSaleIds = new Set(sales.filter(s => s.isVatSale).map(s => s.id));
      data = ledger.filter(l => 
        vatSaleIds.has(l.referenceId) || l.accountCode === '2000' // VAT Payable
      );
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(l => 
        l.description.toLowerCase().includes(lowerSearch) || 
        l.accountName.toLowerCase().includes(lowerSearch) ||
        l.accountCode.includes(lowerSearch)
      );
    }
    
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, sales, isAuditMode, searchTerm]);

  // --- REPORT CALCULATIONS ---

  const incomeStatement = useMemo(() => {
    const revenue = accounts
      .filter(a => a.type === AccountType.INCOME || a.type === AccountType.OTHER_INCOME)
      .reduce((sum, a) => sum + a.balance, 0);

    const cogs = accounts
      .filter(a => a.type === AccountType.COST_OF_GOODS_SOLD)
      .reduce((sum, a) => sum + a.balance, 0);

    const expenses = accounts
      .filter(a => a.type === AccountType.EXPENSE || a.type === AccountType.OTHER_EXPENSE)
      .reduce((sum, a) => sum + a.balance, 0);

    return { revenue, cogs, grossProfit: revenue - cogs, expenses, netIncome: revenue - cogs - expenses };
  }, [accounts]);

  const balanceSheet = useMemo(() => {
    const assets = accounts
      .filter(a => [AccountType.BANK, AccountType.ACCOUNTS_RECEIVABLE, AccountType.INVENTORY_ASSET, AccountType.OTHER_CURRENT_ASSET, AccountType.FIXED_ASSET].includes(a.type))
      .reduce((sum, a) => sum + a.balance, 0);

    const liabilities = accounts
      .filter(a => [AccountType.ACCOUNTS_PAYABLE, AccountType.OTHER_CURRENT_LIABILITY, AccountType.LONG_TERM_LIABILITY].includes(a.type))
      .reduce((sum, a) => sum + a.balance, 0);

    const equity = accounts
      .filter(a => a.type === AccountType.EQUITY)
      .reduce((sum, a) => sum + a.balance, 0);

    // Retained Earnings (Net Income from all periods)
    const retainedEarnings = incomeStatement.netIncome;

    return { 
      assets, 
      liabilities, 
      equity: equity + retainedEarnings, 
      totalLiabilitiesEquity: liabilities + equity + retainedEarnings,
      inventoryValue: accounts.find(a => a.code === '1300')?.balance || 0,
      arValue: accounts.find(a => a.code === '1200')?.balance || 0,
      apValue: accounts.find(a => a.code === '2100')?.balance || 0
    };
  }, [accounts, incomeStatement]);

  const cashFlow = useMemo(() => {
    const cashIn = filteredLedger
      .filter(l => (l.accountCode === '1000' || l.accountCode === '1100') && l.type === 'DEBIT')
      .reduce((sum, l) => sum + l.amount, 0);

    const cashOut = filteredLedger
      .filter(l => (l.accountCode === '1000' || l.accountCode === '1100') && l.type === 'CREDIT')
      .reduce((sum, l) => sum + l.amount, 0);

    return { cashIn, cashOut, netCash: cashIn - cashOut };
  }, [filteredLedger]);

  const agingReport = useMemo(() => {
    const now = new Date();
    const categories = {
      fresh: { label: '0-30 Days', items: [] as InventoryItem[], value: 0 },
      stable: { label: '31-90 Days', items: [] as InventoryItem[], value: 0 },
      slow: { label: '91-180 Days', items: [] as InventoryItem[], value: 0 },
      stagnant: { label: '180+ Days', items: [] as InventoryItem[], value: 0 },
    };

    items.forEach(item => {
      const lastUpdate = new Date(item.lastUpdated);
      const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      const value = (item.landedCost || item.lastKnownPrice || 0) * item.quantity;

      if (diffDays <= 30) {
        categories.fresh.items.push(item);
        categories.fresh.value += value;
      } else if (diffDays <= 90) {
        categories.stable.items.push(item);
        categories.stable.value += value;
      } else if (diffDays <= 180) {
        categories.slow.items.push(item);
        categories.slow.value += value;
      } else {
        categories.stagnant.items.push(item);
        categories.stagnant.value += value;
      }
    });

    return categories;
  }, [items]);

  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
    const totalVat = filteredSales.reduce((sum, s) => sum + s.vatAmount, 0);
    const totalCash = filteredLedger.filter(l => l.accountCode === '1000').reduce((sum, l) => l.type === 'DEBIT' ? sum + l.amount : sum - l.amount, 0);
    const totalBank = filteredLedger.filter(l => l.accountCode === '1100').reduce((sum, l) => l.type === 'DEBIT' ? sum + l.amount : sum - l.amount, 0);
    
    return { totalSales, totalVat, totalCash, totalBank };
  }, [filteredSales, filteredLedger]);

  const arApAging = useMemo(() => {
    const now = new Date();
    const ar = { current: 0, late: 0 };
    const ap = { current: 0, late: 0 };

    sales.filter(s => s.paymentMethod === 'CREDIT').forEach(s => {
      const diffDays = Math.floor((now.getTime() - new Date(s.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) ar.late += s.total;
      else ar.current += s.total;
    });

    // Simple AP logic: if PO is ARRIVED but not COMPLETED, it's likely a liability
    // (In a real system, we'd check against actual Bills/Payments)
    // For now, we'll use the Vendor balances as the source of truth for total, 
    // and POs for aging distribution.
    return { ar, ap };
  }, [sales]);

  const renderSales = () => (
    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sales Invoices & Documents</h3>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search invoices..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice #</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.filter(s => 
              s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
              s.id.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(sale => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-sm font-bold text-slate-600">{new Date(sale.timestamp).toLocaleDateString()}</td>
                <td className="p-6 text-sm font-black text-slate-800 uppercase">{sale.id.slice(0, 8)}</td>
                <td className="p-6 text-sm font-black text-slate-800 uppercase">{sale.customerName}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    sale.type === 'QUOTATION' ? 'bg-emerald-50 text-emerald-600' :
                    sale.type === 'SALES_ORDER' ? 'bg-amber-50 text-amber-600' :
                    sale.type === 'CREDIT_MEMO' ? 'bg-rose-50 text-rose-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {sale.type || 'SALE'}
                  </span>
                </td>
                <td className="p-6 text-sm font-black text-slate-900">${sale.total.toLocaleString()}</td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setViewingDocument({ 
                      type: sale.type === 'QUOTATION' ? 'QUOTATION' : sale.type === 'SALES_ORDER' ? 'SALES_ORDER' : 'INVOICE', 
                      data: sale 
                    })}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                  >
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-slate-900 transition-all duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
              <BarChart3 size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12%</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-slate-900">${incomeStatement.revenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-500 transition-all duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <PieChart size={20} />
            </div>
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">VAT</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VAT Payable</p>
          <p className="text-3xl font-black text-indigo-600">${stats.totalVat.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Income</p>
          <p className={`text-3xl font-black ${incomeStatement.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${incomeStatement.netIncome.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-blue-500 transition-all duration-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
          <p className="text-3xl font-black text-blue-600">${balanceSheet.assets.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
            <Wallet className="text-indigo-500" /> Receivables Aging
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-[2rem]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current (0-30 Days)</p>
              <p className="text-xl font-black text-slate-900">${arApAging.ar.current.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-rose-50 rounded-[2rem]">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Overdue (30+ Days)</p>
              <p className="text-xl font-black text-rose-600">${arApAging.ar.late.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[8px] text-slate-400 italic mt-4 uppercase tracking-widest font-black">* Based on unpaid credit sales</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
            <ArrowUpRight className="text-emerald-500" /> Revenue vs Expenses
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                <span className="text-slate-400">Revenue</span>
                <span className="text-slate-900">${incomeStatement.revenue.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                <span className="text-slate-400">Expenses</span>
                <span className="text-slate-900">${incomeStatement.expenses.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (incomeStatement.expenses / (incomeStatement.revenue || 1)) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
            <History className="text-indigo-500" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {filteredLedger.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${l.type === 'DEBIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {l.type === 'DEBIT' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">{l.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{l.accountName}</p>
                  </div>
                </div>
                <p className={`text-xs font-black ${l.type === 'DEBIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${l.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLedger = () => (
    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">General Ledger Entries</h3>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search entries..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
            <Filter size={18} />
          </button>
          <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
            <Download size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLedger.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-sm font-bold text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                <td className="p-6 text-sm font-black text-slate-800 uppercase">{entry.description}</td>
                <td className="p-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-900 uppercase">{entry.accountName}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{entry.accountCode}</span>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${entry.type === 'DEBIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {entry.type}
                  </span>
                </td>
                <td className={`p-6 text-sm font-black text-right ${entry.type === 'DEBIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${entry.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderIncomeStatement = () => (
    <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Income Statement</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">For the period ending {new Date().toLocaleDateString()}</p>
      </div>

      <div className="space-y-8">
        {/* Revenue */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
              <span>Sales Revenue</span>
              <span>${incomeStatement.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
              <span>Total Revenue</span>
              <span>${incomeStatement.revenue.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* COGS */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cost of Goods Sold</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
              <span>Inventory Cost</span>
              <span>(${incomeStatement.cogs.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
              <span>Total COGS</span>
              <span>(${incomeStatement.cogs.toLocaleString()})</span>
            </div>
          </div>
        </section>

        <div className="flex justify-between text-lg font-black text-slate-900 uppercase py-4 bg-slate-50 px-6 rounded-2xl">
          <span>Gross Profit</span>
          <span>${incomeStatement.grossProfit.toLocaleString()}</span>
        </div>

        {/* Expenses */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Operating Expenses</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
              <span>Operating Costs</span>
              <span>(${incomeStatement.expenses.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
              <span>Total Expenses</span>
              <span>(${incomeStatement.expenses.toLocaleString()})</span>
            </div>
          </div>
        </section>

        <div className={`flex justify-between text-2xl font-black uppercase p-8 rounded-[2rem] ${incomeStatement.netIncome >= 0 ? 'bg-emerald-900 text-white' : 'bg-rose-900 text-white'}`}>
          <span>Net Income</span>
          <span>${incomeStatement.netIncome.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Balance Sheet</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">As of {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Assets */}
        <div className="space-y-8">
          <section>
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Assets</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Assets</p>
                <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                  <span>Cash & Bank</span>
                  <span>${(stats.totalCash + stats.totalBank).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                  <span>Accounts Receivable</span>
                  <span>${balanceSheet.arValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                  <span>Inventory</span>
                  <span>${balanceSheet.inventoryValue.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
                <span>Total Assets</span>
                <span>${balanceSheet.assets.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Liabilities & Equity */}
        <div className="space-y-8">
          <section>
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Liabilities</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                <span>VAT Payable</span>
                <span>${stats.totalVat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                <span>Accounts Payable</span>
                <span>${balanceSheet.apValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
                <span>Total Liabilities</span>
                <span>${balanceSheet.liabilities.toLocaleString()}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Equity</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                <span>Owner Equity</span>
                <span>${(balanceSheet.equity - incomeStatement.netIncome).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                <span>Retained Earnings</span>
                <span>${incomeStatement.netIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
                <span>Total Equity</span>
                <span>${balanceSheet.equity.toLocaleString()}</span>
              </div>
            </div>
          </section>

          <div className="flex justify-between text-sm font-black text-white uppercase p-6 bg-slate-900 rounded-2xl">
            <span>Total Liab. & Equity</span>
            <span>${balanceSheet.totalLiabilitiesEquity.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Balance Check */}
      <div className="mt-12 p-4 bg-slate-50 rounded-2xl flex justify-center items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${Math.abs(balanceSheet.assets - balanceSheet.totalLiabilitiesEquity) < 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
          {Math.abs(balanceSheet.assets - balanceSheet.totalLiabilitiesEquity) < 1 
            ? 'Balance Sheet is Balanced' 
            : `Out of Balance by $${Math.abs(balanceSheet.assets - balanceSheet.totalLiabilitiesEquity).toLocaleString()}`}
        </p>
      </div>
    </div>
  );

  const renderCashFlow = () => (
    <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cash Flow Statement</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">For the period ending {new Date().toLocaleDateString()}</p>
      </div>

      <div className="space-y-12">
        <section>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 pb-2 border-b-2 border-slate-900">Operating Activities</h4>
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
              <span>Cash Received from Customers</span>
              <span className="text-emerald-600">+${cashFlow.cashIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
              <span>Cash Paid for Expenses/Suppliers</span>
              <span className="text-rose-600">(${cashFlow.cashOut.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 uppercase pt-4 border-t border-slate-100">
              <span>Net Cash from Operations</span>
              <span className={cashFlow.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                ${cashFlow.netCash.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Increase in Cash</p>
            <p className="text-3xl font-black">${cashFlow.netCash.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash at End of Period</p>
            <p className="text-3xl font-black">${(stats.totalCash + stats.totalBank).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCOA = () => (
    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Chart of Accounts</h3>
        <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Add Account</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map(account => (
              <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-sm font-black text-slate-900">{account.code}</td>
                <td className="p-6 text-sm font-black text-slate-800 uppercase">{account.name}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    [AccountType.BANK, AccountType.ACCOUNTS_RECEIVABLE, AccountType.INVENTORY_ASSET, AccountType.OTHER_CURRENT_ASSET, AccountType.FIXED_ASSET].includes(account.type) ? 'bg-blue-50 text-blue-600' :
                    [AccountType.ACCOUNTS_PAYABLE, AccountType.OTHER_CURRENT_LIABILITY, AccountType.LONG_TERM_LIABILITY].includes(account.type) ? 'bg-rose-50 text-rose-600' :
                    account.type === AccountType.EQUITY ? 'bg-purple-50 text-purple-600' :
                    [AccountType.INCOME, AccountType.OTHER_INCOME].includes(account.type) ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {account.type}
                  </span>
                </td>
                <td className="p-6 text-sm font-black text-slate-900 text-right">
                  ${account.balance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAgingReport = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Object.entries(agingReport).map(([key, cat]) => (
          <div key={key} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat.label}</p>
            <p className="text-2xl font-black text-slate-900">${cat.value.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{cat.items.length} SKUs</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Slow Moving & Stagnant Stock (90+ Days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Movement</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...agingReport.slow.items, ...agingReport.stagnant.items].map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 text-sm font-black text-slate-800 uppercase">{item.name}</td>
                  <td className="p-6 text-sm font-bold text-slate-600">{item.sku}</td>
                  <td className="p-6 text-sm font-black text-slate-900">{item.quantity}</td>
                  <td className="p-6 text-sm font-bold text-slate-400">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                  <td className="p-6 text-sm font-black text-slate-900 text-right">
                    ${((item.landedCost || item.lastKnownPrice || 0) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
              {agingReport.slow.items.length === 0 && agingReport.stagnant.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    No stagnant stock found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Audit Logs</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking all entity changes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-xs font-bold text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-6 text-xs font-black text-slate-900 uppercase">{log.userName}</td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                    log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                    log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.entityType}</td>
                <td className="p-6 text-xs font-medium text-slate-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            {isAuditMode ? 'Audit Financial Report' : 'Financial Accounting'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Complete ERP Financial Management System</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'sales', label: 'Sales', icon: FileText },
            { id: 'ledger', label: 'Ledger', icon: History },
            { id: 'journal', label: 'Journal', icon: BookOpen },
            { id: 'income', label: 'Income', icon: FileText },
            { id: 'balance', label: 'Balance', icon: Building2 },
            { id: 'cashflow', label: 'Cash Flow', icon: Wallet },
            { id: 'coa', label: 'Accounts', icon: ListTree },
            { id: 'aging', label: 'Stock Aging', icon: PieChart },
            { id: 'audit', label: 'Audit Logs', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105' 
                  : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Mode Banner */}
      {isAuditMode && (
        <div className="bg-rose-900 p-6 rounded-[2rem] flex items-center justify-between text-white shadow-xl shadow-rose-100 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">🛡️</div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Audit Mode Active</p>
              <p className="text-[10px] font-bold text-rose-200 uppercase tracking-widest">Displaying only VAT-compliant transactions</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Verified</div>
        </div>
      )}

      {/* Content */}
      <div className="pb-12">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'sales' && renderSales()}
        {activeTab === 'ledger' && renderLedger()}
        {activeTab === 'journal' && <JournalEntries user={user} accounts={accounts} journalEntries={journalEntries} onRefresh={onRefresh} closingDate={settings?.financialClosingDate} />}
        {activeTab === 'income' && renderIncomeStatement()}
        {activeTab === 'balance' && renderBalanceSheet()}
        {activeTab === 'cashflow' && renderCashFlow()}
        {activeTab === 'coa' && renderCOA()}
        {activeTab === 'aging' && renderAgingReport()}
        {activeTab === 'audit' && renderAuditLogs()}
      </div>
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer 
          type={viewingDocument.type}
          data={viewingDocument.data}
          settings={settings || { systemName: 'ERP', currency: 'USD', language: 'EN', primaryColor: '#000', lowStockGlobalThreshold: 10, taxPerBox: 0, taxPerKiish: 0, taxPerDram: 0, taxPerFalag: 0, mainStoreId: '' }}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default Financials;
