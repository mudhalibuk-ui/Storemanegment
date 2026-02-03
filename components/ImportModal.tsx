
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
  const [selectedDefaultBranch, setSelectedDefaultBranch] = useState(branches[0]?.id || '');

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
        if (!bstr) throw new Error("File could not be read");
        
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          alert("Faylka waa faaruq!");
          return;
        }
        setPreviewData(data);
      } catch (err) {
        console.error("Import Error:", err);
        alert("Cilad: Ma suuragalin in la aqriyo Excel-ka.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const processImport = () => {
    if (previewData.length === 0) return;
    if (!selectedDefaultBranch && branches.length === 0) {
      alert("Cilad: Ma jiro Bakhaar aad ku shubto xogta. Fadlan marka hore abuur Bakhaar.");
      return;
    }
    
    setLoading(true);
    
    try {
      const newItems: any[] = previewData.map((row) => {
        // Find branch mapping with more Somali/English synonyms
        const branchNameInput = (findVal(row, ['Branch', 'Bakhaar', 'Bakhaarka', 'Branch Name', 'Warehouse', 'Xarun', 'Goobta']) || '').toString().toLowerCase();
        let branchMatch = branches.find(b => b.name.toLowerCase().includes(branchNameInput) || b.id === branchNameInput);
        
        const finalBranchId = branchMatch?.id || selectedDefaultBranch;
        const targetBranch = branches.find(b => b.id === finalBranchId);

        const rawShelf = (findVal(row, ['Shelf', 'Iskafalo', 'Iskafalada', 'Iska', 'Shelf Number', 'Safaxad']) || '1').toString();
        const rawSection = (findVal(row, ['Section', 'Godka', 'God', 'Go', 'Slot', 'Qaybta']) || '1').toString();

        return {
          name: (findVal(row, ['Name', 'Magaca', 'Product', 'Alaabta', 'Shayga']) || 'Unnamed Product').toString(),
          category: (findVal(row, ['Category', 'Nooca', 'Cat', 'Qaybta Alaabta']) || 'General').toString(),
          sku: (findVal(row, ['SKU', 'Code', 'Barcode', 'Sumadda', 'Id Code']) || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`).toString(),
          shelves: letterToNumber(rawShelf),
          sections: parseInt(rawSection) || 1,
          quantity: parseInt(findVal(row, ['Quantity', 'Tirada', 'Qty', 'Stock', 'Maduushada'])) || 0,
          branchId: finalBranchId,
          lastUpdated: new Date().toISOString(),
          minThreshold: parseInt(findVal(row, ['MinThreshold', 'Halis', 'Alert', 'Alert Level', 'Heerka Digniinta'])) || 5,
          xarunId: targetBranch?.xarunId || 'x1'
        };
      });

      onImport(newItems as any);
    } catch (err) {
      console.error("Mapping Error:", err);
      alert("Cilad: Xogta Excel-ka ma lahan qaabka saxda ah ama columns-ka ayaa ka maqan.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">📥</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Bulk Import Excel 🚀</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Soo gali xogta adigoo isticmaalaya faylka Excel.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bakhaarka lagu shubayo (Default)</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500"
                  value={selectedDefaultBranch}
                  onChange={(e) => setSelectedDefaultBranch(e.target.value)}
                >
                  <option value="">Dooro Bakhaar...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                  ))}
                </select>
             </div>
             
             {!previewData.length ? (
               <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl transition-all active:scale-95 text-xs uppercase tracking-[0.2em] text-center">
                  {loading ? 'AQRINAYA...' : 'DOORO EXCEL'}
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
               </label>
             ) : (
               <button onClick={() => setPreviewData([])} className="py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-rose-100">Bedel Faylka</button>
             )}
          </div>

          {previewData.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Hordhaca Xogta ({previewData.length} Items)</h3>
              </div>
              <div className="flex-1 overflow-auto rounded-[2rem] border border-slate-100 no-scrollbar shadow-inner bg-slate-50/30">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Alaabta</th>
                      <th className="px-8 py-5">SKU</th>
                      <th className="px-8 py-5">Bakhaarka</th>
                      <th className="px-8 py-5">Placement</th>
                      <th className="px-8 py-5">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 50).map((row, i) => {
                        const branchNameInput = (findVal(row, ['Branch', 'Bakhaar', 'Bakhaarka']) || '').toString().toLowerCase();
                        const branchMatch = branches.find(b => b.name.toLowerCase().includes(branchNameInput) || b.id === branchNameInput);
                        const finalBranch = branchMatch || branches.find(b => b.id === selectedDefaultBranch);
                        
                        return (
                          <tr key={i} className="text-sm font-bold text-slate-700 hover:bg-indigo-50/30">
                            <td className="px-8 py-4 truncate max-w-[200px]">{findVal(row, ['Name', 'Magaca']) || '-'}</td>
                            <td className="px-8 py-4 font-mono text-xs">{findVal(row, ['SKU', 'Code']) || 'Auto'}</td>
                            <td className="px-8 py-4">
                               <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${branchMatch ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                 {finalBranch?.name || 'Lama helin'}
                               </span>
                            </td>
                            <td className="px-8 py-4 font-black text-[10px] text-slate-400">
                               {findVal(row, ['Shelf', 'Iskafalo']) || '1'}-{findVal(row, ['Section', 'Godka']) || '1'}
                            </td>
                            <td className="px-8 py-4 text-emerald-600 font-black">{findVal(row, ['Quantity', 'Tirada']) || 0}</td>
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
          <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest">JOOJI</button>
          <button 
            disabled={!previewData.length || loading}
            onClick={processImport}
            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            {loading ? 'HADA KEYDINAYA...' : `HADA KEYDI ${previewData.length} ITEMS`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
