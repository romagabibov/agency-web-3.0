import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Application } from '../../types';
import { safeUrl } from '../../utils';
import { Check, X, User, Ruler, Instagram, Mail, Phone } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { db } from '../../firebase';

export const AdminReviewTab: React.FC<{
  onApprove: (app: Application) => void;
}> = ({ onApprove }) => {
  const { applications, agencyId, addNotification } = useAppContext();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const pendingApps = applications.filter(a => a.status === 'pending');

  const handleReject = async (app: Application) => {
    if (window.confirm(`Are you sure you want to reject ${app.name}?`)) {
      try {
        const appRef = ref(db, `agencies/${agencyId}/applications/${app.id}`);
        await remove(appRef);
        addNotification(`Application from ${app.name} rejected.`, 'success');
        if (selectedApp?.id === app.id) setSelectedApp(null);
      } catch (error) {
        console.error("Error rejecting application:", error);
        addNotification("Failed to reject application.", "error");
      }
    }
  };

  if (pendingApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500 border border-white/10 bg-black max-w-7xl mx-auto my-6">
        <User size={36} className="mb-4 text-zinc-600" />
        <p className="text-xs uppercase tracking-[0.22em] font-bold text-zinc-400">No pending applications</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* List of applications */}
        <div className="md:col-span-1 space-y-3 max-h-[800px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500 pb-2 border-b border-white/10">
            Pending Applications [{pendingApps.length}]
          </div>
          {pendingApps.map(app => (
            <div 
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`bg-black border p-3.5 cursor-pointer transition-all ${
                selectedApp?.id === app.id 
                  ? 'border-white text-white' 
                  : 'border-white/10 hover:border-white/30 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-14 bg-zinc-950 border border-white/10 overflow-hidden shrink-0">
                  {app.imgs && app.imgs.length > 0 ? (
                    <img src={safeUrl(app.imgs[0], 'img')} alt={app.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={18} /></div>
                  )}
                </div>
                <div className="overflow-hidden min-w-0">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white truncate">{app.name}</h4>
                  <p className="text-[10px] font-mono text-zinc-500 truncate mt-1">
                    {new Date(app.date).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-0.5">
                    {app.height} cm • {app.weight} kg
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Application Details */}
        <div className="md:col-span-2">
          {selectedApp ? (
            <div className="bg-black border border-white/15 p-6 sm:p-8">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-[0.18em]">{selectedApp.name}</h2>
                  <p className="text-zinc-500 text-xs font-mono tracking-wider mt-1">Applied: {new Date(selectedApp.date).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReject(selectedApp)}
                    className="border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    title="Reject"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                  <button 
                    onClick={() => onApprove(selectedApp)}
                    className="bg-white text-black hover:bg-zinc-200 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    title="Approve & Deploy"
                  >
                    <Check size={14} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-xs">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Phone size={14} className="text-zinc-500 shrink-0" />
                    <span className="font-mono">{selectedApp.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Mail size={14} className="text-zinc-500 shrink-0" />
                    <span className="font-mono">{selectedApp.email || '—'}</span>
                  </div>
                  {selectedApp.insta && (
                    <div className="flex items-center gap-3 text-zinc-300">
                      <Instagram size={14} className="text-zinc-500 shrink-0" />
                      <span className="font-mono">{selectedApp.insta}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Ruler size={14} className="text-zinc-500 shrink-0" />
                    <span className="tracking-wider">{selectedApp.height} cm / {selectedApp.weight} kg</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-4 text-center">SH</span>
                    <span>Shoe: {selectedApp.shoe || '—'}</span>
                  </div>
                  {selectedApp.params && (
                    <div className="flex items-center gap-3 text-zinc-300">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-4 text-center">PR</span>
                      <span>Measurements: {selectedApp.params}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedApp.answers && (Array.isArray(selectedApp.answers) ? selectedApp.answers.length > 0 : Object.keys(selectedApp.answers).length > 0) && (
                <div className="mb-8 border-t border-white/10 pt-5">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-4">Questionnaire Responses</h4>
                  <div className="space-y-3 bg-black border border-white/10 p-4">
                    {(Array.isArray(selectedApp.answers) 
                      ? selectedApp.answers 
                      : Object.entries(selectedApp.answers).map(([q, a]) => ({ question: q, answer: a }))
                    ).map((item, idx) => (
                      <div key={idx} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <p className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">{item.question}</p>
                        <p className="text-xs text-white">{item.answer as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.imgs && selectedApp.imgs.length > 0 && (
                <div className="border-t border-white/10 pt-5">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-4">Portfolio Submissions ({selectedApp.imgs.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedApp.imgs.map((img, idx) => (
                      <a key={idx} href={img} target="_blank" rel="noreferrer" className="block aspect-[4/5] bg-black border border-white/15 hover:border-white transition-colors overflow-hidden">
                        <img src={safeUrl(img, 'img')} alt={`Submission ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 border border-white/10 bg-black">
              <p className="text-xs uppercase tracking-[0.2em] font-medium">Select an application to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
