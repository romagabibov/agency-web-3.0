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
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <User size={48} className="mb-4 opacity-50" />
        <p className="text-lg">No pending applications</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* List of applications */}
      <div className="md:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
        {pendingApps.map(app => (
          <div 
            key={app.id}
            onClick={() => setSelectedApp(app)}
            className={`bg-zinc-900 border p-4 rounded-xl cursor-pointer transition-all ${
              selectedApp?.id === app.id 
                ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                {app.imgs && app.imgs.length > 0 ? (
                  <img src={safeUrl(app.imgs[0], 'img')} alt={app.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500"><User size={20} /></div>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-white font-bold truncate">{app.name}</h4>
                <p className="text-xs text-zinc-400 truncate">{new Date(app.date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Application Details */}
      <div className="md:col-span-2">
        {selectedApp ? (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase">{selectedApp.name}</h2>
                <p className="text-zinc-400 text-sm">Applied on {new Date(selectedApp.date).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleReject(selectedApp)}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors"
                  title="Reject"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={() => onApprove(selectedApp)}
                  className="bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white p-3 rounded-xl transition-colors"
                  title="Approve & Edit"
                >
                  <Check size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Phone size={16} className="text-zinc-500" />
                  <span>{selectedApp.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300">
                  <Mail size={16} className="text-zinc-500" />
                  <span>{selectedApp.email}</span>
                </div>
                {selectedApp.insta && (
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Instagram size={16} className="text-zinc-500" />
                    <span>{selectedApp.insta}</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Ruler size={16} className="text-zinc-500" />
                  <span>{selectedApp.height} cm / {selectedApp.weight} kg</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider w-4 text-center">SH</span>
                  <span>Shoe: {selectedApp.shoe}</span>
                </div>
                {selectedApp.params && (
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider w-4 text-center">PR</span>
                    <span>Params: {selectedApp.params}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedApp.answers && (Array.isArray(selectedApp.answers) ? selectedApp.answers.length > 0 : Object.keys(selectedApp.answers).length > 0) && (
              <div className="mb-8">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Answers</h4>
                <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/5">
                  {(Array.isArray(selectedApp.answers) 
                    ? selectedApp.answers 
                    : Object.entries(selectedApp.answers).map(([q, a]) => ({ question: q, answer: a }))
                  ).map((item, idx) => (
                    <div key={idx}>
                      <p className="text-xs text-zinc-400 mb-1">{item.question}</p>
                      <p className="text-sm text-white">{item.answer as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedApp.imgs && selectedApp.imgs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Photos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selectedApp.imgs.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noreferrer" className="block aspect-[3/4] rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                      <img src={safeUrl(img, 'img')} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500 border border-white/5 rounded-2xl bg-black/20">
            <p>Select an application to review</p>
          </div>
        )}
      </div>
    </div>
  );
};
