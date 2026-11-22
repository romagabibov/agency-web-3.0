import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, getPlayableVideoUrl, incrementPackageStat, formatAge } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Maximize2,
  X
} from 'lucide-react';
import { Model } from '../types';

interface ModelProfileViewProps {
  modelId: string;
  onClose: () => void;
  packageId?: string;
  allModels?: Model[];
  onSelectModel?: (id: string) => void;
}

export const ModelProfileView: React.FC<ModelProfileViewProps> = ({
  modelId,
  onClose,
  packageId,
  allModels = [],
  onSelectModel
}) => {
  const { models, lang } = useAppContext();
  const t = translations[lang];
  const m = (allModels.length > 0 ? allModels : models).find(x => String(x.id) === String(modelId));

  const [startTime] = useState(Date.now());
  const [liked, setLiked] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll to top when model changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [modelId]);

  // Analytics for package views
  useEffect(() => {
    if (packageId && modelId) {
      incrementPackageStat(packageId, 'modelViews', modelId, 1).catch(console.error);
    }
    return () => {
      if (packageId && modelId) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        if (timeSpent > 0) {
          incrementPackageStat(packageId, 'timeSpent', modelId, timeSpent).catch(console.error);
        }
      }
    };
  }, [packageId, modelId, startTime]);

  const handleLike = () => {
    if (!liked && packageId) {
      setLiked(true);
      incrementPackageStat(packageId, 'likes', modelId, 1).catch(console.error);
    }
  };

  // Clean media array
  const rawImgs = React.useMemo(() => {
    if (!m || !m.imgs) return [];
    const raw = Array.isArray(m.imgs) ? m.imgs : (typeof m.imgs === 'object' ? Object.values(m.imgs) : []);
    const valid = raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    // Prioritize Cloudinary
    return valid.sort((a, b) => {
      const aC = a.includes('cloudinary');
      const bC = b.includes('cloudinary');
      if (aC && !bC) return -1;
      if (!aC && bC) return 1;
      return 0;
    });
  }, [m]);

  if (!m) return null;

  // Next / Previous model in list
  const currentModelIndex = allModels.findIndex(x => String(x.id) === String(modelId));
  const prevModel = currentModelIndex > 0 ? allModels[currentModelIndex - 1] : null;
  const nextModel = currentModelIndex >= 0 && currentModelIndex < allModels.length - 1 ? allModels[currentModelIndex + 1] : null;

  // Measurements
  const hCm = parseInt(m.height || '0', 10);
  let imperialHeight = '';
  if (!isNaN(hCm) && hCm >= 120 && hCm <= 230) {
    const totalInches = Math.round(hCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    imperialHeight = `${feet}' ${inches}"`;
  }

  const cleanParams = m.params ? m.params.replace(/\s*[-\/]\s*/g, ' / ').trim() : '';

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('model', m.id);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans select-none pb-24 animate-in fade-in duration-300">
      {/* Top Bar: Back button, Model Switcher, Share */}
      <div className="sticky top-16 sm:top-20 z-30 bg-black/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 md:px-12 py-3.5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs font-bold uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={16} />
          <span>{t.all || 'THE EDIT'}</span>
        </button>

        {/* Model Next/Prev Navigation */}
        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {prevModel && onSelectModel && (
            <button
              onClick={() => onSelectModel(prevModel.id)}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title={prevModel.name}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          <span className="text-zinc-600 hidden sm:inline">•</span>

          {nextModel && onSelectModel && (
            <button
              onClick={() => onSelectModel(nextModel.id)}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title={nextModel.name}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          )}

          <button
            onClick={handleShare}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 ml-2 cursor-pointer"
            title="Share model profile"
          >
            <Share2 size={14} />
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Hero Header: Model Parameters & Bio */}
      <div className="px-4 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-8 max-w-6xl mx-auto">
        {/* Division / Category */}
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-2">
          {m.cat || 'THE EDIT'}
        </div>

        {/* Model Full Name */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider text-white font-sans mb-6">
          {m.name || '—'}
        </h1>

        {/* Clean Editorial Specs Grid (Parameters directly at the top) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-x-6 gap-y-4 py-5 border-t border-b border-white/15 my-6 text-left">
          {/* Height */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
              {t.height || 'HEIGHT'}
            </span>
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {m.height ? `${m.height} cm` : '—'}
            </p>
            {imperialHeight && (
              <span className="text-xs text-zinc-400 font-mono block mt-0.5">{imperialHeight}</span>
            )}
          </div>

          {/* Measurements */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
              {t.params || 'MEASUREMENTS'}
            </span>
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {cleanParams || '—'}
            </p>
          </div>

          {/* Shoe */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
              {t.shoe || 'SHOE'}
            </span>
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {m.shoe || '—'}
            </p>
          </div>

          {/* Age */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
              {t.age || 'AGE'}
            </span>
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {formatAge(m.age, m.birthDate, lang) || '—'}
            </p>
          </div>

          {/* Status (if not Active) */}
          {m.status && m.status !== 'Active' && (
            <div className="col-span-2 sm:col-span-1">
              <span className="block text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
                STATUS
              </span>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                {m.status}
              </p>
            </div>
          )}
        </div>

        {/* Like / Casting button if package view */}
        {packageId && (
          <div className="pt-2">
            <button
              onClick={handleLike}
              disabled={liked}
              className={`flex items-center gap-2 px-4 py-2 border uppercase tracking-[0.2em] text-xs font-bold transition-all cursor-pointer ${
                liked
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white border-white/20 hover:border-white'
              }`}
            >
              <Heart size={14} className={liked ? 'fill-current' : ''} />
              <span>{liked ? 'Selected' : 'Select for Casting'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of all model photos (Editorial Photo Grid) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 md:px-12">
        {rawImgs.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-zinc-500 border border-white/10">
            <p className="text-sm uppercase tracking-widest">Нет доступных фото</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {rawImgs.map((src, idx) => (
              <div
                key={`photo-grid-${idx}`}
                className="group relative aspect-[4/5] bg-zinc-950 overflow-hidden border border-white/10 cursor-zoom-in"
                onClick={() => setFullscreenImg(safeUrl(src, 'img'))}
              >
                <img
                  src={safeUrl(src, 'img')}
                  alt={`${m.name} photo ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading={idx < 4 ? 'eager' : 'lazy'}
                />
                <div className="absolute top-3 right-3 bg-black/70 p-2 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={15} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos Section (if available) */}
      {m.videos && m.videos.length > 0 && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 md:px-12 pt-12">
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 mb-4">
            Video & Polaroids
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {m.videos.map((vid, vidIdx) => {
              const playable = getPlayableVideoUrl(vid);
              if (!playable) return null;
              return (
                <div key={`vid-${vidIdx}`} className="aspect-[16/9] bg-black border border-white/10 overflow-hidden">
                  {playable.isDriveIframe ? (
                    <iframe src={playable.url} allow="autoplay" className="w-full h-full border-0" allowFullScreen />
                  ) : (
                    <video src={playable.url} controls className="w-full h-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center cursor-zoom-out"
            onClick={() => setFullscreenImg(null)}
          >
            <button
              onClick={() => setFullscreenImg(null)}
              className="absolute top-6 right-6 text-white hover:text-zinc-300 p-3 bg-black border border-white/20 transition-colors z-50 cursor-pointer"
              aria-label="Close fullscreen"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              src={fullscreenImg}
              alt="Fullscreen"
              className="max-w-[94vw] max-h-[94vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
