import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { Search, X, Filter, LogIn, LogOut, UserPlus, Globe } from 'lucide-react';
import { localizeCategory } from '../utils';

interface HeaderProps {
  onOpenFilter: () => void;
  onOpenLogin: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeCategory?: string;
  onSelectCategory?: (cat: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFilter,
  onOpenLogin,
  searchQuery = '',
  onSearchChange,
  activeCategory = 'All',
  onSelectCategory
}) => {
  const { lang, setLang, logo, pdfLogo, currentAdmin, currentModel, logout, categories, models } = useAppContext();
  const t = translations[lang];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const getCategoryCount = (c: string) => {
    if (c === 'All') return models.length;
    return models.filter(m => {
      const catLower = (m.cat || '').toLowerCase();
      const cLower = c.toLowerCase();
      if (cLower === 'woman' || cLower === 'women') {
        return ['woman', 'women', 'девушки', 'девушка', 'qadınlar'].includes(catLower);
      }
      if (cLower === 'man' || cLower === 'men') {
        return ['man', 'men', 'мужчины', 'мужчина', 'kişilər'].includes(catLower);
      }
      if (cLower === 'kids') {
        return ['kids', 'дети', 'ребенок', 'uşaqlar'].includes(catLower);
      }
      return catLower === cLower;
    }).length;
  };

  const agencyDisplayName = logo === 'BIG' ? 'BIG MODEL AGENCY' : (logo || 'BIG MODEL AGENCY');

  return (
    <>
      <header className="sticky top-0 z-40 bg-black border-b border-white/10 px-3 sm:px-6 md:px-10 h-16 sm:h-20 flex items-center justify-between select-none transition-colors">
        {/* Left: Search & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setIsSearchOpen(prev => !prev)}
            className="text-white hover:text-zinc-300 transition-colors p-1.5 -ml-1 focus:outline-none flex items-center justify-center cursor-pointer"
            aria-label="Search"
            title={t.search_name || "Search"}
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          <div
            className="cursor-pointer max-w-[130px] xs:max-w-[200px] sm:max-w-none"
            onClick={() => {
              if (onSelectCategory) onSelectCategory('All');
              if (onSearchChange) onSearchChange('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {pdfLogo ? (
              <img src={pdfLogo} alt="Logo" className="h-6 sm:h-8 object-contain max-w-full" />
            ) : (
              <h1 className="text-white font-bold text-xs xs:text-sm sm:text-base md:text-lg tracking-[0.2em] uppercase font-sans truncate">
                {agencyDisplayName}
              </h1>
            )}
          </div>
        </div>

        {/* Right: RU / AZ / EN, Join, Filter, Access, Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold mr-1">
            {(['ru', 'az', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1 py-0.5 uppercase tracking-wider transition-colors cursor-pointer ${
                  lang === l
                    ? 'text-white font-bold border-b border-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Join Button */}
          <button
            onClick={() => {
              window.history.pushState({}, '', '/join');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border border-white/20 hover:border-white/40 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            title="Join Us"
          >
            <UserPlus size={13} />
            <span className="hidden xs:inline">Join</span>
          </button>

          {/* Filter Button */}
          <button
            onClick={onOpenFilter}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border border-white/20 hover:border-white/40 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            title={t.filter}
          >
            <Filter size={13} />
            <span className="hidden sm:inline">{t.filter}</span>
          </button>

          {/* Access / Login Button */}
          {currentAdmin || currentModel ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              title={t.exit}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{t.exit}</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              title={t.access}
            >
              <LogIn size={13} />
              <span>{t.access}</span>
            </button>
          )}

          {/* Minimalist Hamburger Menu (3 clean horizontal white bars) */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-white hover:text-zinc-300 transition-opacity p-1.5 -mr-1 focus:outline-none flex flex-col justify-between w-5 sm:w-6 h-[13px] sm:h-[15px] cursor-pointer ml-1"
            aria-label="Menu"
            title="All Categories"
          >
            <span className="w-full h-[1.5px] bg-white"></span>
            <span className="w-full h-[1.5px] bg-white"></span>
            <span className="w-full h-[1.5px] bg-white"></span>
          </button>
        </div>
      </header>

      {/* Slide-down Search Bar */}
      {isSearchOpen && (
        <div className="sticky top-16 sm:top-20 z-30 bg-black/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 md:px-12 py-3 flex items-center gap-3 transition-all">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t.search_name || "Search models by name or parameters..."}
            value={searchQuery}
            onChange={e => onSearchChange && onSearchChange(e.target.value)}
            className="w-full bg-transparent text-white text-sm sm:text-base outline-none placeholder:text-zinc-500 font-sans tracking-wide"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange && onSearchChange('')}
              className="text-[11px] uppercase tracking-wider text-zinc-400 hover:text-white px-2 py-1 font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-zinc-400 hover:text-white p-1 ml-1 cursor-pointer"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Slide-out Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-black border-l border-white/10 h-full p-6 sm:p-10 flex flex-col justify-between z-10 overflow-y-auto">
            {/* Drawer Top */}
            <div>
              <div className="flex items-center justify-between pb-8 border-b border-white/10">
                <span className="text-white font-bold text-xs uppercase tracking-[0.25em]">
                  {agencyDisplayName}
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white hover:text-zinc-400 p-2 -mr-2 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Categories Navigation */}
              <div className="py-8 flex flex-col gap-5">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
                  Categories
                </div>
                {categories.map(c => {
                  const isActive = activeCategory === c;
                  const count = getCategoryCount(c);
                  const label = c === 'All' ? 'THE EDIT' : localizeCategory(c, t).toUpperCase();
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(c);
                        setIsMenuOpen(false);
                      }}
                      className={`text-left text-lg sm:text-xl font-bold tracking-wider uppercase transition-colors flex items-center justify-between cursor-pointer ${
                        isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-xs font-mono font-normal text-zinc-500">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action Links */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-4 text-sm font-semibold tracking-wider uppercase">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFilter();
                  }}
                  className="text-left text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Filter size={16} />
                  <span>{t.filter || 'Advanced Filter'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.history.pushState({}, '', '/join');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-left text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <UserPlus size={16} />
                  <span>Join Agency / Apply</span>
                </button>

                {currentAdmin || currentModel ? (
                  <button
                    onClick={handleLogout}
                    className="text-left text-red-400 hover:text-red-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>{t.exit || 'Logout'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="text-left text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogIn size={16} />
                    <span>{t.access || 'Client / Model Login'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Bottom: Languages */}
            <div className="pt-8 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Globe size={15} />
                <span>Language</span>
              </div>
              <div className="flex items-center gap-3">
                {(['ru', 'az', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      lang === l ? 'text-white border-b border-white pb-0.5' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
