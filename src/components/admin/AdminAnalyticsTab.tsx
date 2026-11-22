import React, { useState } from 'react';
import { Share2, AlertTriangle, Trash2, ChevronDown, ChevronUp, Edit2, Check, X, Plus } from 'lucide-react';
import { Model } from '../../types';
import { formatSeconds, daysLeft } from '../../utils';

interface Props {
  t: any;
  notifications: any[];
  expiringContracts: Model[];
  expiringPayments: Model[];
  recentPassChanges: Model[];
  sharedPackages: any[];
  models: Model[];
  handleDeletePackage: (id: string) => void;
  handleUpdatePackage?: (id: string, newModelIds: string[]) => void;
  handleUpdatePackageTitle?: (id: string, title: string) => void;
}

export const AdminAnalyticsTab: React.FC<Props> = ({
  t,
  notifications,
  expiringContracts,
  expiringPayments,
  recentPassChanges,
  sharedPackages,
  models,
  handleDeletePackage,
  handleUpdatePackage,
  handleUpdatePackageTitle
}) => {
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editingModelIds, setEditingModelIds] = useState<string[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState('');
  const [pkgModelSearch, setPkgModelSearch] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 flex-grow w-full">
      {/* Notifications Panel */}
      <div className="bg-black p-5 sm:p-6 border border-white/15 mb-8">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-white mb-5 flex items-center gap-2">
          <AlertTriangle size={15} className="text-zinc-400"/> System Activity & Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-black p-4 border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">{t.system_logs}</h4>
            {notifications.length === 0 ? <p className="text-xs text-zinc-600">No logs</p> : notifications.map((n, i) => (
              <div key={`${n.id || i}-notif`} className="text-xs text-zinc-300 mb-2.5 border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${n.type === 'error' ? 'bg-red-500' : n.type === 'success' ? 'bg-white' : 'bg-zinc-400'}`}></span>
                  <strong className="text-white text-xs">{n.message}</strong>
                </div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{new Date(n.date).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="bg-black p-4 border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">{t.contract_expiring}</h4>
            {expiringContracts.length === 0 ? <p className="text-xs text-zinc-600">{t.no_alerts}</p> : expiringContracts.map((m, i) => (
              <div key={`${m.id}-${i}-contract`} className="text-xs text-white mb-2 flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="truncate mr-2">{m.name}</span> 
                <span className="text-red-400 font-mono text-[10px] shrink-0">{daysLeft(m.expiry)} days</span>
              </div>
            ))}
          </div>

          <div className="bg-black p-4 border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">{t.payment_expiring}</h4>
            {expiringPayments.length === 0 ? <p className="text-xs text-zinc-600">{t.no_alerts}</p> : expiringPayments.map((m, i) => (
              <div key={`${m.id}-${i}-pay`} className="text-xs text-white mb-2 flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="truncate mr-2">{m.name}</span> 
                <span className="text-red-400 font-mono text-[10px] shrink-0">{daysLeft(m.payExpiry)} days</span>
              </div>
            ))}
          </div>

          <div className="bg-black p-4 border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">{t.recent_pass_changes}</h4>
            {recentPassChanges.length === 0 ? <p className="text-xs text-zinc-600">No recent changes</p> : recentPassChanges.slice().reverse().map((m, i) => {
              const lastChange = m.passHistory![m.passHistory!.length - 1];
              return (
                <div key={`${m.id}-${i}-pass`} className="text-xs text-zinc-300 mb-2.5 border-b border-white/5 pb-2 last:border-0">
                  <strong className="text-white text-xs block mb-1">{m.name}</strong>
                  <div className="flex flex-wrap gap-2 items-center text-[11px] font-mono">
                    <span className="text-zinc-500">Old:</span> <span className="line-through text-zinc-500">{lastChange.old}</span>
                    <span className="text-zinc-500">New:</span> <span className="text-white">{lastChange.new}</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase tracking-widest">{new Date(lastChange.date).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Shared Link Statistics Panel */}
      <div className="bg-black p-5 sm:p-6 border border-white/15">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-white mb-5 flex items-center gap-2">
          <Share2 size={15} className="text-zinc-400"/> Shared Link Statistics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-400">
            <thead className="text-[10px] uppercase tracking-[0.18em] border-b border-white/15 text-zinc-500 font-mono">
              <tr>
                <th className="px-3 py-3">Link / Date</th>
                <th className="px-3 py-3">Views</th>
                <th className="px-3 py-3">Top Viewed</th>
                <th className="px-3 py-3">Likes</th>
                <th className="px-3 py-3">Longest Viewed</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sharedPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-600 uppercase tracking-widest text-xs">No shared links found</td>
                </tr>
              ) : sharedPackages.map((pkg, index) => {
                const totalLikes = pkg.likes ? Object.values(pkg.likes).reduce((a: any, b: any) => a + b, 0) : 0;
                
                let mostViewedModel = '—';
                let maxViews = 0;
                if (pkg.modelViews) {
                  Object.entries(pkg.modelViews).forEach(([mId, count]: [string, any]) => {
                    if (count > maxViews) {
                      maxViews = count;
                      const m = models.find(x => x.id === mId);
                      mostViewedModel = m ? `${m.name} (${count})` : mId;
                    }
                  });
                }

                let longestViewedModel = '—';
                let maxTime = 0;
                if (pkg.timeSpent) {
                  Object.entries(pkg.timeSpent).forEach(([mId, time]: [string, any]) => {
                    if (time > maxTime) {
                      maxTime = time;
                      const m = models.find(x => x.id === mId);
                      longestViewedModel = m ? `${m.name} (${formatSeconds(time)})` : mId;
                    }
                  });
                }

                return (
                  <React.Fragment key={pkg.id || `pkg-${index}`}>
                    <tr className="border-b border-white/10 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-white mb-1">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setExpandedPkgId(expandedPkgId === pkg.id ? null : pkg.id)} className="p-1 hover:text-white text-zinc-400 transition-colors">
                              {expandedPkgId === pkg.id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                            </button>
                            
                            {editingTitleId === pkg.id ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  type="text" 
                                  className="bg-black border border-white/30 px-2 py-1 text-xs text-white focus:outline-none focus:border-white"
                                  value={editingTitleVal}
                                  onChange={e => setEditingTitleVal(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      if (handleUpdatePackageTitle) handleUpdatePackageTitle(pkg.id, editingTitleVal);
                                      setEditingTitleId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingTitleId(null);
                                    }
                                  }}
                                />
                                <button onClick={() => {
                                  if (handleUpdatePackageTitle) handleUpdatePackageTitle(pkg.id, editingTitleVal);
                                  setEditingTitleId(null);
                                }} className="text-white hover:text-zinc-300 p-1"><Check size={13} /></button>
                                <button onClick={() => setEditingTitleId(null)} className="text-zinc-500 hover:text-white p-1"><X size={13} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs uppercase tracking-wider">{pkg.title || `Package ${pkg.id}`}</span>
                                {handleUpdatePackageTitle && (
                                  <button onClick={() => {
                                    setEditingTitleId(pkg.id);
                                    setEditingTitleVal(pkg.title || '');
                                  }} className="text-zinc-600 hover:text-white p-1">
                                    <Edit2 size={11}/>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-7">
                          {new Date(pkg.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-white">{pkg.views || 0}</td>
                      <td className="px-3 py-3.5 text-zinc-300">{mostViewedModel}</td>
                      <td className="px-3 py-3.5 font-mono text-white">{String(totalLikes)}</td>
                      <td className="px-3 py-3.5 text-zinc-300">{longestViewedModel}</td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {handleUpdatePackage && (
                            <button 
                              onClick={() => {
                                setExpandedPkgId(pkg.id);
                                setEditingPkgId(pkg.id);
                                setEditingModelIds(pkg.modelIds || []);
                                setPkgModelSearch('');
                              }}
                              className="w-7 h-7 flex items-center justify-center border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors"
                              title="Edit models"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="w-7 h-7 flex items-center justify-center border border-white/10 hover:border-red-500 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Delete link and reset stats"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPkgId === pkg.id && (
                      <tr className="bg-black border-b border-white/10">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="flex justify-between items-start flex-col xl:flex-row gap-6">
                            <div className="flex-1 w-full">
                              <h5 className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">Model Statistics</h5>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                {(pkg.modelIds || []).map((mId: string, idx: number) => {
                                  const m = models.find(x => x.id === mId);
                                  const mName = m ? m.name : mId;
                                  const mViews = pkg.modelViews?.[mId] || 0;
                                  const mTime = pkg.timeSpent?.[mId] || 0;
                                  const mLikes = pkg.likes?.[mId] || 0;
                                  
                                  return (
                                    <div key={`${mId}-${idx}`} className="bg-black border border-white/10 p-2.5 flex justify-between items-center text-xs">
                                      <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2.5 truncate mr-2">
                                        <div className="w-6 h-7 bg-zinc-950 border border-white/10 overflow-hidden shrink-0">
                                          {m && m.imgs && m.imgs[0] ? <img src={m.imgs[0]} alt="" className="w-full h-full object-cover"/> : null}
                                        </div>
                                        <span className="truncate">{mName}</span>
                                      </div>
                                      <div className="flex gap-3 text-[10px] font-mono items-center shrink-0 text-zinc-400">
                                        <span>VIEWS: {mViews}</span>
                                        <span>TIME: {formatSeconds(mTime)}</span>
                                        <span>LIKES: {mLikes}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {editingPkgId === pkg.id && handleUpdatePackage && (
                              <div className="w-full xl:w-80 bg-black border border-white/20 p-4 shadow-2xl xl:sticky xl:top-4">
                                <h5 className="text-white font-bold text-[10px] uppercase tracking-[0.2em] mb-3">Edit Models</h5>
                                <div className="mb-3">
                                  <input 
                                    type="text"
                                    placeholder="Search..."
                                    value={pkgModelSearch}
                                    onChange={(e) => setPkgModelSearch(e.target.value)}
                                    className="w-full bg-black border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                                  />
                                </div>
                                <div className="space-y-1.5 max-h-56 overflow-y-auto mb-3 pr-1 custom-scrollbar">
                                  {models.filter(m => (m.name || '').toLowerCase().includes(pkgModelSearch.toLowerCase())).map((m, i) => {
                                    const isSelected = editingModelIds.includes(m.id);
                                    return (
                                      <div key={`${m.id}-${i}-edit`} className={`flex justify-between items-center p-2 border transition-colors ${isSelected ? 'bg-white/10 border-white' : 'bg-black border-white/10'}`}>
                                        <div className="flex items-center gap-2 truncate mr-2">
                                          <div className="w-5 h-6 bg-zinc-950 overflow-hidden shrink-0">
                                            {m.imgs && m.imgs[0] && <img src={m.imgs[0]} alt="" className="w-full h-full object-cover"/>}
                                          </div>
                                          <span className={`text-xs truncate ${isSelected ? 'text-white font-bold' : 'text-zinc-400'}`}>{m.name}</span>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            if (isSelected) {
                                              setEditingModelIds(prev => prev.filter(id => id !== m.id));
                                            } else {
                                              setEditingModelIds(prev => [...prev, m.id]);
                                            }
                                          }}
                                          className={`w-6 h-6 flex items-center justify-center border text-xs transition-colors shrink-0 ${isSelected ? 'border-white text-white' : 'border-white/20 text-zinc-500 hover:text-white hover:border-white'}`}
                                        >
                                          {isSelected ? <X size={12}/> : <Plus size={12}/>}
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                  <div className="text-[10px] font-mono text-zinc-500">{editingModelIds.length} selected</div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingPkgId(null)} className="px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border border-white/10">Cancel</button>
                                    <button 
                                      onClick={() => {
                                        if (editingModelIds.length === 0) return alert('Select at least one model');
                                        handleUpdatePackage(pkg.id, editingModelIds);
                                        setEditingPkgId(null);
                                      }} 
                                      className="px-3 py-1.5 text-xs bg-white text-black hover:bg-zinc-200 uppercase font-bold tracking-wider transition-colors"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
