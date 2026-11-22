import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, daysLeft, getPlayableVideoUrl, formatAge } from '../utils';
import { LogOut, Download, AlertTriangle, Globe, X, Clock } from 'lucide-react';
import { Footer } from './Footer';
import { ModelCalendar } from './ModelCalendar';
import { ModelNotes } from './ModelNotes';
import { ModelContractPopup } from './model/ModelContractPopup';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { FileSignature } from 'lucide-react';

import { generateModelPDF } from '../pdfUtils';

export const ModelCabinet: React.FC = () => {
  const { lang, setLang, currentModel, setCurrentModel, sessionStartTime, setSessionStartTime, pdfLogo, models, updateState, updateModel, addNotification, logout } = useAppContext();
  const t = translations[lang];

  const [newPass, setNewPass] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [loginErrorMsg, setLoginErrorMsg] = useState('');
  const [showContractPopup, setShowContractPopup] = useState(false);

  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardPassword, setOnboardPassword] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);

  useEffect(() => {
    const isDismissed = currentModel?.id ? sessionStorage.getItem(`onboarding_remind_later_${currentModel.id}`) : false;
    if (currentModel && !currentModel.email && !isDismissed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [currentModel?.id, currentModel?.email]);

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

  const handleLogout = () => {
    logout();
  };

  if (!currentModel) return null;

  const msgTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

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
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleChangeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMsg('');
    setLoginSuccessMsg('');
    const trimmed = newLogin.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      setLoginErrorMsg(lang === 'ru' ? 'Логин должен быть не короче 2 символов' : lang === 'az' ? 'Login ən az 2 simvol olmalıdır' : 'Login must be at least 2 characters');
      return;
    }

    // Check if another model already uses this login or name
    const inputLower = trimmed.toLowerCase();
    const isTaken = models.some(m => String(m.id) !== String(currentModel.id) && (
      (m.modelLogin && m.modelLogin.toLowerCase().trim() === inputLower) ||
      (m.name && m.name.toLowerCase().trim() === inputLower)
    ));

    if (isTaken) {
      setLoginErrorMsg(t.login_already_taken || (lang === 'ru' ? 'Этот логин уже занят другой моделью' : 'This login is already taken'));
      return;
    }

    // Preserve original model name, update only modelLogin
    const updatedModel = { ...currentModel, modelLogin: trimmed };
    await updateModel(updatedModel);
    await addNotification(`Model ${currentModel.name} updated personal login to "${trimmed}"`, 'info');
    setCurrentModel(updatedModel);
    setNewLogin('');
    setLoginSuccessMsg(t.login_changed_success || (lang === 'ru' ? 'Логин успешно изменен!' : 'Login updated!'));
    setTimeout(() => setLoginSuccessMsg(''), 5000);
  };

  const handleDownloadResume = async () => {
    await generateModelPDF(currentModel, pdfLogo);
  };

  const handleOnboardEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardEmail.includes('@')) return;
    
    // Check if email already in use
    const emailExists = models.some(m => m.email?.toLowerCase() === onboardEmail.toLowerCase());
    if (emailExists) {
      addNotification('This email is already in use by another account.', 'error');
      return;
    }

    setOnboardingStep(2);
  };

  const handleOnboardFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const upModel = { ...currentModel, email: onboardEmail };
    if (onboardPassword.trim().length >= 6) {
      const history = upModel.passHistory || [];
      const updatedHistory = [...history, { date: new Date().toISOString(), old: upModel.modelPass, new: onboardPassword }];
      upModel.modelPass = onboardPassword;
      upModel.passHistory = updatedHistory;
    }
    
    await updateModel(upModel);
    setCurrentModel(upModel);
    addNotification('Account successfully updated!', 'success');
    setShowOnboarding(false);
  };

  const handleRemindLater = () => {
    if (currentModel?.id) {
      sessionStorage.setItem(`onboarding_remind_later_${currentModel.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  const getExpiryColor = (dateStr: string | null) => {
    const dl = daysLeft(dateStr);
    if (dl === null) return 'text-white';
    if (dl <= 10 && dl >= 0) return 'text-red-500 font-black';
    return 'text-white';
  };

  const onboardStrings = {
    ru: {
      title1: 'Привязка Gmail',
      desc1: 'Пожалуйста, привяжите ваш почтовый ящик (желательно Gmail) для быстрого входа и защиты аккаунта.',
      title2: 'Обновление пароля (Опционально)',
      desc2: 'Хотите обновить пароль аккаунта? Оставьте поле пустым, чтобы сохранить текущий пароль.',
      continue: 'Продолжить',
      finish: 'Завершить настройку',
      remindLater: 'Напомнить позже',
      placeholderEmail: 'example@gmail.com',
      placeholderPass: 'Новый пароль (мин. 6 символов)'
    },
    en: {
      title1: 'Link Account Email',
      desc1: 'Please link your email address (Gmail preferred) to enable fast sign-in and secure your account.',
      title2: 'Update Password (Optional)',
      desc2: 'Would you like to update your account password? Leave blank to keep existing.',
      continue: 'Continue',
      finish: 'Finish Setup',
      remindLater: 'Remind me later',
      placeholderEmail: 'example@gmail.com',
      placeholderPass: 'New password (min 6 chars)'
    },
    az: {
      title1: 'E-poçtunuzu bağlayın',
      desc1: 'Zəhmət olmasa, sürətli daxil olmaq və hesabınızı qorumaq üçün e-poçtunuzu (Gmail) bağlayın.',
      title2: 'Şifrəni yenilə (İstəyə bağlı)',
      desc2: 'Hesabınızın şifrəsini yeniləmək istəyirsiniz? Mövcud olanı saxlamaq üçün boş buraxın.',
      continue: 'Davam et',
      finish: 'Quraşdırmanı bitirin',
      remindLater: 'Daha sonra xatırlat',
      placeholderEmail: 'example@gmail.com',
      placeholderPass: 'Yeni şifrə (min 6 simvol)'
    }
  };
  const obs = onboardStrings[lang];

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans flex flex-col relative">
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col items-center">
            <button
              type="button"
              onClick={handleRemindLater}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-zinc-500 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5"
              title={obs.remindLater}
            >
              <X size={20} />
            </button>

            <h3 className="text-xl sm:text-2xl font-black uppercase mb-3 text-white tracking-tight text-center pr-6 pl-6">
              {onboardingStep === 1 ? obs.title1 : obs.title2}
            </h3>
            
            {onboardingStep === 1 && (
              <>
                <p className="text-xs sm:text-sm text-zinc-400 text-center mb-6">
                  {obs.desc1}
                </p>
                <form onSubmit={handleOnboardEmailSubmit} className="w-full space-y-3">
                  <input
                    type="email"
                    value={onboardEmail}
                    onChange={e => setOnboardEmail(e.target.value)}
                    placeholder={obs.placeholderEmail}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all text-center font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg uppercase tracking-widest text-xs sm:text-sm"
                  >
                    {obs.continue}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemindLater}
                    className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs border border-white/10 flex items-center justify-center gap-2"
                  >
                    <Clock size={14} />
                    <span>{obs.remindLater}</span>
                  </button>
                </form>
              </>
            )}

            {onboardingStep === 2 && (
              <>
                <p className="text-xs sm:text-sm text-zinc-400 text-center mb-6">
                  {obs.desc2}
                </p>
                <form onSubmit={handleOnboardFinish} className="w-full space-y-3">
                  <input
                    type="password"
                    value={onboardPassword}
                    onChange={e => setOnboardPassword(e.target.value)}
                    placeholder={obs.placeholderPass}
                    minLength={6}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all text-center font-medium"
                  />
                  <button
                    type="submit"
                    className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg uppercase tracking-widest text-xs sm:text-sm"
                  >
                    {obs.finish}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemindLater}
                    className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs border border-white/10 flex items-center justify-center gap-2"
                  >
                    <Clock size={14} />
                    <span>{obs.remindLater}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm gap-2">
        <h2 className="text-base sm:text-xl font-black uppercase tracking-tighter text-white">Talent Portal</h2>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
            <Globe size={13} className="text-zinc-400" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as 'ru' | 'en' | 'az')}
              className="bg-transparent text-[11px] sm:text-xs font-bold text-white outline-none cursor-pointer uppercase tracking-widest"
            >
              <option value="ru" className="bg-zinc-900">RU</option>
              <option value="en" className="bg-zinc-900">EN</option>
              <option value="az" className="bg-zinc-900">AZ</option>
            </select>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs sm:text-sm font-semibold transition-colors border border-red-500/20">
            <LogOut size={14} />
            <span className="hidden sm:inline">{t.exit}</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 flex-grow w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-12 border-b border-white/10 pb-6 md:pb-8 gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif text-white mb-2 break-words font-medium tracking-tight leading-none">{currentModel.name || '—'}</h1>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.prof_model_interface}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 w-full md:w-auto">
            <button onClick={() => setShowContractPopup(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-full transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)] whitespace-nowrap uppercase tracking-widest text-xs justify-center">
              <FileSignature size={16} />
              {t.contracts}
            </button>
            <button onClick={handleDownloadResume} className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full transition-colors shadow-md whitespace-nowrap uppercase tracking-widest text-xs justify-center">
              <Download size={16} />
              {t.generate_pdf}
            </button>
          </div>
        </div>

        {showContractPopup && <ModelContractPopup onClose={() => setShowContractPopup(false)} />}

        {/* Stats on mobile as grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-3 sm:gap-4 mb-10">
          {(currentModel.age || currentModel.birthDate) && (
            <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-amber-400/20 text-center flex flex-col justify-center lg:flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.age}</span>
              <b className="text-lg lg:text-2xl text-amber-300 font-serif">{formatAge(currentModel.age, currentModel.birthDate, lang)}</b>
            </div>
          )}
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.height}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.height || '—'} <span className="text-xs text-zinc-500 font-sans">{t.cm}</span></b>
          </div>
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.weight}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.weight || '—'} <span className="text-xs text-zinc-500 font-sans">{t.kg}</span></b>
          </div>
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.shoe}</span>
            <b className="text-lg lg:text-2xl text-white font-serif">{currentModel.shoe || '—'}</b>
          </div>
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.status}</span>
            <b className="text-sm lg:text-lg text-white">{currentModel.status === 'Inactive' ? t.inactive : t.active}</b>
          </div>
          {currentModel.contractStart && (
            <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Start</span>
              <b className="text-sm lg:text-lg text-white flex items-center justify-center gap-1">
                {currentModel.contractStart}
              </b>
            </div>
          )}
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.expiry}</span>
            <b className={`text-sm lg:text-lg ${getExpiryColor(currentModel.expiry)} flex items-center justify-center gap-1`}>
              {currentModel.expiry || '-'}
              {daysLeft(currentModel.expiry) !== null && daysLeft(currentModel.expiry)! <= 10 && <AlertTriangle size={14} className="text-red-500" />}
            </b>
          </div>
          <div className="bg-zinc-900/40 p-3 sm:p-4 lg:p-6 rounded-2xl border border-white/5 text-center flex flex-col justify-center lg:flex-1">
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

        <div className="mt-8 bg-zinc-900/50 p-6 sm:p-8 rounded-3xl shadow-sm border border-white/5">
          <h3 className="text-[10px] font-black uppercase mb-6 text-zinc-500 tracking-widest">{t.security_settings}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Section 1: Change Personal Login */}
            <div className="bg-black/40 p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t.change_login}</h4>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 font-mono shrink-0">
                    {t.current_login}: <strong className="text-white">{currentModel.modelLogin || currentModel.name}</strong>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  {lang === 'ru' 
                    ? `Персональный логин для входа. Имя в каталоге (${currentModel.name}) останется без изменений.`
                    : lang === 'az'
                    ? `Kabinə daxil olmaq üçün fərdi login. Kataloqdakı ad (${currentModel.name}) dəyişməz qalır.`
                    : `Personal login to sign in. Catalog name (${currentModel.name}) will remain unchanged.`
                  }
                </p>
                <form onSubmit={handleChangeLogin} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={newLogin} 
                    onChange={e => { setNewLogin(e.target.value); setLoginErrorMsg(''); }} 
                    placeholder={currentModel.modelLogin || currentModel.name || t.new_login} 
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white"
                    required 
                    minLength={2}
                  />
                  <button type="submit" className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-5 rounded-xl transition-colors uppercase tracking-widest text-xs whitespace-nowrap">
                    {t.save_login}
                  </button>
                </form>
                {loginErrorMsg && <p className="text-red-400 text-xs font-semibold mt-2.5">{loginErrorMsg}</p>}
                {loginSuccessMsg && <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-2.5">✓ {loginSuccessMsg}</p>}
              </div>
            </div>

            {/* Section 2: Change Password */}
            <div className="bg-black/40 p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">{t.change_password}</h4>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  {lang === 'ru'
                    ? 'Обновите пароль доступа к вашему кабинету (минимум 6 символов).'
                    : lang === 'az'
                    ? 'Kabinə giriş şifrənizi yeniləyin (ən azı 6 simvol).'
                    : 'Update your cabinet access password (minimum 6 characters).'
                  }
                </p>
                <form onSubmit={handleChangePass} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="password" 
                    value={newPass} 
                    onChange={e => setNewPass(e.target.value)} 
                    placeholder={t.new_password} 
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white"
                    required 
                    minLength={6}
                  />
                  <button type="submit" className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-5 rounded-xl transition-colors uppercase tracking-widest text-xs whitespace-nowrap">
                    {t.change_password}
                  </button>
                </form>
                {successMsg && <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-2.5">✓ {successMsg}</p>}
              </div>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
};
