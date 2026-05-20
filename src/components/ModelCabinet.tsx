import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, daysLeft, getPlayableVideoUrl } from '../utils';
import { LogOut, Download, AlertTriangle, Globe } from 'lucide-react';
import { Footer } from './Footer';
import { ModelCalendar } from './ModelCalendar';
import { ModelNotes } from './ModelNotes';
import { ModelContractPopup } from './model/ModelContractPopup';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { FileSignature } from 'lucide-react';

import { generateModelPDF } from '../pdfUtils';

export const ModelCabinet: React.FC = () => {
  const { lang, setLang, currentModel, setCurrentModel, sessionStartTime, setSessionStartTime, pdfLogo, models, updateState, updateModel, addNotification } = useAppContext();
  const t = translations[lang];

  const [newPass, setNewPass] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showContractPopup, setShowContractPopup] = useState(false);

  // Real-time listener for the current model
  useEffect(() => {
    if (!currentModel?.id) return;
    const modelIndex = models.findIndex(m => m.id === currentModel.id);
    if (modelIndex === -1) return;

    // Determine agencyId from URL
    const getAgencyIdFromUrl = () => {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname.includes('run.app')) {
        return 'bigmodelagency'; // Default for dev/preview
      }
      return hostname.split('.')[0];
    };
    const agencyId = getAgencyIdFromUrl();

    const modelRef = ref(db, `agencies/${agencyId}/models/${modelIndex}`);
    const unsubscribe = onValue(modelRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedModel = snapshot.val();
        // Use a functional state update to avoid dependency on currentModel object
        setCurrentModel(prev => {
          if (!prev || JSON.stringify(updatedModel) !== JSON.stringify(prev)) {
            return updatedModel;
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, [currentModel?.id]); // Only re-run if ID changes

  const handleLogout = async () => {
    if (sessionStartTime && currentModel) {
      const spent = Math.floor((Date.now() - sessionStartTime) / 1000);
      const updatedModel = { ...currentModel, timeSpent: (currentModel.timeSpent || 0) + spent };
      await updateModel(updatedModel);
    }
    setCurrentModel(null);
    setSessionStartTime(null);
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeout);
      // 10 minutes = 600,000 ms
      timeout = setTimeout(() => {
        handleLogout();
      }, 600000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [currentModel, sessionStartTime, models]);

  if (!currentModel) return null;

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newPass) return;
    const history = currentModel.passHistory || [];
    const updatedHistory = [...history, { date: new Date().toISOString(), old: currentModel.modelPass, new: newPass }];
    const updatedModel = { ...currentModel, modelPass: newPass, passHistory: updatedHistory };
    await updateModel(updatedModel);
    await addNotification(`Model ${currentModel.name} changed password`, 'info');
    setCurrentModel(updatedModel);
    setNewPass('');
    setSuccessMsg('Password successfully updated!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDownloadResume = async () => {
    await generateModelPDF(currentModel, pdfLogo);
  };

  const getExpiryColor = (dateStr: string | null) => {
    const dl = daysLeft(dateStr);
    if (dl === null) return 'text-white';
    if (dl <= 10 && dl >= 0) return 'text-red-500 font-black';
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans flex flex-col">
      <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Talent Portal</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
            <Globe size={14} className="text-zinc-400" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as 'ru' | 'en' | 'az')}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer uppercase tracking-widest"
            >
              <option value="ru" className="bg-zinc-900">RU</option>
              <option value="en" className="bg-zinc-900">EN</option>
              <option value="az" className="bg-zinc-900">AZ</option>
            </select>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-semibold transition-colors border border-red-500/20">
            <LogOut size={16} />
            {t.exit}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 border-b border-white/10 pb-6 md:pb-8 gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif text-white mb-2 truncate font-medium tracking-tight">{currentModel.name || '—'}</h1>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.prof_model_interface}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 w-full md:w-auto">
            <button onClick={() => setShowContractPopup(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-full transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)] whitespace-nowrap uppercase tracking-widest text-xs justify-center">
              <FileSignature size={16} />
              Контракты
            </button>
            <button onClick={handleDownloadResume} className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full transition-colors shadow-md whitespace-nowrap uppercase tracking-widest text-xs justify-center">
              <Download size={16} />
              {t.generate_pdf}
            </button>
          </div>
        </div>

        {showContractPopup && <ModelContractPopup onClose={() => setShowContractPopup(false)} />}

        {/* Horizontally scrollable stats on mobile */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-4 mb-10 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
          <div className="snap-start shrink-0 w-28 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.height}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.height || '—'} <span className="text-xs text-zinc-500 font-sans">{t.cm}</span></b>
          </div>
          <div className="snap-start shrink-0 w-28 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.weight}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.weight || '—'} <span className="text-xs text-zinc-500 font-sans">{t.kg}</span></b>
          </div>
          <div className="snap-start shrink-0 w-28 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.shoe}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.shoe || '—'}</b>
          </div>
          <div className="snap-start shrink-0 w-28 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.status}</span>
            <b className="text-sm lg:text-lg text-white">{currentModel.status === 'Inactive' ? t.inactive : t.active}</b>
          </div>
          {currentModel.contractStart && (
            <div className="snap-start shrink-0 w-32 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Start</span>
              <b className="text-sm lg:text-lg text-white flex items-center justify-center gap-1">
                {currentModel.contractStart}
              </b>
            </div>
          )}
          <div className="snap-start shrink-0 w-32 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.expiry}</span>
            <b className={`text-sm lg:text-lg ${getExpiryColor(currentModel.expiry)} flex items-center justify-center gap-1`}>
              {currentModel.expiry || '-'}
              {daysLeft(currentModel.expiry) !== null && daysLeft(currentModel.expiry)! <= 10 && <AlertTriangle size={14} className="text-red-500" />}
            </b>
          </div>
          <div className="snap-start shrink-0 w-32 sm:w-auto sm:flex-1 bg-zinc-900/40 p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.payment}</span>
            <b className={`text-sm lg:text-lg ${getExpiryColor(currentModel.payExpiry)} flex items-center justify-center gap-1`}>
              {currentModel.payExpiry || '-'}
              {daysLeft(currentModel.payExpiry) !== null && daysLeft(currentModel.payExpiry)! <= 10 && <AlertTriangle size={14} className="text-red-500" />}
            </b>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Career & Schedule */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-white/5">
              <h3 className="text-[10px] font-black uppercase mb-6 text-zinc-500 tracking-widest">{t.career_history}</h3>
              <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line break-words font-serif italic">
                {currentModel.shows || t.no_data}
              </div>
            </div>

            <div className="bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-white/5">
              <ModelCalendar 
                model={currentModel} 
                isAdmin={false} 
              />
            </div>

            <div className="bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-white/5">
              <ModelNotes 
                model={currentModel} 
                onUpdateModel={async () => {}} 
                isAdmin={false} 
              />
            </div>
          </div>

          {/* Right Column: Visual Portfolio */}
          <div className="lg:col-span-8 bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-white/5">
            <h3 className="text-[10px] font-black uppercase mb-6 sm:mb-8 text-zinc-500 tracking-widest">{t.visual_portfolio}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {(currentModel.imgs || []).map((src, idx) => (
                <img
                  key={`img-${idx}`}
                  src={safeUrl(src, 'img')}
                  alt={`portfolio-${idx}`}
                  className="aspect-[3/4] object-cover rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-black w-full"
                  loading="lazy"
                />
              ))}
              {(currentModel.videos || []).map((src, idx) => {
                const playable = getPlayableVideoUrl(src);
                if (!playable) return null;
                return (
                  <div key={`vid-${idx}`} className="aspect-[3/4] rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-black overflow-hidden relative">
                    <div className="absolute top-2 right-2 z-10">
                      <span className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-full">VIDEO</span>
                    </div>
                    {playable.isDriveIframe ? (
                      <iframe
                        src={playable.url}
                        allow="autoplay"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={playable.url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-zinc-900/50 p-8 rounded-3xl shadow-sm border border-white/5">
          <h3 className="text-[10px] font-black uppercase mb-6 text-zinc-500 tracking-widest">{t.security_settings}</h3>
          <form onSubmit={handleChangePass} className="flex flex-col sm:flex-row gap-4 max-w-md">
            <input 
              type="password" 
              value={newPass} 
              onChange={e => setNewPass(e.target.value)} 
              placeholder={t.new_password} 
              className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white"
              required 
              minLength={6}
            />
            <button type="submit" className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-xl transition-colors uppercase tracking-widest text-xs whitespace-nowrap">
              {t.change_password}
            </button>
          </form>
          {successMsg && <p className="text-green-500 text-xs font-bold uppercase tracking-widest mt-4">{successMsg}</p>}
        </div>

      </div>
      <Footer />
    </div>
  );
};
