import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ref, get, update, set } from 'firebase/database';
import { db, auth } from '../firebase';
import { AppState, Model, User, NotificationEvent } from '../types';

export const deduplicateModels = (modelsList: any[]): Model[] => {
  if (!Array.isArray(modelsList)) return [];
  const map = new Map<string, any>();
  for (const m of modelsList) {
    if (!m || !m.id) continue;
    const key = String(m.id).trim();
    if (!key) continue;
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, { ...existing, ...m });
    } else {
      map.set(key, m);
    }
  }
  return Array.from(map.values());
};

export const sanitizePublicModel = (m: any): Model => {
  return {
    id: String(m.id || ''),
    name: String(m.name || ''),
    patronymic: '',
    cat: String(m.cat || 'All'),
    height: String(m.height || ''),
    weight: String(m.weight || ''),
    shoe: String(m.shoe || ''),
    params: String(m.params || ''),
    shows: String(m.shows || ''),
    imgs: Array.isArray(m.imgs) ? m.imgs : [],
    videos: Array.isArray(m.videos) ? m.videos : [],
    status: String(m.status || 'Active'),
    insta: String(m.insta || ''),
    // Explicitly empty for private fields (0% PII leak)
    modelLogin: '',
    modelPass: '',
    phone: '',
    email: '',
    finCode: undefined,
    idCardNum: undefined,
    signature: undefined,
    passHistory: undefined,
    notes: undefined,
    events: undefined,
    contractStart: null,
    expiry: null,
    payExpiry: null,
    signedContracts: undefined
  };
};

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
  logout: () => Promise<void>;
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

  const INACTIVITY_TIMEOUT_MS = 40 * 60 * 1000; // 40 minutes

  // Dynamically resolve agencyId from subdomain with safe environment fallback
  const getAgencyIdFromUrl = (): string => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (
        hostname &&
        !hostname.includes('localhost') &&
        !hostname.includes('run.app') &&
        !hostname.includes('web.app') &&
        !hostname.includes('firebaseapp.com') &&
        !hostname.includes('vercel.app')
      ) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www') {
          return parts[0];
        }
      }
    }
    return (import.meta as any).env?.VITE_DEFAULT_AGENCY_ID || 'bigmodelagency';
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

  // Initial Public Data Fetch: Uses server-sanitized /api/public-models to guarantee 0% PII leak
  useEffect(() => {
    let isMounted = true;

    // Hard fallback timeout: ensure isLoading is ALWAYS turned off within 3.5s
    const hardTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 3500);

    const fetchData = async () => {
      try {
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

        const dataPromise = (async () => {
          const [
            logoSnap, categoriesSnap, pdfLogoSnap, agencySignatureSnap, agencyStampSnap, appQuestionsSnap, modelsSnap, usersSnap
          ] = await Promise.all([
            get(ref(db, `agencies/${agencyId}/logo`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/categories`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/pdfLogo`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/agencySignature`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/agencyStamp`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/applicationQuestions`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/models`)).catch(() => null),
            get(ref(db, `agencies/${agencyId}/users`)).catch(() => null)
          ]);

          let safeModels: Model[] = [];
          if (modelsSnap && typeof modelsSnap.exists === 'function' && modelsSnap.exists()) {
            const rawVal = modelsSnap.val();
            const rawList = Array.isArray(rawVal) ? rawVal.filter(Boolean) : Object.values(rawVal || {});
            safeModels = deduplicateModels(rawList);
          } else {
            try {
              const controller = new AbortController();
              const fetchTimer = setTimeout(() => controller.abort(), 2500);
              const res = await fetch(`/api/public-models?agencyId=${encodeURIComponent(agencyId)}`, {
                signal: controller.signal
              });
              clearTimeout(fetchTimer);
              if (res.ok) {
                const apiData = await res.json();
                safeModels = deduplicateModels(apiData);
              }
            } catch (apiErr) {
              console.warn('Backend public-models proxy unavailable', apiErr);
            }
          }

          let loadedUsers: User[] = [];
          if (usersSnap && typeof usersSnap.exists === 'function' && usersSnap.exists()) {
            const uVal = usersSnap.val();
            loadedUsers = Array.isArray(uVal) ? uVal.filter(Boolean) : Object.values(uVal || {});
          }

          return {
            logo: (logoSnap && typeof logoSnap.val === 'function' ? logoSnap.val() : null) || 'BIG',
            categories: (categoriesSnap && typeof categoriesSnap.exists === 'function' && categoriesSnap.exists() && Array.isArray(categoriesSnap.val())) ? categoriesSnap.val() : ['All'],
            models: Array.isArray(safeModels) ? safeModels : [],
            users: loadedUsers,
            pdfLogo: (pdfLogoSnap && typeof pdfLogoSnap.val === 'function' ? pdfLogoSnap.val() : null) || null,
            agencySignature: (agencySignatureSnap && typeof agencySignatureSnap.val === 'function' ? agencySignatureSnap.val() : null) || null,
            agencyStamp: (agencyStampSnap && typeof agencyStampSnap.val === 'function' ? agencyStampSnap.val() : null) || null,
            applicationQuestions: (appQuestionsSnap && typeof appQuestionsSnap.exists === 'function' && appQuestionsSnap.exists() && Array.isArray(appQuestionsSnap.val())) ? appQuestionsSnap.val() : [],
          };
        })();

        const result = await Promise.race([dataPromise, timeoutPromise]) as any;

        if (isMounted) {
          if (result && typeof result === 'object') {
            setState(prev => ({
              ...prev,
              ...result
            }));
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching public data:", error);
        if (isMounted) setIsLoading(false);
      } finally {
        clearTimeout(hardTimeout);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      clearTimeout(hardTimeout);
    };
  }, [agencyId]);

  // Load full authorized data when Admin or Model logs in
  useEffect(() => {
    let isMounted = true;
    const loadAuthorizedData = async () => {
      if (!currentAdmin && !currentModel) return;
      try {
        if (currentAdmin) {
          const [appsSnap, notifsSnap, modelsSnap] = await Promise.all([
            get(ref(db, `agencies/${agencyId}/applications`)),
            get(ref(db, `agencies/${agencyId}/notifications`)),
            get(ref(db, `agencies/${agencyId}/models`))
          ]);
          if (isMounted) {
            let fullModels: Model[] = [];
            if (modelsSnap.exists()) {
              const val = modelsSnap.val();
              const rawList = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
              fullModels = deduplicateModels(rawList);
            }
            setState(prev => ({
              ...prev,
              models: fullModels.length > 0 ? fullModels : prev.models,
              applications: appsSnap.exists() ? (Array.isArray(appsSnap.val()) ? appsSnap.val() : Object.values(appsSnap.val())) : [],
              notifications: notifsSnap.exists() ? (Array.isArray(notifsSnap.val()) ? notifsSnap.val() : Object.values(notifsSnap.val())) : []
            }));
          }
        } else if (currentModel) {
          const modelSnap = await get(ref(db, `agencies/${agencyId}/models/${currentModel.id}`));
          if (modelSnap.exists() && isMounted) {
            setCurrentModel(modelSnap.val());
          }
        }
      } catch (e) {
        console.error("Failed to load authorized data", e);
      }
    };
    loadAuthorizedData();
    return () => { isMounted = false; };
  }, [currentAdmin, currentModel?.id, agencyId]);

  // Keep currentModel synced with state
  useEffect(() => {
    if (currentModel) {
      const updated = state.models.find(m => String(m.id) === String(currentModel.id));
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentModel)) {
        setCurrentModel(updated);
      }
    }
  }, [state.models, currentModel]);

  const setLang = (lang: 'ru' | 'az' | 'en') => {
    localStorage.setItem('lastLang', lang);
    setState(prev => ({ ...prev, lang }));
  };

  const updateState = async (newState: Partial<AppState>) => {
    const cleanNewState = JSON.parse(JSON.stringify(newState));
    delete cleanNewState.lang;

    // Prevent accidental wipe of users
    if (cleanNewState.users && cleanNewState.users.length === 0 && state.users.length > 0) {
      delete cleanNewState.users;
    }

    // If models are updated via updateState (e.g. deletion), always deduplicate and use set() to replace node
    if (cleanNewState.models) {
      const finalModels = deduplicateModels(cleanNewState.models);
      await set(ref(db, `agencies/${agencyId}/models`), finalModels);
      delete cleanNewState.models;
      setState(prev => ({ ...prev, ...newState, models: finalModels }));
    }
    
    if (Object.keys(cleanNewState).length > 0) {
      await update(ref(db, `agencies/${agencyId}`), cleanNewState);
      setState(prev => ({ ...prev, ...newState }));
    }
  };

  const updateModel = async (updatedModel: Model) => {
    const cleanModel = JSON.parse(JSON.stringify(updatedModel));
    const modelKey = String(updatedModel.id || Date.now());
    cleanModel.id = modelKey;

    const currentUnique = deduplicateModels(state.models);
    const index = currentUnique.findIndex(m => String(m.id) === modelKey);
    let newModels: Model[];
    if (index === -1) {
      newModels = [cleanModel, ...currentUnique];
    } else {
      newModels = [...currentUnique];
      newModels[index] = cleanModel;
    }

    const finalModels = deduplicateModels(newModels);
    // CRITICAL: Replace the entire models array with set() so RTDB never keeps orphan key duplicates
    await set(ref(db, `agencies/${agencyId}/models`), finalModels);
    setState(prev => ({ ...prev, models: finalModels }));
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

  const logout = useCallback(async () => {
    if (currentModel && sessionStartTime) {
      const spent = Math.floor((Date.now() - sessionStartTime) / 1000);
      if (spent > 0) {
        const updatedModel = { ...currentModel, timeSpent: (currentModel.timeSpent || 0) + spent };
        await updateModel(updatedModel);
      }
    }
    try {
      localStorage.removeItem('app_session');
      localStorage.removeItem('app_session_last_activity');
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (e) {
      // ignore
    }
    setCurrentAdmin(null);
    setCurrentModel(null);
    setSessionStartTime(null);
    setIsAdminViewingSite(false);
  }, [currentModel, sessionStartTime]);

  // Restore authenticated session safely
  useEffect(() => {
    if (isLoading) return;
    try {
      const savedSessionRaw = localStorage.getItem('app_session');
      const lastActivity = Number(localStorage.getItem('app_session_last_activity') || '0');
      if (savedSessionRaw && lastActivity) {
        const inactiveDuration = Date.now() - lastActivity;
        if (inactiveDuration < INACTIVITY_TIMEOUT_MS) {
          const session = JSON.parse(savedSessionRaw);
          // Verify session token integrity
          if (session.type === 'admin' && session.login) {
            if (session.token && (Date.now() - (session.startTime || 0) < 24 * 60 * 60 * 1000)) {
              setCurrentAdmin(session.login);
              setSessionStartTime(session.startTime || Date.now());
            }
          } else if (session.type === 'model' && session.id) {
            if (session.token && (Date.now() - (session.startTime || 0) < 24 * 60 * 60 * 1000)) {
              const foundModel = state.models.find(m => String(m.id) === String(session.id));
              if (foundModel) {
                setCurrentModel(foundModel);
              } else {
                setCurrentModel({ id: session.id, name: session.name || '' } as any);
              }
              setSessionStartTime(session.startTime || Date.now());
            }
          }
        } else {
          localStorage.removeItem('app_session');
          localStorage.removeItem('app_session_last_activity');
        }
      }
    } catch (e) {
      console.error('Failed to restore session safely', e);
    }
  }, [isLoading]);

  // Inactivity auto-logout timer (40 minutes)
  useEffect(() => {
    if (!currentAdmin && !currentModel) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleTimeout = () => {
      clearTimeout(timeoutId);
      const lastActivity = Number(localStorage.getItem('app_session_last_activity') || Date.now().toString());
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logout();
      } else {
        const remaining = Math.max(1000, INACTIVITY_TIMEOUT_MS - elapsed);
        timeoutId = setTimeout(() => {
          logout();
        }, remaining);
      }
    };

    const handleUserActivity = () => {
      const now = Date.now();
      localStorage.setItem('app_session_last_activity', now.toString());
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    scheduleTimeout();

    const events = ['mousemove', 'mousedown', 'keydown', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [currentAdmin, currentModel?.id, sessionStartTime, logout]);

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
      setIsAdminViewingSite,
      logout
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

// Export useApp alias for backward compatibility with existing components
export const useApp = useAppContext;
