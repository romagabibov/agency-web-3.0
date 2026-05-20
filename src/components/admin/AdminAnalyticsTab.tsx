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
    <div className="max-w-7xl mx-auto px-6 pt-8 flex-grow w-full">
      {/* Notifications Panel */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 mb-8">
        <h3 className="text-lg font-black uppercase text-white mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-yellow-500"/> Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{t.system_logs}</h4>
            {notifications.length === 0 ? <p className="text-sm text-zinc-600">No logs</p> : notifications.map((n, i) => (
              <div key={`${n.id || i}-notif`} className="text-xs text-zinc-300 mb-3 border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${n.type === 'error' ? 'bg-red-500' : n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                  <strong className="text-white text-sm">{n.message}</strong>
                </div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{new Date(n.date).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{t.contract_expiring}</h4>
            {expiringContracts.length === 0 ? <p className="text-sm text-zinc-600">{t.no_alerts}</p> : expiringContracts.map((m, i) => (
              <div key={`${m.id}-${i}-contract`} className="text-sm text-white mb-2 flex justify-between items-center"><span>{m.name}</span> <span className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded-md">{daysLeft(m.expiry)} days</span></div>
            ))}
          </div>
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{t.payment_expiring}</h4>
            {expiringPayments.length === 0 ? <p className="text-sm text-zinc-600">{t.no_alerts}</p> : expiringPayments.map((m, i) => (
              <div key={`${m.id}-${i}-pay`} className="text-sm text-white mb-2 flex justify-between items-center"><span>{m.name}</span> <span className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded-md">{daysLeft(m.payExpiry)} days</span></div>
            ))}
          </div>
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{t.recent_pass_changes}</h4>
            {recentPassChanges.length === 0 ? <p className="text-sm text-zinc-600">No recent changes</p> : recentPassChanges.slice().reverse().map((m, i) => {
              const lastChange = m.passHistory![m.passHistory!.length - 1];
              return (
                <div key={`${m.id}-${i}-pass`} className="text-xs text-zinc-300 mb-3 border-b border-white/5 pb-2 last:border-0">
                  <strong className="text-white text-sm block mb-1">{m.name}</strong>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-zinc-500">Old:</span> <span className="line-through text-zinc-400">{lastChange.old}</span>
                    <span className="text-zinc-500">New:</span> <span className="text-green-400 font-bold">{lastChange.new}</span>
                  </div>
                  <div className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest">{new Date(lastChange.date).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Shared Link Statistics Panel */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 mb-8">
        <h3 className="text-lg font-black uppercase text-white mb-4 flex items-center gap-2"><Share2 size={20} className="text-blue-500"/> Shared Link Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-black/50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">Link / Date</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Most Viewed Model</th>
                <th className="px-4 py-3">Total Likes</th>
                <th className="px-4 py-3">Longest Viewed Model</th>
                <th className="px-4 py-3 rounded-tr-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sharedPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">No shared links found</td>
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
                    <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white mb-1 flex flex-col gap-2">
                          <div className="flex xl:items-center gap-2 flex-col xl:flex-row items-start">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setExpandedPkgId(expandedPkgId === pkg.id ? null : pkg.id)} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                                {expandedPkgId === pkg.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                              </button>
                              
                              {editingTitleId === pkg.id ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    autoFocus
                                    type="text" 
                                    className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-white w-48"
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
                                  }} className="text-green-500 hover:text-green-400 p-1"><Check size={14} /></button>
                                  <button onClick={() => setEditingTitleId(null)} className="text-red-500 hover:text-red-400 p-1"><X size={14} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{pkg.title || `Package ${pkg.id}`}</span>
                                  {handleUpdatePackageTitle && (
                                    <button onClick={() => {
                                      setEditingTitleId(pkg.id);
                                      setEditingTitleVal(pkg.title || '');
                                    }} className="text-zinc-500 hover:text-white p-1">
                                      <Edit2 size={12}/>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <a href={`${window.location.origin}/package/${pkg.id}`} target="_blank" rel="noreferrer" className="hover:underline text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded ml-8 xl:ml-2">
                              {window.location.origin}/package/{pkg.id}
                            </a>
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest pl-8">{new Date(pkg.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">{pkg.views || 0}</td>
                      <td className="px-4 py-3">{mostViewedModel}</td>
                      <td className="px-4 py-3 font-bold text-white">{String(totalLikes)}</td>
                      <td className="px-4 py-3">{longestViewedModel}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {handleUpdatePackage && (
                            <button 
                              onClick={() => {
                                setExpandedPkgId(pkg.id);
                                setEditingPkgId(pkg.id);
                                setEditingModelIds(pkg.modelIds || []);
                                setPkgModelSearch('');
                              }}
                              className="text-blue-500 hover:text-blue-400 p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Edit models"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete link and reset stats"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPkgId === pkg.id && (
                      <tr className="bg-black/20 border-b border-white/5">
                        <td colSpan={6} className="px-8 py-6">
                          <div className="flex justify-between items-start flex-col xl:flex-row gap-8">
                            <div className="flex-1 w-full">
                              <h5 className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mb-4">Model Statistics for Link</h5>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {(pkg.modelIds || []).map((mId: string, index: number) => {
                                  const m = models.find(x => x.id === mId);
                                  const mName = m ? m.name : mId;
                                  const mViews = pkg.modelViews?.[mId] || 0;
                                  const mTime = pkg.timeSpent?.[mId] || 0;
                                  const mLikes = pkg.likes?.[mId] || 0;
                                  
                                  return (
                                    <div key={`${mId}-${index}`} className="bg-white/5 rounded-xl p-3 flex justify-between items-center text-sm border border-white/5">
                                      <div className="font-bold text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                                          {m && m.mainImg ? <img src={m.mainImg} alt="" className="w-full h-full object-cover"/> : null}
                                        </div>
                                        {mName}
                                      </div>
                                      <div className="flex gap-4 text-xs items-center">
                                        <span title="Views" className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded"><span className="opacity-50">👁</span> {mViews}</span>
                                        <span title="Time Spent" className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded"><span className="opacity-50">⏱</span> {formatSeconds(mTime)}</span>
                                        <span title="Likes" className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded"><span className="opacity-50">♥</span> {mLikes}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {editingPkgId === pkg.id && handleUpdatePackage && (
                              <div className="w-full xl:w-96 bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl xl:sticky xl:top-4">
                                <h5 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Edit Models in Link</h5>
                                <div className="mb-4">
                                  <input 
                                    type="text"
                                    placeholder="Search models..."
                                    value={pkgModelSearch}
                                    onChange={(e) => setPkgModelSearch(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                                  />
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                  {models.filter(m => (m.name || '').toLowerCase().includes(pkgModelSearch.toLowerCase())).map((m, i) => {
                                    const isSelected = editingModelIds.includes(m.id);
                                    return (
                                      <div key={`${m.id}-${i}-edit`} className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                                            {m.mainImg && <img src={m.mainImg} alt="" className="w-full h-full object-cover"/>}
                                          </div>
                                          <span className={`text-sm ${isSelected ? 'text-blue-50 font-medium' : 'text-zinc-400'}`}>{m.name}</span>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            if (isSelected) {
                                              setEditingModelIds(prev => prev.filter(id => id !== m.id));
                                            } else {
                                              setEditingModelIds(prev => [...prev, m.id]);
                                            }
                                          }}
                                          className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-red-500/20 text-red-500 hover:bg-red-500/40' : 'bg-green-500/20 text-green-500 hover:bg-green-500/40'}`}
                                        >
                                          {isSelected ? <X size={14}/> : <Plus size={14}/>}
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                  <div className="text-xs text-zinc-500">{editingModelIds.length} selected</div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingPkgId(null)} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">Cancel</button>
                                    <button 
                                      onClick={() => {
                                        if (editingModelIds.length === 0) return alert('Select at least one model');
                                        handleUpdatePackage(pkg.id, editingModelIds);
                                        setEditingPkgId(null);
                                      }} 
                                      className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-colors"
                                    >
                                      Save Link
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
