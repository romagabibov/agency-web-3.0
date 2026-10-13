import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ref, update, get, remove, push } from 'firebase/database';
import { db } from '../../firebase';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ContractDocument } from '../../types';
import { Trash2, Edit, Plus, Users } from 'lucide-react';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const AdminContracts = () => {
  const { agencyId, models } = useAppContext();
  const [modelSearch, setModelSearch] = useState('');
  const [contracts, setContracts] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingContract, setEditingContract] = useState<Partial<ContractDocument> | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activeCursor, setActiveCursor] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    get(ref(db, `agencies/${agencyId}/contracts`)).then((snap) => {
      const list: ContractDocument[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
      }
      setContracts(list);
      setLoading(false);
    });
  }, [agencyId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      setIsUploading(true);
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setEditingContract({
          title: file.name.replace('.pdf', ''),
          base64,
          markers: [],
          assignedTo: {},
          createdAt: new Date().toISOString(),
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);

  const handlePageClick = (event: any, pageIndex: number) => {
    if (!activeCursor || !editingContract) return;

    const rect = event.target.getBoundingClientRect();
    const scale = (typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 600) : 600) / 600;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    const idStr = Math.random().toString(36).substring(7);
    setEditingContract({
      ...editingContract,
      markers: [
        ...(editingContract.markers || []),
        { id: idStr, type: activeCursor as string, x, y, page: pageIndex + 1 }
      ]
    });
    setActiveCursor(null);
  };

  const removeMarker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingContract) return;
    setEditingContract({
      ...editingContract,
      markers: (editingContract.markers || []).filter(m => m.id !== id)
    });
  };

  const handleToggleModel = (modelId: string) => {
    if (!editingContract) return;
    const current = typeof editingContract.assignedTo === 'object' && !Array.isArray(editingContract.assignedTo) 
      ? editingContract.assignedTo 
      : {};
    
    const updated = { ...current };
    if (updated[modelId]) {
      delete updated[modelId];
    } else {
      updated[modelId] = { contractNum: '', date: new Date().toLocaleDateString('ru-RU') };
    }
    setEditingContract({ ...editingContract, assignedTo: updated });
  };
  
  const handleUpdateAssignment = (modelId: string, contractNum: string, date: string) => {
    if (!editingContract) return;
    const current = typeof editingContract.assignedTo === 'object' && !Array.isArray(editingContract.assignedTo) 
      ? editingContract.assignedTo 
      : {};
      
    if (!current[modelId]) return;
    
    setEditingContract({
      ...editingContract, 
      assignedTo: {
        ...current,
        [modelId]: { contractNum, date }
      }
    });
  };

  const saveContract = async () => {
    if (!agencyId || !editingContract || !editingContract.base64) return;
    const isNew = !editingContract.id;
    
    let key = editingContract.id;
    if (isNew) {
      key = push(ref(db, `agencies/${agencyId}/contracts`)).key as string;
    }

    const currentAssigned = typeof editingContract.assignedTo === 'object' && !Array.isArray(editingContract.assignedTo) 
      ? editingContract.assignedTo 
      : {};

    const docToSave = {
      ...editingContract,
      id: key,
      title: editingContract.title || 'Новый Контракт',
      markers: editingContract.markers || [],
      assignedTo: currentAssigned,
      createdAt: editingContract.createdAt || new Date().toISOString()
    };

    await update(ref(db, `agencies/${agencyId}/contracts/${key}`), docToSave);
    
    // Update local state
    if (isNew) {
      setContracts([...contracts, docToSave as ContractDocument]);
    } else {
      setContracts(contracts.map(c => c.id === key ? docToSave as ContractDocument : c));
    }
    
    setEditingContract(null);
  };

  const deleteContract = async (id: string) => {
    if (!agencyId || !confirm("Удалить этот контракт?")) return;
    await remove(ref(db, `agencies/${agencyId}/contracts/${id}`));
    setContracts(contracts.filter(c => c.id !== id));
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading...</div>;

  const coordTypes = [
    { key: 'modelName', label: 'Имя модели' },
    { key: 'modelData', label: 'Данные модели' },
    { key: 'contractNum', label: 'Номер контракта' },
    { key: 'date', label: 'Дата' },
    { key: 'signature', label: 'Подпись модели' },
    { key: 'finCode', label: 'FIN код' },
    { key: 'idCardNum', label: '№ удостоверения' },
    { key: 'agencySignature', label: 'Подпись агентства' },
    { key: 'agencyStamp', label: 'Печать агентства' },
  ] as const;

  if (editingContract) {
    return (
      <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-white/10 gap-4">
          <div className="flex-1 w-full lg:mr-8 border-b border-white/10 pb-4 lg:border-0 lg:pb-0">
            <h2 className="text-xl font-bold text-white mb-2">Настройка контракта</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                value={editingContract.title || ''} 
                onChange={e => setEditingContract({ ...editingContract, title: e.target.value })}
                placeholder="Название контракта"
                className="flex-1 bg-black border border-white/20 p-3 rounded-xl text-white outline-none focus:border-white transition-colors"
              />
              <label className="cursor-pointer bg-black border border-white/20 px-6 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center text-sm font-bold text-white shrink-0">
                Заменить PDF
                <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result && typeof ev.target.result === 'string') {
                      setEditingContract({ ...editingContract, base64: ev.target.result });
                    }
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto mt-2 lg:mt-0">
            <button 
              onClick={() => setEditingContract(null)}
              className="flex-1 px-6 py-3 rounded-lg font-bold text-zinc-400 hover:text-white transition-colors bg-white/5 lg:bg-transparent"
            >
              Отмена
            </button>
            <button 
              onClick={saveContract}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            >
              Сохранить
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start">
          {/* Models Selector Array */}
          <div className="w-full lg:w-72 bg-zinc-900 p-4 rounded-xl border border-white/10 shrink-0 lg:sticky top-24 max-h-[50vh] lg:max-h-[80vh] flex flex-col z-10">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Users size={18} />
              Назначить моделям
            </h3>
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Поиск по имени..." 
                value={modelSearch} 
                onChange={(e) => setModelSearch(e.target.value)} 
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="overflow-y-auto hide-scrollbar flex-1 space-y-2">
              {models.filter(m => {
                const fullName = (m.name + ' ' + (m.patronymic || '')).toLowerCase();
                return fullName.includes(modelSearch.toLowerCase());
              }).map((m, mIdx) => {
                const currentAssigned = typeof editingContract.assignedTo === 'object' && !Array.isArray(editingContract.assignedTo) 
                  ? editingContract.assignedTo 
                  : {};
                const isSelected = !!currentAssigned[m.id];
                const assignmentData = isSelected ? currentAssigned[m.id] : null;

                return (
                  <div key={`${m.id || 'm'}-${mIdx}`} className={`flex flex-col gap-2 p-2 rounded-lg transition-colors border ${
                      isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black border-transparent hover:border-white/10'
                    }`}>
                    <button
                      onClick={() => handleToggleModel(m.id)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <img src={m.imgs?.[0] || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full object-cover" />
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-400' : 'text-zinc-300'}`}>{m.name}</span>
                      {isSelected && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />}
                    </button>
                    {isSelected && assignmentData && (
                      <div className="pl-11 pr-2 pb-2 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Номер"
                          value={assignmentData.contractNum}
                          onChange={e => handleUpdateAssignment(m.id, e.target.value, assignmentData.date)}
                          className="bg-black border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Дата"
                          value={assignmentData.date}
                          onChange={e => handleUpdateAssignment(m.id, assignmentData.contractNum, e.target.value)}
                          className="bg-black border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {models.length === 0 && <div className="text-zinc-500 text-sm">Нет моделей в базе</div>}
            </div>
          </div>

          <div className="w-64 flex flex-col gap-3 bg-zinc-900 p-4 rounded-xl border border-white/10 shrink-0 sticky top-24">
            <h3 className="text-white font-bold mb-2">Настройка полей</h3>
            {coordTypes.map(type => {
              const markerMatches = (editingContract.markers || []).filter(m => m.type === type.key);
              const count = markerMatches.length;
              return (
              <button
                key={type.key}
                onClick={() => setActiveCursor(type.key as any)}
                className={`p-3 text-left rounded-lg text-sm font-medium transition-all ${
                  activeCursor === type.key 
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : count > 0
                      ? 'bg-zinc-800 text-zinc-300 border-l-2 border-green-500' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {type.label}
                {count > 0 && (
                  <span className="block text-[10px] text-zinc-500 mt-1">Определено: {count} шт.</span>
                )}
              </button>
            )})}
            {activeCursor && (
              <div className="mt-4 p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs leading-relaxed">
                Нажмите на нужную точку в PDF.
              </div>
            )}
          </div>

          <div className="flex-1 w-full bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-white/10 overflow-x-auto relative">
            <Document
              file={editingContract.base64}
              onLoadSuccess={handleDocumentLoadSuccess}
              className="flex flex-col items-center gap-4 w-full min-w-fit"
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative border border-zinc-800 shadow-2xl bg-white mx-auto">
                  <Page
                    pageNumber={index + 1}
                    className="w-full"
                    onClick={(e) => handlePageClick(e, index)}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 600) : 600}
                  />
                  {(editingContract.markers || []).map((marker, mIdx) => {
                    if (marker.page === index + 1) {
                      const typeLabel = coordTypes.find(c => c.key === marker.type)?.label;
                      const scale = (typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 600) : 600) / 600;
                      return (
                        <div
                          key={`marker-${marker.id}-${mIdx}`}
                          className="absolute w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)] transform -translate-x-1.5 -translate-y-1.5 cursor-pointer hover:scale-150 transition-transform"
                          style={{ left: marker.x * scale, top: marker.y * scale }}
                          onClick={(e) => removeMarker(marker.id, e)}
                        >
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] sm:text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                            {typeLabel} (Нажмите чтобы удалить)
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-white/10 gap-4 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Управление контрактами</h2>
          <p className="text-xs sm:text-sm text-zinc-400">Загружайте контракты и назначайте их отдельным моделям.</p>
        </div>
        <label className="w-full sm:w-auto bg-white text-black px-6 py-3 rounded-xl font-bold flex justify-center cursor-pointer hover:bg-gray-200 transition-colors items-center gap-2">
          {isUploading ? 'Загрузка...' : <><Plus size={18} />Новый Контракт</>}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.map((contract, cIdx) => (
          <div key={`contract-${contract.id}-${cIdx}`} className="bg-zinc-900 border border-white/10 p-5 rounded-2xl flex flex-col gap-4 group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-lg">{contract.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{new Date(contract.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingContract(contract)} className="p-2 text-zinc-400 hover:text-white bg-black rounded-lg transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteContract(contract.id)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-black rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-2">Назначено моделям ({Object.keys(contract.assignedTo || {}).length || 0})</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(contract.assignedTo || {}).map((mid, midIdx) => {
                  const m = models.find(mo => mo.id === mid);
                  if (!m) return null;
                  return (
                    <div key={`assigned-${mid}-${midIdx}`} className="bg-black border border-white/10 px-2 py-1 rounded w-fit flex items-center gap-2">
                       <img src={m.imgs?.[0] || 'https://via.placeholder.com/50'} className="w-5 h-5 rounded-full object-cover" />
                       <span className="text-xs text-zinc-300 font-medium">{m.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {contracts.length === 0 && (
          <div className="col-span-full text-center p-12 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500">
            Нет загруженных контрактов
          </div>
        )}
      </div>
    </div>
  );
};
