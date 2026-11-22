import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, getPlayableVideoUrl, incrementPackageStat, formatAge, getModelCoverImage, formatEditorialSpecs } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Instagram, Heart, Maximize2, Share2, Mail } from 'lucide-react';
import { Model } from '../types';

export const ModelDetailsModal: React.FC<{ modelId: string; onClose: () => void; packageId?: string }> = ({
  modelId,
  onClose,
  packageId
}) => {
  const { models, lang } = useAppContext();
  const t = translations[lang];
  const m = models.find(x => String(x.id) === String(modelId));

  const [startTime] = useState(Date.now());
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const [mainMedia, setMainMedia] = useState<{ type: 'img' | 'video' | 'iframe'; src: string | undefined }>(() => {
    if (m) {
      if (m.imgs && m.imgs.length > 0) {
        return { type: 'img', src: getModelCoverImage(m) };
      } else if (m.videos && m.videos.length > 0) {
        const playable = getPlayableVideoUrl(m.videos[0]);
        return { type: playable?.isDriveIframe ? 'iframe' : 'video', src: playable?.url };
      }
    }
    return { type: 'img', src: getModelCoverImage(null) };
  });

  useEffect(() => {
    if (m) {
      if (m.imgs && m.imgs.length > 0) {
        setMainMedia({ type: 'img', src: getModelCoverImage(m) });
      } else if (m.videos && m.videos.length > 0) {
        const playable = getPlayableVideoUrl(m.videos[0]);
        setMainMedia({ type: playable?.isDriveIframe ? 'iframe' : 'video', src: playable?.url });
      } else {
        setMainMedia({ type: 'img', src: getModelCoverImage(null) });
      }
    }
  }, [m]);

  if (!m) return null;

  // Format height with imperial feet/inches
  const hCm = parseInt(m.height || '0', 10);
  let heightDisplay = m.height ? `${m.height} cm` : '—';
  if (!isNaN(hCm) && hCm >= 120 && hCm <= 230) {
    const totalInches = Math.round(hCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    heightDisplay = `${feet}' ${inches}" (${m.height} cm)`;
  }

  // Format measurements cleanly with slashes
  const paramsDisplay = m.params ? m.params.replace(/\s*[-\/]\s*/g, ' / ').trim() : '—';

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('model', m.id);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-8 bg-black/90 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black w-full max-w-5xl border border-white/15 flex flex-col md:flex-row overflow-hidden relative max-h-[94vh] shadow-2xl my-auto text-white select-none"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 text-white/80 hover:text-white bg-black/80 hover:bg-black p-2 sm:p-2.5 transition-colors z-50 border border-white/20 cursor-pointer"
            title="Close (ESC)"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Left Column: Editorial Media Visuals */}
          <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 flex flex-col items-center bg-black shrink-0 border-b md:border-b-0 md:border-r border-white/10">
            {/* Primary Image / Video Frame */}
            <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[42vh] md:max-h-none overflow-hidden bg-zinc-950 flex items-center justify-center group border border-white/10">
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
                    className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-102"
                    onClick={() => setIsFullscreen(true)}
                  />
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute bottom-3 right-3 bg-black/80 hover:bg-black text-white p-2 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Fullscreen view"
                  >
                    <Maximize2 size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Gallery */}
            <div className="flex gap-2 sm:gap-2.5 mt-3 sm:mt-4 overflow-x-auto w-full justify-start pb-1 hide-scrollbar touch-scroll">
              {(m.imgs || []).map((src, idx) => {
                const url = safeUrl(src, 'img');
                const isSelected = mainMedia.src === url;
                return (
                  <img
                    key={`img-${idx}`}
                    src={url}
                    alt={`${m.name} thumb ${idx}`}
                    className={`h-14 w-11 sm:h-18 sm:w-14 object-cover cursor-pointer transition-all shrink-0 border ${
                      isSelected
                        ? 'border-white opacity-100 scale-102'
                        : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                    onClick={() => setMainMedia({ type: 'img', src: url })}
                  />
                );
              })}

              {(m.videos || []).map((src, idx) => {
                const playable = getPlayableVideoUrl(src);
                if (!playable) return null;
                const isSelected = mainMedia.src === playable.url;
                return (
                  <div
                    key={`vid-${idx}`}
                    className={`h-14 w-11 sm:h-18 sm:w-14 bg-zinc-900 border cursor-pointer transition-all flex items-center justify-center relative shrink-0 ${
                      isSelected
                        ? 'border-white opacity-100 scale-102'
                        : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                    onClick={() =>
                      setMainMedia({
                        type: playable.isDriveIframe ? 'iframe' : 'video',
                        src: playable.url
                      })
                    }
                  >
                    <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-white bg-black/80 px-1 py-0.5 border border-white/20">
                      VID
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Editorial Comp-Card Specifications */}
          <div className="w-full min-w-0 md:w-1/2 p-5 sm:p-8 md:p-10 flex flex-col justify-between overflow-y-auto bg-black">
            <div>
              {/* Division / Category */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.25em]">
                  {m.cat || 'DIVISION'}
                </span>
                <button
                  onClick={handleShare}
                  className="text-zinc-400 hover:text-white transition-colors text-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  title="Share model link"
                >
                  <Share2 size={13} />
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>
              </div>

              {/* Model Name */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider text-white font-sans mb-6 pr-6 leading-tight">
                {m.name || '—'}
              </h2>

              {/* Editorial Measurements Table (Zero pills, clean hairline borders) */}
              <div className="border-t border-b border-white/15 divide-y divide-white/10 mb-8 font-sans">
                <div className="py-2.5 sm:py-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium">
                    {t.height || 'Height'}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    {heightDisplay}
                  </span>
                </div>

                <div className="py-2.5 sm:py-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium">
                    {t.params || 'Measurements'}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    {paramsDisplay}
                  </span>
                </div>

                <div className="py-2.5 sm:py-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium">
                    {t.shoe || 'Shoe'}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    {m.shoe || '—'}
                  </span>
                </div>

                {(m.age || m.birthDate) && (
                  <div className="py-2.5 sm:py-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium">
                      {t.age || 'Age'}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                      {formatAge(m.age, m.birthDate, lang)}
                    </span>
                  </div>
                )}

                {m.status && m.status !== 'Active' && (
                  <div className="py-2.5 sm:py-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium">
                      Status
                    </span>
                    <span className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                      {m.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions & Agency Contacts */}
            <div className="pt-2 flex flex-col gap-4">
              {packageId && (
                <button
                  onClick={handleLike}
                  disabled={liked}
                  className={`flex items-center justify-center gap-2 py-3 border uppercase tracking-[0.2em] text-xs font-bold transition-all cursor-pointer ${
                    liked
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-white border-white/20 hover:border-white'
                  }`}
                >
                  <Heart size={16} className={liked ? 'fill-current' : ''} />
                  <span>{liked ? 'Added to Selection' : 'Select for Casting'}</span>
                </button>
              )}

              {/* Direct Booking / Contact Row */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
                  Direct Booking
                </span>
                <div className="flex items-center gap-4">
                  {m.insta ? (
                    <a
                      href={`https://www.instagram.com/${m.insta.replace(/^@/, '')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                      title={`@${m.insta}`}
                    >
                      <Instagram size={19} />
                    </a>
                  ) : (
                    <a
                      href="https://www.instagram.com/bigmodelagency/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Agency Instagram"
                    >
                      <Instagram size={19} />
                    </a>
                  )}

                  {m.phone ? (
                    <a
                      href={`tel:${m.phone}`}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title={m.phone}
                    >
                      <Phone size={19} />
                    </a>
                  ) : (
                    <a
                      href="tel:+994518928672"
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Agency Booking"
                    >
                      <Phone size={19} />
                    </a>
                  )}

                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title={m.email}
                    >
                      <Mail size={19} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Editorial Lightbox */}
      <AnimatePresence>
        {isFullscreen && mainMedia.type === 'img' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center cursor-zoom-out"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 text-white hover:text-zinc-300 p-3 bg-black border border-white/20 transition-colors z-50 cursor-pointer"
              aria-label="Close fullscreen"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              src={mainMedia.src}
              alt={m.name}
              className="max-w-[92vw] max-h-[92vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
