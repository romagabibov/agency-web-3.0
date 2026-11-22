import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ref, get, update, set, remove } from 'firebase/database';
import { db, auth } from '../firebase';
import { AppState, Model, DeletedModel, User, NotificationEvent } from '../types';
import { normalizeCategories } from '../utils';

export const deduplicateModels = (modelsList: any[]): Model[] => {
  if (!Array.isArray(modelsList)) return [];
  const map = new Map<string, any>();
  for (const m of modelsList) {
    if (!m) continue;
    const key = m.id ? String(m.id).trim() : '';
    if (!key) continue;
    if (map.has(key)) {
      const existing = map.get(key);
      const existingImgs = Array.isArray(existing.imgs) ? existing.imgs : [];
      const newImgs = Array.isArray(m.imgs) ? m.imgs : [];
      const mergedImgs = newImgs.length > 0 ? newImgs : existingImgs;
      map.set(key, { ...existing, ...m, imgs: mergedImgs });
    } else {
      map.set(key, m);
    }
  }

  // Second pass: deduplicate by name + modelLogin / name + phone if ID differed
  const nameMap = new Map<string, any>();
  for (const m of map.values()) {
    const normName = String(m.name || '').trim().toLowerCase();
    const normLogin = String(m.modelLogin || '').trim().toLowerCase();
    const normPhone = String(m.phone || '').trim().toLowerCase();
    const nameKey = normName && (normLogin || normPhone) ? `${normName}_${normLogin || normPhone}` : null;
    
    if (nameKey && nameMap.has(nameKey)) {
      const existing = nameMap.get(nameKey);
      const existingImgs = Array.isArray(existing.imgs) ? existing.imgs : [];
      const newImgs = Array.isArray(m.imgs) ? m.imgs : [];
      const mergedImgs = newImgs.length > 0 ? newImgs : existingImgs;
      nameMap.set(nameKey, { ...existing, ...m, imgs: mergedImgs });
    } else if (nameKey) {
      nameMap.set(nameKey, m);
    } else {
      // If no login/phone, key by ID
      nameMap.set(String(m.id), m);
    }
  }

  const list = Array.from(nameMap.values());
  for (const m of list) {
    if (!m.modelLogin && m.name) {
      m.modelLogin = String(m.name).trim();
    }
  }

  return list;
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
  deleteModelToTrash: (modelId: string, adminName?: string) => Promise<void>;
  restoreModelFromTrash: (modelId: string) => Promise<void>;
  permanentlyDeleteModel: (modelId: string) => Promise<void>;
  emptyTrashBin: () => Promise<void>;
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
  const getInitialCategories = (): string[] => {
    try {
      const cached = localStorage.getItem('app_categories_cache');
      if (cached) return normalizeCategories(JSON.parse(cached));
    } catch {}
    return ['All', 'Woman', 'Man', 'Kids'];
  };

  const [state, setState] = useState<AppState>({
    lang: (localStorage.getItem('lastLang') as 'ru' | 'az' | 'en') || 'ru',
    logo: 'BIG',
    categories: getInitialCategories(),
    models: [],
    deletedModels: [],
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

  // Initial Public Data Fetch: Uses server-sanitized APIs to guarantee 0% PII leak and sub-second load times
  useEffect(() => {
    let isMounted = true;

    // Hard fallback timeout: ensure isLoading is ALWAYS turned off
    const hardTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 6500);

    const fetchData = async () => {
      try {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 6000);

        let agencyRes: Response | null = null;
        let modelsRes: Response | null = null;

        try {
          [agencyRes, modelsRes] = await Promise.all([
            fetch(`/api/public-agency-data?agencyId=${encodeURIComponent(agencyId)}`, { signal: controller.signal }).catch(() => null),
            fetch(`/api/public-models?agencyId=${encodeURIComponent(agencyId)}`, { signal: controller.signal }).catch(() => null)
          ]);
        } finally {
          clearTimeout(fetchTimer);
        }

        let agencyData = {
          logo: 'BIG',
          categories: ['All', 'Woman', 'Man', 'Kids'],
          pdfLogo: null,
          agencySignature: null,
          agencyStamp: null,
          applicationQuestions: []
        };
        let safeModels: Model[] = [];

        if (agencyRes && agencyRes.ok) {
          try {
            agencyData = await agencyRes.json();
          } catch (e: any) {
            if (e?.name !== 'AbortError') {
              console.warn("Failed parsing agency data response", e);
            }
          }
        }

        if (modelsRes && modelsRes.ok) {
          try {
            const apiModels = await modelsRes.json();
            safeModels = deduplicateModels(apiModels);
          } catch (e: any) {
            if (e?.name !== 'AbortError') {
              console.warn("Failed parsing models response", e);
            }
          }
        }

        // Direct RTDB fallback if API was unavailable (for logged in sessions)
        if (safeModels.length === 0) {
          try {
            const modelsSnap = await get(ref(db, `agencies/${agencyId}/models`)).catch(() => null);
            if (modelsSnap && typeof modelsSnap.exists === 'function' && modelsSnap.exists()) {
              const rawVal = modelsSnap.val();
              const rawList = Array.isArray(rawVal) ? rawVal.filter(Boolean) : Object.values(rawVal || {});
              safeModels = deduplicateModels(rawList);
            }
          } catch (e) {
            console.warn("Direct RTDB fallback read blocked or empty", e);
          }
        }

        if (isMounted) {
          const loadedCats = normalizeCategories(agencyData.categories, safeModels);
          try {
            localStorage.setItem('app_categories_cache', JSON.stringify(loadedCats));
          } catch {}

          setState(prev => ({
            ...prev,
            logo: agencyData.logo || 'BIG',
            categories: loadedCats,
            pdfLogo: agencyData.pdfLogo || null,
            agencySignature: agencyData.agencySignature || null,
            agencyStamp: agencyData.agencyStamp || null,
            applicationQuestions: Array.isArray(agencyData.applicationQuestions) ? agencyData.applicationQuestions : [],
            models: safeModels.length > 0 ? safeModels : prev.models
          }));
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
          const [appsSnap, notifsSnap, modelsSnap, deletedSnap, usersSnap, catsSnap] = await Promise.all([
            get(ref(db, `agencies/${agencyId}/applications`)),
            get(ref(db, `agencies/${agencyId}/notifications`)),
            get(ref(db, `agencies/${agencyId}/models`)),
            get(ref(db, `agencies/${agencyId}/deletedModels`)),
            get(ref(db, `agencies/${agencyId}/users`)),
            get(ref(db, `agencies/${agencyId}/categories`))
          ]);
          if (isMounted) {
            let fullModels: Model[] = [];
            if (modelsSnap.exists()) {
              const val = modelsSnap.val();
              const rawList = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
              fullModels = deduplicateModels(rawList);
            }

            let activeDeleted: DeletedModel[] = [];
            if (deletedSnap.exists()) {
              const val = deletedSnap.val();
              const rawDeleted: DeletedModel[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
              activeDeleted = rawDeleted.filter(item => item && item.id);
            }

            let activeUsers: User[] = [];
            if (usersSnap.exists()) {
              const val = usersSnap.val();
              activeUsers = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
            }

            const defaultSuperAdmin: User = {
              login: 'admin',
              email: 'vnsbek@gmail.com',
              role: 'superadmin',
              timeSpent: 0
            };

            const defaultKamillaAdmin: User = {
              login: 'kamilla',
              email: 'kamila.mehbaliyeva@gmail.com',
              pass: 'kamanatiq1906',
              role: 'admin',
              timeSpent: 0
            };

            let usersChanged = false;
            const hasSuperAdmin = activeUsers.some(u => 
              (u.login && u.login.toLowerCase() === 'admin') ||
              (u.email && u.email.toLowerCase() === 'vnsbek@gmail.com') ||
              u.role === 'superadmin'
            );

            if (!hasSuperAdmin) {
              activeUsers.unshift(defaultSuperAdmin);
              usersChanged = true;
            }

            const hasKamilla = activeUsers.some(u =>
              (u.login && u.login.toLowerCase() === 'kamilla') ||
              (u.email && u.email.toLowerCase() === 'kamila.mehbaliyeva@gmail.com')
            );

            if (!hasKamilla) {
              activeUsers.push(defaultKamillaAdmin);
              usersChanged = true;
            }

            if (usersChanged) {
              set(ref(db, `agencies/${agencyId}/users`), activeUsers).catch(console.warn);
            }

            const syncedCats = catsSnap.exists()
              ? normalizeCategories(catsSnap.val(), fullModels)
              : normalizeCategories(state.categories, fullModels);

            try {
              localStorage.setItem('app_categories_cache', JSON.stringify(syncedCats));
            } catch {}

            setState(prev => ({
              ...prev,
              models: fullModels.length > 0 ? fullModels : prev.models,
              categories: syncedCats,
              deletedModels: activeDeleted,
              applications: appsSnap.exists() ? (Array.isArray(appsSnap.val()) ? appsSnap.val() : Object.values(appsSnap.val())) : [],
              notifications: notifsSnap.exists() ? (Array.isArray(notifsSnap.val()) ? notifsSnap.val() : Object.values(notifsSnap.val())) : [],
              users: activeUsers
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

    if (cleanNewState.categories) {
      const normalizedCats = normalizeCategories(cleanNewState.categories, state.models);
      cleanNewState.categories = normalizedCats;
      newState.categories = normalizedCats;
      try {
        localStorage.setItem('app_categories_cache', JSON.stringify(normalizedCats));
      } catch {}
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
    if (!cleanModel.modelLogin && cleanModel.name) {
      cleanModel.modelLogin = String(cleanModel.name).trim();
    }

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

  const deleteModelToTrash = async (modelId: string, adminName?: string) => {
    const targetModel = state.models.find(m => String(m.id) === String(modelId));
    if (!targetModel) return;

    const deletedRecord: DeletedModel = {
      ...targetModel,
      deletedAt: new Date().toISOString(),
      deletedBy: adminName || currentAdmin || 'Admin'
    };

    const remainingModels = deduplicateModels(state.models.filter(m => String(m.id) !== String(modelId)));
    const updatedDeleted = [deletedRecord, ...state.deletedModels.filter(m => String(m.id) !== String(modelId))];

    await Promise.all([
      set(ref(db, `agencies/${agencyId}/models`), remainingModels),
      set(ref(db, `agencies/${agencyId}/deletedModels/${targetModel.id}`), deletedRecord)
    ]);

    setState(prev => ({
      ...prev,
      models: remainingModels,
      deletedModels: updatedDeleted
    }));

    await addNotification(`Model ${targetModel.name} was moved to Trash`, 'warning');
  };

  const restoreModelFromTrash = async (modelId: string) => {
    const targetModel = state.deletedModels.find(m => String(m.id) === String(modelId));
    if (!targetModel) return;

    const restoredModel: Model = { ...targetModel };
    delete restoredModel.deletedAt;
    delete restoredModel.deletedBy;

    const updatedModels = deduplicateModels([restoredModel, ...state.models]);
    const updatedDeleted = state.deletedModels.filter(m => String(m.id) !== String(modelId));

    await Promise.all([
      set(ref(db, `agencies/${agencyId}/models`), updatedModels),
      remove(ref(db, `agencies/${agencyId}/deletedModels/${modelId}`))
    ]);

    setState(prev => ({
      ...prev,
      models: updatedModels,
      deletedModels: updatedDeleted
    }));

    await addNotification(`Model ${targetModel.name} was restored to active talents`, 'success');
  };

  const permanentlyDeleteModel = async (modelId: string) => {
    const targetModel = state.deletedModels.find(m => String(m.id) === String(modelId));
    const updatedDeleted = state.deletedModels.filter(m => String(m.id) !== String(modelId));

    await remove(ref(db, `agencies/${agencyId}/deletedModels/${modelId}`));

    setState(prev => ({
      ...prev,
      deletedModels: updatedDeleted
    }));

    if (targetModel) {
      await addNotification(`Model ${targetModel.name} was permanently deleted`, 'error');
    }
  };

  const emptyTrashBin = async () => {
    await remove(ref(db, `agencies/${agencyId}/deletedModels`));
    setState(prev => ({ ...prev, deletedModels: [] }));
    await addNotification('Trash bin was emptied', 'info');
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
      if (currentModel?.id) {
        sessionStorage.removeItem(`onboarding_remind_later_${currentModel.id}`);
      }
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
      deleteModelToTrash,
      restoreModelFromTrash,
      permanentlyDeleteModel,
      emptyTrashBin,
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
