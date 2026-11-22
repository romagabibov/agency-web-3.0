import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, localizeCategory, matchesCategory, matchesAgeRange, formatEditorialSpecs } from '../utils';
import { ModelDetailsModal } from './ModelDetailsModal';
import { ModelProfileView } from './ModelProfileView';
import { Model } from '../types';

const ModelCardImage: React.FC<{ model: Model }> = ({ model }) => {
  const allImgs = React.useMemo(() => {
    if (!model || !model.imgs) return [];
    const raw = Array.isArray(model.imgs) ? model.imgs : (typeof model.imgs === 'object' ? Object.values(model.imgs) : []);
    const valid = raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    // Prioritize fast, permanent Cloudinary URLs
    return valid.sort((a, b) => {
      const aC = a.includes('cloudinary');
      const bC = b.includes('cloudinary');
      if (aC && !bC) return -1;
      if (!aC && bC) return 1;
      return 0;
    });
  }, [model]);

  const [imgIndex, setImgIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentUrl = allImgs[imgIndex];

  const handleImgError = () => {
    if (imgIndex + 1 < allImgs.length) {
      setImgIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const initials = (model.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  if (hasError || !currentUrl) {
    return (
      <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mb-2">
          <span className="font-serif text-lg font-bold tracking-widest text-zinc-400">
            {initials || 'BM'}
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
          Big Model
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
      <img
        key={currentUrl}
        src={safeUrl(currentUrl, 'img')}
        alt={model.name}
        onError={handleImgError}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}
    </div>
  );
};

interface ModelGridProps {
  filter: {
    minH: number;
    maxW: number;
    queryP: string;
    cat: string;
    searchName?: string;
    ageRange?: string;
  };
  isPackageView?: boolean;
  packageModelIds?: string[];
  packageId?: string;
  directModels?: Model[];
  onSelectCategory?: (cat: string) => void;
  onSelectAgeRange?: (range: string) => void;
}

export const ModelGrid: React.FC<ModelGridProps> = ({
  filter,
  isPackageView,
  packageModelIds,
  packageId,
  directModels,
  onSelectCategory,
  onSelectAgeRange
}) => {
  const { models: contextModels, lang, categories } = useAppContext();
  const models = directModels && directModels.length > 0 ? directModels : contextModels;
  const t = translations[lang];
  const [selectedModel, setSelectedModel] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('model');
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedModel(params.get('model'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedModel) {
      url.searchParams.set('model', selectedModel);
    } else {
      url.searchParams.delete('model');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedModel]);

  const qParams = (filter.queryP || '').toLowerCase();

  const filtered = models.filter(m => {
    if (directModels && directModels.length > 0) {
      return true;
    }
    if (packageModelIds) {
      return packageModelIds.includes(m.id);
    }
    const catOk = matchesCategory(m.cat, filter.cat);
    const ageOk = matchesAgeRange(m, filter.ageRange);
    const hVal = parseInt(m.height || '0', 10);
    const hOk = isNaN(hVal) ? true : hVal >= (filter.minH || 0);
    const wVal = parseInt(m.weight || '999', 10);
    const wOk = isNaN(wVal) ? true : wVal <= (filter.maxW || 999);
    const pOk = String(m.params || '').toLowerCase().includes(qParams);
    const nameOk = !filter.searchName || String(m.name || '').toLowerCase().includes(filter.searchName.toLowerCase());
    const activeOk = m.status ? m.status !== 'Inactive' : true;
    return catOk && ageOk && hOk && wOk && pOk && nameOk && activeOk;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Section title matching APM Models New York: "THE EDIT (44)"
  const categoryHeaderTitle = React.useMemo(() => {
    if (filter.searchName && filter.searchName.trim()) {
      return `SEARCH: "${filter.searchName.trim()}"`;
    }
    if (filter.cat === 'All') {
      return 'THE EDIT';
    }
    return localizeCategory(filter.cat, t);
  }, [filter.cat, filter.searchName, t]);

  const isKidsActive = matchesCategory(filter.cat, 'Kids');

  // Render in-page tab view when a model is selected (parameters on top, all photos on swipe)
  if (selectedModel) {
    return (
      <ModelProfileView
        modelId={selectedModel}
        onClose={() => setSelectedModel(null)}
        packageId={packageId}
        allModels={filtered}
        onSelectModel={(id) => {
          setSelectedModel(id);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 md:px-12">
      {/* Category Header Row (matching APM New York: THE EDIT (44)) */}
      {!isPackageView && (
        <div className="pt-6 sm:pt-8 pb-5 sm:pb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-white font-bold text-sm sm:text-base tracking-[0.14em] uppercase font-sans">
              {categoryHeaderTitle} ({filtered.length})
            </h2>
          </div>

          {/* Quick Category Text Switcher (Clean, unboxed, anti-slop) */}
          {onSelectCategory && (
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto hide-scrollbar text-xs tracking-wider uppercase font-medium">
              {categories.map(c => {
                const isActive = filter.cat === c;
                const label = c === 'All' ? 'THE EDIT' : localizeCategory(c, t);
                return (
                  <button
                    key={c}
                    onClick={() => onSelectCategory(c)}
                    className={`transition-colors whitespace-nowrap cursor-pointer pb-0.5 ${
                      isActive
                        ? 'text-white border-b-2 border-white font-bold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Kids Age Sub-Filter (Clean unboxed inline links) */}
      {isKidsActive && onSelectAgeRange && (
        <div className="pb-5 flex items-center gap-3 sm:gap-4 overflow-x-auto hide-scrollbar text-xs tracking-wider uppercase">
          <span className="text-zinc-500 font-semibold">{t.age_range || 'Age'}:</span>
          {[
            { id: 'all', label: t.all_ages || 'All' },
            { id: '0-3', label: t.age_0_3 || '0–3' },
            { id: '4-7', label: t.age_4_7 || '4–7' },
            { id: '8-12', label: t.age_8_12 || '8–12' },
            { id: '13-16', label: t.age_13_16 || '13–16' }
          ].map(range => (
            <button
              key={range.id}
              onClick={() => onSelectAgeRange(range.id)}
              className={`transition-colors whitespace-nowrap pb-0.5 cursor-pointer ${
                filter.ageRange === range.id
                  ? 'text-white border-b border-white font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}

      {/* 5-Column High Fashion Editorial Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 w-full pb-16">
        {filtered.length === 0 ? (
          <div className="col-span-full py-24 text-center flex flex-col items-center justify-center text-zinc-500">
            <p className="font-sans text-base sm:text-lg text-zinc-400 mb-2 font-medium">Ничего не найдено</p>
            <p className="text-xs text-zinc-600 max-w-sm">Попробуйте изменить параметры поиска или выбрать другую категорию</p>
          </div>
        ) : (
          filtered.map((m, idx) => {
            const specs = formatEditorialSpecs(m);
            return (
              <div
                key={`${m.id || 'missing-id'}-${idx}`}
                onClick={() => {
                  setSelectedModel(m.id);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedModel(m.id);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }
                }}
                tabIndex={0}
                role="button"
                className="group relative aspect-[4/5] w-full overflow-hidden bg-zinc-950 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-white/40"
              >
                {/* Editorial Photo */}
                <ModelCardImage model={m} />

                {/* Hover Overlay matching APM Models New York */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center select-none pointer-events-none">
                  {/* Model name centered (lowercase/natural case sans-serif like antonia gloessel) */}
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg tracking-wide lowercase font-sans">
                    {m.name || '—'}
                  </h3>

                  {/* Measurements centered underneath (e.g. 5' 11", 32" / 23" / 35") */}
                  {specs && (
                    <p className="text-zinc-200 text-xs sm:text-[13px] font-normal tracking-wide mt-1 font-sans">
                      {specs}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
