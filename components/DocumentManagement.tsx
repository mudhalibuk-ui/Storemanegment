
import React, { useState } from 'react';
import { DMSDocument, User } from '../types';
import { API } from '../services/api';

interface DocumentManagementProps {
  documents: DMSDocument[];
  currentUser: User;
  onRefresh: () => void;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ documents, currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<DMSDocument> | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title || !editingDoc?.type) return;

    setLoading(true);
    try {
      await API.dms.saveDocument({
        ...editingDoc,
        ownerId: currentUser.id,
        xarunId: currentUser.xarunId,
        url: editingDoc.url || 'https://example.com/doc.pdf', // Mock URL
        fileSize: editingDoc.fileSize || '1.2 MB'
      });
      setIsModalOpen(false);
      setEditingDoc(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = filter === 'ALL' ? documents : documents.filter(d => d.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Document Management (DMS)</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Centralized Storage & Compliance</p>
        </div>
        <button
          onClick={() => { setEditingDoc({}); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span>+</span> Upload Document
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'INVOICE', 'CONTRACT', 'MANUAL', 'OTHER'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              filter === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-slate-400 hover:text-indigo-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
            
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-500">
              {doc.type === 'INVOICE' ? '🧾' : doc.type === 'CONTRACT' ? '📜' : doc.type === 'MANUAL' ? '📘' : '📄'}
            </div>

            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight line-clamp-1">{doc.title}</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{doc.type}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">{doc.fileSize}</span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(doc.createdAt).toLocaleDateString()}</span>
              <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Open</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Upload Document</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Add files to the central repository</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={editingDoc?.title || ''}
                  onChange={e => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Annual Audit 2024"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Document Type</label>
                <select
                  required
                  value={editingDoc?.type || ''}
                  onChange={e => setEditingDoc({ ...editingDoc, type: e.target.value as any })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select Type</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="MANUAL">Manual</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">File Upload (Mock)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <span className="text-3xl mb-2">☁️</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to upload file</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">PDF, DOCX, JPG (Max 10MB)</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
