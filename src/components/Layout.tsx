import React from 'react';
import { Footer } from './Footer';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/30 flex flex-col">
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
};
