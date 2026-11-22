import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { safeUrl, sanitizeKey, hashPassword, formatSeconds, daysLeft, getPlayableVideoUrl, normalizeCategories } from '../utils';
import { LogOut, Settings, Users, Image as ImageIcon, Trash2, Edit, AlertTriangle, Info, Globe, X, Plus, Check, Share2, Loader2, Copy } from 'lucide-react';
import { Model, ModelEvent } from '../types';
import { Footer } from './Footer';
import { savePackage } from '../utils';
import { ModelCalendar } from './ModelCalendar';
import { ModelNotes } from './ModelNotes';
import { db } from '../firebase';
import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { AdminDatabaseTab } from './admin/AdminDatabaseTab';
import { AdminReviewTab } from './admin/AdminReviewTab';
import { AdminContracts } from './admin/AdminContracts';
import { Application } from '../types';

export const AdminPanel: React.FC = () => {
  const { lang, setLang, currentAdmin, setCurrentAdmin, sessionStartTime, setSessionStartTime, models, users, updateState, updateModel, deleteModelToTrash, addNotification, logo, categories, notifications, selectedForPackage, togglePackageSelection, clearPackageSelection, agencyId, applicationQuestions, pdfLogo, agencySignature, agencyStamp, setIsAdminViewingSite, logout } = useAppContext();
  const t = translations[lang];

  const currentUserObj = users.find(u => 
    (u.login && u.login.toLowerCase() === (currentAdmin || '').toLowerCase()) ||
    (u.email && u.email.toLowerCase() === (currentAdmin || '').toLowerCase())
  );
  const isSuperAdmin = (currentAdmin || '').toLowerCase() === 'admin' || 
    (currentAdmin || '').toLowerCase() === 'vnsbek@gmail.com' ||
    currentUserObj?.role === 'superadmin' || 
    (currentUserObj?.email && currentUserObj.email.toLowerCase() === 'vnsbek@gmail.com');

  const [search, setSearch] = useState('');
  const [editingModel, setEditingModel] = useState<Partial<Model>>({});
  const [files, setFiles] = useState<FileList | null>(null);
  const [videoFiles, setVideoFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [infoModel, setInfoModel] = useState<Model | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  const [newAdminLogin, setNewAdminLogin] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  const [logoEdit, setLogoEdit] = useState(logo);
  const [filtersEdit, setFiltersEdit] = useState(categories.filter(c => c !== 'All').join(', '));

  useEffect(() => {
    if (categories && categories.length > 0) {
      setFiltersEdit(categories.filter(c => c !== 'All').join(', '));
    }
  }, [categories]);

  useEffect(() => {
    if (logo) setLogoEdit(logo);
  }, [logo]);

  const [applicationQuestionsEdit, setApplicationQuestionsEdit] = useState(applicationQuestions?.join('\n') || '');
  const [pdfLogoFile, setPdfLogoFile] = useState<File | null>(null);
  const [agencySignatureFile, setAgencySignatureFile] = useState<File | null>(null);
  const [agencyStampFile, setAgencyStampFile] = useState<File | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAdminIdx, setConfirmDeleteAdminIdx] = useState<number | null>(null);
  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<{ modelId: string, type: 'img' | 'video', index: number } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [shareLinkModal, setShareLinkModal] = useState<string | null>(null);
  const [eventToReview, setEventToReview] = useState<{model: Model, event: ModelEvent} | null>(null);
  const [sharedPackages, setSharedPackages] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const [activeTab, setActiveTab] = useState<'database' | 'analytics' | 'settings' | 'review' | 'contracts'>('database');

  React.useEffect(() => {
    let isMounted = true;
    import('../utils').then(({ getAllPackages }) => {
      getAllPackages().then(pkgs => {
        if (isMounted) setSharedPackages(pkgs);
      }).catch(console.error);
    });
    return () => { isMounted = false; };
  }, []);

  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const model = models.find(m => m.id === e.detail);
      if (model) {
        setInfoModel(model);
      }
    };
    window.addEventListener('openModelInfo', handler as any);
    return () => window.removeEventListener('openModelInfo', handler as any);
  }, [models]);

  React.useEffect(() => {
    if (infoModel) {
      const updated = models.find(m => m.id === infoModel.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(infoModel)) {
        setInfoModel(updated);
      }
    }
  }, [models]);

  React.useEffect(() => {
    // Check for pending past events to review
    const today = new Date().toISOString().split('T')[0];
    for (const model of models) {
      if (model.events) {
        const pastEvent = model.events.find(e => {
          const checkDate = e.endDate || e.date;
          return checkDate < today && e.status === 'pending';
        });
        if (pastEvent) {
          setEventToReview({ model, event: pastEvent });
          return;
        }
      }
    }
    setEventToReview(null);
  }, [models]);

  const handleDeletePackage = async (id: string) => {
    try {
      const { deletePackage } = await import('../utils');
      await deletePackage(id);
      setSharedPackages(prev => prev.filter(p => p.id !== id));
      addNotification('Shared link deleted and statistics reset', 'success');
    } catch (error) {
      console.error(error);
      addNotification('Failed to delete shared link', 'error');
    }
  };

  const handleUpdatePackage = async (id: string, newModelIds: string[]) => {
    try {
      const { updatePackageModels } = await import('../utils');
      await updatePackageModels(id, newModelIds);
      setSharedPackages(prev => prev.map(p => p.id === id ? { ...p, modelIds: newModelIds } : p));
      addNotification('Shared link updated', 'success');
    } catch (error) {
      console.error('Error updating pkg:', error);
      addNotification('Failed to update shared link', 'error');
    }
  };

  const handleUpdatePackageTitle = async (id: string, newTitle: string) => {
    try {
      const { updatePackageTitle } = await import('../utils');
      await updatePackageTitle(id, newTitle);
      setSharedPackages(prev => prev.map(p => p.id === id ? { ...p, title: newTitle } : p));
      addNotification('Shared link title updated', 'success');
    } catch (error) {
      console.error('Error updating pkg title:', error);
      addNotification('Failed to update shared link title', 'error');
    }
  };

  const handleReviewEvent = async (attended: boolean) => {
    if (!eventToReview) return;
    const { model, event } = eventToReview;
    
    try {
      const updatedEvents = model.events!.map(e => 
        e.id === event.id ? { ...e, status: (attended ? 'completed' : 'missed') as 'completed' | 'missed' } : e
      );
      
      let updatedShows = model.shows || '';
      if (attended) {
        const eventTypeLabel = event.type === 'photoshoot' ? 'Photoshoot' : event.type === 'fashion_week' ? 'Fashion Week' : 'Local Show';
        updatedShows = `${updatedShows}\n${event.date} - ${event.title} (${eventTypeLabel})`.trim();
      }
      
      const updatedModel = { ...model, events: updatedEvents, shows: updatedShows };
      await updateModel(updatedModel);
      
      addNotification(`Event marked as ${attended ? 'completed' : 'missed'}`, 'success');
    } catch (error) {
      console.error('Error reviewing event:', error);
      addNotification('Failed to update event status', 'error');
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleLogout = () => {
    logout();
  };

  const handleSharePackage = async () => {
    if (selectedForPackage.length === 0) return;
    setIsSavingPackage(true);
    try {
      const packageId = await savePackage(selectedForPackage);
      const shareUrl = `${window.location.origin}/share/${packageId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        addNotification('Link copied to clipboard!', 'success');
      } catch (clipboardErr) {
        // Fallback if clipboard API fails (e.g. in iframe)
        setShareLinkModal(shareUrl);
        addNotification('Link generated!', 'success');
      }
      clearPackageSelection();
    } catch (err) {
      console.error(err);
      addNotification('Failed to create package link', 'error');
    } finally {
      setIsSavingPackage(false);
    }
  };

  const handleSaveSettings = async () => {
    const rawList = ['All', ...filtersEdit.split(',').map(c => c.trim()).filter(Boolean)];
    const newCategories = normalizeCategories(rawList, models);
    const newQuestions = applicationQuestionsEdit.split('\n').map(q => q.trim()).filter(Boolean);
    let newPdfLogo = undefined;
    let newAgencySignature = undefined;
    let newAgencyStamp = undefined;

    const uploadFile = async (file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error(`Файл ${file.name} слишком большой (макс 2MB)`);
      }
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    };

    setIsUploading(true);

    if (pdfLogoFile) newPdfLogo = await uploadFile(pdfLogoFile);
    if (agencySignatureFile) newAgencySignature = await uploadFile(agencySignatureFile);
    if (agencyStampFile) newAgencyStamp = await uploadFile(agencyStampFile);

    setIsUploading(false);

    await updateState({
      logo: logoEdit || 'BIG',
      categories: newCategories,
      applicationQuestions: newQuestions,
      ...(newPdfLogo ? { pdfLogo: newPdfLogo } : {}),
      ...(newAgencySignature ? { agencySignature: newAgencySignature } : {}),
      ...(newAgencyStamp ? { agencyStamp: newAgencyStamp } : {})
    });
    
    setPdfLogoFile(null);
    setAgencySignatureFile(null);
    setAgencyStampFile(null);
    setAlertMessage('Settings saved!');
  };

  const handleAddAdmin = async () => {
    if (!newAdminLogin || !newAdminPass) return;
    const hashed = await hashPassword(newAdminPass);
    const newAdminObj = { 
      login: newAdminLogin, 
      email: newAdminEmail || undefined, 
      hash: hashed, 
      role: 'admin' as const,
      timeSpent: 0 
    };

    let baseUsers = Array.isArray(users) ? [...users] : [];
    if (baseUsers.length === 0) {
      try {
        const { get, ref } = await import('firebase/database');
        const uSnap = await get(ref(db, `agencies/${agencyId}/users`));
        if (uSnap.exists()) {
          const val = uSnap.val();
          baseUsers = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
        }
      } catch (e) {}
    }

    const updatedUsers = [...baseUsers, newAdminObj];
    await updateState({ users: updatedUsers });
    await addNotification(`Admin ${newAdminLogin} was added by ${currentAdmin}`, 'success');
    setNewAdminLogin('');
    setNewAdminEmail('');
    setNewAdminPass('');
  };

  const executeDeleteAdmin = async () => {
    if (confirmDeleteAdminIdx === null) return;
    const newUsers = [...users];
    const deletedLogin = newUsers[confirmDeleteAdminIdx].login;
    newUsers.splice(confirmDeleteAdminIdx, 1);
    await updateState({ users: newUsers });
    await addNotification(`Admin ${deletedLogin} was deleted by ${currentAdmin}`, 'warning');
    setConfirmDeleteAdminIdx(null);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isVideoUploading) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Determine existing ID or generate one and lock it immediately
      let id = editingModel.id;
      if (!id) {
        // Check if model with same name and login already exists to avoid creating duplicates
        const normName = String(editingModel.name || '').trim().toLowerCase();
        const normLogin = String(editingModel.modelLogin || '').trim().toLowerCase();
        const existingDuplicate = models.find(m => 
          normName && normLogin && 
          String(m.name || '').trim().toLowerCase() === normName && 
          String(m.modelLogin || '').trim().toLowerCase() === normLogin
        );
        if (existingDuplicate) {
          id = existingDuplicate.id;
        } else {
          id = Date.now().toString();
        }
        setEditingModel(prev => ({ ...prev, id }));
      }

      const existingIndex = models.findIndex(x => String(x.id) === String(id));
      const isNew = existingIndex < 0;
      let imgs = editingModel.imgs !== undefined ? [...editingModel.imgs] : (existingIndex >= 0 ? [...(models[existingIndex].imgs || [])] : []);

      if (files && files.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > 32 * 1024 * 1024) {
             console.error('File too large', files[i].name);
             setAlertMessage(`Image ${files[i].name} is too large (max 32MB)`);
             continue;
          }
          try {
            // Direct upload to Cloudinary
            const cloud_name = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ddmhnwhl3';
            const api_key = import.meta.env.VITE_CLOUDINARY_API_KEY || '157642667529213';
            const api_secret = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'eD5s6htlM8P7GDwRkHorwt0lCKQ';
            
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const folder = 'models_images';
            const str = `folder=${folder}&timestamp=${timestamp}${api_secret}`;
            
            const msgBuffer = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
            const signature = Array.from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            
            const fd = new FormData();
            fd.append('file', files[i]);
            fd.append('api_key', api_key);
            fd.append('timestamp', timestamp);
            fd.append('signature', signature);
            fd.append('folder', folder);
            
            const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { 
              method: 'POST', 
              body: fd 
            });
            if (!resp.ok) {
              const text = await resp.text();
              throw new Error(`HTTP ${resp.status}: ${text.substring(0, 50)}`);
            }
            const data = await resp.json();
            if (data.secure_url || data.url) {
              uploadedUrls.push(data.secure_url || data.url);
            }
          } catch (err: any) {
            console.error('Upload failed for image', i, err);
            setAlertMessage(`Image upload failed: ${err.message}`);
          }
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
        imgs = [...imgs, ...uploadedUrls];
      }

      let videos = editingModel.videos !== undefined ? [...editingModel.videos] : (existingIndex >= 0 ? [...(models[existingIndex].videos || [])] : []);
      if (videoFiles && videoFiles.length > 0) {
        setIsVideoUploading(true);
        const uploadedVideoUrls: string[] = [];
        for (let i = 0; i < videoFiles.length; i++) {
          const file = videoFiles[i];
          if (file.size > 30 * 1024 * 1024) {
            alert(t.video_too_large || 'Video too large (Max 30MB)');
            continue;
          }
          
          try {
            // Direct upload to Cloudinary to support Vercel (bypasses local server)
            const cloud_name = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ddmhnwhl3';
            const api_key = import.meta.env.VITE_CLOUDINARY_API_KEY || '157642667529213';
            const api_secret = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'eD5s6htlM8P7GDwRkHorwt0lCKQ';
            
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const folder = 'models_videos';
            const str = `folder=${folder}&timestamp=${timestamp}${api_secret}`;
            
            // Generate SHA-1 signature
            const msgBuffer = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
            const signature = Array.from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', api_key);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('folder', folder);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) {
              let errorText = await response.text();
              let errorMsg = 'Upload failed to Cloudinary';
              try {
                const errObj = JSON.parse(errorText);
                errorMsg = errObj.error?.message || errorMsg;
              } catch (e) {
                if (response.status === 413 || errorText.toLowerCase().includes('payload too large')) {
                  errorMsg = 'Video is too large. Please compress the video under 30MB.';
                } else {
                  errorMsg = `Server error ${response.status}: ${errorText.substring(0, 50)}`;
                }
              }
              throw new Error(errorMsg);
            }
            
            const result = await response.json();
            if (result.secure_url) {
              uploadedVideoUrls.push(result.secure_url);
            } else if (result.url) {
              uploadedVideoUrls.push(result.url);
            } else {
              throw new Error('No URL returned from upload server');
            }
          } catch (err: any) {
            console.error('Upload failed for video', i, err);
            let errorMsg = err.message;
            if (errorMsg === 'Failed to fetch') {
              errorMsg = 'Failed to fetch. Server might be down or not responding.';
            }
            setAlertMessage(`Video upload failed: ${errorMsg}`);
            setIsVideoUploading(false);
            setIsUploading(false);
            return; // Stop saving the model if video upload fails
          }
          setVideoUploadProgress(Math.round(((i + 1) / videoFiles.length) * 100));
        }
        videos = [...videos, ...uploadedVideoUrls];
        setIsVideoUploading(false);
      }

      const baseModel = existingIndex >= 0 ? models[existingIndex] : { id };
      const newModel: Model = {
        ...baseModel,
        id,
        name: editingModel.name || '',
        patronymic: editingModel.patronymic || '',
        modelLogin: sanitizeKey(editingModel.modelLogin || '') || (editingModel.name ? String(editingModel.name).trim() : ''),
        modelPass: editingModel.modelPass || '',
        phone: editingModel.phone || '',
        insta: editingModel.insta || '',
        email: editingModel.email || '',
        finCode: editingModel.finCode || '',
        idCardNum: editingModel.idCardNum || '',
        status: editingModel.status || 'Active',
        contractStart: editingModel.contractStart || null,
        expiry: editingModel.expiry || null,
        payExpiry: editingModel.payExpiry || null,
        cat: editingModel.cat || categories[1] || 'All',
        height: editingModel.height || '',
        weight: editingModel.weight || '',
        shoe: editingModel.shoe || '',
        params: editingModel.params || '',
        shows: editingModel.shows || '',
        imgs,
        videos: (editingModel as any).driveVideoLink ? [...videos, (editingModel as any).driveVideoLink] : videos,
        applicationId: editingModel.applicationId
      };

      await updateModel(newModel);
      
      // If this model was created from an application, delete the application
      if (editingModel.applicationId) {
        const { remove, ref } = await import('firebase/database');
        const appRef = ref(db, `agencies/${agencyId}/applications/${editingModel.applicationId}`);
        await remove(appRef);
      }
      
      await addNotification(`Model ${newModel.name} was ${isNew ? 'added' : 'updated'} by ${currentAdmin}`, 'success');
      setEditingModel({});
      setFiles(null);
      setVideoFiles(null);
      setAlertMessage('Model saved successfully!');
    } catch (error) {
      console.error('Error saving model:', error);
      setAlertMessage('Error saving model. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
    }
  };

  const executeDeleteModel = async () => {
    if (!confirmDeleteId) return;
    await deleteModelToTrash(confirmDeleteId, currentAdmin || 'Admin');
    setConfirmDeleteId(null);
  };

  const executeDeleteMedia = async () => {
    if (!confirmDeleteMedia) return;
    const { modelId, type, index } = confirmDeleteMedia;
    const model = models.find(m => m.id === modelId);
    if (!model) {
      setConfirmDeleteMedia(null);
      return;
    }
    
    let updatedModel = { ...model };
    if (type === 'img' && model.imgs) {
      const newImgs = [...model.imgs];
      newImgs.splice(index, 1);
      updatedModel.imgs = newImgs;
    } else if (type === 'video' && model.videos) {
      const newVideos = [...model.videos];
      newVideos.splice(index, 1);
      updatedModel.videos = newVideos;
    }
    
    await updateModel(updatedModel);
    setInfoModel(updatedModel);
    await addNotification(`${type === 'img' ? 'Photo' : 'Video'} deleted for ${model.name}`, 'success');
    setConfirmDeleteMedia(null);
  };

  const handleSetMainImage = async (modelId: string, imgIndex: number) => {
    const model = models.find(m => m.id === modelId);
    if (!model || !model.imgs || model.imgs.length <= 1 || imgIndex === 0) return;
    
    const newImgs = [...model.imgs];
    const [selectedImg] = newImgs.splice(imgIndex, 1);
    newImgs.unshift(selectedImg);
    
    const updatedModel = { ...model, imgs: newImgs };
    
    await updateModel(updatedModel);
    setInfoModel(updatedModel);
    await addNotification(`Main photo updated for ${model.name}`, 'success');
  };

  // Notifications logic
  const expiringContracts = models.filter(m => {
    const d = daysLeft(m.expiry);
    return d !== null && d <= 5 && d >= 0;
  });
  const expiringPayments = models.filter(m => {
    const d = daysLeft(m.payExpiry);
    return d !== null && d <= 5 && d >= 0;
  });
  const recentPassChanges = models.filter(m => m.passHistory && m.passHistory.length > 0);

  return (
    <div className="min-h-screen bg-black text-white pb-16 font-sans flex flex-col select-none">
      <header className="bg-black border-b border-white/10 px-4 sm:px-8 py-3.5 sm:py-4 flex justify-between items-center sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0"></div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            onClick={() => setIsAdminViewingSite(true)} 
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-white text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Главная
          </button>
          
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold">
            {(['ru', 'az', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1 py-0.5 uppercase tracking-wider transition-colors cursor-pointer ${
                  lang === l
                    ? 'text-white font-bold border-b border-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{t.exit}</span>
          </button>
        </div>
      </header>

      <div className="border-b border-white/10 bg-black sticky top-[53px] sm:top-[57px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-4 sm:gap-8 overflow-x-auto touch-scroll hide-scrollbar">
          <button onClick={() => setActiveTab('database')} className={`py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'database' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Database</button>
          <button onClick={() => setActiveTab('review')} className={`py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'review' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Review</button>
          <button onClick={() => setActiveTab('contracts')} className={`py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'contracts' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Contracts</button>
          <button onClick={() => setActiveTab('analytics')} className={`py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'analytics' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Analytics & Logs</button>
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('settings')} className={`py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'settings' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Settings & Team</button>
          )}
        </div>
      </div>

      {activeTab === 'review' && (
        <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
          <AdminReviewTab 
            onApprove={(app: Application) => {
              const notes = app.answers && (Array.isArray(app.answers) ? app.answers.length > 0 : Object.keys(app.answers).length > 0)
                ? [{
                    id: Date.now().toString(),
                    text: `Application Answers:\n${(Array.isArray(app.answers) ? app.answers : Object.entries(app.answers).map(([q, a]) => ({ question: q, answer: a }))).map(item => `${item.question}: ${item.answer}`).join('\n')}`,
                    date: new Date().toISOString(),
                    author: 'System'
                  }]
                : [];

              setEditingModel({
                name: app.name,
                phone: app.phone,
                email: app.email,
                insta: app.insta,
                height: app.height,
                weight: app.weight,
                shoe: app.shoe,
                params: app.params,
                imgs: app.imgs,
                status: 'Active',
                cat: 'All',
                applicationId: app.id,
                notes
              });
              setActiveTab('database');
            }}
          />
        </div>
      )}

      {activeTab === 'contracts' && (
        <AdminContracts />
      )}

      {activeTab === 'analytics' && (
        <AdminAnalyticsTab 
          t={t}
          notifications={notifications}
          expiringContracts={expiringContracts}
          expiringPayments={expiringPayments}
          recentPassChanges={recentPassChanges}
          sharedPackages={sharedPackages}
          models={models}
          handleDeletePackage={handleDeletePackage}
          handleUpdatePackage={handleUpdatePackage}
          handleUpdatePackageTitle={handleUpdatePackageTitle}
        />
      )}

      {activeTab === 'settings' && isSuperAdmin && (
        <div className="w-full mt-4">
          <AdminSettingsTab 
            t={t}
            currentAdmin={currentAdmin}
            isSuperAdmin={isSuperAdmin}
            users={users}
            logoEdit={logoEdit}
            setLogoEdit={setLogoEdit}
            filtersEdit={filtersEdit}
            setFiltersEdit={setFiltersEdit}
            applicationQuestionsEdit={applicationQuestionsEdit}
            setApplicationQuestionsEdit={setApplicationQuestionsEdit}
            setPdfLogoFile={setPdfLogoFile}
            setAgencySignatureFile={setAgencySignatureFile}
            setAgencyStampFile={setAgencyStampFile}
            pdfLogo={pdfLogo!}
            agencySignature={agencySignature!}
            agencyStamp={agencyStamp!}
            handleSaveSettings={handleSaveSettings}
            setConfirmDeleteAdminIdx={setConfirmDeleteAdminIdx}
            newAdminLogin={newAdminLogin}
            setNewAdminLogin={setNewAdminLogin}
            newAdminEmail={newAdminEmail}
            setNewAdminEmail={setNewAdminEmail}
            newAdminPass={newAdminPass}
            setNewAdminPass={setNewAdminPass}
            handleAddAdmin={handleAddAdmin}
          />
        </div>
      )}

      {activeTab === 'database' && (
        <div className="w-full mt-4">
          <AdminDatabaseTab 
            t={t}
            editingModel={editingModel}
            setEditingModel={setEditingModel}
            handleSaveModel={handleSaveModel}
            categories={categories}
            setFiles={setFiles}
            setVideoFiles={setVideoFiles}
            isUploading={isUploading}
            isVideoUploading={isVideoUploading}
            uploadProgress={uploadProgress}
            videoUploadProgress={videoUploadProgress}
            search={search}
            setSearch={setSearch}
            models={models}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            ITEMS_PER_PAGE={ITEMS_PER_PAGE}
            togglePackageSelection={togglePackageSelection}
            selectedForPackage={selectedForPackage}
            setInfoModel={setInfoModel}
            setConfirmDeleteId={setConfirmDeleteId}
          />
        </div>
      )}

      {infoModel && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md" onClick={() => setInfoModel(null)}>
          <div className="bg-black border border-white/20 p-6 md:p-8 w-full max-w-5xl shadow-2xl relative max-h-[90vh] flex flex-col text-white" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/10 pb-4">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white break-words pr-4 font-sans">{infoModel.name} {infoModel.patronymic}</h3>
              <button onClick={() => setInfoModel(null)} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                <X size={22} />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 -mr-2 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Column 1: Info & Media */}
                <div className="space-y-6">
                  <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-3 text-sm text-zinc-300">
                    <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px] border-b border-white/10 pb-2">Profile Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Email</strong> {infoModel.email || '—'}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Phone</strong> {infoModel.phone || '—'}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Instagram</strong> {infoModel.insta || '—'}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Status</strong> {infoModel.status}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Category</strong> {infoModel.cat}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Contract Start</strong> {infoModel.contractStart || '—'}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Contract Expiry</strong> {infoModel.expiry || '—'}</div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">Payment Expiry</strong> {infoModel.payExpiry || '—'}</div>
                    </div>
                  </div>

                  <div className="bg-black/40 p-5 rounded-2xl border border-amber-500/20 space-y-4 text-sm text-zinc-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>Доступ & Логин модели</span>
                      </h4>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-bold">
                        {infoModel.modelLogin && infoModel.modelLogin !== infoModel.name ? 'Персональный логин' : 'Логин по умолчанию'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Model Login */}
                      <div className="bg-black/60 p-3 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Логин для входа</strong>
                          <button
                            type="button"
                            onClick={() => {
                              const loginVal = (infoModel.modelLogin || infoModel.name || '').trim();
                              if (loginVal) {
                                navigator.clipboard.writeText(loginVal);
                                setCopiedField('login');
                                setTimeout(() => setCopiedField(null), 2000);
                              }
                            }}
                            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 flex items-center gap-1 text-[10px]"
                            title="Скопировать логин"
                          >
                            {copiedField === 'login' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span className={copiedField === 'login' ? 'text-emerald-400 font-bold' : ''}>
                              {copiedField === 'login' ? 'Скопировано' : 'Копировать'}
                            </span>
                          </button>
                        </div>
                        <div className="text-amber-300 font-mono text-sm font-bold tracking-wide break-all">
                          {infoModel.modelLogin || infoModel.name || '—'}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {infoModel.modelLogin && infoModel.modelLogin !== infoModel.name ? (
                            <span>Имя в системе: <span className="text-zinc-400">{infoModel.name}</span></span>
                          ) : (
                            <span>(по умолчанию совпадает с именем)</span>
                          )}
                        </div>
                      </div>

                      {/* Model Password */}
                      <div className="bg-black/60 p-3 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Пароль (App)</strong>
                          {infoModel.modelPass && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(infoModel.modelPass || '');
                                setCopiedField('pass');
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 flex items-center gap-1 text-[10px]"
                              title="Скопировать пароль"
                            >
                              {copiedField === 'pass' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              <span className={copiedField === 'pass' ? 'text-emerald-400 font-bold' : ''}>
                                {copiedField === 'pass' ? 'Скопировано' : 'Копировать'}
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="text-white font-mono text-sm font-semibold tracking-wide break-all">
                          {infoModel.modelPass || '—'}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          Модель может изменить в кабинете
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/5">
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">FIN код</strong> <span className="font-mono text-zinc-300">{infoModel.finCode || '—'}</span></div>
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">№ удостоверения</strong> <span className="font-mono text-zinc-300">{infoModel.idCardNum || '—'}</span></div>
                    </div>
                  </div>

                  <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-3 text-sm text-zinc-300">
                    <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px] border-b border-white/10 pb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">{t.total_time_spent}</strong> {formatSeconds(infoModel.timeSpent || 0)}</div>
                      {infoModel.lastLogin && <div><strong className="text-white block text-[10px] uppercase tracking-wider opacity-70">{t.last_login}</strong> {new Date(infoModel.lastLogin).toLocaleString()}</div>}
                    </div>
                  </div>

                  {((infoModel.imgs && infoModel.imgs.length > 0) || (infoModel.videos && infoModel.videos.length > 0)) && (
                    <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-4">
                      {infoModel.imgs && infoModel.imgs.length > 0 && (
                        <div>
                          <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-[10px]">Photos</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {infoModel.imgs.map((img, idx) => (
                              <div 
                                key={idx} 
                                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors group ${idx === 0 ? 'border-green-500' : 'border-transparent hover:border-white/50'}`}
                                onClick={() => handleSetMainImage(infoModel.id, idx)}
                              >
                                <img src={safeUrl(img, 'img')} alt={`Photo ${idx}`} className="w-full h-16 object-cover" />
                                {idx === 0 && <div className="absolute top-0 left-0 bg-green-500 text-white text-[8px] font-bold px-1 py-0.5 uppercase">Main</div>}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteMedia({ modelId: infoModel.id, type: 'img', index: idx }); }}
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-all active:scale-90 z-10"
                                  title="Delete photo"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {infoModel.videos && infoModel.videos.length > 0 && (
                        <div className={infoModel.imgs && infoModel.imgs.length > 0 ? "pt-4 border-t border-white/10" : ""}>
                          <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-[10px]">Videos</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {infoModel.videos.map((vid, idx) => {
                              const playable = getPlayableVideoUrl(vid);
                              if (!playable) return null;
                              return (
                                <div 
                                  key={`vid-${idx}`} 
                                  className="relative rounded-lg overflow-hidden border-2 border-transparent group"
                                >
                                  {playable.isDriveIframe ? (
                                    <div className="w-full h-16 bg-zinc-800 flex items-center justify-center">
                                      <span className="text-xs text-white">Drive</span>
                                    </div>
                                  ) : (
                                    <video src={playable.url} className="w-full h-16 object-cover" />
                                  )}
                                  <div className="absolute top-0 left-0 bg-black/50 text-white text-[8px] font-bold px-1 py-0.5 uppercase">Video</div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteMedia({ modelId: infoModel.id, type: 'video', index: idx }); }}
                                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-all active:scale-90 z-10"
                                    title="Delete video"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2: Calendar & Notes */}
                <div className="space-y-6">
                  <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                    <ModelCalendar 
                      model={infoModel} 
                      onUpdateModel={async (updatedModel) => {
                        await updateModel(updatedModel);
                        setInfoModel(updatedModel);
                      }}
                    />
                  </div>
                  
                  <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                    <ModelNotes
                      model={infoModel}
                      onUpdateModel={async (updatedModel) => {
                        await updateModel(updatedModel);
                        setInfoModel(updatedModel);
                      }}
                      isAdmin={true}
                      currentAdmin={currentAdmin || undefined}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center text-white" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="mx-auto text-amber-400 mb-4" />
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white mb-2 font-sans">{t.delete_talent}</h3>
            <p className="text-xs text-zinc-400 mb-6 font-sans">{lang === 'ru' ? 'Модель будет перемещена в Корзину.' : 'Model will be moved to Trash.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-2.5 px-4 border border-white/20 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.cancel}</button>
              <button onClick={executeDeleteModel} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAdminIdx !== null && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setConfirmDeleteAdminIdx(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center text-white" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white mb-2 font-sans">{t.delete_admin}</h3>
            <p className="text-xs text-zinc-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAdminIdx(null)} className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-2.5 px-4 border border-white/20 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.cancel}</button>
              <button onClick={executeDeleteAdmin} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteMedia && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setConfirmDeleteMedia(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center text-white" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white mb-2 font-sans">Delete {confirmDeleteMedia.type === 'img' ? 'Photo' : 'Video'}</h3>
            <p className="text-xs text-zinc-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteMedia(null)} className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-2.5 px-4 border border-white/20 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.cancel}</button>
              <button onClick={executeDeleteMedia} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 transition-colors uppercase tracking-wider text-xs cursor-pointer">{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setAlertMessage(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center text-white" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white mb-6 font-sans">{alertMessage}</h3>
            <button onClick={() => setAlertMessage(null)} className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer">OK</button>
          </div>
        </div>
      )}

      {shareLinkModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setShareLinkModal(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-md shadow-2xl text-center text-white" onClick={e => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white mb-3 font-sans">Share Link</h3>
            <p className="text-xs text-zinc-400 mb-5">Copy the link below to share the selected models.</p>
            <input 
              type="text" 
              value={shareLinkModal} 
              readOnly 
              className="w-full bg-zinc-950 border border-white/15 px-4 py-3 text-xs mb-6 outline-none text-white text-center font-mono select-all"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button onClick={() => setShareLinkModal(null)} className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 transition-colors uppercase tracking-[0.2em] text-xs cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {eventToReview && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-black border border-white/20 p-6 sm:p-8 w-full max-w-md shadow-2xl text-center text-white">
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white mb-2 font-sans">Event Review</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Did <strong className="text-white">{eventToReview.model.name}</strong> attend the event <strong className="text-white">{eventToReview.event.title}</strong> on <strong className="text-white">{eventToReview.event.date}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleReviewEvent(false)} className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-2.5 px-4 border border-white/20 transition-colors uppercase tracking-wider text-xs cursor-pointer">No, Missed</button>
              <button onClick={() => handleReviewEvent(true)} className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 px-4 transition-colors uppercase tracking-wider text-xs cursor-pointer">Yes, Attended</button>
            </div>
          </div>
        </div>
      )}

      {selectedForPackage.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 bg-black border border-white/20 shadow-2xl px-5 sm:px-6 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[92%] sm:w-auto justify-between sm:justify-center">
          <div className="text-white font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap">
            {selectedForPackage.length} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSharePackage}
              disabled={isSavingPackage}
              className="flex items-center gap-1.5 bg-white text-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {isSavingPackage ? <Loader2 className="animate-spin" size={13} /> : <Share2 size={13} />}
              <span>Share</span>
            </button>
            <button
              onClick={clearPackageSelection}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
