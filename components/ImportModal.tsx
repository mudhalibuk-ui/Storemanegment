
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
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDefaultBranch, setSelectedDefaultBranch] = useState(branches[0]?.id || '');

  // Somali & English Synonyms for automatic mapping
  const MAPPINGS = {
    name: ['Name', 'Magaca', 'Product', 'Alaabta', 'Shayga', 'Mudo', 'Item'],
    sku: ['SKU', 'Code', 'Barcode', 'Sumadda', 'Id Code', 'Lambar', 'Suku'],
    category: ['Category', 'Nooca', 'Cat', 'Qaybta Alaabta', 'Qaybta'],
    quantity: ['Quantity', 'Tirada', 'Qty', 'Stock', 'Maduushada', 'Tira'],
    shelf: ['Shelf', 'Iskafalo', 'Iskafalada', 'Iska', 'Shelf Number', 'Safaxad', 'Shelf'],
    section: ['Section', 'Godka', 'God', 'Go', 'Slot', 'Qaybta', 'Section'],
    branch: ['Branch', 'Bakhaar', 'Bakhaarka', 'Branch Name', 'Warehouse', 'Goobta'],
    minThreshold: ['MinThreshold', 'Halis', 'Alert', 'Alert Level', 'Heerka Digniinta', 'Minimum']
  };

  const findVal = (row: any, mappingKeys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of mappingKeys) {
      const match = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
      if (match) return row[match];
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
        
        // Convert with raw: false to get formatted values (dates as strings etc)
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        if (data.length === 0) {
          alert("Faylka waa faaruq! Hubi in xogta ay ku jirto sheet-ka kowaad.");
          return;
        }

        setHeaders(Object.keys(data[0] as object));
        setPreviewData(data);
      } catch (err) {
        console.error("Import Error:", err);
        alert("Cilad: Ma suuragalin in la aqriyo Excel-ka. Fadlan hubi format-ka.");
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
      const processedItems: InventoryItem[] = previewData.map((row, index) => {
        // Find branch mapping
        const branchNameInput = (findVal(row, MAPPINGS.branch) || '').toString().toLowerCase().trim();
        let branchMatch = branches.find(b => 
          b.name.toLowerCase().trim() === branchNameInput || 
          b.id.toLowerCase().trim() === branchNameInput
        );
        
        const finalBranchId = branchMatch?.id || selectedDefaultBranch;
        const targetBranch = branches.find(b => b.id === finalBranchId);

        // Sanitize numbers
        const rawQty = findVal(row, MAPPINGS.quantity);
        const quantity = parseInt(rawQty) || 0;
        
        const rawMin = findVal(row, MAPPINGS.minThreshold);
        const minThreshold = parseInt(rawMin) || 5;

        const rawShelf = (findVal(row, MAPPINGS.shelf) || '1').toString();
        const rawSection = (findVal(row, MAPPINGS.section) || '1').toString();

        const name = (findVal(row, MAPPINGS.name) || 'Unnamed Product').toString().trim();
        const sku = (findVal(row, MAPPINGS.sku) || `AUTO-${index}-${Date.now().toString().slice(-4)}`).toString().trim();
        const category = (findVal(row, MAPPINGS.category) || 'General').toString().trim();

        return {
          id: `imp-${Date.now()}-${index}`,
          name,
          category,
          sku,
          shelves: letterToNumber(rawShelf),
          sections: parseInt(rawSection) || 1,
          quantity,
          branchId: finalBranchId,
          lastUpdated: new Date().toISOString(),
          minThreshold,
          xarunId: targetBranch?.xarunId || 'x1'
        };
      });

      // Filter out rows that are completely empty
      const validItems = processedItems.filter(item => item.name !== 'Unnamed Product' || item.sku.indexOf('AUTO-') === -1);
      
      if (validItems.length === 0) {
        alert("Cilad: Ma jiro xog sax ah oo laga helay Excel-ka. Hubi column-nada (Name, SKU, Qty).");
        setLoading(false);
        return;
      }

      onImport(validItems);
    } catch (err) {
      console.error("Mapping Error:", err);
      alert("Cilad ayaa dhacday xilligii xogta la habaynayay.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl animate-bounce">📥</div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Bulk Import Excel 🚀</h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Soo gali xogta adigoo isticmaalaya faylka Excel.</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all font-black">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bakhaarka lagu shubayo (Default)</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
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
                  {loading ? 'AQRINAYA...' : 'DOORO FAYLKA EXCEL'}
                  <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
               </label>
             ) : (
               <div className="flex gap-2">
                  <button onClick={() => setPreviewData([])} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-rose-100 hover:bg-rose-100">Bedel Faylka</button>
                  <button onClick={processImport} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-700">Xaqiiji & Keydi</button>
               </div>
             )}
          </div>

          {previewData.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Mapping Status:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MAPPINGS).map(([key, synonyms]) => {
                    const found = headers.some(h => synonyms.some(s => s.toLowerCase() === h.toLowerCase().trim()));
                    return (
                      <span key={key} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${found ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {key}: {found ? 'OK' : 'MISSING'}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-[2rem] border border-slate-100 no-scrollbar shadow-inner bg-slate-50/30">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">#</th>
                      <th className="px-8 py-5">Alaabta (Name)</th>
                      <th className="px-8 py-5">SKU</th>
                      <th className="px-8 py-5">Bakhaarka</th>
                      <th className="px-8 py-5">Godka (Loc)</th>
                      <th className="px-8 py-5">Tirada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, i) => {
                        const branchNameInput = (findVal(row, MAPPINGS.branch) || '').toString().toLowerCase().trim();
                        const branchMatch = branches.find(b => b.name.toLowerCase().trim() === branchNameInput || b.id === branchNameInput);
                        const finalBranch = branchMatch || branches.find(b => b.id === selectedDefaultBranch);
                        
                        return (
                          <tr key={i} className="text-sm font-bold text-slate-700 hover:bg-indigo-50/30">
                            <td className="px-8 py-4 text-[10px] text-slate-300">{i+1}</td>
                            <td className="px-8 py-4 truncate max-w-[200px] font-black">{findVal(row, MAPPINGS.name) || '-'}</td>
                            <td className="px-8 py-4 font-mono text-xs">{findVal(row, MAPPINGS.sku) || 'AUTO'}</td>
                            <td className="px-8 py-4">
                               <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${branchMatch ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                 {finalBranch?.name || 'MISSING'}
                               </span>
                            </td>
                            <td className="px-8 py-4 font-black text-[10px] text-slate-400">
                               {findVal(row, MAPPINGS.shelf) || '1'}-{findVal(row, MAPPINGS.section) || '1'}
                            </td>
                            <td className="px-8 py-4 text-indigo-600 font-black">{findVal(row, MAPPINGS.quantity) || '0'}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!previewData.length && !loading && (
             <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                <div className="text-8xl mb-4">📊</div>
                <p className="font-black uppercase tracking-[0.3em] text-sm">Wali wax xog ah lama soo galin</p>
                <p className="text-xs font-bold mt-2 uppercase">Dooro Excel fayl leh columns (Name, SKU, Qty, Category, Branch)</p>
             </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">JOOJI</button>
          <button 
            disabled={!previewData.length || loading}
            onClick={processImport}
            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 hover:bg-indigo-700"
          >
            {loading ? 'HADA SHAQAYNAYA...' : `SOO GALI ${previewData.length} ALAAB`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
