import { useState, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Camera,
  User,
  Wrench,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Globe,
  TrendingUp,
  Activity,
  Layers,
  Search,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  writeBatch,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/LanguageContext';
import { toast } from 'react-hot-toast';
import { RequestPasswordModal } from '../RequestPasswordModal';

export function AllInOneDashboard() {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [activePortalTab, setActivePortalTab] = useState<'CAMERA' | 'SERVICE' | 'VEHICLE'>('CAMERA');
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    
    // Subscribe to all 3 main collections
    const collections = [
      { name: 'service_requests', icon: Wrench, color: 'text-emerald-400' },
      { name: 'camera_requests', icon: Camera, color: 'text-purple-400' },
      { name: 'vehicle_requests', icon: Truck, color: 'text-blue-400' }
    ];

    const unsubscribes = collections.map(col => {
      const q = query(collection(db, col.name), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            collectionName: col.name,
            ...doc.data() 
          }))
          .filter((t: any) => !t.purgedByAllInOne);
        
        setAllTasks(prev => {
          const others = prev.filter(t => t.collectionName !== col.name);
          const merged = [...others, ...docs];
          
          // Deduplicate and sort
          return merged.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, col.name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [profile]);

  const portalTasks = allTasks.filter(t => {
    if (activePortalTab === 'CAMERA') return t.collectionName === 'camera_requests';
    if (activePortalTab === 'SERVICE') return t.collectionName === 'service_requests';
    if (activePortalTab === 'VEHICLE') {
      if (t.collectionName !== 'vehicle_requests') return false;
      // Check if this vehicle request is "linked" to a camera request (unified chain)
      const hasLinkedCamera = allTasks.some(ct => 
        ct.collectionName === 'camera_requests' && 
        (ct.eventTitle || ct.tripName) === (t.eventTitle || t.tripName)
      );
      // Only show standalone vehicle requests here; linked ones are handled in Camera tab
      return !hasLinkedCamera;
    }
    return false;
  }).filter(task => {
    const searchStr = `${task.eventTitle || task.tripName || task.workName || ''} ${task.requesterName || ''} ${task.hostName || ''} ${task.assignedTechnicianName || ''} ${task.assignedDriverName || ''} ${task.departmentName || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allTaskIdsInView = portalTasks.map(t => t.id);
      setSelectedIds(new Set(allTaskIdsInView));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (taskId: string) => {
    const next = new Set(selectedIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedIds(next);
  };

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isDeletePasswordModalOpen, setIsDeletePasswordModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', id?: string, col?: string } | null>(null);

  const handleDeleteSingle = (id: string, col: string) => {
    setDeleteTarget({ type: 'single', id, col });
    setIsDeletePasswordModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({ type: 'bulk' });
    setIsDeletePasswordModalOpen(true);
  };

  const executeSingleDelete = async (id: string, col: string) => {
    setLoading(true);
    try {
        await updateDoc(doc(db, col, id), { purgedByAllInOne: true });
        toast.success("Task archived successfully");
        setDeleteConfirmId(null);
    } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete task");
    } finally {
        setLoading(false);
    }
  };

  const executeBulkDelete = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      selectedIds.forEach(id => {
        const task = allTasks.find(t => t.id === id);
        if (task && task.collectionName) {
          batch.update(doc(db, task.collectionName, id), { purgedByAllInOne: true });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`${count} records deleted successfully`);
        setSelectedIds(new Set());
      } else {
        toast.error('No valid records found to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Bulk deletion failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'APPROVED': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'ASSIGNED': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'ACCEPTED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'IN_PROGRESS': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'COMPLETED': return 'bg-emerald-500 text-white border-emerald-600';
      default: return 'bg-dark-sidebar/50 text-dark-text-muted border-dark-border';
    }
  };

  return (
    <div className="space-y-3 p-3 lg:p-4 bg-dark-main min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-dark-border">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center shadow-lg relative group">
            <div className="absolute inset-0 bg-orange-500/20 blur-lg rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <Globe className="w-5 h-5 text-orange-400 relative z-10 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-black tracking-tighter uppercase leading-none">{t('all_in_one_portal')}</h1>
            <p className="text-dark-text-subtle mt-0.5 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('universal_workforce_registry')}
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Language Switcher */}
          <div className="flex bg-dark-card p-0.5 rounded-lg border border-dark-border shadow-inner mr-2">
            {(['en', 'om', 'am'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                  language === lang 
                    ? "bg-orange-500/20 text-orange-500 shadow-sm" 
                    : "text-dark-text-muted hover:text-orange-400"
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex bg-dark-card p-0.5 rounded-lg border border-dark-border shadow-inner">
            {(['CAMERA', 'SERVICE', 'VEHICLE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActivePortalTab(tab);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  activePortalTab === tab 
                    ? "bg-dark-accent text-white shadow-md shadow-dark-accent/20" 
                    : "text-dark-text-muted hover:text-dark-accent"
                )}
              >
                {tab === 'CAMERA' ? t('tab_camera') : tab === 'SERVICE' ? t('tab_repair') : t('tab_transport')}
              </button>
            ))}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-dark-text-subtle group-focus-within:text-dark-accent transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t('search_personnel_work')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full md:w-64 pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-xs text-black font-bold focus:ring-1 focus:ring-dark-accent/20 focus:border-dark-accent/40 outline-none transition-all placeholder:text-dark-text-muted/50 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('stat_total'), value: allTasks.filter(t => {
            if (t.collectionName === 'vehicle_requests') {
              return !allTasks.some(ct => ct.collectionName === 'camera_requests' && (ct.eventTitle || ct.tripName) === (t.eventTitle || t.tripName));
            }
            return true;
          }).length, icon: Activity, color: 'text-orange-400' },
          { label: t('tab_camera'), value: allTasks.filter(t => t.collectionName === 'camera_requests').length, icon: Camera, color: 'text-purple-400' },
          { label: t('tab_transport'), value: allTasks.filter(t => {
            if (t.collectionName !== 'vehicle_requests') return false;
            return !allTasks.some(ct => ct.collectionName === 'camera_requests' && (ct.eventTitle || ct.tripName) === (t.eventTitle || t.tripName));
          }).length, icon: Truck, color: 'text-blue-400' },
          { label: t('tab_repair'), value: allTasks.filter(t => t.collectionName === 'service_requests').length, icon: Wrench, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <motion.div
            key={`aio-stat-${i}-${stat.label}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-dark-card border border-dark-border p-3 rounded-lg shadow hover:border-dark-accent/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-dark-text-subtle uppercase tracking-widest">{stat.label}</p>
                <h4 className="text-lg font-black text-black mt-0.5 tracking-tighter">{stat.value}</h4>
              </div>
              <div className={cn("p-2 rounded-md bg-dark-main border border-dark-border group-hover:scale-105 transition-transform", stat.color)}>
                <stat.icon className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Registry Chart */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden transition-all duration-500",
          isFullscreen ? "fixed inset-0 z-[100] rounded-none border-none h-screen overflow-hidden flex flex-col" : "min-h-[300px]"
        )}
      >
        <div className="p-2 border-b border-dark-border bg-dark-sidebar/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-500/10 rounded-md text-orange-500">
              <Layers className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-[9px] font-black text-slate-950 uppercase tracking-widest leading-none">
                {activePortalTab === 'CAMERA' ? t('camera_coverage_registry') : activePortalTab === 'SERVICE' ? t('repair_service_registry') : t('transport_registry')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-dark-main rounded-md text-dark-text-subtle hover:text-dark-accent transition-colors flex items-center gap-1.5 group border border-transparent hover:border-dark-border"
              title={isCollapsed ? t('expand_registry') : t('collapse_registry')}
            >
              {isCollapsed ? <Maximize2 className="w-3.5 h-3.5 rotate-45" /> : <Minimize2 className="w-3.5 h-3.5 rotate-45" />}
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">{isCollapsed ? t('expand_registry') : t('collapse_registry')}</span>
            </button>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                {!showConfirmDelete ? (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete ({selectedIds.size})
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                    <button
                      onClick={handleBulkDelete}
                      disabled={loading}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      CONFIRM PURGE
                    </button>
                    <button
                      onClick={() => {
                        setShowConfirmDelete(false);
                      }}
                      className="px-2 py-1 bg-dark-sidebar text-dark-text-subtle hover:text-white rounded-md text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-dark-main rounded-md text-dark-text-subtle hover:text-dark-accent transition-colors flex items-center gap-1.5 group border border-transparent hover:border-dark-border"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">{isFullscreen ? t('exit_fullscreen') : t('enter_fullscreen')}</span>
            </button>

            {/* Zoom Controls */}
            {!isCollapsed && (
              <div className="flex items-center gap-1 bg-dark-main border border-dark-border rounded-lg p-0.5 shadow-inner select-none">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
                  disabled={zoomLevel <= 60}
                  className="p-1 text-dark-text-subtle hover:text-dark-accent disabled:opacity-40 transition-colors cursor-pointer"
                  title={t('zoom_out', 'Zoom Out')}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="px-1.5 text-[9px] font-mono font-black text-slate-800 uppercase tracking-tighter hover:text-dark-accent transition-colors cursor-pointer"
                  title={t('reset_zoom', 'Reset Zoom')}
                >
                  {zoomLevel}%
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
                  disabled={zoomLevel >= 150}
                  className="p-1 text-dark-text-subtle hover:text-dark-accent disabled:opacity-40 transition-colors cursor-pointer"
                  title={t('zoom_in', 'Zoom In')}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              style={{ zoom: zoomLevel / 100 }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "overflow-x-auto scrollbar-hide",
                isFullscreen ? "flex-1 overflow-y-auto" : ""
              )}
            >
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-dark-header sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 border-b border-dark-border w-8">
                      <input 
                        type="checkbox"
                        className="w-3 h-3 rounded border-dark-border bg-dark-main focus:ring-dark-accent"
                        onChange={handleSelectAll}
                        checked={portalTasks.length > 0 && Array.from(selectedIds).length >= portalTasks.length}
                      />
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border">{t('col_no')}</th>
                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border">{t('col_title_location')}</th>
                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border">{t('col_requester')}</th>
                    
                    {activePortalTab === 'CAMERA' && (
                      <>
                        <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-purple-400/80">{t('col_assigned_camera')}</th>
                        <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-blue-400/80">{t('col_assigned_driver')}</th>
                      </>
                    )}
                    
                    {activePortalTab === 'SERVICE' && (
                      <>
                        <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-emerald-400/80">{t('col_assigned_tech')}</th>
                      </>
                    )}
                    
                    {activePortalTab === 'VEHICLE' && (
                      <>
                        <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-blue-400/80">{t('col_assigned_driver')}</th>
                      </>
                    )}

                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-center">{t('col_status')}</th>
                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-center">Delete</th>
                    <th className="px-3 py-2 text-[9px] font-black text-dark-text-muted uppercase tracking-widest border-b border-dark-border text-right">{t('col_schedule')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {portalTasks.map((task, idx) => (
                    <tr 
                      key={`aio-task-${task.id || idx}`}
                      className={cn(
                        "group transition-all hover:bg-dark-main/30 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        selectedIds.has(task.id) ? "bg-dark-accent/5" : ""
                      )}
                    >
                      <td className="px-3 py-1">
                        <input 
                          type="checkbox"
                          checked={selectedIds.has(task.id)}
                          onChange={() => handleToggleSelect(task.id)}
                          className="w-3 h-3 rounded border-dark-border bg-dark-main focus:ring-dark-accent"
                        />
                      </td>
                      <td className="px-3 py-1 font-mono text-[8px] text-dark-accent font-black">{idx + 1}</td>
                      <td className="px-3 py-1">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight group-hover:text-dark-accent transition-colors leading-tight">
                            {task.eventTitle || task.tripName || task.workName || t('unnamed_request')}
                          </span>
                          <div className="flex items-center gap-1 text-dark-text-muted">
                            <MapPin className="w-1.5 h-1.5" />
                            <span className="text-[7px] font-bold uppercase">{task.location || task.destination || t('on_site')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1 font-bold text-slate-900 text-[9px] uppercase whitespace-nowrap">
                        {task.hostName || task.requesterName || 'N/A'}
                      </td>
                      
                      {activePortalTab === 'CAMERA' && (
                        <>
                          <td className="px-3 py-1">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-950 uppercase leading-none">{task.assignedTechnicianName || task.assignedAgentName || task.assignedDriverName || t('pending_label')}</span>
                              <span className="text-[7px] font-mono text-dark-accent/70 font-bold">{task.assignedTechnicianPhone || task.assignedAgentPhone || task.assignedDriverPhone || ''}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1">
                            {(() => {
                              const linkedVehicle = allTasks.find(t => 
                                t.collectionName === 'vehicle_requests' && 
                                (t.eventTitle || t.tripName) === (task.eventTitle || task.tripName) &&
                                t.id !== task.id // Ensure we don't find self if they were same (unlikely but good practice)
                              );
                              return (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-950 uppercase leading-none">{linkedVehicle?.assignedDriverName || t('pending_label')}</span>
                                  <span className="text-[7px] font-mono text-dark-accent/70 font-bold">{linkedVehicle?.assignedDriverPhone || ''}</span>
                                </div>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {activePortalTab === 'SERVICE' && (
                        <td className="px-3 py-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-950 uppercase leading-none">{task.assignedTechnicianName || t('pending_label')}</span>
                            <span className="text-[7px] font-mono text-dark-accent/70 font-bold">{task.assignedTechnicianPhone || ''}</span>
                          </div>
                        </td>
                      )}

                      {activePortalTab === 'VEHICLE' && (
                        <td className="px-3 py-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-950 uppercase leading-none">{task.assignedDriverName || t('pending_label')}</span>
                            <span className="text-[7px] font-mono text-dark-accent/70 font-bold">{task.assignedDriverPhone || ''}</span>
                          </div>
                        </td>
                      )}

                      <td className="px-3 py-1 text-center">
                        <span className={cn(
                          "px-1.5 py-0 rounded text-[7px] font-black uppercase tracking-widest border",
                          getStatusStyle(task.status)
                        )}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingle(task.id, task.collectionName);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all shadow-sm",
                              deleteConfirmId === task.id ? "bg-rose-500 border border-rose-500 text-white animate-pulse" : "text-rose-500 hover:bg-rose-500/10 border border-transparent"
                            )}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-3 py-1 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-0.5 text-dark-text-muted">
                            <Clock className="w-1.5 h-1.5" />
                            <span className="text-[8px] font-mono font-bold">
                              {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'dd/MM/yy') : '--/--/--'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {portalTasks.length === 0 && !loading && (
                    <tr>
                      <td colSpan={10} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-dark-sidebar flex items-center justify-center">
                            <Search className="w-8 h-8 text-dark-text-muted opacity-20" />
                          </div>
                          <p className="text-dark-text-subtle font-serif italic text-sm">
                            {t('no_vectors')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <RequestPasswordModal 
         isOpen={isDeletePasswordModalOpen}
         onClose={() => setIsDeletePasswordModalOpen(false)}
         expectedPassword="123"
         onAuthenticated={() => {
            setIsDeletePasswordModalOpen(false);
            if (deleteTarget) {
              if (deleteTarget.type === 'single' && deleteTarget.id && deleteTarget.col) {
                executeSingleDelete(deleteTarget.id, deleteTarget.col);
              } else if (deleteTarget.type === 'bulk') {
                executeBulkDelete();
              }
            }
         }}
      />
    </div>
  );
}
