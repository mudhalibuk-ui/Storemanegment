
import React, { useState } from 'react';
import { JournalEntry, Account, User, JournalEntryLine } from '../types';
import { API } from '../services/api';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface JournalEntriesProps {
  user: User;
  accounts: Account[];
  journalEntries: JournalEntry[];
  onRefresh: () => void;
  closingDate?: string;
}

const JournalEntries: React.FC<JournalEntriesProps> = ({ user, accounts, journalEntries, onRefresh, closingDate }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 }
  ]);

  const totalDebits = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // In QuickBooks logic, if you enter a debit, it often clears the credit and vice versa
    if (field === 'debit' && Number(value) > 0) newLines[index].credit = 0;
    if (field === 'credit' && Number(value) > 0) newLines[index].debit = 0;
    
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("Journal entry must be balanced (Debits = Credits) and greater than zero.");
      return;
    }

    if (closingDate && new Date(date) <= new Date(closingDate)) {
      alert(`Cilad: Muddada maaliyadeed waa xirantahay ilaa ${new Date(closingDate).toLocaleDateString()}. Ma dhajin kartid wax ka horreeya taariikhdan.`);
      return;
    }

    try {
      const formattedLines = lines.map(l => {
        const account = accounts.find(a => a.id === l.accountId);
        return {
          accountId: l.accountId!,
          accountCode: account?.code || '',
          accountName: account?.name || '',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          memo: description
        };
      });

      await API.journalEntries.create({
        date,
        reference,
        description,
        lines: formattedLines,
        xarunId: user.xarunId || '',
        createdBy: user.name,
        status: 'POSTED'
      });

      setIsFormOpen(false);
      setDescription('');
      setReference('');
      setLines([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]);
      onRefresh();
      alert("✅ Journal Entry posted successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manual Journal Entries</h3>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> New Journal Entry
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {journalEntries.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-sm font-bold text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                <td className="p-6 text-sm font-black text-slate-900 uppercase">{entry.reference}</td>
                <td className="p-6 text-sm font-black text-slate-800 uppercase">{entry.description}</td>
                <td className="p-6 text-sm font-black text-slate-900 text-right">
                  ${entry.lines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}
                </td>
                <td className="p-6 text-center">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
            {journalEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <p className="text-slate-400 font-bold text-sm">No manual journal entries found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">New Journal Entry</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Date</label>
                  <input required type="date" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reference</label>
                  <input required placeholder="e.g. ADJ-001" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase" value={reference} onChange={e => setReference(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description</label>
                  <input required placeholder="Entry description..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-6">Account</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-2 text-right">Credit</div>
                  <div className="col-span-2"></div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-6">
                        <select 
                          required 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs"
                          value={line.accountId}
                          onChange={e => handleLineChange(index, 'accountId', e.target.value)}
                        >
                          <option value="">Select Account...</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-right"
                          value={line.debit}
                          onChange={e => handleLineChange(index, 'debit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-right"
                          value={line.credit}
                          onChange={e => handleLineChange(index, 'credit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {lines.length > 2 && (
                          <button type="button" onClick={() => handleRemoveLine(index)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={handleAddLine}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline ml-2"
                >
                  + Add Line
                </button>
              </div>

              <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debits</p>
                    <p className="text-xl font-black text-slate-900">${totalDebits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credits</p>
                    <p className="text-xl font-black text-slate-900">${totalCredits.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isBalanced ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {isBalanced ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {isBalanced ? 'Balanced' : 'Out of Balance'}
                  </div>
                  <button 
                    type="submit" 
                    disabled={!isBalanced}
                    className={`px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${isBalanced ? 'bg-indigo-600 text-white shadow-xl hover:scale-105' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    Post Journal Entry
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntries;
