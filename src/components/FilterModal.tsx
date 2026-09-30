import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FilterModalProps {
  onClose: () => void;
  filter: { minH: number; maxW: number; queryP: string; cat: string };
  setFilter: React.Dispatch<React.SetStateAction<{ minH: number; maxW: number; queryP: string; cat: string }>>;
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
    const resetFilter = { minH: 0, maxW: 999, queryP: '', cat: 'All' };
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
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
          
          <h3 className="text-xl font-black uppercase mb-6 text-white tracking-tight">{t.search_parameters}</h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Category</label>
              <select
                value={localFilter.cat}
                onChange={e => setLocalFilter({ ...localFilter, cat: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'All' ? t.all : c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.min_height}</label>
                <input
                  type="number"
                  value={localFilter.minH || ''}
                  onChange={e => setLocalFilter({ ...localFilter, minH: parseInt(e.target.value) || 0 })}
                  placeholder={t.min_height}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.max_weight}</label>
                <input
                  type="number"
                  value={localFilter.maxW === 999 ? '' : localFilter.maxW}
                  onChange={e => setLocalFilter({ ...localFilter, maxW: parseInt(e.target.value) || 999 })}
                  placeholder={t.max_weight}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t.meas_keywords}</label>
              <input
                type="text"
                value={localFilter.queryP}
                onChange={e => setLocalFilter({ ...localFilter, queryP: e.target.value })}
                placeholder={t.meas_keywords}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleApply}
                className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs"
              >
                {t.apply}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-xs border border-white/10"
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
