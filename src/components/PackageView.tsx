import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getPackage, incrementPackageStat } from '../utils';
import { ModelGrid } from './ModelGrid';
import { Loader2 } from 'lucide-react';
import { Layout } from './Layout';
import { translations } from '../translations';
import { Model } from '../types';

export const PackageView: React.FC<{ packageId: string }> = ({ packageId }) => {
  const { logo, pdfLogo, lang } = useAppContext();
  const t = translations[lang];
  const [packageModelIds, setPackageModelIds] = useState<string[]>([]);
  const [directModels, setDirectModels] = useState<Model[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPackage = async () => {
      try {
        const res = await fetch(`/api/package-data?id=${encodeURIComponent(packageId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.modelIds) {
            setPackageModelIds(data.modelIds);
            if (Array.isArray(data.models) && data.models.length > 0) {
              setDirectModels(data.models);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Fast package API warning, falling back", err);
      }

      try {
        const pkg = await getPackage(packageId);
        if (isMounted) {
          if (pkg && pkg.modelIds) {
            setPackageModelIds(pkg.modelIds);
            incrementPackageStat(packageId, 'views');
          } else {
            setError('Package not found');
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError('Failed to load package');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPackage();
    return () => { isMounted = false; };
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

  return (
    <Layout>
      <header className="px-3 sm:px-6 md:px-12 py-3 sm:py-5 flex flex-row justify-between items-center bg-black/60 backdrop-blur-md sticky top-0 z-40 border-b border-white/10 gap-2">
        <div className="flex items-center justify-start overflow-hidden">
          {logo === 'BIG' ? (
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-white italic uppercase break-words text-left">
              BIG<span className="text-zinc-500">AGENCY</span>
            </h1>
          ) : pdfLogo ? (
            <img src={pdfLogo} alt="Logo" className="h-7 sm:h-9 object-contain max-w-full" style={{ maxWidth: '100%', maxHeight: '36px' }} />
          ) : (
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-white italic uppercase break-words text-left max-w-full overflow-hidden text-ellipsis">
              {logo}
            </h1>
          )}
        </div>
        <div className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-right shrink-0">
          Curated Selection
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto pt-4 sm:pt-8 pb-12">
        <ModelGrid 
          filter={{ minH: 0, maxW: 999, queryP: '', cat: 'All', searchName: '' }} 
          isPackageView={true} 
          packageModelIds={packageModelIds} 
          packageId={packageId} 
          directModels={directModels || undefined} 
        />
      </main>
    </Layout>
  );
};
