import React from 'react';
import { Image as ImageIcon, Info, Edit, Trash2, Check, Plus } from 'lucide-react';
import { Model } from '../../types';
import { safeUrl } from '../../utils';
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
  const { lang } = useAppContext();
  const filteredModels = models.filter(m => String(m.name || '').toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
            <h3 className="text-xl font-black uppercase text-white mb-6 tracking-tight italic">{editingModel.id ? t.edit_talent : t.add_new_talent}</h3>
            <form onSubmit={handleSaveModel} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">{t.profile_details}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={editingModel.name || ''} onChange={e => setEditingModel({...editingModel, name: e.target.value})} placeholder={t.full_name} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="text" value={editingModel.patronymic || ''} onChange={e => setEditingModel({...editingModel, patronymic: e.target.value})} placeholder="Отчество (Patronymic)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={editingModel.modelLogin || ''} onChange={e => setEditingModel({...editingModel, modelLogin: e.target.value})} placeholder={t.portal_login} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="text" value={editingModel.modelPass || ''} onChange={e => setEditingModel({...editingModel, modelPass: e.target.value})} placeholder={t.portal_password} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" value={editingModel.phone || ''} onChange={e => setEditingModel({...editingModel, phone: e.target.value})} placeholder={t.phone} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="text" value={editingModel.insta || ''} onChange={e => setEditingModel({...editingModel, insta: e.target.value})} placeholder={t.instagram} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="email" value={editingModel.email || ''} onChange={e => setEditingModel({...editingModel, email: e.target.value})} placeholder={t.email} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={editingModel.finCode || ''} onChange={e => setEditingModel({...editingModel, finCode: e.target.value})} placeholder={lang === 'ru' ? 'FIN код' : lang === 'az' ? 'FIN kod' : 'FIN code'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="text" value={editingModel.idCardNum || ''} onChange={e => setEditingModel({...editingModel, idCardNum: e.target.value})} placeholder={lang === 'ru' ? '№ удостоверения личности' : lang === 'az' ? 'şəxsiyyət vəsigə №' : 'ID Card number'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.status}</label>
                    <select value={editingModel.status || 'Active'} onChange={e => setEditingModel({...editingModel, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white">
                      <option value="Active">{t.active}</option>
                      <option value="Inactive">{t.inactive}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.contract_start}</label>
                    <input type="date" value={editingModel.contractStart || ''} onChange={e => setEditingModel({...editingModel, contractStart: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.contract_expiry}</label>
                    <input type="date" value={editingModel.expiry || ''} onChange={e => setEditingModel({...editingModel, expiry: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">{t.payment_expiry}</label>
                    <input type="date" value={editingModel.payExpiry || ''} onChange={e => setEditingModel({...editingModel, payExpiry: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  </div>
                </div>
                <select value={editingModel.cat || categories[1] || 'All'} onChange={e => setEditingModel({...editingModel, cat: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white">
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" value={editingModel.height || ''} onChange={e => setEditingModel({...editingModel, height: e.target.value})} placeholder={t.height.toUpperCase()} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="number" value={editingModel.weight || ''} onChange={e => setEditingModel({...editingModel, weight: e.target.value})} placeholder={t.weight.toUpperCase()} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                  <input type="number" value={editingModel.shoe || ''} onChange={e => setEditingModel({...editingModel, shoe: e.target.value})} placeholder={t.shoe.toUpperCase()} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
                </div>
                <input type="text" value={editingModel.params || ''} onChange={e => setEditingModel({...editingModel, params: e.target.value})} placeholder={t.measurements_placeholder} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white" />
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">{t.media_biography}</h4>
                <textarea value={editingModel.shows || ''} onChange={e => setEditingModel({...editingModel, shows: e.target.value})} placeholder={t.career_highlights} className="flex-1 w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white min-h-[160px]"></textarea>
                <div className="p-6 border-2 border-dashed border-white/10 rounded-2xl text-center bg-black/50 hover:bg-black transition-colors">
                  <ImageIcon className="mx-auto text-zinc-500 mb-2" size={24} />
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 cursor-pointer">{t.upload_portfolio}</label>
                  <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="text-xs text-zinc-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                </div>
                {isUploading && !isVideoUploading && (
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
                
                <div className="p-6 border-2 border-dashed border-white/10 rounded-2xl text-center bg-black/50 hover:bg-black transition-colors">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 cursor-pointer">{t.upload_video || 'Upload Video'}</label>
                  <input type="file" multiple accept="video/*" onChange={e => setVideoFiles(e.target.files)} className="text-xs text-zinc-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                  
                  <div className="mt-4 pt-4 border-t border-white/10 text-left">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Или вставьте ссылку на Google Drive</label>
                    <input 
                      type="text" 
                      placeholder="https://drive.google.com/file/d/..." 
                      value={(editingModel as any).driveVideoLink || ''}
                      onChange={e => setEditingModel({...editingModel, driveVideoLink: e.target.value} as any)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white"
                    />
                  </div>
                </div>
                {isVideoUploading && (
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${videoUploadProgress}%` }}></div>
                  </div>
                )}

                <button type="submit" disabled={isUploading || isVideoUploading} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-4 rounded-xl transition-colors mt-auto disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm">
                  {isUploading || isVideoUploading ? `${t.saving} ${Math.max(uploadProgress, videoUploadProgress)}%` : t.deploy}
                </button>
                {Object.keys(editingModel).length > 0 && (
                  <button type="button" onClick={() => setEditingModel({})} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-white/10 uppercase tracking-widest text-xs">
                    {t.cancel_edit}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h3 className="text-2xl font-black uppercase tracking-tight text-white italic">{t.talent_database}</h3>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search_name} className="w-full md:max-w-sm bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/50 text-white shadow-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModels
            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
            .map(m => (
            <div key={m.id} className="bg-zinc-900/50 p-4 rounded-2xl shadow-sm border border-white/5 flex items-start gap-4 hover:bg-zinc-900 transition-colors">
              <img src={safeUrl(m.imgs?.[0], 'img')} alt={m.name} className="w-16 h-16 rounded-xl object-cover bg-black shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                <div className="mb-3">
                  <h4 className="text-base font-bold text-white leading-tight truncate w-full">{m.name || '—'}</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 truncate">
                    {m.cat || '—'} <span className="mx-1">•</span> {m.status || 'Active'}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => togglePackageSelection(m.id)} 
                    className={`p-2 rounded-lg transition-colors flex-1 flex justify-center ${selectedForPackage.includes(m.id) ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                    title={selectedForPackage.includes(m.id) ? "Remove from selection" : "Add to selection"}
                  >
                    {selectedForPackage.includes(m.id) ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                  <button onClick={() => setInfoModel(m)} className="p-2 text-zinc-400 hover:text-blue-400 bg-white/5 hover:bg-blue-400/20 rounded-lg transition-colors flex-1 flex justify-center"><Info size={16} /></button>
                  <button onClick={() => setEditingModel(m)} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex-1 flex justify-center"><Edit size={16} /></button>
                  <button onClick={() => setConfirmDeleteId(m.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors flex-1 flex justify-center"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
};
