import React from 'react';
import { Settings, Users, Trash2, HelpCircle } from 'lucide-react';
import { formatSeconds } from '../../utils';

interface Props {
  t: any;
  currentAdmin: string | null;
  users: any[];
  logoEdit: string;
  setLogoEdit: (val: string) => void;
  filtersEdit: string;
  setFiltersEdit: (val: string) => void;
  applicationQuestionsEdit: string;
  setApplicationQuestionsEdit: (val: string) => void;
  setPdfLogoFile: (file: File | null) => void;
  setAgencySignatureFile: (file: File | null) => void;
  setAgencyStampFile: (file: File | null) => void;
  pdfLogo?: string;
  agencySignature?: string;
  agencyStamp?: string;
  handleSaveSettings: () => void;
  setConfirmDeleteAdminIdx: (idx: number) => void;
  newAdminLogin: string;
  setNewAdminLogin: (val: string) => void;
  newAdminEmail: string;
  setNewAdminEmail: (val: string) => void;
  newAdminPass: string;
  setNewAdminPass: (val: string) => void;
  handleAddAdmin: () => void;
}

export const AdminSettingsTab: React.FC<Props> = ({
  t,
  currentAdmin,
  users,
  logoEdit,
  setLogoEdit,
  filtersEdit,
  setFiltersEdit,
  applicationQuestionsEdit,
  setApplicationQuestionsEdit,
  setPdfLogoFile,
  setAgencySignatureFile,
  setAgencyStampFile,
  pdfLogo,
  agencySignature,
  agencyStamp,
  handleSaveSettings,
  setConfirmDeleteAdminIdx,
  newAdminLogin,
  setNewAdminLogin,
  newAdminEmail,
  setNewAdminEmail,
  newAdminPass,
  setNewAdminPass,
  handleAddAdmin
}) => {
  if (currentAdmin !== 'admin') {
    return null;
  }

  return (
    <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={16} /> {t.branding}</h3>
        <input type="text" value={logoEdit} onChange={e => setLogoEdit(e.target.value)} placeholder={t.agency_name} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-white/50 text-white" />
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{t.resume_categories}</label>
        <textarea value={filtersEdit} onChange={e => setFiltersEdit(e.target.value)} placeholder="Woman, Man, Kids..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 h-24 outline-none focus:ring-2 focus:ring-white/50 text-white"></textarea>
        
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{t.resume_logo}</label>
        {pdfLogo && <img src={pdfLogo} alt="Logo" className="h-10 mb-2 rounded bg-white/10 p-1" />}
        <input type="file" accept="image/png,image/jpeg" onChange={e => setPdfLogoFile(e.target.files?.[0] || null)} className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 text-zinc-400" />
        
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Подпись агентства</label>
        {agencySignature && <img src={agencySignature} alt="Signature" className="h-12 w-auto mb-2 bg-white/10 p-1 rounded" />}
        <input type="file" accept="image/png,image/jpeg" onChange={e => setAgencySignatureFile(e.target.files?.[0] || null)} className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 text-zinc-400" />
        
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Печать агентства</label>
        {agencyStamp && <img src={agencyStamp} alt="Stamp" className="h-16 w-auto mb-2 bg-white/10 p-1 rounded" />}
        <input type="file" accept="image/png,image/jpeg" onChange={e => setAgencyStampFile(e.target.files?.[0] || null)} className="w-full text-sm mb-6 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 text-zinc-400" />
        
        <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs">{t.sync}</button>
      </div>

      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><HelpCircle size={16} /> Application Questions</h3>
        <p className="text-xs text-zinc-400 mb-4">Enter custom questions for the /join form. Separate each question with a new line.</p>
        <textarea 
          value={applicationQuestionsEdit} 
          onChange={e => setApplicationQuestionsEdit(e.target.value)} 
          placeholder="Do you have any tattoos?&#10;Are you willing to travel?" 
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 h-48 outline-none focus:ring-2 focus:ring-white/50 text-white"
        ></textarea>
        <button onClick={handleSaveSettings} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs">{t.sync}</button>
      </div>

      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16} /> {t.admin_access}</h3>
        <div className="space-y-2 mb-6">
          {users.map((u, i) => (
            <div key={i} className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5">
              <div>
                <span className="font-bold text-sm text-white block">{u.login}</span>
                {u.email && <span className="text-[10px] text-zinc-400 block">{u.email}</span>}
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mt-1">Time: {formatSeconds(u.timeSpent || 0)}</span>
                {u.lastLogin && <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Last Login: {new Date(u.lastLogin).toLocaleString()}</span>}
              </div>
              {u.login !== 'admin' ? (
                <button onClick={() => setConfirmDeleteAdminIdx(i)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
              ) : (
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t.root}</span>
              )}
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-white/5 space-y-3">
          <input type="text" value={newAdminLogin} onChange={e => setNewAdminLogin(e.target.value)} placeholder="Login" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
          <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email (for Google Login)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
          <input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} placeholder="Security Key" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
          <button onClick={handleAddAdmin} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-white/10 mt-2 uppercase tracking-widest text-xs">{t.add_admin}</button>
        </div>
      </div>
    </div>
  );
};
