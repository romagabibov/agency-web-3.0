import React from 'react';
import { Image as ImageIcon, Info, Edit, Trash2, Check, Plus, RotateCcw, Clock, AlertTriangle, ChevronDown, ChevronUp, ArrowRight, UserPlus } from 'lucide-react';
import { Model } from '../../types';
import { safeUrl, localizeCategory, matchesCategory, normalizeCategories, calculateAgeFromBirthDate, formatAge } from '../../utils';
import { useAppContext } from '../../context/AppContext';

interface Props {
  t: any;
  editingModel: Partial<Model>;
  setEditingModel: React.Dispatch<React.SetStateAction<Partial<Model>>>;
  handleSaveModel: (e: React.FormEvent) => void;
  categories: string[];
  setFiles: (files: FileList | null) => void;
  setVideoFiles: (files: FileList | null) => void;
  isUploading: boolean;
  isVideoUploading: boolean;
  uploadProgress: number;
  videoUploadProgress: number;
  search: string;
  setSearch: (val: string) => void;
  models: Model[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  ITEMS_PER_PAGE: number;
  togglePackageSelection: (id: string) => void;
  selectedForPackage: string[];
  setInfoModel: (model: Model | null) => void;
  setConfirmDeleteId: (id: string | null) => void;
}

export const AdminDatabaseTab: React.FC<Props> = ({
  t,
  editingModel,
  setEditingModel,
  handleSaveModel,
  categories,
  setFiles,
  setVideoFiles,
  isUploading,
  isVideoUploading,
  uploadProgress,
  videoUploadProgress,
  search,
  setSearch,
  models,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  togglePackageSelection,
  selectedForPackage,
  setInfoModel,
  setConfirmDeleteId
}) => {
  const { lang, deletedModels, restoreModelFromTrash, permanentlyDeleteModel, emptyTrashBin } = useAppContext();
  const [selectedCat, setSelectedCat] = React.useState<string>('All');
  const [viewMode, setViewMode] = React.useState<'active' | 'trash'>('active');
  const [confirmRestoreId, setConfirmRestoreId] = React.useState<string | null>(null);
  const [confirmPermDeleteId, setConfirmPermDeleteId] = React.useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState<boolean>(() => Boolean(editingModel.id));
  const [formSubTab, setFormSubTab] = React.useState<'info' | 'media'>('info');

  React.useEffect(() => {
    if (editingModel.id || editingModel.name) {
      setIsFormOpen(true);
    }
  }, [editingModel.id, editingModel.name]);

  const allCategories = React.useMemo(() => {
    return normalizeCategories(categories, models);
  }, [categories, models]);

  const filteredModels = models.filter(m => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      String(m.name || '').toLowerCase().includes(searchLower) ||
      String(m.phone || '').toLowerCase().includes(searchLower) ||
      String(m.modelLogin || '').toLowerCase().includes(searchLower);
    const matchesCat = matchesCategory(m.cat, selectedCat);
    return matchesSearch && matchesCat;
  });

