import React from 'react';
import { Footer } from './Footer';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/30 flex flex-col">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050505] to-[#050505]"></div>
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
};
