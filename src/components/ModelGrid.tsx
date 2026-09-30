import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl } from '../utils';
import { motion } from 'framer-motion';
import { ModelDetailsModal } from './ModelDetailsModal';

export const ModelGrid: React.FC<{ filter: { minH: number; maxW: number; queryP: string; cat: string; searchName?: string }, isPackageView?: boolean, packageModelIds?: string[], packageId?: string }> = ({ filter, isPackageView, packageModelIds, packageId }) => {
  const { models, lang } = useAppContext();
  const t = translations[lang];
  const [selectedModel, setSelectedModel] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('model');
  });

  // Update URL when selectedModel changes
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
    if (packageModelIds) {
      return packageModelIds.includes(m.id);
    }
    const catOk = filter.cat === 'All' || m.cat === filter.cat;
    const hVal = parseInt(m.height || '0', 10);
    const hOk = isNaN(hVal) ? true : hVal >= (filter.minH || 0);
    const wVal = parseInt(m.weight || '999', 10);
    const wOk = isNaN(wVal) ? true : wVal <= (filter.maxW || 999);
    const pOk = String(m.params || '').toLowerCase().includes(qParams);
    const nameOk = !filter.searchName || String(m.name || '').toLowerCase().includes(filter.searchName.toLowerCase());
    const activeOk = m.status ? m.status !== 'Inactive' : true;
    return catOk && hOk && wOk && pOk && nameOk && activeOk;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const localizeCategory = (cat: string) => {
    const c = String(cat || '').trim().toLowerCase();
    if (['woman','women','female','девушки','девушка','qadınlar','qadinlar','qadin','qadın'].includes(c)) return t.woman;
    if (['man','men','male','мужчины','мужчина','kişilər','kisiler','kisi','kişi'].includes(c)) return t.man;
    if (['kids','children','дети','uşaqlar','usaqlar','uşaq','usaq'].includes(c)) return t.kids;
    return cat || '—';
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 p-4 sm:p-6 md:p-12">
        {filtered.map((m, idx) => (
          <motion.div
            key={`${m.id || 'missing-id'}-${idx}`}
            onClick={() => setSelectedModel(m.id)}
            className="group cursor-pointer flex flex-col"
            whileHover={{ y: -4 }}
          >
            <div className="aspect-[3/4] overflow-hidden bg-zinc-900 relative mb-3 sm:mb-4">
              <img
                src={safeUrl(m.imgs?.[0], 'img')}
                alt={m.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-white text-lg sm:text-xl leading-tight mb-1 truncate">{m.name || '—'}</h3>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{localizeCategory(m.cat)}</p>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 mt-1">
                {m.height || '—'} {t.cm}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedModel && (
        <ModelDetailsModal
          modelId={selectedModel}
          onClose={() => setSelectedModel(null)}
          packageId={packageId}
        />
      )}
    </>
  );
};