  const filteredDeletedModels = deletedModels.filter(m => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      String(m.name || '').toLowerCase().includes(searchLower) ||
      String(m.phone || '').toLowerCase().includes(searchLower) ||
      String(m.modelLogin || '').toLowerCase().includes(searchLower);
    const matchesCat = matchesCategory(m.cat, selectedCat);
    return matchesSearch && matchesCat;
  });

  const getCatCount = (c: string) => {
    const targetList = viewMode === 'active' ? models : deletedModels;
    if (c === 'All' || c.toLowerCase() === 'all') return targetList.length;
    return targetList.filter(m => matchesCategory(m.cat, c)).length;
  };

  const currentList = viewMode === 'active' ? filteredModels : filteredDeletedModels;
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);

  return (
    <>
      {/* Create / Edit Talent Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="bg-black border border-white/15 transition-all">
          {/* Header Toggle Banner */}
          <div 
            onClick={() => setIsFormOpen(prev => !prev)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-black hover:bg-white/[0.02] transition-colors border-b border-white/10"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 border border-white/20 bg-black flex items-center justify-center text-white shrink-0">
                {editingModel.id ? <Edit size={14} className="text-white" /> : <UserPlus size={14} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold uppercase text-white tracking-[0.2em] truncate">
                    {editingModel.id ? t.edit_talent : t.add_new_talent}
                  </h3>
                  {editingModel.name && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 border border-white/20 px-2 py-0.5 truncate max-w-[160px]">
                      {editingModel.name}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 hidden sm:block">
                  {editingModel.id ? 'Modify parameters, media assets and login credentials' : 'Add new model profile to agency catalog'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-white text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-all shrink-0 bg-transparent"
            >
              <span>{isFormOpen ? 'Collapse' : (editingModel.id ? 'Edit' : '+ Add')}</span>
              {isFormOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Form Content */}
          {isFormOpen && (
            <div className="p-4 sm:p-6 md:p-8 bg-black">
              {/* Mobile Sub-Tab Switcher */}
              <div className="flex md:hidden border border-white/15 mb-6">
                <button
                  type="button"
                  onClick={() => setFormSubTab('info')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                    formSubTab === 'info' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white bg-black'
                  }`}
                >
                  1. Profile
                </button>
                <button
                  type="button"
                  onClick={() => setFormSubTab('media')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 ${
                    formSubTab === 'media' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white bg-black'
                  }`}
                >
                  <span>2. Media</span>
                  {((editingModel.imgs?.length || 0) + (editingModel.videos?.length || 0)) > 0 && (
                    <span className={`text-[9px] font-mono px-1.5 ${formSubTab === 'media' ? 'bg-black text-white' : 'bg-white/20 text-white'}`}>
                      {(editingModel.imgs?.length || 0) + (editingModel.videos?.length || 0)}
                    </span>
                  )}
                </button>
              </div>

              <form onSubmit={handleSaveModel} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Column 1: Info and Parameters */}
                <div className={`space-y-4 ${formSubTab === 'info' ? 'block' : 'hidden md:block'}`}>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.25em] mb-2">
                      {t.profile_details}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input 
                        type="text" 
                        value={editingModel.name || ''} 
                        onChange={e => setEditingModel({...editingModel, name: e.target.value})} 
                        placeholder={t.full_name} 
                        required 
                        className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                      />
                      <input 
                        type="text" 
                        value={editingModel.patronymic || ''} 
                        onChange={e => setEditingModel({...editingModel, patronymic: e.target.value})} 
                        placeholder="Отчество / Patronymic" 
                        className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text" 
                      value={editingModel.modelLogin || ''} 
                      onChange={e => setEditingModel({...editingModel, modelLogin: e.target.value})} 
                      placeholder={t.portal_login} 
                      required 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="text" 
                      value={editingModel.modelPass || ''} 
                      onChange={e => setEditingModel({...editingModel, modelPass: e.target.value})} 
                      placeholder={t.portal_password} 
                      required 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input 
                      type="text" 
                      value={editingModel.phone || ''} 
                      onChange={e => setEditingModel({...editingModel, phone: e.target.value})} 
                      placeholder={t.phone} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="text" 
                      value={editingModel.insta || ''} 
                      onChange={e => setEditingModel({...editingModel, insta: e.target.value})} 
                      placeholder={t.instagram} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="email" 
                      value={editingModel.email || ''} 
                      onChange={e => setEditingModel({...editingModel, email: e.target.value})} 
                      placeholder={t.email} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text" 
                      value={editingModel.finCode || ''} 
                      onChange={e => setEditingModel({...editingModel, finCode: e.target.value})} 
                      placeholder={lang === 'ru' ? 'FIN код' : lang === 'az' ? 'FIN kod' : 'FIN code'} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="text" 
                      value={editingModel.idCardNum || ''} 
                      onChange={e => setEditingModel({...editingModel, idCardNum: e.target.value})} 
                      placeholder={lang === 'ru' ? '№ удостоверения' : lang === 'az' ? 'şəxsiyyət vəsigə №' : 'ID Card number'} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs font-mono tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">{t.status}</label>
                      <select 
                        value={editingModel.status || 'Active'} 
                        onChange={e => setEditingModel({...editingModel, status: e.target.value})} 
                        className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white"
                      >
                        <option value="Active">{t.active}</option>
                        <option value="Inactive">{t.inactive}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">Категория / Category</label>
                      <select 
                        value={editingModel.cat || 'Woman'} 
                        onChange={e => setEditingModel({...editingModel, cat: e.target.value})} 
                        className="w-full bg-black border border-white/15 px-3 py-2 text-xs tracking-wider outline-none focus:border-white text-white"
                      >
                        {allCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{localizeCategory(c, t)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">{t.contract_start}</label>
                      <input 
                        type="date" 
                        value={editingModel.contractStart || ''} 
                        onChange={e => setEditingModel({...editingModel, contractStart: e.target.value})} 
                        className="w-full bg-black border border-white/15 px-2 py-1.5 text-xs outline-none focus:border-white text-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">{t.contract_expiry}</label>
                      <input 
                        type="date" 
                        value={editingModel.expiry || ''} 
                        onChange={e => setEditingModel({...editingModel, expiry: e.target.value})} 
                        className="w-full bg-black border border-white/15 px-2 py-1.5 text-xs outline-none focus:border-white text-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">{t.payment_expiry}</label>
                      <input 
                        type="date" 
                        value={editingModel.payExpiry || ''} 
                        onChange={e => setEditingModel({...editingModel, payExpiry: e.target.value})} 
                        className="w-full bg-black border border-white/15 px-2 py-1.5 text-xs outline-none focus:border-white text-white" 
                      />
                    </div>
                  </div>

                  {/* Date of Birth & Automatic Age Calculation Section */}
                  <div className="border border-white/15 p-3 space-y-2 bg-black">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
                        {t.birth_date || 'Дата рождения'} & {t.age || 'Возраст'}
                      </label>
                      {editingModel.birthDate && calculateAgeFromBirthDate(editingModel.birthDate) && (
                        <span className="text-[9px] font-mono px-2 py-0.5 border border-white/30 text-white">
                          {formatAge(editingModel.age, editingModel.birthDate, lang)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] text-zinc-500 block mb-1">{t.birth_date || 'Дата рождения'}</label>
                        <input
                          type="date"
                          value={editingModel.birthDate || ''}
                          onChange={e => {
                            const newBirthDate = e.target.value;
                            const calc = calculateAgeFromBirthDate(newBirthDate);
                            setEditingModel(prev => ({
                              ...prev,
                              birthDate: newBirthDate,
                              age: calc ? calc.years : (prev.age || '')
                            }));
                          }}
                          className="w-full bg-black border border-white/15 px-2 py-1.5 text-xs outline-none focus:border-white text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 block mb-1">{t.age_calculated || 'Возраст (лет)'}</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={editingModel.age !== undefined && editingModel.age !== null ? editingModel.age : ''}
                          onChange={e => setEditingModel(prev => ({ ...prev, age: e.target.value ? Number(e.target.value) : '' }))}
                          placeholder={t.age || 'Возраст'}
                          className="w-full bg-black border border-white/15 px-3 py-1.5 text-xs outline-none focus:border-white text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <input 
                      type="number" 
                      value={editingModel.height || ''} 
                      onChange={e => setEditingModel({...editingModel, height: e.target.value})} 
                      placeholder={t.height.toUpperCase()} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="number" 
                      value={editingModel.weight || ''} 
                      onChange={e => setEditingModel({...editingModel, weight: e.target.value})} 
                      placeholder={t.weight.toUpperCase()} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                    <input 
                      type="number" 
                      value={editingModel.shoe || ''} 
                      onChange={e => setEditingModel({...editingModel, shoe: e.target.value})} 
                      placeholder={t.shoe.toUpperCase()} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs outline-none focus:border-white text-white placeholder-zinc-600" 
                    />
                  </div>
                  <input 
                    type="text" 
                    value={editingModel.params || ''} 
                    onChange={e => setEditingModel({...editingModel, params: e.target.value})} 
                    placeholder={t.measurements_placeholder} 
                    className="w-full bg-black border border-white/15 px-3 py-2 text-xs outline-none focus:border-white text-white placeholder-zinc-600" 
                  />

                  {/* Navigation helper on mobile */}
                  <div className="md:hidden pt-2">
                    <button
                      type="button"
                      onClick={() => setFormSubTab('media')}
                      className="w-full py-2.5 px-4 border border-white/20 text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:border-white transition-colors"
                    >
                      <span>Next: Photos & Videos</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Column 2: Media and Bio */}
                <div className={`flex flex-col gap-3.5 ${formSubTab === 'media' ? 'flex' : 'hidden md:flex'}`}>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.25em] mb-2">{t.media_biography}</h4>
                    <textarea 
                      value={editingModel.shows || ''} 
                      onChange={e => setEditingModel({...editingModel, shows: e.target.value})} 
                      placeholder={t.career_highlights} 
                      className="w-full bg-black border border-white/15 px-3 py-2 text-xs outline-none focus:border-white text-white min-h-[90px] placeholder-zinc-600"
                    ></textarea>
                  </div>
                  
                  {/* Existing Photos Management in Edit Form */}
                  {editingModel.imgs && editingModel.imgs.length > 0 && (
                    <div className="border border-white/15 p-3 space-y-2 bg-black">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-[0.2em]">
                          {t.photos || 'Photos'} ({editingModel.imgs.length})
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Main: Photo #1</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {editingModel.imgs.map((img, idx) => (
                          <div 
                            key={idx} 
                            className={`relative aspect-[4/5] overflow-hidden border group bg-black ${idx === 0 ? 'border-white' : 'border-white/15 hover:border-white/40'}`}
                          >
                            <img src={safeUrl(img, 'img')} alt="" className="w-full h-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute top-0 left-0 bg-white text-black text-[8px] font-bold px-1 py-0.5 uppercase tracking-wider">
                                Cover
                              </span>
                            )}
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newImgs = [...(editingModel.imgs || [])];
                                  const [selected] = newImgs.splice(idx, 1);
                                  newImgs.unshift(selected);
                                  setEditingModel({ ...editingModel, imgs: newImgs });
                                }}
                                className="absolute bottom-1 left-1 bg-black/90 text-[7px] text-white px-1 py-0.5 border border-white/30 uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                                title="Set as main cover"
                              >
                                Set Cover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newImgs = [...(editingModel.imgs || [])];
                                newImgs.splice(idx, 1);
                                setEditingModel({ ...editingModel, imgs: newImgs });
                              }}
                              className="absolute top-1 right-1 bg-black/90 hover:bg-red-600 text-white p-1 border border-white/20 transition-colors"
                              title="Delete photo"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Videos Management in Edit Form */}
                  {editingModel.videos && editingModel.videos.length > 0 && (
                    <div className="border border-white/15 p-3 space-y-2 bg-black">
                      <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-[0.2em] block">
                        {t.videos || 'Videos'} ({editingModel.videos.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                        {editingModel.videos.map((vid, idx) => (
                          <div key={idx} className="relative border border-white/15 bg-black p-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-zinc-300 truncate">Video #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newVids = [...(editingModel.videos || [])];
                                newVids.splice(idx, 1);
                                setEditingModel({ ...editingModel, videos: newVids });
                              }}
                              className="text-zinc-400 hover:text-red-400 p-1 shrink-0"
                              title="Delete video"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 border border-dashed border-white/20 text-center bg-black hover:border-white/40 transition-colors">
                    <ImageIcon className="mx-auto text-zinc-500 mb-1.5" size={18} />
                    <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-[0.2em] block mb-1.5 cursor-pointer">{t.upload_portfolio}</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={e => setFiles(e.target.files)} 
                      className="text-[10px] text-zinc-500 w-full file:mr-3 file:py-1 file:px-2.5 file:border file:border-white/20 file:text-[10px] file:uppercase file:tracking-wider file:bg-transparent file:text-white hover:file:border-white" 
                    />
                  </div>
                  {isUploading && !isVideoUploading && (
                    <div className="w-full bg-white/10 h-1">
                      <div className="bg-white h-1 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                  
                  <div className="p-4 border border-dashed border-white/20 text-center bg-black hover:border-white/40 transition-colors">
                    <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-[0.2em] block mb-1.5 cursor-pointer">{t.upload_video || 'Upload Video'}</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="video/*" 
                      onChange={e => setVideoFiles(e.target.files)} 
                      className="text-[10px] text-zinc-500 w-full file:mr-3 file:py-1 file:px-2.5 file:border file:border-white/20 file:text-[10px] file:uppercase file:tracking-wider file:bg-transparent file:text-white hover:file:border-white" 
                    />
                    
                    <div className="mt-3 pt-3 border-t border-white/10 text-left">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-[0.2em] block mb-1">Google Drive Video Link</label>
                      <input 
                        type="text" 
                        placeholder="https://drive.google.com/file/d/..." 
                        value={(editingModel as any).driveVideoLink || ''}
                        onChange={e => setEditingModel({...editingModel, driveVideoLink: e.target.value} as any)}
                        className="w-full bg-black border border-white/15 px-3 py-1.5 text-xs outline-none focus:border-white text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>
                  {isVideoUploading && (
                    <div className="w-full bg-white/10 h-1">
                      <div className="bg-white h-1 transition-all duration-300" style={{ width: `${videoUploadProgress}%` }}></div>
                    </div>
                  )}

                  {/* Mobile Back Button */}
                  <div className="md:hidden flex">
                    <button
                      type="button"
                      onClick={() => setFormSubTab('info')}
                      className="w-full py-2.5 px-4 border border-white/20 text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em]"
                    >
                      ← Back to Parameters
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="col-span-full pt-4 flex flex-col sm:flex-row gap-3 border-t border-white/10">
                  <button 
                    type="submit" 
                    disabled={isUploading || isVideoUploading} 
                    className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs"
                  >
                    {isUploading || isVideoUploading ? `${t.saving} ${Math.max(uploadProgress, videoUploadProgress)}%` : t.deploy}
                  </button>
                  {Object.keys(editingModel).length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingModel({});
                        setIsFormOpen(false);
                      }} 
                      className="px-6 py-3 border border-white/20 hover:border-white text-white font-bold transition-colors uppercase tracking-[0.2em] text-xs"
                    >
                      {t.cancel_edit}
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 border border-white/10 text-zinc-400 hover:text-white font-bold transition-colors text-xs uppercase tracking-[0.2em] sm:hidden"
                  >
                    Collapse
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Main Database & Trash Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Sub-header with View Switcher and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => { setViewMode('active'); setCurrentPage(1); }}
              className={`pb-2 text-xs font-bold uppercase tracking-[0.22em] transition-all flex items-center gap-2 border-b-2 ${
                viewMode === 'active' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-white'
              }`}
            >
              <span>{t.talent_database}</span>
              <span className="font-mono text-[10px] text-zinc-400">
                [{models.length}]
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('trash'); setCurrentPage(1); }}
              className={`pb-2 text-xs font-bold uppercase tracking-[0.22em] transition-all flex items-center gap-2 border-b-2 ${
                viewMode === 'trash' 
                  ? 'border-red-500 text-red-400' 
                  : 'border-transparent text-zinc-500 hover:text-white'
              }`}
            >
              <Trash2 size={13} />
              <span>{t.trash_bin || 'Trash'}</span>
              <span className="font-mono text-[10px] text-zinc-400">
                [{deletedModels.length}]
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {viewMode === 'trash' && deletedModels.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(true)}
                className="px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors flex items-center gap-2 shrink-0"
              >
                <Trash2 size={12} />
                <span>{t.empty_trash || 'Empty Trash'}</span>
              </button>
            )}
            <input 
              type="text" 
              value={search} 
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }} 
              placeholder={t.search_name} 
              className="w-full md:w-72 bg-black border border-white/15 px-3.5 py-2 text-xs uppercase tracking-wider outline-none focus:border-white text-white placeholder-zinc-600" 
            />
          </div>
        </div>

        {viewMode === 'trash' && (
          <div className="border border-white/10 p-3 mb-6 flex items-center gap-3 text-zinc-400 text-xs">
            <Clock size={16} className="shrink-0 text-zinc-400" />
            <span>{t.trash_retention_info || 'Deleted talents are preserved indefinitely until restored or permanently cleared.'}</span>
          </div>
        )}

        {/* Minimalist Category Distribution Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-4 mb-6 custom-scrollbar flex-nowrap md:flex-wrap items-center">
          {allCategories.map(c => {
            const count = getCatCount(c);
            const isSelected = selectedCat.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCat(c);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border shrink-0 flex items-center gap-2 ${
                  isSelected 
                    ? 'bg-white text-black border-white' 
                    : 'bg-black text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                }`}
              >
                <span>{localizeCategory(c, t)}</span>
                <span className={`font-mono text-[9px] ${isSelected ? 'text-black' : 'text-zinc-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Talent Grid */}
        {viewMode === 'active' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredModels
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map(m => (
              <div 
                key={m.id} 
                className="bg-black border border-white/10 hover:border-white/30 p-3.5 flex flex-col justify-between transition-colors group"
              >
                <div className="flex items-start gap-3.5 mb-3">
                  <img 
                    src={safeUrl(m.imgs?.[0], 'img')} 
                    alt={m.name} 
                    className="w-16 h-20 aspect-[4/5] object-cover bg-zinc-950 border border-white/10 shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate leading-snug">
                      {m.name || '—'}
                    </h4>
                    
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 truncate">
                      {m.cat || '—'}
                      {(m.age || m.birthDate) && (
                        <span className="text-zinc-400 ml-1">
                          • {formatAge(m.age, m.birthDate, lang)}
                        </span>
                      )}
                    </p>

                    <div className="mt-2 text-[10px] font-mono text-zinc-400 truncate">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 mr-1.5">LOGIN:</span>
                      <span className="text-white border-b border-white/20 pb-0.5">
                        {m.modelLogin || m.name || '—'}
                      </span>
                    </div>

                    <div className="mt-1 text-[9px] uppercase tracking-widest text-zinc-500">
                      STATUS: <span className={m.status === 'Inactive' ? 'text-red-400' : 'text-zinc-300'}>{m.status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-white/10 mt-auto">
                  <button 
                    onClick={() => togglePackageSelection(m.id)} 
                    className={`h-8 flex-1 flex items-center justify-center border text-[10px] uppercase font-bold tracking-wider transition-colors ${
                      selectedForPackage.includes(m.id) 
                        ? 'bg-white text-black border-white' 
                        : 'border-white/10 hover:border-white text-zinc-400 hover:text-white bg-black'
                    }`}
                    title={selectedForPackage.includes(m.id) ? "Remove from package" : "Add to package"}
                  >
                    {selectedForPackage.includes(m.id) ? <Check size={13} /> : <Plus size={13} />}
                  </button>

                  <button 
                    onClick={() => setInfoModel(m)} 
                    className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-white text-zinc-400 hover:text-white bg-black transition-colors"
                    title={`Model credentials: ${m.modelLogin || m.name}`}
                  >
                    <Info size={13} />
                  </button>

                  <button 
                    onClick={() => setEditingModel(m)} 
                    className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-white text-zinc-400 hover:text-white bg-black transition-colors"
                    title="Edit profile"
                  >
                    <Edit size={13} />
                  </button>

                  <button 
                    onClick={() => setConfirmDeleteId(m.id)} 
                    className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-red-500 text-zinc-400 hover:text-red-400 bg-black transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredDeletedModels.length === 0 ? (
              <div className="text-center py-20 border border-white/10 bg-black">
                <Trash2 size={36} className="mx-auto text-zinc-600 mb-3" />
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">{t.trash_empty || 'Trash is empty'}</h4>
                <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest">No removed talent records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDeletedModels
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map(m => (
                    <div key={m.id} className="bg-black border border-red-500/20 hover:border-red-500/40 p-3.5 flex flex-col justify-between transition-colors">
                      <div className="flex items-start gap-3.5 mb-3">
                        <img 
                          src={safeUrl(m.imgs?.[0], 'img')} 
                          alt={m.name} 
                          className="w-16 h-20 aspect-[4/5] object-cover bg-zinc-950 border border-white/10 shrink-0 opacity-60 grayscale" 
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate leading-snug">
                            {m.name || '—'}
                          </h4>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 truncate">
                            {m.cat || '—'} • {m.status || 'Active'}
                          </p>
                          {m.deletedAt && (
                            <p className="text-[9px] font-mono text-zinc-500 mt-2 flex items-center gap-1">
                              <Clock size={10} />
                              <span>{new Date(m.deletedAt).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-white/10 mt-auto">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(m.id)}
                          className="flex-1 py-1.5 px-3 border border-white/20 hover:border-white text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                          title={t.restore || 'Restore'}
                        >
                          <RotateCcw size={12} />
                          <span>{t.restore || 'Restore'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPermDeleteId(m.id)}
                          className="px-2.5 py-1.5 border border-red-500/30 hover:border-red-500 text-red-400 text-[10px] transition-colors flex items-center justify-center"
                          title={t.permanently_delete || 'Permanently Delete'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-6 mt-10 border-t border-white/10 pt-6">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-white/20 hover:border-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold uppercase tracking-[0.2em] transition-colors text-white"
            >
              Prev
            </button>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              Page {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-white/20 hover:border-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold uppercase tracking-[0.2em] transition-colors text-white"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Restore Model */}
      {confirmRestoreId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setConfirmRestoreId(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <RotateCcw size={36} className="mx-auto text-white mb-4" />
            <h3 className="text-sm font-bold uppercase text-white tracking-[0.2em] mb-2">{t.restore_talent || 'Restore Talent?'}</h3>
            <p className="text-xs text-zinc-400 mb-6">{t.confirm_restore || 'Restore this talent back into the active agency database?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestoreId(null)} className="flex-1 border border-white/20 hover:border-white text-white font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors">{t.cancel}</button>
              <button 
                onClick={async () => {
                  await restoreModelFromTrash(confirmRestoreId);
                  setConfirmRestoreId(null);
                }} 
                className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors"
              >
                {t.restore || 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Permanent Delete Model */}
      {confirmPermDeleteId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setConfirmPermDeleteId(null)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-sm font-bold uppercase text-white tracking-[0.2em] mb-2">{t.permanently_delete || 'Permanently Delete'}</h3>
            <p className="text-xs text-zinc-400 mb-6">{t.confirm_perm_delete || 'Are you sure you want to delete this profile permanently? This cannot be undone.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPermDeleteId(null)} className="flex-1 border border-white/20 hover:border-white text-white font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors">{t.cancel}</button>
              <button 
                onClick={async () => {
                  await permanentlyDeleteModel(confirmPermDeleteId);
                  setConfirmPermDeleteId(null);
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Trash Bin */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setConfirmEmptyTrash(false)}>
          <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-sm font-bold uppercase text-white tracking-[0.2em] mb-2">{t.empty_trash || 'Empty Trash'}</h3>
            <p className="text-xs text-zinc-400 mb-6">All models in trash will be permanently wiped out.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEmptyTrash(false)} className="flex-1 border border-white/20 hover:border-white text-white font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors">{t.cancel}</button>
              <button 
                onClick={async () => {
                  await emptyTrashBin();
                  setConfirmEmptyTrash(false);
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 uppercase tracking-[0.2em] text-xs transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
