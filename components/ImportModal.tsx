
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, Branch } from '../types';

interface ImportModalProps {
  branches: Branch[];
  onImport: (items: InventoryItem[]) => void;
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ branches, onImport, onCancel }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
        alert("Cilad ayaa ku dhacday aqrinta faylka. Hubi inuu yahay Excel sax ah.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const processImport = () => {
    const newItems: InventoryItem[] = previewData.map((row, index) => {
      // Helper function to find column value by multiple names
      const findVal = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        const match = keys.find(k => rowKeys.some(rk => rk.toLowerCase().trim() === k.toLowerCase().trim()));
        if (match) {
           const actualKey = rowKeys.find(rk => rk.toLowerCase().trim() === match.toLowerCase().trim());
           return row[actualKey!];
        }
        return null;
      };

      const branchNameInput = (findVal(row, ['Branch', 'Bakhaar', 'Bakhaarka', 'BranchName']) || '').toString().toLowerCase();
      const branchMatch = branches.find(b => 
        b.name.toLowerCase() === branchNameInput
      );

      const shelfVal = findVal(row, ['Shelf', 'Iskafalo', 'ShelfNum', 'Iskafalada', 'Shelf_Num']);
      const sectionVal = findVal(row, ['Section', 'Godka', 'SectionNum', 'God', 'Section_Num']);

      return {
        id: `i-import-${Date.now()}-${index}`,
        name: findVal(row, ['Name', 'Magaca', 'Item', 'Product']) || 'Unknown Item',
        category: findVal(row, ['Category', 'Nooca', 'Cat']) || 'General',
        sku: (findVal(row, ['SKU', 'Code', 'Barcode']) || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`).toString(),
        shelves: parseInt(shelfVal) || 1,
        sections: parseInt(sectionVal) || 1,
        quantity: parseInt(findVal(row, ['Quantity', 'Tirada', 'Qty', 'Stock'])) || 0,
        branchId: branchMatch?.id || branches[0].id,
        lastUpdated: new Date().toISOString(),
        minThreshold: parseInt(findVal(row, ['MinThreshold', 'Halis', 'Alert'])) || 5
      };
    });

    onImport(newItems);
  };

  const downloadTemplate = () => {
    const template = [
      { 
        Magaca: 'Solar Panel 400W', 
        SKU: 'SOL-400', 
        Nooca: 'Energy', 
        Tirada: 10, 
        Bakhaar: branches[0]?.name || 'Main Warehouse', 
        Iskafalo: 1, 
        Godka: 5, 
        Halis: 5 
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SmartStock_Template");
    XLSX.writeFile(wb, "SmartStock_Template.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">📥</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Import Excel 🚀</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Hubi in "Iskafalo" iyo "Godka" ay ku jiraan faylkaaga.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {!previewData.length ? (
            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3rem] p-12 text-center">
              <div className="text-6xl mb-6">📄</div>
              <h3 className="text-xl font-black text-slate-800">Dooro faylka Excel (.xlsx)</h3>
              <div className="mt-8 flex gap-4">
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black cursor-pointer shadow-xl transition-all active:scale-95 text-xs uppercase">
                  XUL FAYLKA
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </label>
                <button onClick={downloadTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-black text-xs uppercase">TEMPLATE</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto rounded-[2rem] border border-slate-100 no-scrollbar shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Product</th>
                      <th className="px-8 py-5">SKU</th>
                      <th className="px-8 py-5">Qty</th>
                      <th className="px-8 py-5">Shelf (Iskafalo)</th>
                      <th className="px-8 py-5">Section (Godka)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 50).map((row, i) => {
                         const findVal = (row: any, keys: string[]) => {
                            const rowKeys = Object.keys(row);
                            const match = keys.find(k => rowKeys.some(rk => rk.toLowerCase().trim() === k.toLowerCase().trim()));
                            if (match) {
                               const actualKey = rowKeys.find(rk => rk.toLowerCase().trim() === match.toLowerCase().trim());
                               return row[actualKey!];
                            }
                            return null;
                          };
                        return (
                          <tr key={i} className="text-sm font-bold text-slate-700 hover:bg-indigo-50/30 transition-colors">
                            <td className="px-8 py-4">{findVal(row, ['Name', 'Magaca']) || '-'}</td>
                            <td className="px-8 py-4 opacity-50">{findVal(row, ['SKU', 'Code']) || '-'}</td>
                            <td className="px-8 py-4 text-indigo-600">{findVal(row, ['Quantity', 'Tirada', 'Qty']) || 0}</td>
                            <td className="px-8 py-4 font-black">{findVal(row, ['Shelf', 'Iskafalo']) || 1}</td>
                            <td className="px-8 py-4 font-black">{findVal(row, ['Section', 'Godka']) || 1}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
                {previewData.length > 50 && <div className="p-4 text-center text-xs font-bold text-slate-400">... iyo {previewData.length - 50} kale ...</div>}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-3xl uppercase text-[10px]">KABAX</button>
          <button 
            disabled={!previewData.length || loading}
            onClick={processImport}
            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl transition-all uppercase text-[10px]"
          >
            {loading ? 'SHAQADAA SOCOTA...' : `HADA KEYDI ${previewData.length} ITEMS`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
