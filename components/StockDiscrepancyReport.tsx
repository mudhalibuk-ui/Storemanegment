import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Branch, User, StockTakeSession, StockTakeStatus, SystemSettings } from '../types';
import { API } from '../services/api';
import * as XLSX from 'xlsx';
import {
  Scale,
  Search,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  Sparkles,
  RotateCcw,
  Barcode,
  Check,
  ChevronDown,
  Building2,
  Boxes,
  HelpCircle
} from 'lucide-react';

interface StockDiscrepancyReportProps {
  user: User;
  items: InventoryItem[];
  branches: Branch[];
  sessions?: StockTakeSession[];
  settings?: SystemSettings;
  onRefresh: () => void;
  onNavigateToStockTake?: () => void;
}

type FilterStatus = 'ALL' | 'DISCREPANCIES' | 'SHORTAGE' | 'SURPLUS' | 'MATCHED' | 'PENDING';
type SortField = 'VARIANCE_ASC' | 'VARIANCE_DESC' | 'VALUATION_ASC' | 'VALUATION_DESC' | 'NAME' | 'STOCK_DESC';

export const StockDiscrepancyReport: React.FC<StockDiscrepancyReportProps> = ({
  user,
  items,
  branches,
  sessions = [],
  settings,
  onRefresh,
  onNavigateToStockTake
}) => {
  // Store physical audit count per item id. Undefined means uncounted/pending.
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`stock_discrepancy_audit_${user.xarunId || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save changes to localStorage for safety
  useEffect(() => {
    try {
      localStorage.setItem(`stock_discrepancy_audit_${user.xarunId || 'default'}`, JSON.stringify(auditCounts));
    } catch (e) {
      console.warn('Could not save discrepancy draft:', e);
    }
  }, [auditCounts, user.xarunId]);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('VARIANCE_ASC');
  const [scannerInput, setScannerInput] = useState('');
  const [scannerQuantity, setScannerQuantity] = useState<number>(1);
  const [scannerMessage, setScannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [reconcileModalItems, setReconcileModalItems] = useState<InventoryItem[] | null>(null);
  const [reconciliationReason, setReconciliationReason] = useState('Stock Discrepancy Physical Audit Reconciliation');
  const [isReconciling, setIsReconciling] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Currency
  const currencySymbol = settings?.currency || '$';

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Branch map for quick lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, Branch>();
    branches.forEach(b => map.set(b.id, b));
    return map;
  }, [branches]);

  // Filtered by branch and role first
  const scopedItems = useMemo(() => {
    let list = items;
    if (user.xarunId) {
      list = list.filter(i => !i.xarunId || i.xarunId === user.xarunId);
    }
    if (selectedBranchId !== 'ALL') {
      list = list.filter(i => i.branchId === selectedBranchId);
    }
    if (selectedCategory !== 'ALL') {
      list = list.filter(i => i.category === selectedCategory);
    }
    return list;
  }, [items, user.xarunId, selectedBranchId, selectedCategory]);

  // Computed data for each item
  const discrepancyRows = useMemo(() => {
    return scopedItems.map(item => {
      const auditVal = auditCounts[item.id];
      const hasAudited = auditVal !== undefined && auditVal !== null;
      const actualCount = hasAudited ? auditVal : item.quantity; // if not audited, default delta 0
      const systemStock = item.quantity ?? 0;
      const variance = hasAudited ? (actualCount - systemStock) : 0;
      const unitCost = Number(item.costPrice ?? item.lastKnownPrice ?? item.sellingPrice ?? 0);
      const valuationImpact = variance * unitCost;
      const percentageVariance = systemStock !== 0 ? ((variance / systemStock) * 100) : (variance > 0 ? 100 : 0);

      let status: 'MATCHED' | 'SHORTAGE' | 'SURPLUS' | 'PENDING' = 'PENDING';
      if (!hasAudited) {
        status = 'PENDING';
      } else if (variance === 0) {
        status = 'MATCHED';
      } else if (variance < 0) {
        status = 'SHORTAGE';
      } else {
        status = 'SURPLUS';
      }

      return {
        item,
        branch: branchMap.get(item.branchId),
        hasAudited,
        auditedQty: auditVal,
        systemStock,
        variance,
        percentageVariance,
        unitCost,
        valuationImpact,
        status
      };
    });
  }, [scopedItems, auditCounts, branchMap]);

  // Filter and sort the table rows
  const filteredRows = useMemo(() => {
    let rows = discrepancyRows;

    // Search query
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      rows = rows.filter(r => 
        r.item.name.toLowerCase().includes(query) ||
        r.item.sku.toLowerCase().includes(query) ||
        (r.item.category && r.item.category.toLowerCase().includes(query)) ||
        (r.branch && r.branch.name.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter === 'DISCREPANCIES') {
      rows = rows.filter(r => r.hasAudited && r.variance !== 0);
    } else if (statusFilter === 'SHORTAGE') {
      rows = rows.filter(r => r.hasAudited && r.variance < 0);
    } else if (statusFilter === 'SURPLUS') {
      rows = rows.filter(r => r.hasAudited && r.variance > 0);
    } else if (statusFilter === 'MATCHED') {
      rows = rows.filter(r => r.hasAudited && r.variance === 0);
    } else if (statusFilter === 'PENDING') {
      rows = rows.filter(r => !r.hasAudited);
    }

    // Sorting
    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'VARIANCE_ASC': // Greatest shortage first (e.g. -10, -5, 0, 5)
          return a.variance - b.variance;
        case 'VARIANCE_DESC': // Greatest surplus first (e.g. 10, 5, 0, -5)
          return b.variance - a.variance;
        case 'VALUATION_ASC': // Greatest monetary loss first
          return a.valuationImpact - b.valuationImpact;
        case 'VALUATION_DESC': // Greatest monetary gain first
          return b.valuationImpact - a.valuationImpact;
        case 'STOCK_DESC':
          return b.systemStock - a.systemStock;
        case 'NAME':
        default:
          return a.item.name.localeCompare(b.item.name);
      }
    });
  }, [discrepancyRows, searchTerm, statusFilter, sortBy]);

  // Overall statistics (KPIs)
  const stats = useMemo(() => {
    const totalItems = scopedItems.length;
    let auditedCount = 0;
    let matchedCount = 0;
    let shortageCount = 0;
    let surplusCount = 0;
    let totalShortageUnits = 0;
    let totalSurplusUnits = 0;
    let totalShortageValue = 0;
    let totalSurplusValue = 0;
    let netValuationVariance = 0;

    discrepancyRows.forEach(r => {
      if (r.hasAudited) {
        auditedCount++;
        if (r.variance === 0) {
          matchedCount++;
        } else if (r.variance < 0) {
          shortageCount++;
          totalShortageUnits += Math.abs(r.variance);
          totalShortageValue += Math.abs(r.valuationImpact);
          netValuationVariance += r.valuationImpact;
        } else {
          surplusCount++;
          totalSurplusUnits += r.variance;
          totalSurplusValue += r.valuationImpact;
          netValuationVariance += r.valuationImpact;
        }
      }
    });

    const auditCoverage = totalItems > 0 ? Math.round((auditedCount / totalItems) * 100) : 0;
    const accuracyRate = auditedCount > 0 ? Math.round((matchedCount / auditedCount) * 100) : 100;
    const discrepanciesCount = shortageCount + surplusCount;

    return {
      totalItems,
      auditedCount,
      pendingCount: totalItems - auditedCount,
      matchedCount,
      shortageCount,
      surplusCount,
      discrepanciesCount,
      totalShortageUnits,
      totalSurplusUnits,
      totalShortageValue,
      totalSurplusValue,
      netValuationVariance,
      auditCoverage,
      accuracyRate
    };
  }, [scopedItems, discrepancyRows]);

  // Update a single item's audit count
  const handleUpdateCount = (itemId: string, count: number | null) => {
    setAuditCounts(prev => {
      const next = { ...prev };
      if (count === null || isNaN(count)) {
        delete next[itemId];
      } else {
        next[itemId] = Math.max(0, count);
      }
      return next;
    });
  };

  // Adjust count by step (+1 / -1)
  const handleStepCount = (item: InventoryItem, step: number) => {
    const current = auditCounts[item.id] ?? item.quantity ?? 0;
    const nextVal = Math.max(0, current + step);
    handleUpdateCount(item.id, nextVal);
  };

  // Quick Match system stock
  const handleMatchSystem = (item: InventoryItem) => {
    handleUpdateCount(item.id, item.quantity ?? 0);
  };

  // Reset item count to uncounted
  const handleClearItem = (itemId: string) => {
    handleUpdateCount(itemId, null);
  };

  // Barcode / SKU Scanner Quick Entry
  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    const term = scannerInput.trim().toLowerCase();
    const matched = scopedItems.find(i => 
      (i.sku && i.sku.toLowerCase() === term) ||
      (i.name && i.name.toLowerCase() === term)
    );

    if (!matched) {
      setScannerMessage({
        text: `Alaab leh SKU ama koodh "${scannerInput}" lama helin!`,
        type: 'error'
      });
      return;
    }

    // Update count: add scanned quantity to current audit count or initialize
    const current = auditCounts[matched.id] ?? 0;
    const newQty = current + Math.max(1, scannerQuantity);
    handleUpdateCount(matched.id, newQty);

    setScannerMessage({
      text: `✓ ${matched.name}: Tirada la xaqiijiyey waa ${newQty} (Ku daris +${scannerQuantity})`,
      type: 'success'
    });
    setScannerInput('');
    setScannerQuantity(1);

    setTimeout(() => setScannerMessage(null), 4000);
  };

  // Pre-fill realistic test audit variances (demo button)
  const handleSeedDemoAudit = () => {
    const sampleCounts: Record<string, number> = {};
    scopedItems.forEach((item, index) => {
      const base = item.quantity ?? 10;
      if (index % 5 === 0) {
        // Shortage
        sampleCounts[item.id] = Math.max(0, base - Math.floor(Math.random() * 4 + 1));
      } else if (index % 5 === 1) {
        // Surplus
        sampleCounts[item.id] = base + Math.floor(Math.random() * 5 + 1);
      } else if (index % 5 === 2 || index % 5 === 3) {
        // Perfect match
        sampleCounts[item.id] = base;
      }
      // Leave remainder pending
    });
    setAuditCounts(sampleCounts);
    alert('Simulated audit counts applied across items for discrepancy testing.');
  };

  // Pull counts from latest active or completed Stock Take session
  const handlePullFromStockTake = () => {
    const relevantSessions = sessions.filter(s => !user.xarunId || s.xarunId === user.xarunId);
    if (relevantSessions.length === 0) {
      alert('Ma jiro xisaab-xir (Stock Take Session) hore oo la helay.');
      return;
    }

    const latestSession = relevantSessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    if (!latestSession.items || latestSession.items.length === 0) {
      alert('Xisaab-xirkan ma laha xog alaab ah.');
      return;
    }

    let imported = 0;
    const newCounts: Record<string, number> = { ...auditCounts };

    latestSession.items.forEach(auditItem => {
      // Find matching item in inventory
      const target = items.find(i => i.id === auditItem.itemId || (auditItem.sku && i.sku === auditItem.sku));
      if (target && auditItem.actualQty !== undefined) {
        newCounts[target.id] = auditItem.actualQty;
        imported++;
      }
    });

    setAuditCounts(newCounts);
    alert(`Guul! ${imported} alaabood xogtooda tirada waxaa laga soo jiitay xisaab-xirkii (${latestSession.id.slice(0, 8)}).`);
  };

  // Clear all audit inputs
  const handleClearAllAudit = () => {
    if (window.confirm('Ma hubtaa inaad tirtirto dhammaan tirakoobka gacanta lagu geliyey?')) {
      setAuditCounts({});
      setSelectedItemIds(new Set());
    }
  };

  // Bulk Import Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let matchCount = 0;
        const newCounts: Record<string, number> = { ...auditCounts };

        data.forEach(row => {
          const sku = String(row.SKU || row.sku || row.Barcode || row.barcode || row.Code || '').trim();
          const name = String(row.Name || row.name || row['Item Name'] || '').trim().toLowerCase();
          const qty = Number(row['Audited Qty'] ?? row['Actual Qty'] ?? row.Count ?? row.Quantity ?? row.actual_qty ?? row.qty);

          if (!isNaN(qty)) {
            const found = scopedItems.find(i => 
              (sku && i.sku && i.sku.toLowerCase() === sku.toLowerCase()) ||
              (name && i.name && i.name.toLowerCase() === name)
            );
            if (found) {
              newCounts[found.id] = Math.max(0, qty);
              matchCount++;
            }
          }
        });

        setAuditCounts(newCounts);
        setIsImportModalOpen(false);
        alert(`Guul! ${matchCount} alaabood oo ku jira faylka Excel/CSV ayaa la xiriiriyay.`);
      } catch (err: any) {
        alert('Cilad ayaa dhacday inta faylka la akhrinayay: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Bulk Paste TSV/CSV text
  const handleApplyPasteData = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    let matchCount = 0;
    const newCounts: Record<string, number> = { ...auditCounts };

    lines.forEach(line => {
      // Split by tab, comma, or multiple spaces
      const parts = line.includes('\t') ? line.split('\t') : line.includes(',') ? line.split(',') : line.split(/\s{2,}/);
      if (parts.length >= 2) {
        const identifier = parts[0].trim().toLowerCase();
        const rawQty = parts[1].trim();
        const qty = Number(rawQty);

        if (!isNaN(qty)) {
          const found = scopedItems.find(i => 
            (i.sku && i.sku.toLowerCase() === identifier) ||
            (i.name && i.name.toLowerCase() === identifier)
          );
          if (found) {
            newCounts[found.id] = Math.max(0, qty);
            matchCount++;
          }
        }
      }
    });

    setAuditCounts(newCounts);
    setIsImportModalOpen(false);
    setPasteData('');
    alert(`Guul! ${matchCount} alaabood ayaa lagu daray tirakoobka.`);
  };

  // Select/Deselect All Checkbox
  const handleToggleSelectAll = () => {
    const discrepancyItems = filteredRows
      .filter(r => r.hasAudited && r.variance !== 0)
      .map(r => r.item.id);

    if (selectedItemIds.size === discrepancyItems.length && discrepancyItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(discrepancyItems));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open reconciliation modal for selected items or all discrepancies
  const handleInitiateReconcile = (targetItems?: InventoryItem[]) => {
    let itemsToReconcile: InventoryItem[] = [];

    if (targetItems && targetItems.length > 0) {
      itemsToReconcile = targetItems;
    } else if (selectedItemIds.size > 0) {
      itemsToReconcile = scopedItems.filter(i => selectedItemIds.has(i.id));
    } else {
      // All items with non-zero variance
      itemsToReconcile = discrepancyRows
        .filter(r => r.hasAudited && r.variance !== 0)
        .map(r => r.item);
    }

    if (itemsToReconcile.length === 0) {
      alert('Ma jiraan alaabo leh kala-duwanaansho (Discrepancy) oo la doortay ama la helay.');
      return;
    }

    setReconcileModalItems(itemsToReconcile);
  };

  // Execute actual database reconciliation
  const handleConfirmReconciliation = async () => {
    if (!reconcileModalItems || reconcileModalItems.length === 0) return;

    setIsReconciling(true);
    try {
      let updatedCount = 0;
      for (const item of reconcileModalItems) {
        const auditCount = auditCounts[item.id];
        if (auditCount === undefined || auditCount === null) continue;

        const currentSystemStock = item.quantity ?? 0;
        const diff = auditCount - currentSystemStock;
        if (diff === 0) continue;

        // 1. Log inventory adjustment
        await API.inventoryAdjustments.save({
          itemId: item.id,
          itemName: item.name,
          type: 'SET',
          quantity: auditCount,
          reason: `${reconciliationReason} (Before: ${currentSystemStock}, Audited: ${auditCount}, Diff: ${diff > 0 ? '+' : ''}${diff})`,
          createdBy: user.username || user.name || 'Auditor',
          xarunId: item.xarunId || user.xarunId || ''
        });

        // 2. Update item stock in DB
        await API.items.save({
          ...item,
          quantity: auditCount,
          lastUpdated: new Date().toISOString()
        });

        updatedCount++;
      }

      setReconcileModalItems(null);
      setSelectedItemIds(new Set());
      onRefresh();
      alert(`✅ Si guul leh ayaa loo saxay xogta ${updatedCount} alaabood oo database-ka ku jirta! Kaydka hadda wuu la jaanqaaday tirada dhabta ah.`);
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      alert('Cilad ayaa dhacday inta lagu guda jiray saxitaanka kaydka: ' + err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const reportData = discrepancyRows.map(r => ({
      'Item Name': r.item.name,
      'SKU / Code': r.item.sku || '-',
      'Category': r.item.category || 'General',
      'Branch / Location': r.branch?.name || 'Main Warehouse',
      'Unit Cost': r.unitCost,
      'System Stock': r.systemStock,
      'Audited Count': r.hasAudited ? r.auditedQty : 'Not Counted',
      'Variance Units (Diff)': r.hasAudited ? r.variance : '-',
      'Variance %': r.hasAudited ? `${r.percentageVariance.toFixed(1)}%` : '-',
      'Valuation Impact ($)': r.hasAudited ? r.valuationImpact.toFixed(2) : '-',
      'Status': r.status,
      'Audit Timestamp': new Date().toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Discrepancy_Report');
    XLSX.writeFile(wb, `Stock_Discrepancy_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'SKU', 'Category', 'Branch', 'Unit Cost', 'System Stock', 'Audited Count', 'Variance', 'Variance %', 'Valuation Impact', 'Status'];
    const rows = discrepancyRows.map(r => [
      `"${r.item.name.replace(/"/g, '""')}"`,
      `"${(r.item.sku || '').replace(/"/g, '""')}"`,
      `"${(r.item.category || '').replace(/"/g, '""')}"`,
      `"${(r.branch?.name || '').replace(/"/g, '""')}"`,
      r.unitCost,
      r.systemStock,
      r.hasAudited ? r.auditedQty : '',
      r.hasAudited ? r.variance : '',
      r.hasAudited ? `${r.percentageVariance.toFixed(1)}%` : '',
      r.hasAudited ? r.valuationImpact.toFixed(2) : '',
      r.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Discrepancies_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50 min-h-full overflow-y-auto no-scrollbar print:p-0 print:bg-white">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Scale size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                Stock Discrepancy Report
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Kala-duwanaanshaha Kaydka Database-ka & Tirakoobka Dhabta ah
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={handleSeedDemoAudit}
            title="Generate sample counts to quickly test variances and reconciliation"
            className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Sparkles size={16} /> Sample Data
          </button>

          {sessions && sessions.length > 0 && (
            <button
              onClick={handlePullFromStockTake}
              title="Import counts from recent Stock Take Session"
              className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <RotateCcw size={16} /> Load From Audit
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Upload size={16} /> Import Audit Counts
          </button>

          <div className="relative group">
            <button className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
              <Download size={16} /> Export <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-2xl shadow-xl py-2 w-48 z-30 animate-in fade-in">
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" /> Excel (.xlsx)
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileSpreadsheet size={16} className="text-indigo-600" /> CSV File
              </button>
              <button
                onClick={handlePrint}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Printer size={16} className="text-slate-600" /> Print / PDF
              </button>
            </div>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh database records"
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-8 p-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Stock Discrepancy & Variance Audit Report</h1>
            <p className="text-xs text-slate-500 font-medium">Generated on {new Date().toLocaleString()} by {user.name} ({user.role})</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{settings?.systemName || 'SmartStock Pro Enterprise'}</p>
            <p className="text-xs text-slate-500">Inventory Reconciliation Department</p>
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Items */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monitored Items</p>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
              {stats.totalItems}
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            {stats.auditedCount} counted · {stats.pendingCount} pending
          </p>
        </div>

        {/* Audit Coverage */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Coverage</p>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono tabular-nums">
              {stats.auditCoverage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${stats.auditCoverage}%` }}></div>
          </div>
        </div>

        {/* Stock Accuracy Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy Rate</p>
          <div className="my-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
              stats.accuracyRate >= 95 ? 'text-emerald-600' : stats.accuracyRate >= 80 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {stats.accuracyRate}%
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            {stats.matchedCount} exact match items
          </p>
        </div>

        {/* Shortages / Deficits */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 bg-rose-50/20 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Shortage (Deficit)</p>
            <ArrowDownRight size={16} className="text-rose-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tabular-nums">
              -{stats.totalShortageUnits}
            </span>
            <span className="text-xs font-bold text-rose-500 ml-1">units</span>
          </div>
          <p className="text-[11px] font-bold text-rose-600 font-mono tabular-nums">
            -{currencySymbol}{stats.totalShortageValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value
          </p>
        </div>

        {/* Surpluses / Excess */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 bg-emerald-50/20 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Surplus (Excess)</p>
            <ArrowUpRight size={16} className="text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums">
              +{stats.totalSurplusUnits}
            </span>
            <span className="text-xs font-bold text-emerald-500 ml-1">units</span>
          </div>
          <p className="text-[11px] font-bold text-emerald-600 font-mono tabular-nums">
            +{currencySymbol}{stats.totalSurplusValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value
          </p>
        </div>

        {/* Net Valuation Variance */}
        <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between ${
          stats.netValuationVariance < 0 
            ? 'bg-rose-600 text-white border-rose-700' 
            : stats.netValuationVariance > 0 
            ? 'bg-emerald-600 text-white border-emerald-700' 
            : 'bg-slate-900 text-white border-slate-900'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Net Valuation Variance</p>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums">
              {stats.netValuationVariance < 0 ? '-' : stats.netValuationVariance > 0 ? '+' : ''}
              {currencySymbol}{Math.abs(stats.netValuationVariance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-bold text-white/80">
            {stats.netValuationVariance < 0 ? '⚠️ Net inventory loss' : stats.netValuationVariance > 0 ? '✓ Net inventory gain' : 'Balanced inventory'}
          </p>
        </div>
      </div>

      {/* QUICK BARCODE / SKU AUDIT SCANNER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <form onSubmit={handleScannerSubmit} className="flex flex-1 flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider shrink-0">
            <Barcode size={18} className="text-indigo-600" />
            <span>Quick Scan / Add Count:</span>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Scan Barcode or type SKU (e.g. SKU-1002)..."
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[10px] font-black text-slate-400 uppercase">Qty to add:</label>
            <input
              type="number"
              min="1"
              value={scannerQuantity}
              onChange={(e) => setScannerQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-center outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm shrink-0"
          >
            Record Count
          </button>
        </form>

        {scannerMessage && (
          <div className={`text-xs font-bold px-4 py-2 rounded-xl transition-all animate-in fade-in shrink-0 ${
            scannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {scannerMessage.text}
          </div>
        )}
      </div>

      {/* FILTER, SEARCH, AND ACTION TOOLBAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Items ({stats.totalItems})
            </button>
            <button
              onClick={() => setStatusFilter('DISCREPANCIES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'DISCREPANCIES' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
              }`}
            >
              Discrepancies ({stats.discrepanciesCount})
            </button>
            <button
              onClick={() => setStatusFilter('SHORTAGE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'SHORTAGE' ? 'bg-rose-700 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Shortage ({stats.shortageCount})
            </button>
            <button
              onClick={() => setStatusFilter('SURPLUS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'SURPLUS' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Surplus ({stats.surplusCount})
            </button>
            <button
              onClick={() => setStatusFilter('MATCHED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'MATCHED' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Matched ({stats.matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                statusFilter === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Pending ({stats.pendingCount})
            </button>
          </div>

          {/* Reconciliation & Reset Toolbar */}
          <div className="flex items-center gap-3 shrink-0">
            {stats.discrepanciesCount > 0 && (
              <button
                onClick={() => handleInitiateReconcile()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> Reconcile Discrepancies ({selectedItemIds.size > 0 ? selectedItemIds.size : stats.discrepanciesCount})
              </button>
            )}

            {stats.auditedCount > 0 && (
              <button
                onClick={handleClearAllAudit}
                title="Reset physical counts"
                className="px-3 py-2.5 text-slate-400 hover:text-rose-600 text-xs font-bold uppercase transition-colors"
              >
                Reset All Counts
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search product name, SKU, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">All Branches & Stores</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="VARIANCE_ASC">Worst Shortage First (Deficit)</option>
              <option value="VARIANCE_DESC">Highest Surplus First</option>
              <option value="VALUATION_ASC">Highest Monetary Loss First ($)</option>
              <option value="VALUATION_DESC">Highest Monetary Gain First ($)</option>
              <option value="STOCK_DESC">Highest Database Stock First</option>
              <option value="NAME">Product Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN VISUAL DISCREPANCY TABLE */}
      <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-4 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest print:hidden w-12">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.size > 0 && selectedItemIds.size === filteredRows.filter(r => r.hasAudited && r.variance !== 0).length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product & SKU</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category / Branch</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Cost</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">System Stock</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[200px]">Audited Count (Input)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Variance Units</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Variance %</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valuation Impact</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-4 pr-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                    Lama helin wax xog ah oo waafaqsan shaandhada la doortay.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedItemIds.has(row.item.id);
                  const isShortage = row.hasAudited && row.variance < 0;
                  const isSurplus = row.hasAudited && row.variance > 0;
                  const isMatched = row.hasAudited && row.variance === 0;

                  return (
                    <tr
                      key={row.item.id}
                      className={`transition-colors ${
                        isShortage 
                          ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                          : isSurplus 
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70' 
                          : isMatched
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-amber-50/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 pl-6 print:hidden">
                        {row.hasAudited && row.variance !== 0 ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(row.item.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="p-4">
                        <div className="font-black text-slate-900 leading-tight">
                          {row.item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                          <span>{row.item.sku || 'NO-SKU'}</span>
                          {row.item.unitOfMeasure && (
                            <>
                              <span>·</span>
                              <span className="uppercase text-[10px] font-bold text-slate-500">{row.item.unitOfMeasure}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category & Branch */}
                      <td className="p-4">
                        <div className="font-bold text-slate-700">
                          {row.item.category || 'General'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {row.branch?.name || 'Main Warehouse'}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="p-4 text-right font-mono tabular-nums font-bold text-slate-600">
                        {currencySymbol}{row.unitCost.toFixed(2)}
                      </td>

                      {/* System Stock */}
                      <td className="p-4 text-right font-mono tabular-nums font-black text-slate-900 text-sm">
                        {row.systemStock}
                      </td>

                      {/* Audited Count Input Cell */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                          <button
                            type="button"
                            onClick={() => handleStepCount(row.item, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 print:hidden"
                            title="Decrease count"
                          >
                            <Minus size={13} />
                          </button>

                          <input
                            type="number"
                            min="0"
                            placeholder="Count..."
                            value={row.auditedQty !== null && row.auditedQty !== undefined ? row.auditedQty : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                              handleUpdateCount(row.item.id, val);
                            }}
                            className="w-20 px-2 py-1 text-center font-mono font-black text-sm text-slate-900 outline-none bg-transparent tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepCount(row.item, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 print:hidden"
                            title="Increase count"
                          >
                            <Plus size={13} />
                          </button>

                          {!row.hasAudited ? (
                            <button
                              type="button"
                              onClick={() => handleMatchSystem(row.item)}
                              className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors print:hidden"
                              title="Set audit count equal to system stock"
                            >
                              Match
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClearItem(row.item.id)}
                              className="w-6 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors print:hidden"
                              title="Clear count"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Variance Units */}
                      <td className="p-4 text-right font-mono tabular-nums font-black text-sm">
                        {!row.hasAudited ? (
                          <span className="text-slate-300 font-normal italic">--</span>
                        ) : isShortage ? (
                          <span className="text-rose-600 flex items-center justify-end gap-1">
                            <ArrowDownRight size={14} /> {row.variance}
                          </span>
                        ) : isSurplus ? (
                          <span className="text-emerald-600 flex items-center justify-end gap-1">
                            <ArrowUpRight size={14} /> +{row.variance}
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center justify-end gap-1">
                            <Check size={14} className="text-emerald-500" /> 0
                          </span>
                        )}
                      </td>

                      {/* Variance % */}
                      <td className="p-4 text-right font-mono tabular-nums font-bold">
                        {!row.hasAudited ? (
                          <span className="text-slate-300 font-normal">--</span>
                        ) : (
                          <span className={
                            isShortage ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-400'
                          }>
                            {row.variance > 0 ? '+' : ''}{row.percentageVariance.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Valuation Impact ($) */}
                      <td className="p-4 text-right font-mono tabular-nums font-black text-sm">
                        {!row.hasAudited ? (
                          <span className="text-slate-300 font-normal">--</span>
                        ) : (
                          <span className={
                            isShortage ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-500'
                          }>
                            {row.valuationImpact < 0 ? '-' : row.valuationImpact > 0 ? '+' : ''}
                            {currencySymbol}{Math.abs(row.valuationImpact).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {row.status === 'PENDING' && (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                            Pending Audit
                          </span>
                        )}
                        {row.status === 'MATCHED' && (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Matched
                          </span>
                        )}
                        {row.status === 'SHORTAGE' && (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            Deficit / Shortage
                          </span>
                        )}
                        {row.status === 'SURPLUS' && (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Excess / Surplus
                          </span>
                        )}
                      </td>

                      {/* Individual Action */}
                      <td className="p-4 pr-6 text-right print:hidden">
                        {row.hasAudited && row.variance !== 0 ? (
                          <button
                            type="button"
                            onClick={() => handleInitiateReconcile([row.item])}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            title="Reconcile this single item"
                          >
                            Reconcile
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECONCILIATION CONFIRMATION MODAL */}
      {reconcileModalItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Confirm Stock Reconciliation</h3>
                  <p className="text-xs text-white/60 font-medium">Reconciling {reconcileModalItems.length} inventory items</p>
                </div>
              </div>
              <button
                onClick={() => setReconcileModalItems(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  Talaabadani waxay si toos ah u cusboonaysiinaysaa tirada alaabta database-ka ku jirta si ay u noqoto tiradii dhabta ahayd ee aad gelisay. Sidoo kale waxaa loo diiwaangelinayaa sidii xisaab-xir rasmi ah (Inventory Adjustment).
                </p>
              </div>

              {/* Items to reconcile summary table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="p-3 pl-4">Item</th>
                      <th className="p-3 text-right">System Qty</th>
                      <th className="p-3 text-right">Audited Qty</th>
                      <th className="p-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconcileModalItems.map(item => {
                      const audited = auditCounts[item.id] ?? item.quantity;
                      const diff = audited - (item.quantity ?? 0);
                      return (
                        <tr key={item.id} className="font-bold">
                          <td className="p-3 pl-4 text-slate-900">{item.name}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{item.quantity}</td>
                          <td className="p-3 text-right font-mono text-indigo-600 font-black">{audited}</td>
                          <td className={`p-3 text-right font-mono font-black ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reason input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sababta / Audit Reason Note
                </label>
                <input
                  type="text"
                  value={reconciliationReason}
                  onChange={(e) => setReconciliationReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                  placeholder="E.g., Year-end physical count reconciliation..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setReconcileModalItems(null)}
                  disabled={isReconciling}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl uppercase text-xs tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReconciliation}
                  disabled={isReconciling}
                  className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl uppercase text-xs tracking-wider transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  {isReconciling ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Applying Adjustments...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirm & Update Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT AUDIT COUNTS MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Import Physical Counts</h3>
                  <p className="text-xs text-white/60 font-medium">Upload Excel/CSV or paste count lists</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Option 1: File Upload */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Option 1: Upload Excel or CSV Spreadsheet
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100/50">
                  <FileSpreadsheet size={32} className="text-indigo-600 mb-2" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Choose Excel / CSV File</span>
                  <span className="text-[11px] font-medium text-slate-400 mt-1">Columns needed: SKU (or Name) and Count (or Audited Qty)</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Option 2: Paste List */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Option 2: Paste Rows (SKU &lt;tab&gt; Quantity)
                </label>
                <textarea
                  rows={4}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="SKU-1001&#9;25&#10;SKU-1002&#9;40&#10;SKU-1003&#9;12"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl uppercase text-xs tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPasteData}
                  disabled={!pasteData.trim()}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-2xl uppercase text-xs tracking-wider transition-all shadow-xl"
                >
                  Apply Pasted Counts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockDiscrepancyReport;
