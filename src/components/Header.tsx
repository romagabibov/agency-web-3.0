import React from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { Filter, LogIn, LogOut, UserPlus } from 'lucide-react';

interface HeaderProps {
  onOpenFilter: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFilter, onOpenLogin }) => {
  const { lang, setLang, logo, pdfLogo, currentAdmin, currentModel, setCurrentAdmin, setCurrentModel, setSessionStartTime } = useAppContext();
  const t = translations[lang];

  const handleLogout = () => {
    setCurrentAdmin(null);
    setCurrentModel(null);
    setSessionStartTime(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-3 sm:gap-0">
      <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto cursor-pointer overflow-hidden px-2" onClick={() => window.location.reload()}>
        {logo === 'BIG' ? (
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white italic leading-tight break-words text-center sm:text-left">
            BIG<span className="text-zinc-500">AGENCY</span>
          </h1>
        ) : pdfLogo ? (
          <img src={pdfLogo} alt="Logo" className="h-8 sm:h-10 object-contain max-w-full" style={{ maxWidth: '100%', maxHeight: '40px' }} />
        ) : (
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white italic leading-tight break-words text-center sm:text-left max-w-full overflow-hidden text-ellipsis">
            {logo}
          </h1>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          {(['ru', 'az', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${
                lang === l ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            window.history.pushState({}, '', '/join');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors border border-white/5"
          title="Join Us"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Join</span>
        </button>

        <button
          onClick={onOpenFilter}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors border border-white/5"
        >
          <Filter size={16} />
          <span className="hidden sm:inline">{t.filter}</span>
        </button>

        {currentAdmin || currentModel ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs sm:text-sm font-semibold transition-colors border border-red-500/20"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t.exit}</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">{t.access}</span>
          </button>
        )}
      </div>
    </header>
  );
};
