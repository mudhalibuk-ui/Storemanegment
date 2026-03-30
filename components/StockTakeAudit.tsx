
import React, { useState, useEffect, useMemo } from 'react';
import { StockTakeSession, StockTakeStatus, StockTakeItem, InventoryItem, User, UserRole } from '../types';
import { API } from '../services/api';
import * as XLSX from 'xlsx';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  History, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users as UsersIcon,
  FileUp,
  Download,
  Lock,
  Unlock,
  ArrowRight
} from 'lucide-react';

interface StockTakeAuditProps {
  user: User;
  inventory: InventoryItem[];
  sessions: StockTakeSession[];
  onRefresh: () => void;
}

const StockTakeAudit: React.FC<StockTakeAuditProps> = ({ user, inventory, sessions, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<StockTakeSession | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [newSessionData, setNewSessionData] = useState({
    notes: '',
    assignedUsers: [] as string[]
  });

  const activeSession = useMemo(() => 
    sessions.find(s => s.xarunId === user.xarunId && (s.status === StockTakeStatus.OPEN || s.status === StockTakeStatus.IN_PROGRESS)),
    [sessions, user.xarunId]
  );

  const filteredSessions = sessions.filter(s => 
    s.xarunId === user.xarunId || user.role === UserRole.SUPER_ADMIN
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const handleStartSession = async () => {
    if (activeSession) {
      alert("Xaruntan horey ayey xisaab-xir uga socotaa!");
      return;
    }

    try {
      const session: Partial<StockTakeSession> = {
        xarunId: user.xarunId || '',
        status: StockTakeStatus.OPEN,
        startTime: new Date().toISOString(),
        createdBy: user.username,
        assignedUsers: [user.username, ...newSessionData.assignedUsers],
        items: inventory.filter(i => i.xarunId === user.xarunId).map(i => ({
          itemId: i.id,
          sku: i.sku,
          itemName: i.name,
          expectedQty: i.quantity,
          actualQty: i.quantity, // Default to expected
          difference: 0
        })),
        progress: 0,
        notes: newSessionData.notes
      };

      await API.stockTakeSessions.save(session);
      setIsModalOpen(false);
      onRefresh();
      alert("✅ Xisaab-xirka waa la bilaabay. Xarunta hadda waa 'Locked'!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>, session: StockTakeSession) => {
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

        const updatedItems = [...session.items];
        let changedCount = 0;

        for (const row of data) {
          const sku = String(row.SKU || row.sku || '');
          const actualQty = Number(row['Actual Qty'] || row['actual_qty'] || row['New Qty'] || 0);
          
          const itemIndex = updatedItems.findIndex(i => i.sku === sku);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              actualQty: actualQty,
              difference: actualQty - updatedItems[itemIndex].expectedQty
            };
            changedCount++;
          }
        }

        const progress = Math.round((changedCount / updatedItems.length) * 100);
        
        await API.stockTakeSessions.save({
          ...session,
          items: updatedItems,
          progress: progress,
          status: StockTakeStatus.IN_PROGRESS
        });

        onRefresh();
        alert(`✅ ${changedCount} alaabood ayaa la cusboonaysiiyey!`);
      } catch (err) {
        alert("Excel error: " + err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCompleteSession = async (session: StockTakeSession) => {
    const confirm = window.confirm("Ma hubtaa inaad dhammaystirto xisaab-xirka? Tirada cusub ayaa loo isticmaali doonaa bakhaarka.");
    if (!confirm) return;

    try {
      // 1. Update session status
      await API.stockTakeSessions.save({
        ...session,
        status: StockTakeStatus.COMPLETED,
        endTime: new Date().toISOString(),
        progress: 100
      });

      // 2. Apply adjustments to inventory
      for (const item of session.items) {
        if (item.difference !== 0) {
          await API.inventoryAdjustments.save({
            itemId: item.itemId,
            itemName: item.itemName,
            type: 'SET',
            quantity: item.actualQty,
            reason: `Year-End Audit (${session.id.slice(0,8)})`,
            createdBy: user.username,
            xarunId: session.xarunId
          });
        }
      }

      onRefresh();
      alert("✅ Xisaab-xirka waa la dhammaystiray. Xarunta hadda waa 'Unlocked'!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const downloadTemplate = (session: StockTakeSession) => {
    const template = session.items.map(i => ({
      SKU: i.sku,
      Name: i.itemName,
      'Expected Qty': i.expectedQty,
      'Actual Qty': i.actualQty,
      Difference: i.difference
    }));
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit_List");
    XLSX.writeFile(wb, `Audit_Template_${session.id.slice(0,8)}.xlsx`);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <ClipboardCheck className="text-indigo-600" /> Year-End Audit (Xisaab-xir)
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Xisaab-xirka sanadlaha ah iyo xaqiijinta alaabta</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {!activeSession && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Start New Audit
            </button>
          )}
          {activeSession && (
            <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 animate-pulse">
              <Lock size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Branch Locked for Audit</span>
            </div>
          )}
        </div>
      </div>

      {activeSession && (
        <div className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="text-indigo-200" size={20} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Active Session</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter">PROGRESS: {activeSession.progress}%</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <UsersIcon size={16} className="text-indigo-200" />
                  <span className="text-xs font-bold">{activeSession.assignedUsers.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-200" />
                  <span className="text-xs font-bold">Started: {new Date(activeSession.startTime).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => downloadTemplate(activeSession)}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Download size={16} /> Download List
              </button>
              <label className="px-6 py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 transition-all flex items-center gap-2 shadow-xl">
                <FileUp size={16} /> {isImporting ? 'Importing...' : 'Upload Counts'}
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleImportExcel(e, activeSession)} disabled={isImporting} />
              </label>
              <button 
                onClick={() => handleCompleteSession(activeSession)}
                className="px-6 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl"
              >
                <CheckCircle2 size={16} /> Complete & Unlock
              </button>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <History size={18} className="text-indigo-600" /> Audit History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <div className="text-xs font-bold text-slate-600">
                      {new Date(session.startTime).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      session.status === StockTakeStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' :
                      session.status === StockTakeStatus.CANCELLED ? 'bg-rose-50 text-rose-600' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="p-6 text-xs font-bold text-slate-600">{session.createdBy}</td>
                  <td className="p-6">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all" style={{ width: `${session.progress}%` }}></div>
                    </div>
                  </td>
                  <td className="p-6 text-xs font-bold text-slate-600">{session.items.length} items</td>
                  <td className="p-6 text-xs font-bold text-slate-400 italic">{session.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">Start Audit Session</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-xl">✕</button>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                <AlertTriangle className="text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                  Digniin: Markaad bilowdo xisaab-xirka, xarunta waa la xiri doonaa (Locked). Ma jiri doonto wax iib ah ama dhaqdhaqaaq alaab ah ilaa laga dhammaystiro.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Notes / Purpose</label>
                <textarea 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-indigo-500 transition-all outline-none resize-none"
                  rows={3}
                  placeholder="E.g., 2025 Year-End Stock Take..."
                  value={newSessionData.notes}
                  onChange={e => setNewSessionData({...newSessionData, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStartSession}
                  className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                >
                  Start Audit Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTakeAudit;
