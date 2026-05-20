import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { ModelGrid } from './components/ModelGrid';
import { FilterModal } from './components/FilterModal';
import { LoginModal } from './components/LoginModal';
import { AdminPanel } from './components/AdminPanel';
import { ModelCabinet } from './components/ModelCabinet';
import { PackageView } from './components/PackageView';
import { LoadingWave } from './components/LoadingWave';
import { translations } from './translations';

import { JoinForm } from './components/JoinForm';

const MainApp: React.FC = () => {
  const { currentAdmin, currentModel, isLoading, categories, lang, isAdminViewingSite, setIsAdminViewingSite } = useAppContext();
  const t = translations[lang];
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [filter, setFilter] = useState({ minH: 0, maxW: 999, queryP: '', cat: 'All', searchName: '' });
  
  // Simple router based on window.location.pathname
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle /join route
  if (currentPath === '/join') {
    return <JoinForm />;
  }

  // Handle /share/:id route
  if (currentPath.startsWith('/share/')) {
    const packageId = currentPath.split('/share/')[1].replace(/\/$/, '').split('?')[0];
    return <PackageView packageId={packageId} />;
  }

  if (currentAdmin && !isAdminViewingSite) {
    return <AdminPanel />;
  }

  if (currentModel) {
    return <ModelCabinet />;
  }

  return (
    <Layout>
      <Header
        onOpenFilter={() => setIsFilterOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
      
      <main className="max-w-[1600px] mx-auto relative pb-24">
        <div className="px-6 md:px-12 pt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar w-full md:flex-wrap md:justify-start">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setFilter({ ...filter, cat: c })}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border shrink-0 ${
                  filter.cat === c 
                    ? 'bg-white text-black border-white shadow-md' 
                    : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                }`}
              >
                {c === 'All' ? t.all_talents : c}
              </button>
            ))}
          </div>
          <div className="w-full md:w-64">
            <input 
              type="text" 
              placeholder={t.search_name} 
              value={filter.searchName}
              onChange={e => setFilter({ ...filter, searchName: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:ring-2 focus:ring-white/50 outline-none"
            />
          </div>
        </div>
        <ModelGrid filter={filter} />
      </main>

      {isFilterOpen && (
        <FilterModal
          filter={filter}
          setFilter={setFilter}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {isLoginOpen && (
        <LoginModal onClose={() => setIsLoginOpen(false)} />
      )}

      {isAdminViewingSite && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <button
            onClick={() => setIsAdminViewingSite(false)}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all"
          >
            В админ панель
          </button>
        </div>
      )}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <LoadingWave />
      <MainApp />
    </AppProvider>
  );
}
