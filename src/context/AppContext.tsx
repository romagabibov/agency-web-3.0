import React, { createContext, useContext, useEffect, useState } from 'react';
import { ref, get, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import { AppState, Model, User, NotificationEvent, Application } from '../types';

interface AppContextType extends AppState {
  setLang: (lang: 'ru' | 'az' | 'en') => void;
  updateState: (newState: Partial<AppState>) => Promise<void>;
  updateModel: (updatedModel: Model) => Promise<void>;
  addNotification: (message: string, type?: 'info' | 'warning' | 'success' | 'error') => Promise<void>;
  currentAdmin: string | null;
  setCurrentAdmin: (admin: string | null) => void;
  currentModel: Model | null;
  setCurrentModel: React.Dispatch<React.SetStateAction<Model | null>>;
  sessionStartTime: number | null;
  setSessionStartTime: React.Dispatch<React.SetStateAction<number | null>>;
  isLoading: boolean;
  selectedForPackage: string[];
  togglePackageSelection: (modelId: string) => void;
  clearPackageSelection: () => void;
  agencyId: string;
  isAdminViewingSite: boolean;
  setIsAdminViewingSite: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    lang: (localStorage.getItem('lastLang') as 'ru' | 'az' | 'en') || 'ru',
    logo: 'BIG',
    categories: ['All'],
    models: [],
    applications: [],
    users: [],
    pdfLogo: null,
    lastLoginTime: {},
    notifications: [],
  });
  const [currentAdmin, setCurrentAdmin] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForPackage, setSelectedForPackage] = useState<string[]>([]);
  const [isAdminViewingSite, setIsAdminViewingSite] = useState(false);

  // Хардкодим agencyId, чтобы на Vercel не считывался кривой домен
  const getAgencyIdFromUrl = () => {
    return 'bigmodelagency';
  };

  const agencyId = getAgencyIdFromUrl();

  const togglePackageSelection = (modelId: string) => {
    setSelectedForPackage(prev => 
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );
  };

  const clearPackageSelection = () => {
    setSelectedForPackage([]);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (state.models.length > 0 && !isLoading) return;

      try {
        const [
          logoSnap, categoriesSnap, pdfLogoSnap, agencySignatureSnap, agencyStampSnap, appQuestionsSnap, modelsSnap, usersSnap
        ] = await Promise.all([
          get(ref(db, `agencies/${agencyId}/logo`)),
          get(ref(db, `agencies/${agencyId}/categories`)),
          get(ref(db, `agencies/${agencyId}/pdfLogo`)),
          get(ref(db, `agencies/${agencyId}/agencySignature`)),
          get(ref(db, `agencies/${agencyId}/agencyStamp`)),
          get(ref(db, `agencies/${agencyId}/applicationQuestions`)),
          get(ref(db, `agencies/${agencyId}/models`)),
          get(ref(db, `agencies/${agencyId}/users`))
        ]);
        
        if (isMounted) {
          setState(prev => ({
            ...prev,
            logo: logoSnap.val() || 'BIG',
            categories: categoriesSnap.exists() && Array.isArray(categoriesSnap.val()) ? categoriesSnap.val() : ['All'],
            models: modelsSnap.exists() ? (Array.isArray(modelsSnap.val()) ? modelsSnap.val() : Object.values(modelsSnap.val())) : [],
            users: usersSnap.exists() && Array.isArray(usersSnap.val()) ? usersSnap.val() : [],
            pdfLogo: pdfLogoSnap.val() || null,
            agencySignature: agencySignatureSnap.val() || null,
            agencyStamp: agencyStampSnap.val() || null,
            applicationQuestions: appQuestionsSnap.exists() && Array.isArray(appQuestionsSnap.val()) ? appQuestionsSnap.val() : [],
          }));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lazy load admin heavy data
  useEffect(() => {
    let isMounted = true;
    const loadAdminData = async () => {
      if (!currentAdmin) return;
      try {
        const [appsSnap, notifsSnap] = await Promise.all([
          get(ref(db, `agencies/${agencyId}/applications`)),
          get(ref(db, `agencies/${agencyId}/notifications`))
        ]);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            applications: appsSnap.exists() ? (Array.isArray(appsSnap.val()) ? appsSnap.val() : Object.values(appsSnap.val())) : [],
            notifications: notifsSnap.exists() ? (Array.isArray(notifsSnap.val()) ? notifsSnap.val() : Object.values(notifsSnap.val())) : []
          }));
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
      }
    };
    loadAdminData();
    return () => { isMounted = false; };
  }, [currentAdmin, agencyId]);

  useEffect(() => {
    if (currentModel) {
      const updated = state.models.find(m => m.id === currentModel.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentModel)) {
        setCurrentModel(updated);
      }
    }
  }, [state.models]);

  const setLang = (lang: 'ru' | 'az' | 'en') => {
    localStorage.setItem('lastLang', lang);
    setState(prev => ({ ...prev, lang }));
  };

  const updateState = async (newState: Partial<AppState>) => {
    const cleanNewState = JSON.parse(JSON.stringify(newState));
    delete cleanNewState.lang;
    
    if (Object.keys(cleanNewState).length > 0) {
      await update(ref(db, `agencies/${agencyId}`), cleanNewState);
      // Локальное обновление стейта, чтобы избежать необходимости в постоянном слушателе onValue
      setState(prev => ({ ...prev, ...newState }));
    }
  };

  const updateModel = async (updatedModel: Model) => {
    const index = state.models.findIndex(m => m.id === updatedModel.id);
    if (index === -1) {
      // If it's a new model, we add it to the array
      const newModels = [...state.models, updatedModel];
      await updateState({ models: newModels });
    } else {
      // Update specific model in Firebase to avoid overwriting the whole array
      const cleanModel = JSON.parse(JSON.stringify(updatedModel));
      await update(ref(db, `agencies/${agencyId}/models/${index}`), cleanModel);
      
      // Update local state
      setState(prev => {
        const newModels = [...prev.models];
        newModels[index] = updatedModel;
        return { ...prev, models: newModels };
      });
    }
  };

  const addNotification = async (message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    const newNotif: NotificationEvent = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      type,
      message
    };
    const newNotifications = [newNotif, ...state.notifications].slice(0, 150);
    await updateState({ notifications: newNotifications });
  };

  return (
    <AppContext.Provider value={{
      ...state,
      setLang,
      updateState,
      updateModel,
      addNotification,
      currentAdmin,
      setCurrentAdmin,
      currentModel,
      setCurrentModel,
      sessionStartTime,
      setSessionStartTime,
      isLoading,
      selectedForPackage,
      togglePackageSelection,
      clearPackageSelection,
      agencyId,
      isAdminViewingSite,
      setIsAdminViewingSite
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};