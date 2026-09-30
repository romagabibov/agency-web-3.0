import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getPackage, incrementPackageStat } from '../utils';
import { ModelGrid } from './ModelGrid';
import { Loader2 } from 'lucide-react';
import { Layout } from './Layout';
import { translations } from '../translations';

export const PackageView: React.FC<{ packageId: string }> = ({ packageId }) => {
  const { logo, pdfLogo, lang } = useAppContext();
  const t = translations[lang];
  const [packageModelIds, setPackageModelIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const pkg = await getPackage(packageId);
        if (pkg && pkg.modelIds) {
          setPackageModelIds(pkg.modelIds);
          // Increment views
          incrementPackageStat(packageId, 'views');
        } else {
          setError('Package not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load package');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackage();
  }, [packageId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-bold tracking-widest uppercase text-sm">Loading Selection...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
          <p className="font-bold tracking-widest uppercase text-xl text-red-500">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 px-6 py-2 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </Layout>
    );
  }

  // Create a fake filter that matches all models, but we will filter models before passing to ModelGrid?
  // ModelGrid uses useAppContext().models directly. 
  // We need to pass the packageModelIds to ModelGrid or filter them in ModelGrid.
  // Wait, ModelGrid uses `models` from context. We can't easily override it unless we pass it as a prop.
  // Let's modify ModelGrid to accept an optional `packageModelIds` prop.
  return (
    <Layout>
      <header className="px-4 sm:px-6 md:px-12 py-4 sm:py-8 flex flex-col sm:flex-row justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/10 gap-4 sm:gap-0">
        <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto overflow-hidden px-2">
          {logo === 'BIG' ? (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-white italic uppercase break-words text-center sm:text-left">
              BIG<span className="text-zinc-500">AGENCY</span>
            </h1>
          ) : pdfLogo ? (
            <img src={pdfLogo} alt="Logo" className="h-8 sm:h-10 object-contain max-w-full" style={{ maxWidth: '100%', maxHeight: '40px' }} />
          ) : (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-white italic uppercase break-words text-center sm:text-left max-w-full overflow-hidden text-ellipsis">
              {logo}
            </h1>
          )}
        </div>
        <div className="text-white/50 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
          Curated Selection
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto pt-8">
        <ModelGrid filter={{ minH: 0, maxW: 999, queryP: '', cat: 'All', searchName: '' }} isPackageView={true} packageModelIds={packageModelIds} packageId={packageId} />
      </main>
    </Layout>
  );
};
