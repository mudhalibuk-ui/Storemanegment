
import React, { useState, useRef } from 'react';
import { InventoryItem, InventoryAdjustment as AdjustmentType, User } from '../types';
import { API } from '../services/api';
import * as XLSX from 'xlsx';
import { 
  Settings2, 
  Plus, 
  Minus, 
  RotateCcw, 
  History, 
  Search, 
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  Calendar,
  FileUp,
  Download
} from 'lucide-react';

interface InventoryAdjustmentProps {
  user: User;
  inventory: InventoryItem[];
  adjustments: AdjustmentType[];
  onRefresh: () => void;
}

const InventoryAdjustment: React.FC<InventoryAdjustmentProps> = ({ user, inventory, adjustments, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAdjustments = adjustments.filter(a => 
    a.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.reason.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await API.inventoryAdjustments.save({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        type: adjustmentType,
        quantity,
        reason,
        createdBy: user.username,
        xarunId: user.xarunId || ''
      });
      
      setIsModalOpen(false);
      setSelectedItem(null);
      setQuantity(0);
      setReason('');
      onRefresh();
      alert("✅ Inventory adjusted successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const validAdjustments: any[] = [];
        const errors: string[] = [];

        for (const row of data) {
          // Expected columns: SKU, Type (ADD/REMOVE/SET), Qty, Reason
          // OR: SKU, New Qty (which implies SET)
          const sku = row.SKU || row.sku;
          let type = (row.Type || row.type || '').toUpperCase();
          let qty = Number(row.Qty || row.qty || row.Quantity || row.quantity || 0);
          const newQty = row['New Qty'] || row['new_qty'] || row['New Quantity'];
          const reasonText = row.Reason || row.reason || 'Excel Import';

          const item = inventory.find(i => i.sku === String(sku));
          if (!item) {
            errors.push(`SKU aan la aqoon: ${sku}`);
            continue;
          }

          // If "New Qty" is provided, it's a SET operation
          if (newQty !== undefined && newQty !== '') {
            type = 'SET';
            qty = Number(newQty);
          }

          if (!type) type = 'SET'; // Default to SET if not specified

          if (!['ADD', 'REMOVE', 'SET'].includes(type)) {
            errors.push(`Type aan sax ahayn: ${type} (SKU: ${sku})`);
            continue;
          }

          validAdjustments.push({
            itemId: item.id,
            itemName: item.name,
            type: type as 'ADD' | 'REMOVE' | 'SET',
            quantity: qty,
            reason: reasonText,
            createdBy: user.username,
            xarunId: user.xarunId || ''
          });
        }

        if (errors.length > 0) {
          alert("Qaladaad ayaa dhacay:\n" + errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...iyo ${errors.length - 5} kale` : ""));
        }

        if (validAdjustments.length > 0) {
          const confirmImport = window.confirm(`Ma hubtaa inaad soo galiso ${validAdjustments.length} adjustment?`);
          if (confirmImport) {
            const success = await API.inventoryAdjustments.bulkSave(validAdjustments);
            if (success) {
              alert(`✅ Si guul leh ayaa loo soo galiyey ${validAdjustments.length} adjustment!`);
              onRefresh();
            } else {
              alert("❌ Khalad ayaa dhacay intii lagu guda jiray soo gelinta.");
            }
          }
        } else {
          alert("Ma jiro wax xog ah oo sax ah oo la soo gelin karo.");
        }
      } catch (err) {
        console.error(err);
        alert("Khalad ayaa dhacay akhrinta faylka Excel.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = inventory.map(item => ({
      SKU: item.sku,
      Name: item.name,
      'Current Qty': item.quantity,
      'New Qty': '', // User fills this
      Reason: 'Stock count correction'
    }));

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_List");
    XLSX.writeFile(wb, "Inventory_Adjustment_Template.xlsx");
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Settings2 className="text-indigo-600" /> Inventory Adjustment
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Toosinta iyo saxitaanka tirada alaabta</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleImportExcel} 
          />
          <button 
            onClick={downloadTemplate}
            className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2"
            title="Download Template"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <FileUp size={16} /> {isImporting ? 'Soo galinaya...' : 'Import Excel'}
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search adjustments..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Adjustment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <History size={18} className="text-indigo-600" /> Recent Adjustments
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdjustments.map(adj => (
                <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Calendar size={14} className="text-slate-300" />
                      {new Date(adj.timestamp).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-6 text-sm font-black text-slate-800 uppercase">{adj.itemName}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 w-fit ${
                      adj.type === 'ADD' ? 'bg-emerald-50 text-emerald-600' :
                      adj.type === 'REMOVE' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {adj.type === 'ADD' && <Plus size={10} />}
                      {adj.type === 'REMOVE' && <Minus size={10} />}
                      {adj.type === 'SET' && <RotateCcw size={10} />}
                      {adj.type}
                    </span>
                  </td>
                  <td className={`p-6 text-sm font-black text-right ${
                    adj.type === 'ADD' ? 'text-emerald-600' :
                    adj.type === 'REMOVE' ? 'text-rose-600' :
                    'text-blue-600'
                  }`}>
                    {adj.type === 'REMOVE' ? '-' : ''}{adj.quantity}
                  </td>
                  <td className="p-6 text-xs font-bold text-slate-500 max-w-xs truncate">{adj.reason}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <UserIcon size={14} className="text-slate-300" />
                      {adj.createdBy}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">New Adjustment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sax tirada alaabta bakhaarka ku jirta</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-xl hover:rotate-90 transition-all">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Select Item</label>
                <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl no-scrollbar">
                  {inventory.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-xl text-left transition-all flex justify-between items-center ${
                        selectedItem?.id === item.id 
                        ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' 
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black uppercase">{item.name}</p>
                        <p className={`text-[10px] font-bold uppercase ${selectedItem?.id === item.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          SKU: {item.sku}
                        </p>
                      </div>
                      <p className="text-sm font-black">Current: {item.quantity}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Adjustment Type</label>
                  <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl">
                    {(['ADD', 'REMOVE', 'SET'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdjustmentType(t)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                          adjustmentType === t 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quantity</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-indigo-500 transition-all outline-none"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reason / Note</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="E.g., Damaged item, Stock count correction..."
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-indigo-500 transition-all outline-none resize-none"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!selectedItem}
                  className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAdjustment;
