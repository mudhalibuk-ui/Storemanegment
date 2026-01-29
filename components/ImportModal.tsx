
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, Branch } from '../types';
import { letterToNumber } from '../services/mappingUtils';

interface ImportModalProps {
  branches: Branch[];
  onImport: (items: InventoryItem[]) => void;
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ branches, onImport, onCancel }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const findVal = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    const match = keys.find(k => rowKeys.some(rk => rk.toLowerCase().trim() === k.toLowerCase().trim()));
    if (match) {
       const actualKey = rowKeys.find(rk => rk.toLowerCase().trim() === match.toLowerCase().trim());
       return row[actualKey!];
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setPreviewData(data);
      } catch (err) {
        alert("Cilad ayaa ku dhacday aqrinta faylka.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const processImport = () => {
    const newItems: InventoryItem[] = previewData.map((row, index) => {
      const branchNameInput = (findVal(row, ['Branch', 'Bakhaar', 'Bakhaarka', 'Bakhaar_Name']) || '').toString().toLowerCase();
      const branchMatch = branches.find(b => b.name.toLowerCase() === branchNameInput);

      const rawShelf = (findVal(row, ['Shelf', 'Iskafalo', 'Iskafalada', 'ShelfNum', 'Shelf_Num', 'Iska']) || '1').toString();
      const rawSection = (findVal(row, ['Section', 'Godka', 'God', 'SectionNum', 'Section_Num', 'Go']) || '1').toString();

      return {
        id: `i-import-${Date.now()}-${index}`,
        name: findVal(row, ['Name', 'Magaca', 'Item', 'Product']) || 'No Name',
        category: findVal(row, ['Category', 'Nooca', 'Cat']) || 'General',
        sku: (findVal(row, ['SKU', 'Code', 'Barcode']) || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`).toString(),
        shelves: letterToNumber(rawShelf), // Halkan ayaa lagu saxayaa haddii ay tahay "A" ama "1"
        sections: parseInt(rawSection) || 1,
        quantity: parseInt(findVal(row, ['Quantity', 'Tirada', 'Qty', 'Stock'])) || 0,
        branchId: branchMatch?.id || branches[0].id,
        lastUpdated: new Date().toISOString(),
        minThreshold: parseInt(findVal(row, ['MinThreshold', 'Halis', 'Alert'])) || 5
      };
    });

    onImport(newItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">📥</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Import Excel 🚀</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Excel-kaaga hadda "A" ama "1" waa laga aqbalayaa Iskafalada.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {!previewData.length ? (
            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3rem] p-12 text-center">
              <div className="text-6xl mb-6">📄</div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Dooro faylka Excel (.xlsx)</h3>
              <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Waa inuu leeyahay tiirarka: Magaca, SKU, Iskafalo, Godka</p>
              <div className="mt-8">
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl transition-all active:scale-95 text-xs uppercase tracking-[0.2em]">
                  XUL FAYLKA EXCEL
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto rounded-[2rem] border border-slate-100 no-scrollbar shadow-inner bg-slate-50/30">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Product</th>
                      <th className="px-8 py-5">Iskafalo (Raw)</th>
                      <th className="px-8 py-5">Iskafalo (Mapped)</th>
                      <th className="px-8 py-5">Godka</th>
                      <th className="px-8 py-5">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 50).map((row, i) => {
                        const rawShelf = (findVal(row, ['Shelf', 'Iskafalo', 'Iskafalada']) || '1').toString();
                        const mappedShelf = letterToNumber(rawShelf);
                        return (
                          <tr key={i} className="text-sm font-bold text-slate-700 hover:bg-indigo-50/30">
                            <td className="px-8 py-4">{findVal(row, ['Name', 'Magaca']) || '-'}</td>
                            <td className="px-8 py-4 text-slate-400">{rawShelf}</td>
                            <td className="px-8 py-4 text-indigo-600 font-black">Shelf {mappedShelf}</td>
                            <td className="px-8 py-4 font-black">{findVal(row, ['Section', 'Godka']) || 1}</td>
                            <td className="px-8 py-4 text-emerald-600">{findVal(row, ['Quantity', 'Tirada']) || 0}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-3xl uppercase text-[10px] tracking-widest">KABAX</button>
          <button 
            disabled={!previewData.length || loading}
            onClick={processImport}
            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl transition-all uppercase text-[10px] tracking-widest"
          >
            {loading ? 'PROCESS-ING...' : `HADA KEYDI ${previewData.length} ITEMS`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
