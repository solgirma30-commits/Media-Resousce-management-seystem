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
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/LanguageContext';
import { toast } from 'react-hot-toast';

export function AllInOneDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [activePortalTab, setActivePortalTab] = useState<'CAMERA' | 'SERVICE' | 'VEHICLE'>('CAMERA');
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        const docs = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          collectionName: col.name,
          ...doc.data() 
        }));
        
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
    if (activePortalTab === 'VEHICLE') return t.collectionName === 'vehicle_requests';
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      selectedIds.forEach(id => {
        const task = allTasks.find(t => t.id === id);
        if (task && task.collectionName) {
          batch.delete(doc(db, task.collectionName, id));
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
    <div className="space-y-8 p-6 lg:p-10 bg-dark-main min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-dark-border">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center shadow-2xl shadow-orange-500/10 relative group">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <Globe className="w-8 h-8 text-orange-400 relative z-10 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tighter uppercase leading-none">ALL IN ONE PORTAL</h1>
            <p className="text-dark-text-subtle mt-2 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Universal Workforce Registry & Assignment Intelligence
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <div className="flex bg-dark-card p-1 rounded-xl border border-dark-border shadow-inner">
            {(['CAMERA', 'SERVICE', 'VEHICLE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActivePortalTab(tab);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activePortalTab === tab 
                    ? "bg-dark-accent text-white shadow-lg shadow-dark-accent/20" 
                    : "text-dark-text-muted hover:text-dark-accent"
                )}
              >
                {tab === 'CAMERA' ? 'Camera Ops' : tab === 'SERVICE' ? 'Technical Services' : 'Logistic Flows'}
              </button>
            ))}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-dark-text-subtle group-focus-within:text-dark-accent transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by personnel, work, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full md:w-80 pl-11 pr-4 py-3 bg-dark-card border border-dark-border rounded-xl text-xs text-black font-bold focus:ring-2 focus:ring-dark-accent/20 focus:border-dark-accent/40 outline-none transition-all placeholder:text-dark-text-muted/50 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Registry', value: allTasks.length, icon: Activity, color: 'text-orange-400' },
          { label: 'Camera Services', value: allTasks.filter(t => t.collectionName === 'camera_requests').length, icon: Camera, color: 'text-purple-400' },
          { label: 'Logistic Flows', value: allTasks.filter(t => t.collectionName === 'vehicle_requests').length, icon: Truck, color: 'text-blue-400' },
          { label: 'Technical Jobs', value: allTasks.filter(t => t.collectionName === 'service_requests').length, icon: Wrench, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-lg hover:border-dark-accent/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">{stat.label}</p>
                <h4 className="text-2xl font-black text-black mt-2 tracking-tighter">{stat.value}</h4>
              </div>
              <div className={cn("p-3 rounded-xl bg-dark-main border border-dark-border group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon className="w-5 h-5" />
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
          "bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden transition-all duration-500",
          isFullscreen ? "fixed inset-0 z-[100] rounded-none border-none h-screen overflow-hidden flex flex-col" : "min-h-[600px]"
        )}
      >
        <div className="p-6 border-b border-dark-border bg-dark-sidebar/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">
                {activePortalTab === 'CAMERA' ? 'Camera Coverage' : activePortalTab === 'SERVICE' ? 'Technical Service & Repair' : 'Logistics & Transportation'} Registry
              </h3>
              <p className="text-[10px] text-dark-text-subtle mt-0.5 font-medium uppercase tracking-tight">Relational view of assignments and personnel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                {!showConfirmDelete ? (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete ({selectedIds.size})
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mr-2">Confirm?</span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={loading}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-3 py-1.5 bg-dark-sidebar text-dark-text-subtle hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-dark-main rounded-lg text-dark-text-subtle hover:text-dark-accent transition-colors flex items-center gap-2 group border border-transparent hover:border-dark-border"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Normal View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Fullscreen Chart</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className={cn(
          "overflow-x-auto scrollbar-hide",
          isFullscreen ? "flex-1 overflow-y-auto" : ""
        )}>
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-dark-header sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5 border-b border-dark-border w-10">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-dark-border bg-dark-main focus:ring-dark-accent"
                    onChange={handleSelectAll}
                    checked={portalTasks.length > 0 && Array.from(selectedIds).length >= portalTasks.length}
                  />
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">No</th>
                <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Title / Location</th>
                <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Requester</th>
                
                {activePortalTab === 'CAMERA' && (
                  <>
                    <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-purple-400">Assigned Camera Man</th>
                    <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-blue-400">Assigned Driver</th>
                  </>
                )}
                
                {activePortalTab === 'SERVICE' && (
                  <>
                    <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-emerald-400">Assigned Technician</th>
                    <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-blue-400">Assigned Driver</th>
                  </>
                )}
                
                {activePortalTab === 'VEHICLE' && (
                  <>
                    <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-blue-400">Assigned Driver</th>
                  </>
                )}

                <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest border-b border-dark-border text-right">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {portalTasks.map((task, idx) => (
                <tr 
                  key={task.id}
                  className={cn(
                    "group transition-all hover:bg-dark-main/30 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    selectedIds.has(task.id) ? "bg-dark-accent/5" : ""
                  )}
                >
                  <td className="px-6 py-6">
                    <input 
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => handleToggleSelect(task.id)}
                      className="w-4 h-4 rounded border-dark-border bg-dark-main focus:ring-dark-accent"
                    />
                  </td>
                  <td className="px-6 py-6 font-mono text-[10px] text-dark-accent font-black">{idx + 1}</td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-bold text-slate-800 uppercase tracking-tight group-hover:text-dark-accent transition-colors">
                        {task.eventTitle || task.tripName || task.workName || 'Unnamed Request'}
                      </span>
                      <div className="flex items-center gap-2 text-dark-text-muted">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-bold uppercase">{task.location || task.destination || 'On-Site'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-bold text-slate-900 text-[11px] uppercase">
                    {task.hostName || task.requesterName || 'N/A'}
                  </td>
                  
                  {activePortalTab === 'CAMERA' && (
                    <>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-950 uppercase">{task.assignedTechnicianName || task.assignedAgentName || 'PENDING'}</span>
                          <span className="text-[9px] font-mono text-dark-accent/70 font-bold">{task.assignedTechnicianPhone || task.assignedAgentPhone || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-950 uppercase">{task.assignedDriverName || 'N/A'}</span>
                          <span className="text-[9px] font-mono text-dark-accent/70 font-bold">{task.assignedDriverPhone || ''}</span>
                        </div>
                      </td>
                    </>
                  )}

                  {activePortalTab === 'SERVICE' && (
                    <>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-950 uppercase">{task.assignedTechnicianName || 'PENDING'}</span>
                          <span className="text-[9px] font-mono text-dark-accent/70 font-bold">{task.assignedTechnicianPhone || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-950 uppercase">{task.assignedDriverName || '---'}</span>
                          <span className="text-[9px] font-mono text-dark-accent/70 font-bold">{task.assignedDriverPhone || ''}</span>
                        </div>
                      </td>
                    </>
                  )}

                  {activePortalTab === 'VEHICLE' && (
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-950 uppercase">{task.assignedDriverName || 'PENDING'}</span>
                        <span className="text-[9px] font-mono text-dark-accent/70 font-bold">{task.assignedDriverPhone || ''}</span>
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-6 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border",
                      getStatusStyle(task.status)
                    )}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-dark-text-muted">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-mono font-bold">
                          {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'dd/MM/yyyy') : '--/--/--'}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-dark-accent/70 uppercase">
                        {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'HH:mm:ss') : 'WAITING...'}
                      </span>
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
                        No operational vectors found for this category.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
