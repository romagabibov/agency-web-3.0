import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, getPlayableVideoUrl, incrementPackageStat } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Instagram, Heart, Maximize2 } from 'lucide-react';

export const ModelDetailsModal: React.FC<{ modelId: string; onClose: () => void; packageId?: string }> = ({ modelId, onClose, packageId }) => {
  const { models, lang } = useAppContext();
  const t = translations[lang];
  const m = models.find(x => String(x.id) === String(modelId));
  
  const [startTime] = useState(Date.now());
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (packageId) {
      incrementPackageStat(packageId, 'modelViews', modelId, 1).catch(console.error);
    }
    return () => {
      if (packageId) {
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

  const [mainMedia, setMainMedia] = useState<{ type: 'img' | 'video' | 'iframe', src: string | undefined }>(() => {
    if (m) {
      if (m.imgs && m.imgs.length > 0) {
        return { type: 'img', src: safeUrl(m.imgs[0], 'img') };
      } else if (m.videos && m.videos.length > 0) {
        const playable = getPlayableVideoUrl(m.videos[0]);
        return { type: playable?.isDriveIframe ? 'iframe' : 'video', src: playable?.url };
      }
    }
    return { type: 'img', src: safeUrl(null, 'img') };
  });

  useEffect(() => {
    if (m) {
      if (m.imgs && m.imgs.length > 0) {
        setMainMedia({ type: 'img', src: safeUrl(m.imgs[0], 'img') });
      } else if (m.videos && m.videos.length > 0) {
        const playable = getPlayableVideoUrl(m.videos[0]);
        setMainMedia({ type: playable?.isDriveIframe ? 'iframe' : 'video', src: playable?.url });
      } else {
        setMainMedia({ type: 'img', src: safeUrl(null, 'img') });
      }
    }
  }, [m]);

  if (!m) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-zinc-950 w-full max-w-6xl rounded-3xl md:rounded-[40px] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative max-h-[90vh] shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors z-50"
          >
            <X size={24} />
          </button>

          <div className="w-full md:w-1/2 p-4 md:p-8 flex flex-col items-center bg-black/50 shrink-0 border-b md:border-b-0 md:border-r border-white/10">
            <div className="relative w-full aspect-[4/5] md:aspect-[3/4] md:h-auto rounded-2xl overflow-hidden shadow-inner bg-black flex items-center justify-center group">
              {mainMedia.type === 'video' ? (
                <video
                  src={mainMedia.src}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : mainMedia.type === 'iframe' ? (
                <iframe
                  src={mainMedia.src}
                  allow="autoplay"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <>
                  <img
                    src={mainMedia.src}
                    alt={m.name}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsFullscreen(true)}
                  />
                  <button 
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                  >
                    <Maximize2 size={20} />
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4 overflow-x-auto w-full justify-start pb-2 custom-scrollbar">
              {(m.imgs || []).map((src, idx) => (
                <img
                  key={`img-${idx}`}
                  src={safeUrl(src, 'img')}
                  alt={`thumb-${idx}`}
                  className={`h-16 w-12 md:h-20 md:w-16 object-cover rounded-lg cursor-pointer transition-all shrink-0 ${
                    mainMedia.src === safeUrl(src, 'img') ? 'ring-2 ring-white opacity-100 scale-105' : 'opacity-40 hover:opacity-100'
                  }`}
                  onClick={() => setMainMedia({ type: 'img', src: safeUrl(src, 'img') })}
                />
              ))}
              {(m.videos || []).map((src, idx) => {
                const playable = getPlayableVideoUrl(src);
                if (!playable) return null;
                return (
                  <div
                    key={`vid-${idx}`}
                    className={`h-16 w-12 md:h-20 md:w-16 bg-zinc-800 rounded-lg cursor-pointer transition-all flex items-center justify-center relative shrink-0 ${
                      mainMedia.src === playable.url ? 'ring-2 ring-white opacity-100 scale-105' : 'opacity-40 hover:opacity-100'
                    }`}
                    onClick={() => setMainMedia({ type: playable.isDriveIframe ? 'iframe' : 'video', src: playable.url })}
                  >
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <span className="text-white text-[8px] md:text-[10px] font-bold bg-black/50 px-1 rounded">VIDEO</span>
                    </div>
                    {playable.isDriveIframe ? (
                      <div className="w-full h-full bg-zinc-700 rounded-lg opacity-50 flex items-center justify-center">
                        <span className="text-[10px] text-white">Drive</span>
                      </div>
                    ) : (
                      <video src={playable.url} className="w-full h-full object-cover rounded-lg opacity-50" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full min-w-0 md:w-1/2 p-6 sm:p-8 md:p-12 flex flex-col justify-start md:justify-center overflow-y-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-2 break-words font-medium tracking-tight pr-8">{m.name || '—'}</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 md:mb-8">{m.cat || '—'}</p>

            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
              <div className="bg-white/5 p-4 sm:p-5 md:p-6 rounded-2xl border border-white/5 text-center shadow-sm">
                <span className="text-[9px] sm:text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{t.height}</span>
                <p className="text-xl sm:text-2xl font-serif text-white mt-1">{m.height || '—'} <span className="text-xs sm:text-sm text-zinc-500 font-sans">{t.cm}</span></p>
              </div>
              <div className="bg-white/5 p-4 sm:p-5 md:p-6 rounded-2xl border border-white/5 text-center shadow-sm">
                <span className="text-[9px] sm:text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{t.shoe}</span>
                <p className="text-xl sm:text-2xl font-serif text-white mt-1">{m.shoe || '—'}</p>
              </div>
              <div className="bg-white/5 p-4 sm:p-5 md:p-6 rounded-2xl border border-white/5 text-center shadow-sm col-span-2">
                <span className="text-[9px] sm:text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{t.params}</span>
                <p className="text-lg sm:text-xl font-serif text-white mt-1">{m.params || '-'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {packageId && (
                <button
                  onClick={handleLike}
                  disabled={liked}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${
                    liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart size={20} className={liked ? 'fill-current' : ''} />
                  {liked ? 'Liked' : 'Like'}
                </button>
              )}
              <div className="flex justify-center gap-6 mt-4">
                <a href="https://www.instagram.com/bigmodelagency/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                  <Instagram size={24} />
                </a>
                <a href="tel:+994518928672" className="text-zinc-500 hover:text-white transition-colors">
                  <Phone size={24} />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {isFullscreen && mainMedia.type === 'img' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50"
            >
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={mainMedia.src}
              alt="Fullscreen"
              className="max-w-full max-h-full object-contain p-4 md:p-12"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
