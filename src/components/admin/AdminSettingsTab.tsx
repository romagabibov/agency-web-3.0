import React from 'react';
import { Settings, Users, Trash2, HelpCircle, Shield, Stamp, FileText, Check } from 'lucide-react';
import { formatSeconds } from '../../utils';

interface Props {
  t: any;
  currentAdmin: string | null;
  isSuperAdmin?: boolean;
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
  isSuperAdmin = true,
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
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        
        {/* PANEL 1: Branding & Visual Assets */}
        <div className="bg-black border border-white/15 p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-5">
              <Settings size={15} className="text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-white">
                {t.branding} & Identity
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] block mb-1.5">
                  {t.agency_name}
                </label>
                <input 
                  type="text" 
                  value={logoEdit} 
                  onChange={e => setLogoEdit(e.target.value)} 
                  placeholder={t.agency_name} 
                  className="w-full bg-black border border-white/15 px-3.5 py-2.5 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] block mb-1.5">
                  {t.resume_categories}
                </label>
                <textarea 
                  value={filtersEdit} 
                  onChange={e => setFiltersEdit(e.target.value)} 
                  placeholder="Woman, Man, Kids, New Faces..." 
                  className="w-full bg-black border border-white/15 px-3.5 py-2 text-xs tracking-wider h-20 outline-none focus:border-white text-white placeholder-zinc-600 resize-none font-mono"
                ></textarea>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">
                  Separate categories with comma
                </p>
              </div>
              
              <div className="border-t border-white/10 pt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">
                      {t.resume_logo}
                    </label>
                    {pdfLogo && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Uploaded</span>
                    )}
                  </div>
                  {pdfLogo && (
                    <div className="mb-2 p-2 bg-zinc-950 border border-white/10 inline-block">
                      <img src={pdfLogo} alt="Logo preview" className="h-8 w-auto object-contain" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg" 
                    onChange={e => setPdfLogoFile(e.target.files?.[0] || null)} 
                    className="w-full text-[10px] text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-white/20 file:text-[10px] file:uppercase file:tracking-wider file:bg-transparent file:text-white hover:file:border-white" 
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">
                      Подпись / Signature
                    </label>
                    {agencySignature && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Uploaded</span>
                    )}
                  </div>
                  {agencySignature && (
                    <div className="mb-2 p-2 bg-zinc-950 border border-white/10 inline-block">
                      <img src={agencySignature} alt="Signature preview" className="h-10 w-auto object-contain invert brightness-200" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg" 
                    onChange={e => setAgencySignatureFile(e.target.files?.[0] || null)} 
                    className="w-full text-[10px] text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-white/20 file:text-[10px] file:uppercase file:tracking-wider file:bg-transparent file:text-white hover:file:border-white" 
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">
                      Печать / Stamp
                    </label>
                    {agencyStamp && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Uploaded</span>
                    )}
                  </div>
                  {agencyStamp && (
                    <div className="mb-2 p-2 bg-zinc-950 border border-white/10 inline-block">
                      <img src={agencyStamp} alt="Stamp preview" className="h-12 w-auto object-contain" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg" 
                    onChange={e => setAgencyStampFile(e.target.files?.[0] || null)} 
                    className="w-full text-[10px] text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-white/20 file:text-[10px] file:uppercase file:tracking-wider file:bg-transparent file:text-white hover:file:border-white" 
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSaveSettings} 
            className="w-full mt-8 bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={14} />
            <span>{t.sync}</span>
          </button>
        </div>

        {/* PANEL 2: Application Questions */}
        <div className="bg-black border border-white/15 p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-5">
              <HelpCircle size={15} className="text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-white">
                Casting Questions
              </h3>
            </div>

            <p className="text-[11px] text-zinc-400 mb-4 uppercase tracking-wider leading-relaxed">
              Custom questionnaire shown to models during registration via the public <span className="text-white border-b border-white/30">/join</span> form.
            </p>

            <div>
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] block mb-1.5">
                Questions List (One per row)
              </label>
              <textarea 
                value={applicationQuestionsEdit} 
                onChange={e => setApplicationQuestionsEdit(e.target.value)} 
                placeholder="Do you have any tattoos?&#10;Are you willing to travel abroad?&#10;What languages do you speak?&#10;Previous modeling experience?" 
                className="w-full bg-black border border-white/15 p-3.5 text-xs tracking-wider h-80 outline-none focus:border-white text-white placeholder-zinc-600 resize-none font-sans"
              ></textarea>
            </div>

            <div className="border border-white/10 p-3 mt-4 bg-zinc-950/40">
              <div className="flex items-center gap-2 text-zinc-400 text-[10px] uppercase tracking-wider font-mono">
                <FileText size={12} className="text-zinc-400" />
                <span>Format Guide</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Each line will render as an individual question field in the casting modal.
              </p>
            </div>
          </div>

          <button 
            onClick={handleSaveSettings} 
            className="w-full mt-8 bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={14} />
            <span>{t.sync}</span>
          </button>
        </div>

        {/* PANEL 3: Admin Access & Team */}
        <div className="bg-black border border-white/15 p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-5">
              <Users size={15} className="text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-white">
                {t.admin_access} & Team
              </h3>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                Active Staff [{users.length}]
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {users.map((u, i) => {
                  const isRoot = (u.login || '').toLowerCase() === 'admin' || 
                    (u.email || '').toLowerCase() === 'vnsbek@gmail.com' || 
                    u.role === 'superadmin';
                  return (
                    <div key={i} className="flex justify-between items-center bg-black p-3 border border-white/10 hover:border-white/20 transition-colors">
                      <div className="min-w-0 pr-3">
                        <span className="font-bold text-xs uppercase tracking-wider text-white block truncate">
                          {u.login || u.email || 'Admin'}
                        </span>
                        {u.email && u.login && u.login !== u.email && (
                          <span className="text-[10px] text-zinc-400 font-mono block truncate mt-0.5">
                            {u.email}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {u.role && (
                            <span className="text-[8px] border border-white/20 text-zinc-300 px-1.5 py-0.2 font-mono uppercase">
                              {u.role}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                            Time: {formatSeconds(u.timeSpent || 0)}
                          </span>
                        </div>
                      </div>
                      {!isRoot ? (
                        <button 
                          onClick={() => setConfirmDeleteAdminIdx(i)} 
                          className="text-zinc-500 hover:text-red-400 p-1.5 border border-transparent hover:border-red-500/30 transition-colors shrink-0"
                          title="Remove admin"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-[8px] font-mono text-zinc-500 border border-white/10 px-1.5 py-0.5 uppercase tracking-widest shrink-0">
                          {t.root}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] block">
                Add Team Member
              </label>
              <input 
                type="text" 
                value={newAdminLogin} 
                onChange={e => setNewAdminLogin(e.target.value)} 
                placeholder="Admin Login (e.g. manager1)" 
                className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
              />
              <input 
                type="email" 
                value={newAdminEmail} 
                onChange={e => setNewAdminEmail(e.target.value)} 
                placeholder="Google OAuth Email" 
                className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
              />
              <input 
                type="password" 
                value={newAdminPass} 
                onChange={e => setNewAdminPass(e.target.value)} 
                placeholder="Security Passkey" 
                className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
              />
            </div>
          </div>

          <button 
            onClick={handleAddAdmin} 
            className="w-full mt-6 border border-white/20 hover:border-white text-white font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield size={14} />
            <span>{t.add_admin}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
