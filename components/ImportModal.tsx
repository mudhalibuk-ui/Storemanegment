
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem, Branch } from '../types';
import { letterToNumber } from '../services/mappingUtils';

interface ImportModalProps {
  branches: Branch[];
  userXarunId?: string;
  onImport: (items: InventoryItem[]) => Promise<boolean>; // Changed to Promise<boolean>
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ branches, userXarunId, onImport, onCancel }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [selectedDefaultBranch, setSelectedDefaultBranch] = useState(branches[0]?.id || '');

  const MAPPINGS = {
    name: ['Name', 'Magaca', 'Product', 'Alaabta', 'Shayga', 'Mudo', 'Item', 'Product Name', 'Description', 'Alaab', 'Magaca Alaabta'],
    sku: ['SKU', 'Code', 'Barcode', 'Sumadda', 'Id Code', 'Lambar', 'Suku', 'Sku Code', 'Part Number', 'Item Code', 'Lambarka'],
    category: ['Category', 'Nooca', 'Cat', 'Qaybta Alaabta', 'Qaybta', 'Type', 'Nooca Shayga', 'Caynka'],
    quantity: ['Quantity', 'Tirada', 'Qty', 'Stock', 'Maduushada', 'Tira', 'Amount', 'Count', 'Available', 'Tirada Guud', 'Xaddiga'],
    shelf: ['Shelf', 'Iskafalo', 'Iskafalada', 'Iska', 'Shelf Number', 'Safaxad', 'Rack', 'Shelf Name', 'Booska'],
    section: ['Section', 'Godka', 'God', 'Go', 'Slot', 'Qaybta', 'Bin', 'Godka Iskafalada', 'Qolka'],
    branch: ['Branch', 'Bakhaar', 'Bakhaarka', 'Branch Name', 'Warehouse', 'Goobta', 'BranchId', 'Store', 'Magaalada'],
    minThreshold: ['MinThreshold', 'Halis', 'Alert', 'Alert Level', 'Heerka Digniinta', 'Minimum', 'Low Stock', 'Min', 'Tirada Halista']
  };

  const findVal = (row: any, mappingKeys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of mappingKeys) {
      const match = rowKeys.find(rk => {
        const normalizedRK = rk.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const normalizedK = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return normalizedRK === normalizedK;
      });
      if (match) return row[match];
    }
    return null;
  };

  const generateAutoSKU = (name: string, category: string) => {
    const prefix = category ? category.substring(0, 3).toUpperCase() : (name ? name.substring(0, 3).toUpperCase() : 'ITM');
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `AUTO-${prefix}-${randomNum}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus('IDLE');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error("Faylka lama aqrin karo.");
        
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        if (data.length === 0) {
          throw new Error("Excel-ku wax xog ah kuma jirto!");
        }
        setPreviewData(data);
      } catch (err: any) {
        setErrorMessage(err.message || "Cilad markii Excel-ka la aqrinayay.");
        setStatus('ERROR');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const processImport = async () => {
    if (previewData.length === 0) return;
    setStatus('SAVING');
    setErrorMessage('');
    
    try {
      const processedItems: InventoryItem[] = previewData.map((row, index) => {
        const branchNameInput = (findVal(row, MAPPINGS.branch) || '').toString().toLowerCase().trim();
        let branchMatch = branches.find(b => 
          b.name.toLowerCase().trim() === branchNameInput || 
          b.id.toLowerCase().trim() === branchNameInput
        );
        
        const finalBranchId = branchMatch?.id || selectedDefaultBranch;
        const targetBranch = branches.find(b => b.id === finalBranchId);
        const itemXarunId = targetBranch?.xarunId || userXarunId;

        if (!itemXarunId) {
          throw new Error(`Cilad: Ma aanan helin Xarun ID loo xiro alaabta: ${findVal(row, MAPPINGS.name) || 'Unknown'}`);
        }

        const name = (findVal(row, MAPPINGS.name) || `Item ${index + 1}`).toString().trim();
        const category = (findVal(row, MAPPINGS.category) || 'General').toString().trim();
        let sku = (findVal(row, MAPPINGS.sku) || '').toString().trim();
        
        if (!sku) {
          sku = generateAutoSKU(name, category);
        }

        const quantity = parseInt(findVal(row, MAPPINGS.quantity)) || 0;
        const minThreshold = parseInt(findVal(row, MAPPINGS.minThreshold)) || 5;
        const rawShelf = (findVal(row, MAPPINGS.shelf) || '1').toString();
        const rawSection = (findVal(row, MAPPINGS.section) || '1').toString();

        return {
          id: `temp-${Date.now()}-${index}`,
          name,
          category,
          sku,
          shelves: letterToNumber(rawShelf),
          sections: parseInt(rawSection) || 1,
          quantity,
          branchId: finalBranchId,
          lastUpdated: new Date().toISOString(),
          minThreshold,
          xarunId: itemXarunId
        } as InventoryItem;
      });

      const success = await onImport(processedItems);
      if (success) {
        setImportedCount(processedItems.length);
        setStatus('SUCCESS');
      } else {
        throw new Error("Database-ka ayaa diiday inuu keydiyo xogta. Hubi SKU-yada.");
      }
    } catch (err: any) {
      console.error("Import Failure:", err);
      setErrorMessage(err.message || "Cilad ayaa dhacday markii xogta la habaynayay.");
      setStatus('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[20000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/10 animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${status === 'SUCCESS' ? 'bg-emerald-600' : status === 'ERROR' ? 'bg-rose-600' : 'bg-indigo-600'} text-white transition-colors duration-500`}>
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl ${status === 'SAVING' ? 'animate-spin' : ''}`}>
              {status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '⚠️' : '📥'}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">
                {status === 'SUCCESS' ? 'WAAR LAGU GUULEYSTAY!' : status === 'ERROR' ? 'CILAD AYAA DHACDAY' : 'AUTOMATIC IMPORT 🚀'}
              </h2>
              <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">
                {status === 'SUCCESS' ? `${importedCount} Alaab ah ayaa la galiyay` : 'Excel Mapping & Auto-SKU Generator'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="w-12 h-12 rounded-full hover:bg-white/20 flex items-center justify-center transition-all font-black text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {status === 'SUCCESS' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl shadow-xl shadow-emerald-100">✔</div>
               <div>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Xogta waa la keydiyey</h3>
                 <p className="text-slate-500 font-medium mt-2">Dhammaan {importedCount} alaabta ah waxay hadda ku jiraan database-kaaga.</p>
                 <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">💡 TALO MUHIIM AH:</p>
                    <p className="text-[11px] text-indigo-700 font-bold mt-1">Haddii aadan arkin alaabtaada, fadlan nadiifi Filter-ka (Bakhaarada ama Noocyada) ee ku yaala Inventory Tab.</p>
                 </div>
               </div>
               <button onClick={onCancel} className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest">HADA XIR FOOMKA</button>
            </div>
          ) : status === 'ERROR' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in shake duration-500">
               <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl shadow-xl shadow-rose-100">✕</div>
               <div className="max-w-md">
                 <h3 className="text-xl font-black text-rose-600 uppercase tracking-tight">Cilad: Import-kii waa fashilmay</h3>
                 <p className="bg-rose-50 p-4 rounded-2xl text-rose-700 font-bold mt-4 border border-rose-100 text-sm">{errorMessage}</p>
               </div>
               <div className="flex gap-4">
                 <button onClick={() => setStatus('IDLE')} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">DIB U ISKU DAY</button>
                 <button onClick={onCancel} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">HADA JOOJI</button>
               </div>
            </div>
          ) : (
            <>
              {!previewData.length && (
                <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">1. Soo degso Template-ka</h3>
                    <p className="text-sm text-indigo-700 mt-2 font-medium">Hubi in magacyada tiirarka (Columns) ay sax yihiin si system-ka u aqoonsado.</p>
                  </div>
                  <button onClick={() => {
                    const ws = XLSX.utils.json_to_sheet([{'Magaca': 'Tusaale', 'Tirada': 10, 'Nooca': 'Hardware', 'SKU': ''}]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                    XLSX.writeFile(wb, "SmartStock_Template.xlsx");
                  }} className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-3 uppercase text-[11px] tracking-widest border border-indigo-100">
                    📄 Template
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Default Bakhaar (Hadii Excel-ka lagu xusin)</label>
                    <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" value={selectedDefaultBranch} onChange={(e) => setSelectedDefaultBranch(e.target.value)} disabled={status === 'SAVING'}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.location})</option>)}
                    </select>
                </div>
                {!previewData.length ? (
                  <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black cursor-pointer shadow-xl transition-all active:scale-95 text-[11px] uppercase tracking-[0.2em] text-center border-b-4 border-indigo-800">
                      {loading ? 'AQRINAYA...' : 'DOORO EXCEL (.XLSX)'}
                      <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <button onClick={() => { setPreviewData([]); setStatus('IDLE'); }} className="py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-rose-100 hover:bg-rose-100" disabled={status === 'SAVING'}>BEDEL FAYLKA</button>
                )}
              </div>

              {previewData.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Hordhaca Xogta ({previewData.length} Items)</h3>
                  <div className="flex-1 overflow-auto rounded-[2.5rem] border border-slate-100 no-scrollbar shadow-inner bg-slate-50/30">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-5">Alaabta</th>
                          <th className="px-8 py-5">SKU Status</th>
                          <th className="px-8 py-5">Bakhaarka</th>
                          <th className="px-8 py-5 text-center">Tirada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.slice(0, 100).map((row, i) => {
                          const providedSku = (findVal(row, MAPPINGS.sku) || '').toString().trim();
                          const bNameInput = (findVal(row, MAPPINGS.branch) || '').toString();
                          const bMatch = branches.find(b => b.name.toLowerCase().trim() === bNameInput.toLowerCase().trim());
                          const finalBName = bMatch ? bMatch.name : branches.find(b => b.id === selectedDefaultBranch)?.name || 'Default';

                          return (
                            <tr key={i} className={`text-sm font-bold text-slate-700 hover:bg-indigo-50/50 ${status === 'SAVING' ? 'opacity-50' : ''}`}>
                              <td className="px-8 py-4">{findVal(row, MAPPINGS.name) || 'N/A'}</td>
                              <td className="px-8 py-4">
                                {providedSku ? (
                                  <span className="font-mono text-xs text-slate-400">{providedSku}</span>
                                ) : (
                                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase">AUTO ✨</span>
                                )}
                              </td>
                              <td className="px-8 py-4">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${bMatch ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {finalBName}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-center font-black">{findVal(row, MAPPINGS.quantity) || '0'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {status === 'IDLE' && previewData.length > 0 && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button onClick={onCancel} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-400 font-black rounded-[2rem] uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">JOOJI</button>
            <button 
              onClick={processImport}
              className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-2xl transition-all uppercase text-[11px] tracking-widest border-b-4 border-indigo-900"
            >
              SOO GALI DHAMMAAN ({previewData.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
