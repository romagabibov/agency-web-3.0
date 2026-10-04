import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 flex justify-center mt-auto">
      <a 
        href="https://coyora.studio/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-zinc-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] transition-colors hover:text-[#ccff00]"
      >
        BIG MODEL AGENCY | POWERED BY COYORA STUDIO
      </a>
    </footer>
  );
};
