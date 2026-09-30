import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../firebase';
import { ref, get, update, onValue } from 'firebase/database';
import SignatureCanvas from 'react-signature-canvas';
import { X, FileSignature, Download, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ContractDocument } from '../../types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { trimCanvas } from '../../utils/trimCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  onClose: () => void;
}

export const ModelContractPopup: React.FC<Props> = ({ onClose }) => {
  const { currentModel, agencyId, updateModel, agencySignature, agencyStamp } = useAppContext();
  const [contracts, setContracts] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContract, setActiveContract] = useState<ContractDocument | null>(null);
  
  const sigCanvas = useRef<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [unsignedPreviewUrl, setUnsignedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId || !currentModel) return;
    const unsub = onValue(ref(db, `agencies/${agencyId}/contracts`), (snap) => {
      const list: ContractDocument[] = [];
      if (snap.exists()) {
        snap.forEach(child => {
          const c = { id: child.key, ...child.val() } as ContractDocument;
          const assigned = typeof c.assignedTo === 'object' && !Array.isArray(c.assignedTo) && c.assignedTo && Object.keys(c.assignedTo).includes(currentModel.id);
          if (assigned || (Array.isArray(c.assignedTo) && c.assignedTo.includes(currentModel.id))) {
            list.push(c);
          }
        });
      }
      setContracts(list);
      
      // Update activeContract if it was edited
      if (activeContract) {
        const updated = list.find(c => c.id === activeContract.id);
        if (updated) setActiveContract(updated);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, currentModel, activeContract?.id]);

  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeContract) {
      if (currentModel?.signedContracts?.[activeContract.id]) {
        const signedData = currentModel.signedContracts[activeContract.id];
        const sigDataUrl = signedData.signatureDataUrl || currentModel.signature || null;
        if (signedData.pdfBase64) {
          setSignedPreviewUrl(signedData.pdfBase64);
        } else {
          generateContractPdf(activeContract, sigDataUrl).then(setSignedPreviewUrl).catch(console.error);
        }
        setUnsignedPreviewUrl(null);
      } else {
        generateContractPdf(activeContract, null).then(setUnsignedPreviewUrl).catch(console.error);
        setSignedPreviewUrl(null);
      }
    } else {
      setUnsignedPreviewUrl(null);
      setSignedPreviewUrl(null);
    }
  }, [activeContract, currentModel, agencySignature, agencyStamp]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const drawImageAtMarker = async (pdfDoc: any, pages: any[], urlOrBytes: string | ArrayBuffer, marker: any, scaleFactor = 0.5) => {
    try {
      let imageBytes;
      if (typeof urlOrBytes === 'string') {
        imageBytes = await fetch(urlOrBytes).then(res => res.arrayBuffer());
      } else {
        imageBytes = urlOrBytes;
      }
      const page = pages[marker.page - 1];
      if (!page) return;
      const embImage = await pdfDoc.embedPng(imageBytes).catch(() => pdfDoc.embedJpg(imageBytes));
      let sigDims = embImage.scale(scaleFactor);
      
      const MAX_WIDTH = 120; // 120 points on PDF is reasonable for a signature
      if (sigDims.width > MAX_WIDTH) {
        const scaleToFit = MAX_WIDTH / embImage.width;
        sigDims = embImage.scale(scaleToFit);
      }

      const pageHeight = page.getHeight();
      const screenWidth = 600;
      const scale = page.getWidth() / screenWidth;

      const pdfX = marker.x * scale;
      const pdfY = pageHeight - (marker.y * scale) - sigDims.height;

      page.drawImage(embImage, {
        x: pdfX,
        y: pdfY,
        width: sigDims.width,
        height: sigDims.height,
      });
    } catch (e) {
      console.warn('Failed to draw image at marker', e);
    }
  };

  const generateContractPdf = async (contract: ContractDocument, signatureDataUrl: string | null = null): Promise<string> => {
    // Fetch base64 PDF
    const pdfBytes = Uint8Array.from(atob(contract.base64.split(',')[1]), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // We need standard font to write text. Standard fonts don't support Cyrillic so we load a custom font via URL
    pdfDoc.registerFontkit(fontkit);
    const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';
    const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
    const font = await pdfDoc.embedFont(fontBytes);

    const drawTextAt = (pageIdx: number, text: string, x: number, y: number) => {
      if (!text || pageIdx < 0 || pageIdx >= pages.length) return;
      const page = pages[pageIdx];
      const pageHeight = page.getHeight();
      const screenWidth = 600;
      const scale = page.getWidth() / screenWidth;

      const pdfX = x * scale;
      const pdfY = pageHeight - (y * scale);
      
      page.drawText(text, {
        x: pdfX,
        y: pdfY,
        size: 12,
        font,
      });
    };

    const markers = contract.markers || [];
    const assignmentData = contract.assignedTo?.[currentModel?.id || ''];

    for (const m of markers) {
      if (m.type === 'modelName') {
        const fullName = `${currentModel?.name || ''} ${currentModel?.patronymic || ''}`.trim();
        drawTextAt(m.page - 1, fullName, m.x, m.y);
      }
      if (m.type === 'modelData') {
        drawTextAt(m.page - 1, `Email: ${currentModel?.email || ''}, Phone: ${currentModel?.phone || ''}`, m.x, m.y);
      }
      if (m.type === 'contractNum') {
        drawTextAt(m.page - 1, assignmentData?.contractNum || '', m.x, m.y);
      }
      if (m.type === 'date') {
        drawTextAt(m.page - 1, assignmentData?.date || '', m.x, m.y);
      }
      if (m.type === 'finCode') {
        drawTextAt(m.page - 1, currentModel?.finCode || '', m.x, m.y);
      }
      if (m.type === 'idCardNum') {
        drawTextAt(m.page - 1, currentModel?.idCardNum || '', m.x, m.y);
      }
      if (m.type === 'signature' && signatureDataUrl) {
        const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
        await drawImageAtMarker(pdfDoc, pages, signatureImageBytes, m, 0.5);
      }
      if (m.type === 'agencySignature' && agencySignature) {
        await drawImageAtMarker(pdfDoc, pages, agencySignature, m, 0.5);
      }
      if (m.type === 'agencyStamp' && agencyStamp) {
        await drawImageAtMarker(pdfDoc, pages, agencyStamp, m, 0.5);
      }
    }

    return await pdfDoc.saveAsBase64({ dataUri: true });
  };

  const handleSign = async () => {
    if (!activeContract) return;
    if (!currentModel?.signature && sigCanvas.current?.isEmpty()) {
      setError('Пожалуйста, поставьте подпись перед сохранением.');
      return;
    }
    setError(null);
    setIsSigning(true);

    try {
      const signatureDataUrl = currentModel?.signature || trimCanvas(sigCanvas.current.getCanvas()).toDataURL('image/png');
      const pdfBytesFinal = await generateContractPdf(activeContract, signatureDataUrl);

      const newSignedContracts = {
        ...(currentModel?.signedContracts || {}),
        [activeContract.id]: {
          signedAt: new Date().toISOString(),
          signatureDataUrl: signatureDataUrl
        }
      };

      // Ensure we push changes through AppContext which accurately maps IDs to indices
      const modelUpdate: any = { ...currentModel!, signedContracts: newSignedContracts };
      if (!currentModel?.signature) {
        modelUpdate.signature = signatureDataUrl;
      }
      await updateModel(modelUpdate);
      setActiveContract(null); // return to list

    } catch (err: any) {
      console.error(err);
      setError('Ошибка при подписании контракта: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadSigned = async (contract: ContractDocument, signedData: any) => {
    try {
      if (signedData.pdfBase64) {
        const a = document.createElement('a');
        a.href = signedData.pdfBase64;
        a.download = `${contract.title.replace(/\s+/g, '_')}_Signed.pdf`;
        a.click();
      } else {
        // use signatureDataUrl or currentModel.signature
        const sigUrl = signedData.signatureDataUrl || currentModel?.signature || null;
        const dataUrl = await generateContractPdf(contract, sigUrl);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${contract.title.replace(/\s+/g, '_')}_Signed.pdf`;
        a.click();
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>
        
        {activeContract ? (
          <>
            <button onClick={() => setActiveContract(null)} className="absolute left-6 top-6 text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium z-10">
              <ArrowLeft size={16} />
              Назад
            </button>
            <h3 className="text-2xl font-black uppercase text-white mb-6 mt-8 flex items-center gap-3">
              <FileSignature />
              {currentModel?.signedContracts?.[activeContract.id] ? 'Предпросмотр Контракта' : `Подписание: ${activeContract.title}`}
            </h3>
            
            <div className="space-y-6 overflow-y-auto hide-scrollbar">
              {currentModel?.signedContracts?.[activeContract.id] ? (
                <div className="bg-white rounded-xl overflow-hidden mt-4 w-full flex justify-center pb-4 min-h-[40vh]">
                  {signedPreviewUrl ? (
                    <Document 
                      file={signedPreviewUrl} 
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <Page
                          key={`page_${i + 1}`}
                          pageNumber={i + 1}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          width={Math.min(window.innerWidth - 80, 600)}
                          className="mb-4 shadow-lg mx-auto"
                        />
                      ))}
                    </Document>
                  ) : <div className="text-zinc-500 m-auto">Формирование документа...</div>}
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl text-sm leading-relaxed">
                    Документ готов к подписанию. Пожалуйста, ознакомьтесь с контрактом и поставьте подпись в поле ниже.
                  </div>

                  {unsignedPreviewUrl && (
                    <div className="bg-white rounded-xl overflow-hidden mt-4 w-full flex justify-center pb-4 max-h-[40vh] overflow-y-auto">
                      <Document 
                        file={unsignedPreviewUrl} 
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      >
                        {Array.from({ length: numPages }, (_, i) => (
                          <Page
                            key={`page_preview_${i + 1}`}
                            pageNumber={i + 1}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            width={Math.min(window.innerWidth - 120, 500)}
                            className="mb-4 shadow-lg mx-auto"
                          />
                        ))}
                      </Document>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Ваша Подпись</label>
                      {!currentModel?.signature && (
                        <button onClick={clearSignature} className="text-xs text-zinc-500 hover:text-white transition-colors border-b border-transparent hover:border-white">Очистить</button>
                      )}
                    </div>
                    {currentModel?.signature ? (
                      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 flex justify-center h-48 items-center">
                        <img src={currentModel.signature} alt="Saved Signature" className="max-h-full max-w-full mix-blend-screen invert" />
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border-4 border-zinc-800 overflow-hidden touch-none h-48 w-full cursor-crosshair">
                        <SignatureCanvas 
                          ref={sigCanvas}
                          penColor="black"
                          canvasProps={{ className: 'w-full h-full' }}
                        />
                      </div>
                    )}
                  </div>

                  {error && <div className="text-red-500 text-sm font-bold">{error}</div>}

                  <button 
                    onClick={handleSign} 
                    disabled={isSigning}
                    className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSigning ? <Loader2 size={18} className="animate-spin" /> : <FileSignature size={18} />}
                    {isSigning ? 'Формирование PDF...' : 'Подписать Контракт'}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-black uppercase text-white mb-6 flex items-center gap-3">
              <FileSignature />
              Ваши Контракты
            </h3>
            
            <div className="space-y-4 overflow-y-auto hide-scrollbar pb-4 flex-1">
              {contracts.length === 0 ? (
                <div className="text-zinc-500 text-center p-8 border border-white/5 bg-black/30 rounded-2xl text-sm">
                  У вас пока нет назначенных контрактов.
                </div>
              ) : (
                contracts.map((contract, cIdx) => {
                  const assignmentData = contract.assignedTo?.[currentModel?.id || ''];
                  const isSigned = !!currentModel?.signedContracts?.[contract.id];
                  const signedData = currentModel?.signedContracts?.[contract.id];
                  return (
                    <div key={`contract-item-${contract.id}-${cIdx}`} className="bg-black border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-white font-bold text-lg">{contract.title}</h4>
                      </div>
                      
                      <div className="w-full sm:w-auto shrink-0 flex gap-2">
                        {isSigned && signedData && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSigned(contract, signedData);
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-700 transition-colors"
                          >
                            <Download size={16} />
                            Скачать PDF
                          </button>
                        )}
                        <button
                          onClick={() => setActiveContract(contract)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                        >
                          <FileSignature size={16} />
                          {isSigned ? 'Предпросмотр' : 'Ознакомиться и Подписать'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
