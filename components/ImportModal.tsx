
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
      // Find branch ID by name (case insensitive)
      const branchNameInput = (row.Branch || row.Bakhaar || '').toString().toLowerCase();
      const branchMatch = branches.find(b => 
        b.name.toLowerCase() === branchNameInput
      );

      return {
        id: `i-import-${Date.now()}-${index}`,
        name: row.Name || row.Magaca || 'Unknown Item',
        category: row.Category || row.Nooca || 'General',
        sku: (row.SKU || row.Code || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`).toString(),
        shelves: parseInt(row.Shelf || row.Iskafalo || row.ShelfNum) || 1,
        sections: parseInt(row.Section || row.Godka || row.SectionNum) || 1,
        quantity: parseInt(row.Quantity || row.Tirada || row.Qty) || 0,
        branchId: branchMatch?.id || branches[0].id,
        lastUpdated: new Date().toISOString(),
        minThreshold: parseInt(row.MinThreshold || row.Halis) || 5
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
      },
      { 
        Magaca: 'Generator 5KW', 
        SKU: 'GEN-005', 
        Nooca: 'Hardware', 
        Tirada: 2, 
        Bakhaar: branches[0]?.name || 'Main Warehouse', 
        Iskafalo: 2, 
        Godka: 1, 
        Halis: 1 
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SmartStock_Template");
    XLSX.writeFile(wb, "SmartStock_Template_Somali.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">📥</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Soo Geli Xogta (Excel)</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Wada geli Magaca, Tirada, Bakhaarka, iyo Booska (Shelf/God)</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {!previewData.length ? (
            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3rem] p-12 text-center group hover:border-indigo-200 transition-all">
              <div className="text-6xl mb-6">📄</div>
              <h3 className="text-xl font-black text-slate-800">Dooro faylka Excel (.xlsx)</h3>
              <p className="text-slate-400 max-w-md mt-4 font-medium leading-relaxed">
                Waa inuu faylku leeyahay tiirarka (Columns): <br/>
                <span className="text-indigo-600 font-black">Magaca, SKU, Tirada, Bakhaar, Iskafalo, Godka.</span>
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black cursor-pointer shadow-xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
                  XUL FAYLKA EXCEL-KA
                  <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                </label>
                <button 
                  onClick={downloadTemplate}
                  className="bg-white border-2 border-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  SOO DEJI TEMPLATE (SOMALI)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Hadda waxaa ku jira:</span>
                  <span className="text-sm font-black text-indigo-600">{fileName} ({previewData.length} items)</span>
                </div>
                <button onClick={() => setPreviewData([])} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Badal Faylka</button>
              </div>
              
              <div className="flex-1 overflow-auto rounded-[2rem] border border-slate-100 no-scrollbar shadow-inner bg-slate-50/30">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Alaabta (Name)</th>
                      <th className="px-8 py-5">SKU</th>
                      <th className="px-8 py-5">Tirada (Qty)</th>
                      <th className="px-8 py-5">Bakhaarka</th>
                      <th className="px-8 py-5">Iskafalo (Shelf)</th>
                      <th className="px-8 py-5">Godka (Section)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, i) => (
                      <tr key={i} className="text-sm font-bold text-slate-700 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-8 py-4 font-black">{row.Name || row.Magaca || '-'}</td>
                        <td className="px-8 py-4 text-[10px] font-mono opacity-50">{row.SKU || row.Code || '-'}</td>
                        <td className="px-8 py-4 text-indigo-600">{row.Quantity || row.Tirada || row.Qty || 0}</td>
                        <td className="px-8 py-4">{row.Branch || row.Bakhaar || '-'}</td>
                        <td className="px-8 py-4 text-center">{row.Shelf || row.Iskafalo || 1}</td>
                        <td className="px-8 py-4 text-center">{row.Section || row.Godka || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-3xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest">
            KABAX
          </button>
          <button 
            disabled={!previewData.length || loading}
            onClick={processImport}
            className="flex-[2] py-5 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-3xl shadow-2xl shadow-indigo-200 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
          >
            {loading ? 'SHAQADAA SOCOTA...' : 'HADA KEYDI XOGTAN'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
