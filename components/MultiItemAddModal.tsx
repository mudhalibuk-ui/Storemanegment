import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Branch, Xarun, InventoryItem, ItemType } from '../types';
import { generateId } from '../services/api';

  interface MultiItemAddModalProps {
  branches: Branch[];
  xarumo: Xarun[];
  userXarunId?: string;
  onSave: (items: Partial<InventoryItem>[], replicateToAllBranches: boolean) => Promise<boolean>;
  onCancel: () => void;
}

export const MultiItemAddModal: React.FC<MultiItemAddModalProps> = ({ branches, xarumo, userXarunId, onSave, onCancel }) => {
  const defaultXarun = userXarunId || xarumo[0]?.id || '';
  const defaultBranch = branches.filter(b => b.xarunId === defaultXarun)[0]?.id || branches[0]?.id || '';

  const ITEM_TYPES: { id: ItemType, label: string }[] = [
    { id: 'STOCK', label: 'Stock Item' },
    { id: 'NON_STOCK', label: 'Non-Stock Item' },
    { id: 'SERVICE', label: 'Service' },
    { id: 'ASSEMBLE', label: 'Assemble' }
  ];

  const getEmptyRow = () => ({
    id: generateId(),
    name: '',
    sku: '',
    category: '',
    itemType: 'STOCK' as ItemType,
    lastKnownPrice: 0, // Cost price
    sellingPrice: 0,
    quantity: 0,
    shelves: 1,
    sections: 1,
    xarunId: defaultXarun,
    branchId: defaultBranch
  });

  const [rows, setRows] = useState<any[]>([getEmptyRow(), getEmptyRow(), getEmptyRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showWarehouseData, setShowWarehouseData] = useState(false);

  const addRow = () => setRows([...rows, getEmptyRow()]);

  const updateRow = (index: number, field: string, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length > 1) {
          // Find headers
          const headers = (data[0] as unknown[]).map(h => String(h).toLowerCase().trim());
          const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('magac') || h === 'item');
          const skuIdx = headers.findIndex(h => h.includes('sku') || h.includes('code') || h.includes('barcode'));
          const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('price') || h.includes('qiimo'));
          const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('nooc'));
          const catIdx = headers.findIndex(h => h.includes('category') || h.includes('qeyb'));
          const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('tirada'));
          const sellIdx = headers.findIndex(h => h.includes('sell') || h.includes('sale') || h.includes('lacagta'));
          
          if (nameIdx === -1) {
             alert('File-ka qaybta "Name" ama "Magaca" ayaa ka maqan (Column Name).');
             setIsUploading(false);
             return;
          }

          const parsedRows: any[] = [];
          for (let i = 1; i < data.length; i++) {
            const rowData: any = data[i];
            if (!rowData || !rowData[nameIdx] || String(rowData[nameIdx]).trim() === '') continue;

            let itemType: ItemType = 'STOCK';
            if (typeIdx !== -1 && rowData[typeIdx]) {
               const rawType = String(rowData[typeIdx]).toUpperCase().trim();
               if (rawType.includes('NON')) itemType = 'NON_STOCK';
               else if (rawType.includes('SERV')) itemType = 'SERVICE';
               else if (rawType.includes('ASSEM')) itemType = 'ASSEMBLE';
            }

            parsedRows.push({
               id: generateId(),
               name: String(rowData[nameIdx]).trim(),
               sku: skuIdx !== -1 && rowData[skuIdx] ? String(rowData[skuIdx]).trim() : '',
               category: catIdx !== -1 && rowData[catIdx] ? String(rowData[catIdx]).trim() : '',
               itemType,
               lastKnownPrice: costIdx !== -1 && rowData[costIdx] ? parseFloat(rowData[costIdx]) || 0 : 0,
               sellingPrice: sellIdx !== -1 && rowData[sellIdx] ? parseFloat(rowData[sellIdx]) || 0 : 0,
               quantity: qtyIdx !== -1 && rowData[qtyIdx] ? parseFloat(rowData[qtyIdx]) || 0 : 0,
               shelves: 1,
               sections: 1,
               xarunId: defaultXarun,
               branchId: defaultBranch
            });
          }

          if (parsedRows.length > 0) {
             // Overwrite if only empty rows existed, otherwise append
             const currentValidRows = rows.filter(r => r.name.trim() !== '');
             if (currentValidRows.length === 0) {
                setRows(parsedRows);
             } else {
                setRows([...currentValidRows, ...parsedRows]);
             }
          }
        }
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Khalad ayaa dhacay inta la akhrinayay file-ka.');
      }
      setIsUploading(false);
      if (e.target) e.target.value = '';
    };

    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    try {
      const validRows = rows.filter(r => r.name && String(r.name).trim() !== '');
      if (validRows.length === 0) return;

      setIsSaving(true);
      const mappedRows = validRows.map(row => {
          // Auto-generate SKU if omitted
          const safeSku = row.sku ? String(row.sku).trim() : '';
          const generatedSku = safeSku || `SKU-${Math.floor(10000 + Math.random() * 90000)}`;
          return {
              id: row.id || generateId(),
              name: String(row.name).trim(),
              sku: generatedSku,
              category: row.category ? String(row.category).trim() : '',
              itemType: row.itemType,
              lastKnownPrice: row.lastKnownPrice,
              sellingPrice: row.sellingPrice || row.lastKnownPrice || 0,
              xarunId: row.xarunId,
              branchId: row.branchId,
              quantity: showWarehouseData ? (row.quantity || 0) : 0,
              shelves: showWarehouseData ? (row.shelves || 1) : 1,
              sections: showWarehouseData ? (row.sections || 1) : 1,
              minThreshold: 5
          };
      });

      const success = await onSave(mappedRows, !showWarehouseData);

      setIsSaving(false);
      if (success) {
        onCancel();
      } else {
        alert("Cilad ayaa dhacday inta lagu guda jiray xog gelinta.");
      }
    } catch (e: any) {
      console.error("MultiItemAddModal handleSave Error:", e);
      setIsSaving(false);
      alert("Cilad ayaa dhacday: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-in zoom-in duration-300">
        
        <div className="p-6 md:p-8 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 tracking-tighter rounded-xl flex items-center justify-center text-2xl">✨</div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Qor Alaabta Cusub (Multiple Items)</h2>
              <p className="text-[10px] font-bold uppercase opacity-80 mt-1">Ku dar dhawr alaabood marqura</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowWarehouseData(!showWarehouseData)}
              className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${showWarehouseData ? 'bg-amber-400 text-amber-900 border-2 border-amber-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              {showWarehouseData ? '📦 BAKHAAR YAA FURAN' : '📦 MACLUUMAADKA BAKHAARKA'}
            </button>
            <label className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold cursor-pointer text-xs uppercase tracking-wider transition-all flex items-center gap-2">
              {isUploading ? 'AQRINAYA...' : '➕ EXCEL SHUB'}
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 transition-all font-black" disabled={isSaving || isUploading}>✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4 shrink-0">
          <div className="bg-white border rounded-[1.5rem] shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Magaca Alaabta *</th>
                  <th className="px-4 py-3 min-w-[120px]">SKU (Optional)</th>
                  <th className="px-4 py-3 min-w-[100px]">Cost (Optional)</th>
                  {showWarehouseData && <th className="px-4 py-3 min-w-[100px] bg-indigo-50 text-indigo-700">Tirada (Qty)</th>}
                  {showWarehouseData && <th className="px-4 py-3 min-w-[100px] bg-indigo-50 text-indigo-700">Lacagta (Sell)</th>}
                  <th className="px-4 py-3 min-w-[150px]">Nooca (Type)</th>
                  <th className="px-4 py-3 min-w-[150px]">Category (Optional)</th>
                  {showWarehouseData && <th className="px-4 py-3 min-w-[150px] bg-indigo-50 text-indigo-700">Bakhaar</th>}
                  <th className="px-4 py-3 w-16 text-center">Tirtir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.name} 
                        onChange={e => updateRow(idx, 'name', e.target.value)}
                        placeholder="Naamka..."
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.sku} 
                        onChange={e => updateRow(idx, 'sku', e.target.value)}
                        placeholder="Auto"
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all font-mono"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        value={row.lastKnownPrice || ''} 
                        onChange={e => updateRow(idx, 'lastKnownPrice', parseFloat(e.target.value) || 0)}
                        placeholder="$ 0.00"
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all"
                      />
                    </td>
                    {showWarehouseData && (
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={row.quantity || ''} 
                          onChange={e => updateRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full p-3 bg-slate-50 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all"
                        />
                      </td>
                    )}
                    {showWarehouseData && (
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={row.sellingPrice || ''} 
                          onChange={e => updateRow(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                          placeholder="$ 0.00"
                          className="w-full p-3 bg-slate-50 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all"
                        />
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <select
                        value={row.itemType}
                        onChange={e => updateRow(idx, 'itemType', e.target.value)}
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all cursor-pointer"
                      >
                        {ITEM_TYPES.map(t => <option value={t.id} key={t.id}>{t.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.category} 
                        onChange={e => updateRow(idx, 'category', e.target.value)}
                        placeholder="Category..."
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all"
                      />
                    </td>
                    {showWarehouseData && (
                      <td className="px-4 py-2">
                        <select
                          value={row.branchId}
                          onChange={e => {
                              const bId = e.target.value;
                              const xId = branches.find(b => b.id === bId)?.xarunId || row.xarunId;
                              updateRow(idx, 'branchId', bId);
                              updateRow(idx, 'xarunId', xId);
                          }}
                          className="w-full p-3 bg-slate-50 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl font-bold text-sm outline-none transition-all cursor-pointer truncate"
                        >
                          {branches.map(b => <option value={b.id} key={b.id}>{b.name.substring(0, 15)}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-2 text-center">
                      <button 
                        onClick={() => removeRow(idx)}
                        className="w-10 h-10 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl font-black text-xl transition-all"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center">
             <button 
                onClick={addRow}
                className="bg-indigo-50 text-indigo-600 px-6 py-3 border-2 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 rounded-xl font-black text-xs uppercase tracking-widest transition-all focus:scale-95"
             >
                + Ku dar Saf Kale
             </button>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all"
            disabled={isSaving}
          >
            JOOJI
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-indigo-700 shadow-xl transition-all disabled:opacity-50"
            disabled={isSaving || rows.filter(r => r.name.trim() !== '').length === 0}
          >
            {isSaving ? 'WAA LA KEYDINAYAA...' : `KEYDI ${rows.filter(r=>r.name.trim()!=='').length} ALAAB`}
          </button>
        </div>

      </div>
    </div>
  );
};
