import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { localizeCategory } from '../utils';

interface FilterModalProps {
  onClose: () => void;
  filter: { minH: number; maxW: number; queryP: string; cat: string; searchName?: string; ageRange?: string };
  setFilter: React.Dispatch<React.SetStateAction<any>>;
}

export const FilterModal: React.FC<FilterModalProps> = ({ onClose, filter, setFilter }) => {
  const { lang, categories } = useAppContext();
  const t = translations[lang];

  const [localFilter, setLocalFilter] = useState(filter);

  const handleApply = () => {
    setFilter(localFilter);
    onClose();
  };

  const handleReset = () => {
    const resetFilter = { minH: 0, maxW: 999, queryP: '', cat: 'All', searchName: '', ageRange: 'all' };
    setLocalFilter(resetFilter);
    setFilter(resetFilter);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto text-white select-none"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <h3 className="text-base sm:text-lg font-bold uppercase mb-6 text-white tracking-[0.2em] font-sans">
            {t.search_parameters || 'FILTERS'}
          </h3>
          
          <div className="space-y-5 font-sans">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">
                Category
              </label>
              <select
                value={localFilter.cat}
                onChange={e => setLocalFilter({ ...localFilter, cat: e.target.value })}
                className="w-full bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-white outline-none transition-colors"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="bg-zinc-950 text-white">
                    {c === 'All' ? 'THE EDIT' : localizeCategory(c, t).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">
                {t.age_range || 'Age'}
              </label>
              <select
                value={localFilter.ageRange || 'all'}
                onChange={e => setLocalFilter({ ...localFilter, ageRange: e.target.value })}
                className="w-full bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-white outline-none transition-colors"
              >
                <option value="all" className="bg-zinc-950 text-white">{t.all_ages || 'All ages'}</option>
                <option value="0-3" className="bg-zinc-950 text-white">{t.age_0_3 || '0–3 years'}</option>
                <option value="4-7" className="bg-zinc-950 text-white">{t.age_4_7 || '4–7 years'}</option>
                <option value="8-12" className="bg-zinc-950 text-white">{t.age_8_12 || '8–12 years'}</option>
                <option value="13-16" className="bg-zinc-950 text-white">{t.age_13_16 || '13–16 years'}</option>
                <option value="17+" className="bg-zinc-950 text-white">{t.age_17_plus || '17+ years'}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">
                  {t.min_height} (cm)
                </label>
                <input
                  type="number"
                  value={localFilter.minH || ''}
                  onChange={e => setLocalFilter({ ...localFilter, minH: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 175"
                  className="w-full bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-white outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">
                  {t.max_weight} (kg)
                </label>
                <input
                  type="number"
                  value={localFilter.maxW === 999 ? '' : localFilter.maxW}
                  onChange={e => setLocalFilter({ ...localFilter, maxW: parseInt(e.target.value) || 999 })}
                  placeholder="e.g. 60"
                  className="w-full bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-white outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">
                {t.meas_keywords || 'Keywords / Measurements'}
              </label>
              <input
                type="text"
                value={localFilter.queryP}
                onChange={e => setLocalFilter({ ...localFilter, queryP: e.target.value })}
                placeholder="e.g. 90-60-90, blonde, blue"
                className="w-full bg-zinc-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-white outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={handleApply}
                className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer"
              >
                {t.apply}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs border border-white/20 cursor-pointer"
              >
                {t.reset}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
