
import React, { useState, useEffect } from 'react';
import { SystemSettings, User, DMSDocument, Xarun, UserRole } from '../types';
import { API } from '../services/api';

interface CompanySetupProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
  currentUser: User;
  documents: DMSDocument[];
  onRefresh: () => void;
  xarumo: Xarun[];
  onUpdateXarun: (xarun: Partial<Xarun>) => Promise<void>;
}

const CompanySetup: React.FC<CompanySetupProps> = ({ 
  settings, onSave, currentUser, documents, onRefresh, xarumo, onUpdateXarun
}) => {
  const [selectedXarunId, setSelectedXarunId] = useState<string>(currentUser.xarunId || '');
  const [localXarun, setLocalXarun] = useState<Partial<Xarun>>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const xarun = xarumo.find(x => x.id === selectedXarunId);
    if (xarun) {
      setLocalXarun(xarun);
    } else {
      setLocalXarun({});
    }
  }, [selectedXarunId, xarumo]);

  const handleSaveProfile = async () => {
    if (!selectedXarunId) {
      alert("Fadlan dooro shirkad/xarun.");
      return;
    }
    await onUpdateXarun({ ...localXarun, id: selectedXarunId });
    alert("Macluumaadka shirkadda waa la keydiyey!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'LOGO' | 'DOC') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate upload
    setTimeout(async () => {
      try {
        if (type === 'LOGO') {
          const mockUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${localXarun.name || 'Company'}`;
          setLocalXarun({ ...localXarun, logo: mockUrl });
          alert("Logo uploaded (simulated)!");
        } else {
          await API.dms.saveDocument({
            title: file.name,
            type: 'OTHER',
            ownerId: currentUser.id,
            xarunId: selectedXarunId,
            url: 'https://example.com/doc.pdf',
            fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            createdAt: new Date().toISOString()
          });
          onRefresh();
          alert("Document uploaded successfully!");
        }
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    }, 1000);
  };

  const companyDocs = documents.filter(d => d.xarunId === selectedXarunId && (d.type === 'OTHER' || d.title.toLowerCase().includes('company') || d.title.toLowerCase().includes('license')));

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* COMPANY SELECTOR (FOR SUPER ADMIN) */}
      {currentUser.role === UserRole.SUPER_ADMIN && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Multi-Company Manager</h2>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Select a company to manage its profile</p>
          </div>
          <select 
            className="w-full md:w-64 p-4 bg-white/10 border border-white/20 rounded-2xl font-bold outline-none cursor-pointer text-white"
            value={selectedXarunId}
            onChange={e => setSelectedXarunId(e.target.value)}
          >
            <option value="" className="text-slate-900">Dooro Shirkad...</option>
            {xarumo.map(x => <option key={x.id} value={x.id} className="text-slate-900">{x.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: PROFILE INFO */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Company Profile</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Identity & Contact Information</p>
              </div>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">🏢</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Company Name</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  value={localXarun.name || ''} 
                  onChange={e => setLocalXarun({...localXarun, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tax ID / Business License</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  value={localXarun.taxId || ''} 
                  onChange={e => setLocalXarun({...localXarun, taxId: e.target.value})} 
                  placeholder="TRN-123456789"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  value={localXarun.email || ''} 
                  onChange={e => setLocalXarun({...localXarun, email: e.target.value})} 
                  placeholder="info@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  value={localXarun.phone || ''} 
                  onChange={e => setLocalXarun({...localXarun, phone: e.target.value})} 
                  placeholder="+252..."
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Physical Address</label>
                <textarea 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px]" 
                  value={localXarun.address || ''} 
                  onChange={e => setLocalXarun({...localXarun, address: e.target.value})} 
                  placeholder="Street, District, City, Country"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Website</label>
                <input 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  value={localXarun.website || ''} 
                  onChange={e => setLocalXarun({...localXarun, website: e.target.value})} 
                  placeholder="www.company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Currency</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={localXarun.currency || 'USD'}
                  onChange={e => setLocalXarun({...localXarun, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="SOS">SOS (Sh.So)</option>
                </select>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button 
                onClick={handleSaveProfile}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
              >
                Save Company Profile
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGO & DOCUMENTS */}
        <div className="space-y-8">
          {/* LOGO SECTION */}
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Company Logo</h3>
            <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-6 relative group">
              {localXarun.logo ? (
                <img src={localXarun.logo} alt="Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <span className="text-4xl">🖼️</span>
              )}
              <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="text-white text-[10px] font-black uppercase tracking-widest">Change</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'LOGO')} />
              </label>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Recommended: 512x512 PNG/SVG</p>
          </div>

          {/* DOCUMENT UPLOAD SECTION */}
          <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl text-white">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Company Documents</h3>
            
            <div className="space-y-4 mb-8">
              {companyDocs.length === 0 ? (
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase italic">No documents uploaded</p>
                </div>
              ) : (
                companyDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-white truncate max-w-[120px]">{doc.title}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">{doc.fileSize} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="text-indigo-400 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            <label className="w-full py-4 bg-white/10 border border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
              <span className="text-2xl mb-1">☁️</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{isUploading ? 'Uploading...' : 'Upload New File'}</span>
              <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'DOC')} />
            </label>
            <p className="text-[8px] text-slate-500 text-center mt-4 italic">* Upload licenses, tax certificates, or registration files.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySetup;
