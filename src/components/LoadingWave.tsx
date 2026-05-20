import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';

export const LoadingWave: React.FC = () => {
  const { isLoading, lang } = useAppContext();
  const t = translations[lang] || translations.ru;
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + Math.floor(Math.random() * 5) + 1;
          if (prev < 80) return prev + Math.floor(Math.random() * 3) + 1;
          if (prev < 95) return prev + Math.floor(Math.random() * 2) + 1;
          return 95;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      // Delay to let images load
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #000000 100%)',
            }}
            initial={{ y: '0%' }}
            exit={{ y: '-150%' }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-white animate-spin mb-8" />
              <div className="text-white text-lg md:text-2xl font-black uppercase tracking-[0.4em] font-sans text-center px-4 mix-blend-difference mb-8">
                BIG MODEL AGENCY
              </div>
              
              <div className="w-64 max-w-[80vw] h-1 bg-zinc-800/80 rounded-full overflow-hidden mb-3">
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>
              <div className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase">
                {progress}% <span className="mx-2">•</span> {t.loading_system.replace('...', '')}
              </div>
            </motion.div>
            
            {/* The SVG wave element that hangs at the bottom and curves when going up */}
            <motion.svg
              className="absolute top-full w-full h-[150px] md:h-[300px] pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              initial={{ d: "M0 0 C 50 0 50 0 100 0 L 100 0 L 0 0" }}
              exit={{ d: "M0 0 C 50 150 50 150 100 0 L 100 0 L 0 0" }}
            >
              <motion.path 
                fill="#000000"
                transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
                initial={{ d: 'M0 0 Q 50 0 100 0 L 100 0 L 0 0' }}
                exit={{ d: 'M0 0 Q 50 150 100 0 L 100 0 L 0 0' }}
              />
            </motion.svg>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
