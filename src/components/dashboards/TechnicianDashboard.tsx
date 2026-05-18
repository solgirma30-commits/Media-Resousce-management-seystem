import { useState, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Truck,
  Check,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Phone,
  X,
  User,
  Wrench,
  Camera,
  Trash2,
  Archive,
  BarChart3,
  CheckCircle,
  Activity,
  Layers
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc,
  serverTimestamp,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export function TechnicianDashboard() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Role-based portal configuration
  const portalConfig = React.useMemo(() => {
    switch (profile?.role) {
      case 'CAMERAMAN':
        return { 
          title: 'FMC CAMERA PORTAL', 
          subtitle: 'Media & Event Coverage Node', 
          collection: 'camera_requests', 
          idField: 'assignedTechnicianId',
          icon: Camera,
          accent: 'text-purple-400',
          bg: 'bg-purple-500/10'
        };
      case 'DRIVER':
        return { 
          title: 'FMC DRIVER PORTAL', 
          subtitle: 'Logistics & Transport Node', 
          collection: 'vehicle_requests', 
          idField: 'assignedDriverId',
          icon: Truck,
          accent: 'text-blue-400',
          bg: 'bg-blue-500/10'
        };
      default:
        return { 
          title: 'FMC ENGINEERS PORTAL', 
          subtitle: 'Maintenance & Service Node', 
          collection: 'service_requests', 
          idField: 'assignedTechnicianId',
          icon: Wrench,
          accent: 'text-emerald-400',
          bg: 'bg-emerald-500/10'
        };
    }
  }, [profile?.role]);

  const [selectedWork, setSelectedWork] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedWork) {
      const colName = selectedWork.collectionName || 'service_requests';
      const initialNotes = colName === 'vehicle_requests' 
        ? selectedWork.driverNotes 
        : selectedWork.technicianNotes;
      setNotes(initialNotes || '');
      setPreviewUrl(selectedWork.completionImageUrl || null);
    } else {
      setNotes('');
      setPreviewUrl(null);
    }
  }, [selectedWork?.id]);

  useEffect(() => {
    if (!profile) return;

    const path = portalConfig.collection;
    const q = query(collection(db, path), where(portalConfig.idField, '==', profile.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((doc: any) => ({ 
          id: doc.id, 
          collectionName: path,
          ...doc.data() 
        }))
        .filter((doc: any) => !doc.technicianArchived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setAssignments(docs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));

    const fleetPath = 'fleet';
    const unsubscribeFleet = onSnapshot(collection(db, fleetPath), (snapshot) => {
      setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, fleetPath));

    return () => {
      unsubscribe();
      unsubscribeFleet();
    };
  }, [profile, portalConfig]);

  // Analytics Calculations
  const stats = React.useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter(a => ['ACCEPTED', 'IN_PROGRESS'].includes(a.status)).length;
    const pending = assignments.filter(a => a.status === 'ASSIGNED').length;
    const finalized = assignments.filter(a => ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(a.status)).length;

    const chartData = [
      { name: 'Pending', value: pending, color: '#6366f1' },
      { name: 'Active', value: active, color: '#f59e0b' },
      { name: 'Finalized', value: finalized, color: '#10b981' }
    ].filter(d => d.value > 0);

    return { total, active, pending, finalized, chartData };
  }, [assignments]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 storage
      toast.error('Image too large. Please use a smaller photo (under 1MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateStatus = async (requestId: string, status: string) => {
    if (!selectedWork) return;
    const colName = selectedWork.collectionName || 'service_requests';
    const path = `${colName}/${requestId}`;
    try {
      const update: any = {
        status,
        updatedAt: serverTimestamp(),
      };
      
      if (status === 'COMPLETED') {
        update.completedAt = serverTimestamp();
        update.technicianArchived = true; // Auto-archive from technician log
        // Use appropriate field based on request type
        if (colName === 'vehicle_requests') {
          update.driverNotes = notes;
        } else {
          update.technicianNotes = notes;
        }
        update.completionImageUrl = previewUrl;
      }

      await updateDoc(doc(db, colName, requestId), update);
      
      // Create notification for admins and director
      if (status === 'COMPLETED') {
        const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN')));
        const adminPromises = adminsSnapshot.docs.map(adminDoc => {
          const notificationId = `notif_${Date.now()}_${adminDoc.id}`;
          return setDoc(doc(db, 'notifications', notificationId), {
            userId: adminDoc.id,
            title: colName === 'vehicle_requests' ? 'Trip Completed' : 
                   colName === 'camera_requests' ? 'Coverage Finished' : 'Repairs Completed',
            message: `${profile?.displayName} has completed work on ${colName.replace('_', ' ')} #${requestId.slice(-6).toUpperCase()}`,
            read: false,
            type: 'COMPLETION',
            requestId: requestId,
            createdAt: serverTimestamp(),
          });
        });

        // Notify the specific director who placed the request
        if (selectedWork.directorId) {
          const dirNotifId = `notif_${Date.now()}_dir_${selectedWork.directorId}`;
          const dirPromise = setDoc(doc(db, 'notifications', dirNotifId), {
            userId: selectedWork.directorId,
            title: 'Operation Finalized',
            message: `Your request #${requestId.slice(-6).toUpperCase()} has been completed by ${profile?.displayName}.`,
            read: false,
            type: 'COMPLETION',
            requestId: requestId,
            createdAt: serverTimestamp(),
          });
          adminPromises.push(dirPromise);
        }

        await Promise.all(adminPromises);
      }

      const toastMsg = status === 'COMPLETED' ? 'Operation Finished & Reported' : `Status: ${status.replace('_', ' ')}`;
      toast.success(toastMsg);
      if (status === 'COMPLETED') {
        setSelectedWork(prev => prev?.id === requestId ? { 
          ...prev, 
          status, 
          technicianNotes: colName === 'vehicle_requests' ? undefined : notes,
          driverNotes: colName === 'vehicle_requests' ? notes : undefined
        } : prev);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedWork || !notes) return;
    setSaving(true);
    const colName = selectedWork.collectionName || 'service_requests';
    const path = `${colName}/${selectedWork.id}`;
    try {
      const update: any = {
        updatedAt: serverTimestamp(),
      };
      if (colName === 'vehicle_requests') {
        update.driverNotes = notes;
      } else {
        update.technicianNotes = notes;
      }
      await updateDoc(doc(db, colName, selectedWork.id), update);
      toast.success('Work log synchronized');
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleClearWork = async (work: any) => {
    if (!['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(work.status)) {
      toast.error('Only finished tasks can be cleared from this log');
      return;
    }

    try {
      const colName = work.collectionName || 'service_requests';
      await updateDoc(doc(db, colName, work.id), {
        technicianArchived: true
      });
      toast.success('Assignment archived from active view');
      if (selectedWork?.id === work.id) setSelectedWork(null);
    } catch (_error) {
      toast.error('Failed to clear assignment');
    }
  };

  const handleClearFinished = async () => {
    const finished = assignments.filter(a => ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(a.status));
    if (finished.length === 0) {
      toast.error('No finished assignments to clear');
      return;
    }

    const confirm = window.confirm(`Clear ${finished.length} finished assignments from your log?`);
    if (!confirm) return;

    try {
      const promises = finished.map(work => {
        const colName = (work.collectionName as string) || 'service_requests';
        return updateDoc(doc(db, colName, work.id), {
          technicianArchived: true
        });
      });
      await Promise.all(promises);
      toast.success('Operational log cleared of finished items');
      setSelectedWork(null);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (_error) {
      toast.error('Failed to clear log completely');
    }
  };

  const handleClearSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No assignments selected');
      return;
    }

    const confirm = window.confirm(`Clear ${selectedIds.size} selected assignments from your log?`);
    if (!confirm) return;

    try {
      const promises = Array.from(selectedIds).map((id: string) => {
        const work = assignments.find(a => a.id === id);
        if (!work) return Promise.resolve();
        const collectionName = (work.collectionName as string) || 'service_requests';
        const docRef = doc(db, collectionName, id);
        return updateDoc(docRef, {
          technicianArchived: true
        });
      });
      await Promise.all(promises);
      toast.success(`${selectedIds.size} items cleared from log`);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setSelectedWork(null);
    } catch (_error) {
      toast.error('Failed to clear selected items');
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-200">
      <div className="flex items-center justify-between px-2">
          <div>
            <h1 className="text-3xl font-medium text-white tracking-tight uppercase">{portalConfig.title}</h1>
            <p className="text-dark-text-subtle mt-1 font-serif italic uppercase tracking-widest text-[10px] font-black">{profile?.displayName} • {portalConfig.subtitle}</p>
          </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-dark-card px-4 py-2 rounded-lg border border-dark-border items-center gap-3 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse"></div>
            <span className="text-[10px] font-black text-dark-text-muted uppercase tracking-widest">Network Synchronized</span>
          </div>
        </div>
      </div>

      {/* Analytics Stats Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-dark-accent/5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-dark-main border border-dark-border flex items-center justify-center text-dark-accent">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Total Requests</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.total.toString().padStart(2, '0')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-dark-main border border-dark-border flex items-center justify-center text-amber-500">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Active Task</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.active.toString().padStart(2, '0')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-dark-main border border-dark-border flex items-center justify-center text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Pending Sync</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.pending.toString().padStart(2, '0')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-dark-main border border-dark-border flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Finalized</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.finalized.toString().padStart(2, '0')}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Finalized Chart & Distribution */}
      {stats.total > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-dark-accent" />
              Operational Cycle Chart
            </h3>
            <div className="flex items-center gap-4">
              {stats.chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-mono text-dark-text-subtle uppercase">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-8">
              <div className="space-y-6">
                {stats.chartData.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.name} Lifecycle</span>
                      <span className="text-[10px] font-mono text-dark-text-subtle">{Math.round((item.value / stats.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-dark-main h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / stats.total) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Assignment Queue Sidebar / List */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-3 h-3" />
                {portalConfig.collection === 'service_requests' ? 'Service Log' : 'Operational Assignments'}
              </h3>
            <div className="flex items-center gap-2">
              {assignments.some(a => ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(a.status)) && (
                <div className="flex items-center gap-1">
                   {isSelectMode ? (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        <button 
                          onClick={handleClearSelected}
                          disabled={selectedIds.size === 0}
                          className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest px-2 py-1 flex items-center gap-1 transition-colors disabled:opacity-30"
                        >
                          Clear ({selectedIds.size})
                        </button>
                        <button 
                          onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                          className="text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest px-2 py-1"
                        >
                          Cancel
                        </button>
                     </div>
                   ) : (
                     <button 
                        onClick={() => setIsSelectMode(true)}
                        className="text-[9px] font-black text-dark-accent hover:text-indigo-300 uppercase tracking-widest px-2 py-1 flex items-center gap-1 transition-colors"
                      >
                        Select
                      </button>
                   )}
                   {!isSelectMode && (
                     <button 
                        onClick={handleClearFinished}
                        className="text-[9px] font-black text-red-500/80 hover:text-red-400 uppercase tracking-widest px-1 py-1 flex items-center gap-1 transition-colors"
                        title="Clear all finished"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                   )}
                </div>
              )}
              <span className="bg-dark-accent/20 text-dark-accent text-[9px] font-black px-2 py-0.5 rounded-full border border-dark-accent/20">
                {assignments.length} ACTIVE
              </span>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] scrollbar-hide pr-1">
            {loading ? (
              <div className="py-8 text-center text-[10px] uppercase font-black tracking-widest text-dark-text-subtle animate-pulse">Scanning Frequency...</div>
            ) : assignments.length === 0 ? (
              <div className="py-12 px-6 text-center bg-dark-card/50 rounded-xl border border-dark-border border-dashed">
                <p className="text-dark-text-subtle text-[10px] font-black uppercase tracking-widest">No Active Vectors Found</p>
              </div>
            ) : (
              assignments.map((work) => (
                <motion.div
                  layout
                  key={work.id}
                  onClick={() => isSelectMode ? null : setSelectedWork(work)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer group relative",
                    selectedWork?.id === work.id 
                      ? "bg-dark-sidebar border-dark-accent ring-1 ring-dark-accent/10" 
                      : "bg-dark-card border-dark-border hover:border-dark-text-muted/30",
                    isSelectMode && selectedIds.has(work.id) && "border-dark-accent ring-1 ring-dark-accent/10 bg-dark-sidebar/40"
                  )}
                >
                  {isSelectMode && ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(work.status) && (
                    <div 
                      onClick={(e) => toggleSelect(work.id, e)}
                      className={cn(
                        "absolute top-4 left-4 w-4 h-4 rounded border flex items-center justify-center transition-all z-20",
                        selectedIds.has(work.id) ? "bg-dark-accent border-dark-accent" : "bg-dark-main border-dark-border"
                      )}
                    >
                      {selectedIds.has(work.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  )}
                  <div className={cn("transition-all", isSelectMode && ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(work.status) ? "pl-8" : "")}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {work.collectionName === 'camera_requests' ? <Camera className="w-2.5 h-2.5 text-purple-400" /> : 
                         work.collectionName === 'vehicle_requests' ? <Truck className="w-2.5 h-2.5 text-blue-400" /> : 
                         <Wrench className="w-2.5 h-2.5 text-emerald-400" />}
                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded", getStatusStyle(work.status))}>
                          {work.status === 'COMPLETED' ? 'FINISHED' : work.status}
                        </span>
                        {!isSelectMode && ['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(work.status) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearWork(work);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Archive className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-dark-text-subtle">#{work.id.slice(-4).toUpperCase()}</span>
                    </div>
                    <h4 className={cn("text-xs font-medium truncate mb-2", selectedWork?.id === work.id ? "text-white" : "text-slate-300")}>
                      {work.collectionName === 'camera_requests' ? work.eventTitle : 
                       work.collectionName === 'vehicle_requests' ? work.destination : 
                       work.description}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] text-dark-text-subtle font-mono">
                      <MapPin className="w-2.5 h-2.5 text-dark-accent" />
                      {work.location || work.destination}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Task Detail View */}
        <div className="md:col-span-8 lg:col-span-9">
          <AnimatePresence mode="wait">
            {!selectedWork ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] bg-dark-card/40 rounded-2xl border border-dark-border border-dashed flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-dark-main/50 border border-dark-border flex items-center justify-center mb-6">
                  <Truck className="w-8 h-8 text-dark-text-subtle/40" />
                </div>
                <h3 className="text-xl font-medium text-slate-400">Select Task from Assigned List</h3>
                <p className="text-dark-text-subtle text-[10px] uppercase font-black tracking-widest mt-2">Initialize communication with the administrative portal</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedWork.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-dark-card rounded-2xl border border-dark-border shadow-2xl overflow-hidden flex flex-col h-full min-h-[600px]"
              >
                <div className="p-8 border-b border-dark-border bg-dark-sidebar/40 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-dark-main border border-dark-border flex items-center justify-center text-dark-accent shadow-inner">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", getStatusStyle(selectedWork.status))}>
                          {selectedWork.status === 'COMPLETED' ? 'FINISHED' : selectedWork.status}
                        </span>
                        <span className="text-[10px] font-mono text-dark-text-subtle">VECT_{selectedWork.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <h2 className="text-2xl font-medium text-white tracking-tight">
                         {selectedWork.collectionName === 'camera_requests' ? selectedWork.eventTitle : 
                          selectedWork.collectionName === 'vehicle_requests' ? selectedWork.destination : 
                          selectedWork.description}
                       </h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">
                      {selectedWork.collectionName === 'vehicle_requests' ? 'Mission Date' : 'Assigned Date'}
                    </p>
                    <p className="text-sm font-mono text-slate-200">
                      {selectedWork.collectionName === 'vehicle_requests' ? selectedWork.departureDate : 
                       selectedWork.createdAt?.toDate ? format(selectedWork.createdAt.toDate(), 'dd MMM yyyy') : 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="p-10 flex-1 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                      <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-dark-accent" />
                        Target Sector
                      </p>
                      <p className="text-[0.9rem] font-medium text-slate-200">{selectedWork.location || selectedWork.destination}</p>
                      <p className="text-[11px] text-dark-text-subtle mt-1">{selectedWork.departmentName}</p>
                    </div>
                    {selectedWork.collectionName === 'vehicle_requests' ? (
                      <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-dark-accent" />
                          Timing Link
                        </p>
                        <p className="text-[0.9rem] font-medium text-slate-200">Dep: {selectedWork.departureTime}</p>
                        <p className="text-[11px] text-dark-text-subtle mt-1 italic">Ret: {selectedWork.returnTime}</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl group hover:border-dark-accent/40 transition-colors">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Phone className="w-3 h-3 text-dark-accent" />
                          Contact Protocol
                        </p>
                        <p className="text-[0.9rem] font-medium text-slate-200">{selectedWork.phoneNumber || 'Internal Assignment'}</p>
                        {selectedWork.phoneNumber && <a href={`tel:${selectedWork.phoneNumber}`} className="text-[10px] text-dark-accent font-black uppercase tracking-widest mt-2 inline-block hover:underline">Establish Link</a>}
                      </div>
                    )}
                    <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                      <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        {selectedWork.collectionName === 'vehicle_requests' ? 'Pax Metrics' : 'Fleet Asset'}
                      </p>
                      <p className="text-[0.9rem] font-bold text-emerald-400">
                        {selectedWork.collectionName === 'vehicle_requests' ? (
                          `${selectedWork.passengersCount} Passengers`
                        ) : selectedWork.fleetId ? (
                           fleet.find(f => f.id === selectedWork.fleetId)?.plateNumber || 'Linked Asset'
                        ) : 'General Service'}
                      </p>
                      <p className="text-[11px] text-dark-text-subtle mt-1 italic font-serif">
                        {selectedWork.collectionName === 'vehicle_requests' ? selectedWork.purpose : (selectedWork.fleetId ? fleet.find(f => f.id === selectedWork.fleetId)?.model : 'General Service')}
                      </p>
                    </div>
                    <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                      <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Priority Matrix
                      </p>
                      <p className={cn(
                        "text-[0.9rem] font-bold",
                        selectedWork.priority === 'URGENT' ? "text-red-400" : "text-emerald-400"
                      )}>{selectedWork.priority}</p>
                      <p className="text-[11px] text-dark-text-subtle mt-1 italic font-serif">Standard deployment rules apply</p>
                    </div>

                    {(selectedWork.assignedTechnicianName || selectedWork.assignedDriverName) && (
                      <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl border-dashed">
                        <p className="text-[10px] font-black text-dark-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Assigned Professional
                        </p>
                        <p className="text-[0.9rem] font-medium text-slate-200">
                          {selectedWork.assignedTechnicianName || selectedWork.assignedDriverName}
                        </p>
                        <p className="text-[11px] text-dark-text-subtle mt-1 font-mono">
                          {selectedWork.assignedTechnicianPhone || selectedWork.assignedDriverPhone || 'Internal assignment'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-dark-sidebar/20 rounded-2xl p-8 border border-dark-border">
                    {selectedWork.status === 'ASSIGNED' && (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-dark-accent/10 border border-dark-accent/20 flex items-center justify-center mb-6 text-dark-accent">
                          <Check className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-medium text-white mb-2">Initialize Assignment</h4>
                        <p className="text-dark-text-subtle text-sm mb-8 max-w-sm">Synchronize your local node with the central portal to accept this work vector.</p>
                        <button
                          onClick={() => updateStatus(selectedWork.id, 'ACCEPTED')}
                          className="w-full max-w-xs flex items-center justify-center gap-3 bg-dark-accent hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-900/30 active:scale-95 group"
                        >
                          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Accept & Confirm Link
                        </button>
                      </div>
                    )}

                    {selectedWork.status === 'ACCEPTED' && (
                      <div className="flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500">
                          <Truck className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-medium text-white mb-2">Ready for Deployment</h4>
                        <p className="text-dark-text-subtle text-sm mb-8 max-w-sm">Set your status to 'In Progress' when arriving at the operational site.</p>
                        <button
                          onClick={() => updateStatus(selectedWork.id, 'IN_PROGRESS')}
                          className="w-full max-w-xs flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-amber-900/30 active:scale-95 group"
                        >
                          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Begin Active Operation
                        </button>
                      </div>
                    )}

                    {selectedWork.status === 'IN_PROGRESS' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 mb-2">
                           <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                             {selectedWork.collectionName === 'camera_requests' ? <Camera className="w-5 h-5" /> : 
                              selectedWork.collectionName === 'vehicle_requests' ? <Truck className="w-5 h-5" /> : 
                              <Wrench className="w-5 h-5" />}
                           </div>
                           <div>
                             <h4 className="text-lg font-medium text-white">Active Operational Vector</h4>
                             <p className="text-dark-text-subtle text-xs">Awaiting post-operation terminal summary</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between pl-1">
                            <label className="text-[11px] font-black text-dark-text-subtle uppercase tracking-widest">
                              {selectedWork.collectionName === 'vehicle_requests' ? 'Mission Report & Pilot Remarks' : 'Work Completion Summary & Technical Notes'}
                            </label>
                            <button 
                              onClick={handleSaveNotes}
                              disabled={saving || !notes}
                              className="text-[9px] font-black uppercase text-dark-accent hover:underline disabled:opacity-30 flex items-center gap-2"
                            >
                              {saving ? 'Syncing...' : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Commit Remarks
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            placeholder={selectedWork.collectionName === 'vehicle_requests' ? "Document mission outcome, fuel consumption if applicable, and any vehicle incidents..." : "Explain the work done to fix the problem, parts replaced, and operational tests performed..."}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-dark-main/80 border border-dark-border rounded-2xl p-6 text-sm text-slate-200 focus:ring-1 focus:ring-dark-accent outline-none min-h-[180px] resize-none shadow-inner"
                          />

                          <div className="space-y-4">
                            <label className="text-[11px] font-black text-dark-text-subtle uppercase tracking-widest pl-1">
                              Operational Evidence (Photo Evidence)
                            </label>
                            <div className="flex flex-col sm:flex-row gap-6">
                              <div 
                                className="relative w-full sm:w-48 h-48 bg-dark-main/50 border-2 border-dashed border-dark-border rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-dark-accent/40 transition-all"
                              >
                                {previewUrl ? (
                                  <>
                                    <img src={previewUrl} alt="Maintenance preview" className="w-full h-full object-cover" />
                                    <button 
                                      onClick={() => setPreviewUrl(null)}
                                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      capture="environment"
                                      onChange={handleImageChange}
                                      className="hidden" 
                                    />
                                    <ImageIcon className="w-8 h-8 text-dark-text-subtle/30 mb-2 group-hover:text-dark-accent/50 transition-colors" />
                                    <span className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest text-center px-4">Tap to Capture Maintenance Photo</span>
                                  </label>
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                <p className="text-[11px] text-dark-text-subtle italic font-serif leading-relaxed">
                                  Capture a clear image of the device performance, replaced hardware, or the repaired asset state.
                                </p>
                                <div className="mt-4 flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                   <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">Awaiting Verification Image</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-dark-text-subtle/60 italic font-serif px-2">
                            * Provide clear details for administrative review and ledger confirmation.
                          </p>
                        </div>

                        <div className="flex flex-col gap-4">
                          <button
                            disabled={!notes}
                            onClick={() => updateStatus(selectedWork.id, 'COMPLETED')}
                            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-20 text-white font-bold py-5 rounded-xl transition-all shadow-xl shadow-emerald-900/40 active:scale-95"
                          >
                            <Send className="w-5 h-5" />
                            Finalize & Send to Admin Portal
                          </button>
                          <p className="text-[10px] text-dark-text-subtle text-center font-serif italic">The central command will review and confirm this decommissioning</p>
                        </div>
                      </div>
                    )}

                    {['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(selectedWork.status) && (
                      <div className="p-12 text-center bg-dark-main/30 rounded-2xl border border-dark-border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-500">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-medium text-white mb-2">Assignment Data Secured</h4>
                        <p className="text-dark-text-subtle text-sm mb-2 max-w-sm mx-auto">Your terminal summary has been delivered to the central command.</p>
                        <div className="mt-8 pt-8 border-t border-dark-border flex items-center justify-center gap-8">
                           <div className="text-left">
                              <p className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest">Report Sync</p>
                              <p className="text-[11px] text-emerald-400 font-mono">COMPLETE</p>
                           </div>
                           <div className="text-left">
                              <p className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest">Admin View</p>
                              <p className="text-[11px] text-amber-500 font-mono">{selectedWork.status === 'CONFIRMED' || selectedWork.status === 'CLOSED' ? 'FINALIZED' : 'PENDING'}</p>
                           </div>
                        </div>

                        {selectedWork.directorComments && (
                           <div className="mt-10 pt-8 border-t border-dark-border text-left">
                              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 mb-3 flex items-center gap-2">
                                 <MessageSquare className="w-3 h-3" />
                                 Requester Feedback
                              </label>
                              <div className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 text-sm text-indigo-200 font-medium italic border-dashed">
                                 {selectedWork.directorComments}
                              </div>
                           </div>
                        )}

                        {selectedWork.completionImageUrl && (
                           <div className="mt-10 pt-8 border-t border-dark-border text-left">
                              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1 mb-3 flex items-center gap-2">
                                 <ImageIcon className="w-3 h-3" />
                                 Operational Documentation
                              </label>
                              <div className="relative group max-w-sm overflow-hidden rounded-2xl border border-dark-border">
                                <img src={selectedWork.completionImageUrl} alt="Maintenance outcome" className="w-full aspect-video object-cover" />
                                <div className="absolute inset-0 bg-dark-main/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <span className="text-[10px] font-black text-white uppercase tracking-widest border border-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">View Evidence Link</span>
                                </div>
                              </div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'NEW': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'APPROVED': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    case 'ASSIGNED': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'ACCEPTED': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
    case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'CONFIRMED': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    case 'CLOSED': return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};
