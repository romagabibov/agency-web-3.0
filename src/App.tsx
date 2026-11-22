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
import { localizeCategory, matchesCategory } from './utils';

const MainApp: React.FC = () => {
  const { currentAdmin, currentModel, isLoading, categories, lang, isAdminViewingSite, setIsAdminViewingSite } = useAppContext();
  const t = translations[lang];
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [filter, setFilter] = useState({ minH: 0, maxW: 999, queryP: '', cat: 'All', searchName: '', ageRange: 'all' });
  
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

  const isKidsActive = matchesCategory(filter.cat, 'Kids');

  return (
    <Layout>
      <Header
        onOpenFilter={() => setIsFilterOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        searchQuery={filter.searchName}
        onSearchChange={q => setFilter(f => ({ ...f, searchName: q }))}
        activeCategory={filter.cat}
        onSelectCategory={cat => setFilter(f => ({ ...f, cat, ageRange: 'all' }))}
      />
      
      <main className="max-w-[1920px] mx-auto relative">
        <ModelGrid
          filter={filter}
          onSelectCategory={cat => setFilter(f => ({ ...f, cat, ageRange: 'all' }))}
          onSelectAgeRange={range => setFilter(f => ({ ...f, ageRange: range }))}
        />
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
