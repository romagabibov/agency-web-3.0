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
    let isMounted = true;
    get(ref(db, `agencies/${agencyId}/contracts`)).then((snap) => {
      if (!isMounted) return;
      const list: ContractDocument[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
      }
      setContracts(list);
      setLoading(false);
    });
    return () => { isMounted = false; };
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

  if (loading) return <div className="p-12 text-center text-xs uppercase tracking-widest text-zinc-500">Loading contracts...</div>;

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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-black p-4 sm:p-6 border border-white/15 gap-4">
          <div className="flex-1 w-full lg:mr-8 border-b border-white/10 pb-4 lg:border-0 lg:pb-0">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white mb-3">Настройка контракта / Contract Setup</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={editingContract.title || ''} 
                onChange={e => setEditingContract({ ...editingContract, title: e.target.value })}
                placeholder="Название контракта"
                className="flex-1 bg-black border border-white/20 px-3.5 py-2.5 text-xs text-white outline-none focus:border-white transition-colors"
              />
              <label className="cursor-pointer bg-black border border-white/20 px-5 py-2.5 hover:border-white transition-colors flex items-center justify-center text-xs font-bold uppercase tracking-wider text-white shrink-0">
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
          <div className="flex gap-3 w-full lg:w-auto">
            <button 
              onClick={() => setEditingContract(null)}
              className="flex-1 px-5 py-2.5 border border-white/20 hover:border-white text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button 
              onClick={saveContract}
              className="flex-1 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start">
          {/* Models Selector Array */}
          <div className="w-full lg:w-72 bg-black p-4 border border-white/15 shrink-0 lg:sticky top-24 max-h-[50vh] lg:max-h-[80vh] flex flex-col z-10">
            <h3 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Users size={14} />
              Назначить моделям
            </h3>
            <div className="mb-3">
              <input 
                type="text" 
                placeholder="Поиск по имени..." 
                value={modelSearch} 
                onChange={(e) => setModelSearch(e.target.value)} 
                className="w-full bg-black border border-white/15 px-3 py-1.5 text-xs text-white outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1.5">
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
                  <div key={`${m.id || 'm'}-${mIdx}`} className={`flex flex-col gap-1.5 p-2 transition-colors border ${
                      isSelected ? 'bg-white/10 border-white' : 'bg-black border-white/10 hover:border-white/30'
                    }`}>
                    <button
                      onClick={() => handleToggleModel(m.id)}
                      className="w-full flex items-center gap-2.5 text-left"
                    >
                      <img src={m.imgs?.[0] || 'https://via.placeholder.com/150'} className="w-6 h-7 object-cover bg-zinc-950 border border-white/10" />
                      <span className={`text-xs font-medium truncate ${isSelected ? 'text-white font-bold' : 'text-zinc-400'}`}>{m.name}</span>
                      {isSelected && <span className="ml-auto text-[10px] text-white">✓</span>}
                    </button>
                    {isSelected && assignmentData && (
                      <div className="pt-1 grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Номер"
                          value={assignmentData.contractNum}
                          onChange={e => handleUpdateAssignment(m.id, e.target.value, assignmentData.date)}
                          className="bg-black border border-white/15 px-2 py-1 text-[11px] text-white outline-none focus:border-white"
                        />
                        <input
                          type="text"
                          placeholder="Дата"
                          value={assignmentData.date}
                          onChange={e => handleUpdateAssignment(m.id, assignmentData.contractNum, e.target.value)}
                          className="bg-black border border-white/15 px-2 py-1 text-[11px] text-white outline-none focus:border-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {models.length === 0 && <div className="text-zinc-500 text-xs uppercase tracking-wider py-4">Нет моделей в базе</div>}
            </div>
          </div>

          <div className="w-64 flex flex-col gap-2 bg-black p-4 border border-white/15 shrink-0 sticky top-24">
            <h3 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-2">Настройка полей</h3>
            {coordTypes.map(type => {
              const markerMatches = (editingContract.markers || []).filter(m => m.type === type.key);
              const count = markerMatches.length;
              return (
              <button
                key={type.key}
                onClick={() => setActiveCursor(type.key as any)}
                className={`p-2.5 text-left text-xs uppercase tracking-wider transition-all border ${
                  activeCursor === type.key 
                    ? 'bg-white text-black border-white font-bold' 
                    : count > 0
                      ? 'bg-black text-white border-white/40' 
                      : 'bg-black text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <div>{type.label}</div>
                {count > 0 && (
                  <span className="block text-[9px] font-mono text-zinc-500 mt-0.5">Определено: {count} шт.</span>
                )}
              </button>
            )})}
            {activeCursor && (
              <div className="mt-2 p-2.5 border border-white/30 text-white text-[11px] uppercase tracking-wider leading-relaxed">
                Нажмите на нужную точку в PDF.
              </div>
            )}
          </div>

          <div className="flex-1 w-full bg-black p-4 sm:p-6 border border-white/15 overflow-x-auto relative">
            <Document
              file={editingContract.base64}
              onLoadSuccess={handleDocumentLoadSuccess}
              className="flex flex-col items-center gap-4 w-full min-w-fit"
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative border border-white/20 shadow-2xl bg-white mx-auto">
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
                          className="absolute w-3 h-3 bg-red-500 border border-black transform -translate-x-1.5 -translate-y-1.5 cursor-pointer hover:scale-150 transition-transform"
                          style={{ left: marker.x * scale, top: marker.y * scale }}
                          onClick={(e) => removeMarker(marker.id, e)}
                        >
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-black text-white text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border border-white/20 whitespace-nowrap pointer-events-none z-50">
                            {typeLabel} (Click to remove)
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black p-5 sm:p-6 border border-white/15 gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-white mb-1">Управление контрактами / Contracts</h2>
          <p className="text-xs text-zinc-400">Загружайте PDF контракты и назначайте их отдельным моделям.</p>
        </div>
        <label className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black px-5 py-2.5 text-xs uppercase font-bold tracking-[0.18em] flex justify-center cursor-pointer transition-colors items-center gap-2">
          {isUploading ? 'Uploading...' : <><Plus size={14} /> Новый Контракт</>}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.map((contract, cIdx) => (
          <div key={`contract-${contract.id}-${cIdx}`} className="bg-black border border-white/10 hover:border-white/30 p-5 flex flex-col gap-4 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">{contract.title}</h3>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">{new Date(contract.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setEditingContract(contract)} 
                  className="w-8 h-8 flex items-center justify-center border border-white/15 hover:border-white text-zinc-400 hover:text-white bg-black transition-colors"
                >
                  <Edit size={13} />
                </button>
                <button 
                  onClick={() => deleteContract(contract.id)} 
                  className="w-8 h-8 flex items-center justify-center border border-white/15 hover:border-red-500 text-zinc-400 hover:text-red-400 bg-black transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-3">
              <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Назначено ({Object.keys(contract.assignedTo || {}).length || 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(contract.assignedTo || {}).map((mid, midIdx) => {
                  const m = models.find(mo => mo.id === mid);
                  if (!m) return null;
                  return (
                    <div key={`assigned-${mid}-${midIdx}`} className="bg-black border border-white/15 px-2 py-1 flex items-center gap-1.5">
                       <img src={m.imgs?.[0] || 'https://via.placeholder.com/50'} className="w-4 h-5 object-cover bg-zinc-950" />
                       <span className="text-[10px] text-zinc-300 font-mono">{m.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {contracts.length === 0 && (
          <div className="col-span-full text-center py-16 border border-white/10 bg-black text-zinc-500 text-xs uppercase tracking-[0.2em]">
            Нет загруженных контрактов
          </div>
        )}
      </div>
    </div>
  );
};
