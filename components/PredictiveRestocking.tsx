import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Branch, Transaction, Sale, PurchaseOrder, User, SystemSettings, POStatus, PackType } from '../types';
import { getPredictiveRestockingReport, PredictiveRestockItem, PredictiveRestockSummary } from '../services/geminiService';
import { API } from '../services/api';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Calendar,
  Building2,
  RefreshCw,
  Download,
  Printer,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  Clock,
  DollarSign,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PredictiveRestockingProps {
  user: User;
  items: InventoryItem[];
  branches: Branch[];
  transactions: Transaction[];
  sales?: Sale[];
  purchaseOrders?: PurchaseOrder[];
  settings?: SystemSettings;
  onRefresh: () => void;
  onNavigateToPurchases?: () => void;
}

type UrgencyFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED';

export const PredictiveRestocking: React.FC<PredictiveRestockingProps> = ({
  user,
  items,
  branches,
  transactions,
  sales = [],
  purchaseOrders = [],
  settings,
  onRefresh,
  onNavigateToPurchases
}) => {
  const currencySymbol = settings?.currency || '$';

  // Filters & State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [seasonalPreset, setSeasonalPreset] = useState<string>('AUTOMATIC');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'URGENCY' | 'DAYS_LEFT' | 'VELOCITY' | 'SUGGESTED_QTY'>('URGENCY');

  // Loading & Data State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>('');
  const [reportData, setReportData] = useState<{
    summary: PredictiveRestockSummary | null;
    recommendations: PredictiveRestockItem[];
  }>({
    summary: null,
    recommendations: []
  });

  // Selected items for bulk purchase order
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isPOModalOpen, setIsPOModalOpen] = useState<boolean>(false);
  const [vendorName, setVendorName] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('Predictive restocking auto-generated purchase order based on velocity & seasonal trends');
  const [isCreatingPO, setIsCreatingPO] = useState<boolean>(false);
  const [poSuccessMessage, setPoSuccessMessage] = useState<string | null>(null);

  // Local adjustments to suggested quantities
  const [adjustedQtys, setAdjustedQtys] = useState<Record<string, number>>({});

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Fetch / Generate Report
  const loadReport = async () => {
    setIsLoading(true);
    setPoSuccessMessage(null);
    try {
      const response = await getPredictiveRestockingReport({
        items,
        transactions,
        sales,
        branches,
        branchId: selectedBranchId,
        seasonalPreset
      });

      setReportData(response);
      setLastAnalyzedAt(new Date().toLocaleTimeString());

      // Auto-select critical items by default for convenience
      const criticalIds = new Set<string>();
      response.recommendations
        .filter(r => r.urgency === 'CRITICAL' && r.suggestedReorderQty > 0)
        .forEach(r => criticalIds.add(r.itemId));
      setSelectedItemIds(criticalIds);
    } catch (err) {
      console.error('Failed to load predictive report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedBranchId, seasonalPreset]);

  // Filtered & Sorted Recommendations
  const filteredItems = useMemo(() => {
    let list = [...reportData.recommendations];

    if (urgencyFilter !== 'ALL') {
      list = list.filter(item => item.urgency === urgencyFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter(item => item.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item =>
        item.itemName.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.branchName.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'URGENCY') {
        const order = { CRITICAL: 0, WARNING: 1, OPTIMAL: 2, OVERSTOCKED: 3 };
        if (order[a.urgency] !== order[b.urgency]) {
          return order[a.urgency] - order[b.urgency];
        }
        return a.daysUntilStockout - b.daysUntilStockout;
      }
      if (sortBy === 'DAYS_LEFT') {
        return a.daysUntilStockout - b.daysUntilStockout;
      }
      if (sortBy === 'VELOCITY') {
        return b.dailyVelocity - a.dailyVelocity;
      }
      if (sortBy === 'SUGGESTED_QTY') {
        return b.suggestedReorderQty - a.suggestedReorderQty;
      }
      return 0;
    });

    return list;
  }, [reportData.recommendations, urgencyFilter, categoryFilter, searchTerm, sortBy]);

  // Chart Data: Top 7 at-risk items (Current Stock vs Suggested Reorder)
  const chartData = useMemo(() => {
    return reportData.recommendations
      .filter(r => r.suggestedReorderQty > 0)
      .slice(0, 8)
      .map(r => ({
        name: r.itemName.length > 12 ? `${r.itemName.slice(0, 10)}...` : r.itemName,
        sku: r.sku,
        CurrentStock: r.currentStock,
        SuggestedReorder: adjustedQtys[r.itemId] ?? r.suggestedReorderQty,
        DailyBurn: r.dailyVelocity
      }));
  }, [reportData.recommendations, adjustedQtys]);

  // Urgency Distribution for Pie Chart
  const urgencyPieData = useMemo(() => {
    if (!reportData.summary) return [];
    return [
      { name: 'Critical (<5 Days)', value: reportData.summary.criticalCount, color: '#ef4444' },
      { name: 'Warning (5-14 Days)', value: reportData.summary.warningCount, color: '#f59e0b' },
      { name: 'Optimal (15-30 Days)', value: reportData.summary.optimalCount, color: '#10b981' },
      { name: 'Overstocked (>60 Days)', value: reportData.summary.overstockedCount, color: '#6366f1' },
    ].filter(d => d.value > 0);
  }, [reportData.summary]);

  // Quantity change handler
  const handleQtyChange = (itemId: string, val: number) => {
    setAdjustedQtys(prev => ({
      ...prev,
      [itemId]: Math.max(0, val)
    }));
  };

  // Toggle item selection
  const toggleSelect = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.itemId)));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredItems.map(item => {
      const finalQty = adjustedQtys[item.itemId] ?? item.suggestedReorderQty;
      return {
        'SKU': item.sku,
        'Item Name': item.itemName,
        'Category': item.category,
        'Branch': item.branchName,
        'Current Stock': item.currentStock,
        'Min Safety Threshold': item.minThreshold,
        'Daily Consumption Velocity (pcs/day)': item.dailyVelocity,
        'Weekly Velocity': item.weeklyVelocity,
        'Days Until Stockout': item.daysUntilStockout >= 999 ? 'No stockout risk' : item.daysUntilStockout,
        'Seasonal Demand Shift': `${item.seasonalDemandShiftPct >= 0 ? '+' : ''}${item.seasonalDemandShiftPct}%`,
        'Suggested Reorder Qty': finalQty,
        'Unit Landed Cost': `${currencySymbol}${item.unitCost}`,
        'Estimated Reorder Cost': `${currencySymbol}${Math.round(finalQty * item.unitCost)}`,
        'Urgency Level': item.urgency,
        'Confidence Score': `${item.confidenceScore}%`,
        'AI Strategic Guidance': item.aiReasoning,
        'Recommended Action': item.recommendedAction
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Predictive Restocking');
    XLSX.writeFile(workbook, `SmartStock_Predictive_Restocking_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Create Purchase Order from selected items
  const handleCreatePurchaseOrder = async () => {
    const selectedItems = reportData.recommendations.filter(i => selectedItemIds.has(i.itemId));
    if (selectedItems.length === 0) {
      alert('Fadlan doorto ugu yaraan hal alaab oo ku jirta dalabka.');
      return;
    }

    setIsCreatingPO(true);
    try {
      const poItems = selectedItems.map((item, idx) => {
        const finalQty = adjustedQtys[item.itemId] ?? item.suggestedReorderQty;
        return {
          id: `poi_${Date.now()}_${idx}`,
          name: item.itemName,
          packType: (item.packType as PackType) || PackType.PCS,
          requestedQty: finalQty > 0 ? finalQty : 10,
          purchasedQty: 0,
          lastPurchasePrice: item.unitCost,
          actualPrice: item.unitCost,
          isPurchased: false,
          unitLandedCost: item.unitCost
        };
      });

      const totalAmount = poItems.reduce((acc, it) => acc + (it.requestedQty * it.actualPrice), 0);

      const newPO: Partial<PurchaseOrder> = {
        title: `Auto-Restock PO: ${reportData.summary?.activeSeasonName || 'Velocity Plan'} (${selectedItems.length} items)`,
        vendorName: vendorName.trim() || 'Central Wholesale Supplier',
        items: poItems,
        status: POStatus.DRAFT,
        total: totalAmount,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        personnel: user.name,
        creatorId: user.id,
        xarunId: user.xarunId || undefined,
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        notes: `${poNotes} [Generated on ${new Date().toLocaleDateString()}]`
      };

      await API.purchaseOrders.save(newPO as any);

      setIsPOModalOpen(false);
      setPoSuccessMessage(`Si guul leh ayaa loo abuuray Purchase Order qabyo ah oo ay ku jiraan ${poItems.length} alaab ah!`);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to create purchase order:', err);
      alert('Cilad ayaa dhacday inta lagu guda jiray abuurista Purchase Order.');
    } finally {
      setIsCreatingPO(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Predictive Restocking Report
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Velocity Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Falanqaynta xawaaraha iibka (Velocity), xilliyada ganacsiga (Seasonality), iyo saadaasha kayd-dhamayska xarumaha
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Xarunta"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent border-none outline-none font-medium cursor-pointer"
              >
                <option value="ALL">Dhammaan Xarumaha (All Branches)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                ))}
              </select>
            </div>

            {/* Seasonal Preset */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <select
                aria-label="Xilliga Ganacsiga"
                value={seasonalPreset}
                onChange={(e) => setSeasonalPreset(e.target.value)}
                className="bg-transparent border-none outline-none font-medium cursor-pointer"
              >
                <option value="AUTOMATIC">Xilliyeed: Toos ah (Auto Calendar)</option>
                <option value="RAMADAN_SURGE">Xilliyeed: Ramadan & Ciid (+35% Surge)</option>
                <option value="DRY_SEASON_SURGE">Xilliyeed: Xilliga Jiilaalka / Dhismaha (+25%)</option>
                <option value="YEAR_END_PEAK">Xilliyeed: Dhamaadka Sanadka (+30%)</option>
                <option value="NORMAL">Xilliyeed: Caadi / Deggan (Baseline)</option>
              </select>
            </div>

            {/* Refresh / Run AI */}
            <button
              onClick={loadReport}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-medium transition shadow-sm"
              title="Dib u cusboonaysii Falanqaynta AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Falanqaynaya...' : 'Orod Falanqaynta'}</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition shadow-sm"
              title="Dhoofi Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Excel</span>
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition shadow-sm"
              title="Daabac Warbixinta"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Success Alert if PO created */}
        {poSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{poSuccessMessage}</span>
            </div>
            {onNavigateToPurchases && (
              <button
                onClick={onNavigateToPurchases}
                className="font-semibold underline hover:text-emerald-900 ml-2"
              >
                Fiiri Dalabyada &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI Executive Advisory Card */}
      {reportData.summary && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-300" /> Gemini Strategic Intelligence
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {reportData.summary.activeSeasonName}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {reportData.summary.seasonalTrendFactor}
                </span>
                {lastAnalyzedAt && (
                  <span className="text-[11px] text-slate-400">
                    La falanqeeyay: {lastAnalyzedAt}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-normal">
                {reportData.summary.aiExecutiveSummary}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-start">
              <button
                onClick={() => setIsPOModalOpen(true)}
                disabled={selectedItemIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-md transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Abuur Purchase Order ({selectedItemIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Risk */}
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-600">Halista Degdegga ah (&le; 5 Maalmood)</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {reportData.summary?.criticalCount ?? 0}
            </span>
            <span className="text-xs text-slate-500">alaab oo kaydkoodu dhammaanayo</span>
          </div>
          <div className="mt-3 text-[11px] text-red-700 bg-red-50 px-2 py-1 rounded font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Waxay u baahan yihiin dalab 24-48 saacadood gudahood
          </div>
        </div>

        {/* Warning / Moderate Risk */}
        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600">Digniin (6 - 14 Maalmood)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {reportData.summary?.warningCount ?? 0}
            </span>
            <span className="text-xs text-slate-500">alaab ku dhow xadka min</span>
          </div>
          <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Ku dar wareegga dalabka toddobaadlaha ah
          </div>
        </div>

        {/* Total Reorder Units Suggested */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Wadarta Tirada La Soo Jeediyay</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {(reportData.summary?.totalSuggestedUnits ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">pcs/units</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Guud ahaan xarumaha la doortay
          </div>
        </div>

        {/* Estimated Reorder Budget Required */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Miisaaniyadda Dib-u-Dalbashada</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {currencySymbol}{(reportData.summary?.totalEstimatedCost ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">qiyaas landed cost</span>
          </div>
          <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ka hortagaysa khasaaraha fursadaha iibka
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart: Current Stock vs Suggested Reorder */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" />
                  Top Items: Kaydka Hadda Jira vs Tirada Dib-u-Dalbashada
                </h3>
                <p className="text-xs text-slate-500">
                  Muuqaalka alaabta ugu halista badan marka la barbardhigo xawaaraha gubashada maalinlaha ah
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="CurrentStock" name="Kaydka Hadda (Stock)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="SuggestedReorder" name="Tirada La Soo Jeediyay (Reorder)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Urgency Distribution */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
                Qaybsanaanta Xaaladaha Kaydka
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Heerarka digniinta alaabta guud ahaan xarumaha
              </p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {urgencyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span>Critical: {reportData.summary?.criticalCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Warning: {reportData.summary?.warningCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Optimal: {reportData.summary?.optimalCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Overstocked: {reportData.summary?.overstockedCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Urgency Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Xaaladda:
            </span>
            {(['ALL', 'CRITICAL', 'WARNING', 'OPTIMAL', 'OVERSTOCKED'] as UrgencyFilter[]).map((tab) => {
              const active = urgencyFilter === tab;
              const count = tab === 'ALL'
                ? reportData.recommendations.length
                : reportData.recommendations.filter(r => r.urgency === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setUrgencyFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    active
                      ? (tab === 'CRITICAL' ? 'bg-red-600 text-white' :
                         tab === 'WARNING' ? 'bg-amber-500 text-white' :
                         tab === 'OPTIMAL' ? 'bg-emerald-600 text-white' :
                         'bg-indigo-600 text-white')
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'Dhammaan' : tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi SKU, alaab, xarun..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Category:</span>
              <select
                aria-label="Category-ga alaabta"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Kala saar:</span>
              <select
                aria-label="Kala saarida alaabta"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
              >
                <option value="URGENCY">Heerka Halista (Critical First)</option>
                <option value="DAYS_LEFT">Maalmaha Haray (Fewest Days Left)</option>
                <option value="VELOCITY">Xawaaraha Iibka (Highest Velocity)</option>
                <option value="SUGGESTED_QTY">Tirada La Dalbayo (Highest Reorder Qty)</option>
              </select>
            </div>
          </div>

          {/* Selection Stats */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {selectedItemIds.size === filteredItems.length && filteredItems.length > 0
                ? 'Kala noqo dhammaan'
                : 'Dooro dhammaan'}
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">
              {selectedItemIds.size} la doortay
            </span>
          </div>
        </div>
      </div>

      {/* Main Predictive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Dooro dhammaan alaabta miiska"
                    checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={selectAllFiltered}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Alaabta & SKU</th>
                <th className="p-3">Xarunta (Branch)</th>
                <th className="p-3 text-center">Kaydka & Xadka</th>
                <th className="p-3 text-center">Xawaaraha Iibka (Velocity)</th>
                <th className="p-3 text-center">Maalmaha Haray</th>
                <th className="p-3 text-center">Saamaynta Xilliga</th>
                <th className="p-3 text-center">Tirada La Soo Jeediyay</th>
                <th className="p-3 text-center">Qiimaha Qiyaasta</th>
                <th className="p-3">Talooyinka AI & Sababaha</th>
                <th className="p-3 text-center">Ficil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                      <span className="text-sm font-medium">Falanqaynaya xogta xawaaraha iibka iyo saadaasha kaydka...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <span className="text-sm font-medium">Lama helin alaab waafaqsan shaandhada la doortay.</span>
                      <button
                        onClick={() => {
                          setUrgencyFilter('ALL');
                          setCategoryFilter('ALL');
                          setSearchTerm('');
                        }}
                        className="text-xs text-indigo-600 hover:underline mt-1"
                      >
                        Nadiifi Shaandhooyinka
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.itemId);
                  const effectiveQty = adjustedQtys[item.itemId] ?? item.suggestedReorderQty;
                  const itemTotalCost = Math.round(effectiveQty * item.unitCost);

                  return (
                    <tr
                      key={`${item.itemId}-${item.branchId}`}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Dooro ${item.itemName}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(item.itemId)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Product Name & SKU */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{item.itemName}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{item.sku}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                          {item.packType && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-slate-500">{item.packType}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Branch Name */}
                      <td className="p-3">
                        <div className="font-medium text-slate-700 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{item.branchName}</span>
                        </div>
                      </td>

                      {/* Current Stock & Min Threshold */}
                      <td className="p-3 text-center">
                        <div className="font-bold text-slate-800">
                          {item.currentStock} pcs
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {item.minThreshold} pcs
                        </div>
                      </td>

                      {/* Velocity */}
                      <td className="p-3 text-center">
                        <div className="font-semibold text-slate-800 flex items-center justify-center gap-1">
                          <span>{item.dailyVelocity}</span>
                          <span className="text-[10px] text-slate-500 font-normal">/maalin</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ~{item.weeklyVelocity} pcs/wk
                        </div>
                      </td>

                      {/* Stockout Horizon Days */}
                      <td className="p-3 text-center">
                        {item.daysUntilStockout <= 5 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            {item.daysUntilStockout === 0 ? 'Dhammaatay' : `${item.daysUntilStockout} maalmood`}
                          </span>
                        ) : item.daysUntilStockout <= 14 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            {item.daysUntilStockout} maalmood
                          </span>
                        ) : item.daysUntilStockout > 60 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            &gt; 60 maalmood
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            {item.daysUntilStockout} maalmood
                          </span>
                        )}
                      </td>

                      {/* Seasonal Impact */}
                      <td className="p-3 text-center">
                        {item.seasonalDemandShiftPct > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" />
                            +{item.seasonalDemandShiftPct}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">Deggan (0%)</span>
                        )}
                      </td>

                      {/* Suggested Reorder Qty (Editable) */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.itemId, Math.max(0, effectiveQty - 5))}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold"
                            title="-5"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            aria-label={`Tirada dalabka ee ${item.itemName}`}
                            value={effectiveQty}
                            onChange={(e) => handleQtyChange(item.itemId, Number(e.target.value))}
                            className="w-14 text-center py-1 text-xs font-bold text-slate-800 border-none outline-none"
                            min="0"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.itemId, effectiveQty + 5)}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-bold"
                            title="+5"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Estimated Cost */}
                      <td className="p-3 text-center">
                        <div className="font-semibold text-slate-800">
                          {currencySymbol}{itemTotalCost.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{currencySymbol}{item.unitCost}/pc
                        </div>
                      </td>

                      {/* AI Reasoning */}
                      <td className="p-3 max-w-xs">
                        <div className="text-slate-700 text-[11px] leading-tight">
                          {item.aiReasoning}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{item.recommendedAction}</span>
                        </div>
                      </td>

                      {/* Single Item Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemIds(new Set([item.itemId]));
                            setIsPOModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded text-[11px] font-semibold transition flex items-center gap-1 mx-auto"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Dalbo</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Waxaa la soo bandhigayaa {filteredItems.length} ka mid ah {reportData.recommendations.length} alaabood oo la falanqeeyay.
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              Wadarta Dalabka La Doortay: {
                Array.from(selectedItemIds).reduce((sum, id) => {
                  const it = reportData.recommendations.find(r => r.itemId === id);
                  const qty = it ? (adjustedQtys[id] ?? it.suggestedReorderQty) : 0;
                  return sum + qty;
                }, 0)
              } pcs
            </span>
          </div>
        </div>
      </div>

      {/* PO Creation Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                Abuur Purchase Order Qabyo ah (Draft PO)
              </h3>
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Alaab-qeybiyaha (Vendor Name):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Najax Wholesale, SomTrade Ltd..."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Xusuusin / Notes:
                </label>
                <textarea
                  rows={3}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Items Summary in Modal */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto space-y-1.5">
                <div className="font-semibold text-slate-700 text-[11px] mb-1">
                  Alaabta ku jirta dalabkan ({selectedItemIds.size}):
                </div>
                {reportData.recommendations
                  .filter(r => selectedItemIds.has(r.itemId))
                  .map(it => {
                    const finalQty = adjustedQtys[it.itemId] ?? it.suggestedReorderQty;
                    return (
                      <div key={it.itemId} className="flex justify-between items-center text-[11px] text-slate-600 border-b border-slate-100 pb-1">
                        <span className="font-medium text-slate-800">{it.itemName} ({it.branchName})</span>
                        <span>{finalQty} pcs × {currencySymbol}{it.unitCost} = <strong className="text-slate-800">{currencySymbol}{finalQty * it.unitCost}</strong></span>
                      </div>
                    );
                  })}
              </div>

              <div className="text-right text-xs font-bold text-slate-800 pt-1">
                Wadarta Guud ee Qiyaasta: {currencySymbol}
                {reportData.recommendations
                  .filter(r => selectedItemIds.has(r.itemId))
                  .reduce((sum, it) => {
                    const q = adjustedQtys[it.itemId] ?? it.suggestedReorderQty;
                    return sum + (q * it.unitCost);
                  }, 0).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPOModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Ka Noqo
              </button>
              <button
                type="button"
                onClick={handleCreatePurchaseOrder}
                disabled={isCreatingPO}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                {isCreatingPO ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Abuuraya...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Xaqiiji oo Abuur PO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveRestocking;
