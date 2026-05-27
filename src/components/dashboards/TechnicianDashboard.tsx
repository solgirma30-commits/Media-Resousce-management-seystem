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
  Smartphone,
  X,
  User,
  Wrench,
  Camera,
  Trash2,
  Archive,
  BarChart3,
  CheckCircle,
  Activity,
  Layers,
  Maximize2,
  Minimize2
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
  orderBy,
  onSnapshot, 
  updateDoc, 
  doc,
  serverTimestamp,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { notificationService } from '../../services/notificationService';
import { useLanguage } from '../../lib/LanguageContext';
import { useFcmToken } from '../../hooks/useFcmToken';

export function TechnicianDashboard() {
  useFcmToken();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allRegistryTasks, setAllRegistryTasks] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(notificationService.getPermissionStatus());
  
  // Real-time simulated SMS states
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);
  const [isSmsPhoneOpen, setIsSmsPhoneOpen] = useState(false);
  const [lastSmsNotification, setLastSmsNotification] = useState<any | null>(null);
  
  // Role-based portal configuration
  const portalConfig = React.useMemo(() => {
    switch (profile?.role) {
      case 'CAMERAMAN':
        return { 
          title: 'FMC CAMERA PORTAL', 
          subtitle: 'Media & Event Coverage Node', 
          collection: 'camera_requests', 
          department: 'CAMERA',
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
          department: 'VEHICLE',
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
          department: 'SERVICE',
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [teamUpdates, setTeamUpdates] = useState<any[]>([]);

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

  // Real-time notepad updates subscription
  useEffect(() => {
    if (!portalConfig.department) return;
    const qUpdates = query(
      collection(db, 'department_updates'),
      where('department', '==', portalConfig.department)
    );
    
    const unsubscribe = onSnapshot(qUpdates, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      
      // Sort client-side to avoid Firestore composite index requirements
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setTeamUpdates(msgs.slice(0, 5)); // Keep only latest 5 for banner

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          
          // Check if this is a relatively new message (within last 30 seconds)
          // or if it has pending writes (local).
          const isPending = snapshot.metadata.hasPendingWrites;
          const ts = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          const isRecent = (Date.now() - ts) < 30000;
          
          if (isPending || isRecent) {
            toast(`📢 Director Update: ${data.message}`, { 
              duration: 6000,
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155'
              }
            });
          }
        }
      });
    }, (error) => {
      console.error("Notepad updates subscription failed:", error);
    });
    return () => unsubscribe();
  }, [portalConfig.department]);

  // Real-time SIM SMS logs subscription
  useEffect(() => {
    if (!profile?.uid) return;

    const qSms = query(
      collection(db, 'sim_sms_logs'),
      where('recipientId', '==', profile.uid)
    );

    const unsubscribeSms = onSnapshot(qSms, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort descending by sentAt (fallback to ID timestamp)
      logs.sort((a, b) => {
        const timeA = a.sentAt?.seconds || 0;
        const timeB = b.sentAt?.seconds || 0;
        return timeB - timeA;
      });

      setSmsLogs(logs);

      const readIds = JSON.parse(localStorage.getItem(`read_sms_${profile.uid}`) || '[]');
      const unreadCount = logs.filter((log: any) => !readIds.includes(log.id)).length;
      setUnreadSmsCount(unreadCount);

      // Trigger user-friendly sound and modal banner notification for new unread SMS
      if (logs.length > 0) {
        const latest = logs[0];
        if (!readIds.includes(latest.id)) {
          setLastSmsNotification(latest);
          
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
          } catch (e) {
            // Browser blocked audio auto-play fallback
          }
        }
      }
    }, (error) => {
      console.error("SMS notification subscription failure:", error);
    });

    return () => unsubscribeSms();
  }, [profile?.uid]);

  const markSmsAsRead = () => {
    if (!profile?.uid || smsLogs.length === 0) return;
    const allIds = smsLogs.map((log: any) => log.id);
    localStorage.setItem(`read_sms_${profile.uid}`, JSON.stringify(allIds));
    setUnreadSmsCount(0);
    setLastSmsNotification(null);
  };

  const handleOpenSmsTask = (requestId: string) => {
    const matchedWork = assignments.find((a: any) => a.id === requestId);
    if (matchedWork) {
      setSelectedWork(matchedWork);
      setIsSmsPhoneOpen(false);
    } else {
      toast.error(t("Assignment details not found or archived"));
    }
  };

  useEffect(() => {
    if (!profile) return;

    const path = portalConfig.collection;
    const q = query(collection(db, path)); // Query ALL tasks in the collection for proper "Global Work Registry" representation

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((doc: any) => ({ 
          id: doc.id, 
          collectionName: path,
          ...doc.data() 
        }))
        .filter((doc: any) => !doc.technicianArchived);
      
      console.log(`[TechnicianDashboard] Subscription update for ${path}: fetched ${docs.length} global docs`);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      
      if (!isFirstLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            const isAssignedToMe = data[portalConfig.idField] === profile.uid ||
                                   data.assignedTechnicianIds?.includes(profile.uid) ||
                                   data.assignedDriverIds?.includes(profile.uid) ||
                                   data.assignedTechnicians?.some((t: any) => t.id === profile.uid) ||
                                   data.assignedDrivers?.some((d: any) => d.id === profile.uid);
                                   
            if (data.status === 'ASSIGNED' && isAssignedToMe) {
              const displayName = path === 'camera_requests' ? (data.eventTitle || data.purpose) : 
                                  path === 'vehicle_requests' ? (data.tripName || data.destination) : 
                                  (data.workName || data.description);
              console.log(`[TechnicianDashboard] New assigned task detected for me: ${data.status}`);
              notificationService.notify(`NEW ASSIGNMENT: ${displayName}`, {
                body: "A new assignment is ready in your queue.",
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }

      // 1. Core personal assignments list (tasks explicitly assigned to the logged-in user)
      const personalAssignments = docs.filter((doc: any) => {
        const isMain = doc[portalConfig.idField] === profile.uid;
        const isSecondaryArray = (doc.assignedTechnicianIds && Array.isArray(doc.assignedTechnicianIds) && doc.assignedTechnicianIds.includes(profile.uid)) ||
                                 (doc.assignedDriverIds && Array.isArray(doc.assignedDriverIds) && doc.assignedDriverIds.includes(profile.uid));
        const isObjectList = (doc.assignedTechnicians && Array.isArray(doc.assignedTechnicians) && doc.assignedTechnicians.some((t: any) => t.id === profile.uid)) ||
                             (doc.assignedDrivers && Array.isArray(doc.assignedDrivers) && doc.assignedDrivers.some((d: any) => d.id === profile.uid));
        return isMain || isSecondaryArray || isObjectList;
      });

      // 2. Global Registry (any tasks that have been APPROVED, DISPATCHED, or are currently in-progress/complete)
      const globalRegistry = docs.filter((doc: any) => 
        ['APPROVED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED', 'CLOSED', 'REOPENED'].includes(doc.status)
      );

      setAssignments(personalAssignments.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i));
      setAllRegistryTasks(globalRegistry.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i));
      setLoading(false);
      isFirstLoad = false;
    }, (error) => {
        console.error(`[TechnicianDashboard] Error in ${path}:`, error);
        handleFirestoreError(error, OperationType.LIST, path);
    });

    // Listen for NEW unassigned requests to notify technicians in real-time
    let isFirstLoadNew = true;
    const qNew = query(collection(db, path), where('status', '==', 'NEW'));
    const unsubscribeNew = onSnapshot(qNew, (snapshot) => {
      if (!isFirstLoadNew) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            const displayName = path === 'camera_requests' ? (data.eventTitle || data.purpose) : 
                              path === 'vehicle_requests' ? (data.tripName || data.destination) : 
                              (data.workName || data.description);
            notificationService.notify(`NEW UNASSIGNED REQUEST: ${displayName}`, {
              body: "Available for pick up",
              icon: '/pwa-512x512.png'
            });
          }
        });
      }
      isFirstLoadNew = false;
    });

    return () => {
      unsubscribe();
      unsubscribeNew();
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
        // Do not auto-archive completed tasks from active log, so users can view and delete them manually
        // update.technicianArchived = true; 
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

  const handleDeleteWork = async (e: React.MouseEvent, work: any) => {
    e.stopPropagation();
    
    const colName = work.collectionName || (
      profile?.role === 'CAMERAMAN' ? 'camera_requests' :
      profile?.role === 'DRIVER' ? 'vehicle_requests' : 'service_requests'
    );

    if (deleteConfirmId === work.id) {
      try {
        await deleteDoc(doc(db, colName, work.id));
        toast.success('Record purged permanently');
        setDeleteConfirmId(null);
        if (selectedWork?.id === work.id) setSelectedWork(null);
      } catch (error) {
        toast.error('Purge failure');
        handleFirestoreError(error, OperationType.DELETE, `${colName}/${work.id}`);
      }
    } else {
      setDeleteConfirmId(work.id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      toast('Click again to confirm PERMANENT purge', { icon: '⚠️' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900">
      <div className="flex items-center justify-between px-2">
          <div>
            <h1 className="text-3xl font-medium text-slate-950 tracking-tight uppercase">{t(portalConfig.title)}</h1>
            <p className="text-dark-text-subtle mt-1 font-serif italic uppercase tracking-widest text-[10px] font-black">{profile?.displayName} • {t(portalConfig.subtitle)}</p>
          </div>
        <div className="flex items-center gap-4">
          {permission === 'granted' && profile?.role !== 'DRIVER' && (
            <button 
              onClick={() => notificationService.notify("Operational Test", { body: "Mobile alert handshake verified." })}
              className="hidden sm:flex text-[9px] font-black text-dark-accent/60 hover:text-dark-accent uppercase tracking-widest px-2 py-1 flex items-center gap-1 transition-colors"
            >
              <Activity className="w-3 h-3" />
              Test Sync
            </button>
          )}
          <div className="hidden sm:flex bg-dark-card px-4 py-2 rounded-lg border border-dark-border items-center gap-3 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse"></div>
            <span className="text-[10px] font-black text-dark-text-muted uppercase tracking-widest">Network Synchronized</span>
          </div>
        </div>
      </div>

      {teamUpdates.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border-l-4 border-l-dark-accent border border-t-dark-border border-r-dark-border border-b-dark-border rounded-lg shadow-xl overflow-hidden p-4"
        >
          <h3 className="text-[10px] font-black text-dark-accent uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Director Notepad Broadcasts
          </h3>
          <div className="space-y-2">
            {teamUpdates.map((msg, idx) => (
              <div key={`${msg.id || 'msg'}-${idx}`} className="bg-slate-100 p-2.5 rounded text-sm text-black border border-slate-300 flex justify-between items-start group">
                <div>
                  <p className="text-xs font-semibold">{msg.message}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Just now'}
                  </p>
                </div>
                <button 
                  onClick={() => deleteDoc(doc(db, 'department_updates', msg.id))}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete message for everyone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Work Request Data Table */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-dark-card border border-dark-border rounded-2xl shadow-xl overflow-hidden transition-all duration-300",
          isFullscreen ? "fixed inset-0 z-[100] rounded-none border-none h-screen overflow-hidden flex flex-col" : ""
        )}
      >
        <div className="p-6 border-b border-dark-border bg-dark-sidebar/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dark-accent/10 rounded-lg text-dark-accent">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">Global Work Registry</h3>
              <p className="text-[10px] text-dark-text-subtle mt-0.5 font-medium uppercase tracking-tight">Consolidated operational ledger</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-dark-main rounded-full border border-dark-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-dark-text-muted uppercase">{allRegistryTasks.length} Total Records</span>
            </div>
            
            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-dark-main rounded-lg text-dark-text-subtle hover:text-dark-accent transition-colors flex items-center gap-2 group border border-transparent hover:border-dark-border"
              title={isFullscreen ? t("Exit Fullscreen") : t("Fullscreen Mode")}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t("Exit")}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t("Fullscreen")}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className={cn(
          "overflow-x-auto scrollbar-hide",
          isFullscreen ? "flex-1 overflow-y-auto" : ""
        )}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-dark-header">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Order No")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Work Description")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Department")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Assigned Agent / Requester")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Status")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border">{t("Timeline Link")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.1em] border-b border-dark-border text-right whitespace-nowrap whitespace-nowrap">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {allRegistryTasks.map((work, idx) => (
                <tr 
                  key={`${work.id || 'work'}-${idx}`}
                  onClick={() => setSelectedWork(work)}
                  className={cn(
                    "group transition-all cursor-pointer hover:bg-dark-main/30",
                    selectedWork?.id === work.id ? "bg-dark-accent/5 translate-x-1" : ""
                  )}
                >
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-mono text-dark-accent font-black tracking-widest group-hover:text-dark-accent transition-colors">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900 group-hover:text-dark-accent transition-colors truncate max-w-[250px]">
                        {work.collectionName === 'camera_requests' ? (work.eventTitle || work.purpose) : 
                         work.collectionName === 'vehicle_requests' ? (work.tripName || work.destination) : 
                         (work.workName || work.description)}
                      </span>
                      <span className="text-[10px] text-dark-text-subtle mt-0.5 font-serif italic truncate max-w-[200px]">
                        {work.description || work.purpose || 'Standard Task'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-dark-border rounded-full group-hover:bg-dark-accent transition-colors"></div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{work.departmentName || 'Ops Sector'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-dark-main border border-dark-border flex items-center justify-center text-[9px] font-black text-dark-text-muted shadow-inner group-hover:border-dark-accent/40 transition-colors">
                        {(work.assignedTechnicianName || work.assignedDriverName || work.requesterName || work.directorName || '??').charAt(0)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-slate-900 leading-none">
                          {(() => {
                            const agent = work.assignedTechnicianName || work.assignedDriverName;
                            
                            // Prioritize hostName for Camera and Vehicle requests as the "requestor person name"
                            const requesterVal = (work.collectionName === 'camera_requests' || work.collectionName === 'vehicle_requests') 
                              ? (work.hostName || work.requesterName || work.directorName) 
                              : (work.requesterName || work.directorName);
                            
                            const requester = requesterVal;
                            
                            // If requester is generic or same as department, try to show the other if available
                            const finalRequester = (requester === work.departmentName && work.requesterName && work.requesterName !== 'TFMC') ? work.requesterName : requester;

                            if (agent && finalRequester && agent !== finalRequester) {
                              return `${agent} / ${finalRequester}`;
                            }
                            return agent || finalRequester || 'Unassigned';
                          })()}
                        </span>
                        <span className="text-[9px] text-dark-text-subtle uppercase font-bold tracking-tight">
                          {(work.requesterName || work.directorName) && !work.assignedTechnicianName && !work.assignedDriverName ? 'Requester' : 'Active Duty'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border shadow-sm",
                      getStatusStyle(work.status)
                    )}>
                      {work.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 text-dark-text-subtle">
                      <Clock className="w-3 h-3 group-hover:text-dark-accent transition-colors" />
                      <span className="text-[10px] font-mono group-hover:text-slate-900 transition-colors">
                        {work.createdAt?.toDate ? format(work.createdAt.toDate(), 'dd/MM HH:mm') : 'Sync...'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDeleteWork(e, work)}
                        className={cn(
                          "p-2 rounded-lg transition-all border",
                          deleteConfirmId === work.id
                            ? "bg-rose-500 border-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/40"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                        )}
                        title={deleteConfirmId === work.id ? "Confirm Purge" : "Delete Record"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allRegistryTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-dark-text-subtle font-serif italic text-sm">
                    No active work vectors detected in current sector.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="w-full">
        {/* Task Detail View */}
        <div className="w-full">
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
                <h3 className="text-xl font-medium text-slate-400">Select Task from Global Work Registry</h3>
                <p className="text-dark-text-subtle text-[10px] uppercase font-black tracking-widest mt-2">Initialize communication with the Property and Casualty Laborer portal</p>
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
                      <h2 className="text-2xl font-medium text-slate-950 tracking-tight">
                         {selectedWork.collectionName === 'camera_requests' ? (selectedWork.eventTitle || selectedWork.purpose) : 
                          selectedWork.collectionName === 'vehicle_requests' ? (selectedWork.tripName || selectedWork.destination) : 
                          (selectedWork.workName || selectedWork.description)}
                       </h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">
                      {selectedWork.collectionName === 'vehicle_requests' ? 'Mission Date' : 'Assigned Date'}
                    </p>
                    <p className="text-sm font-mono text-slate-900">
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
                      <p className="text-[0.9rem] font-medium text-slate-900">{selectedWork.location || selectedWork.destination}</p>
                      <p className="text-[11px] text-dark-text-subtle mt-1">{selectedWork.departmentName}</p>
                    </div>
                    {selectedWork.collectionName === 'vehicle_requests' ? (
                      <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-dark-accent" />
                          Timing Link
                        </p>
                        <p className="text-[0.9rem] font-black text-black">Dep: {selectedWork.departureTime}</p>
                        <p className="text-[11px] text-dark-text-subtle mt-1 italic">Ret: {selectedWork.returnTime}</p>
                      </div>
                    ) : (
                      <div className="p-1 bg-gradient-to-br from-dark-card to-dark-main border border-dark-border rounded-xl group hover:border-dark-accent/40 transition-colors shadow-lg">
                        <div className="p-5">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Phone className="w-3 h-3 text-dark-accent" />
                            Requester Sim Link
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-dark-sidebar border border-dark-border flex items-center justify-center text-dark-accent group-hover:scale-110 transition-transform shadow-inner">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-[0.9rem] font-black text-black leading-tight">{selectedWork.phoneNumber || 'Internal Link'}</p>
                               <p className="text-[9px] text-dark-text-subtle uppercase tracking-widest mt-0.5">Encrypted Protocol</p>
                            </div>
                          </div>
                          {selectedWork.phoneNumber && (
                            <div className="flex gap-2 mt-4">
                              <a href={`tel:${selectedWork.phoneNumber}`} className="flex-1 text-center bg-dark-accent/10 border border-dark-accent/20 hover:bg-dark-accent hover:text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Voice</a>
                              <a href={`sms:${selectedWork.phoneNumber}`} className="flex-1 text-center bg-dark-accent/10 border border-dark-accent/20 hover:bg-dark-accent hover:text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">SMS Card</a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="p-6 bg-dark-main/50 border border-dark-border rounded-xl">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User className="w-3 h-3 text-indigo-500" />
                        Requested By
                      </p>
                      <p className="text-[0.9rem] font-bold text-indigo-400">
                        {(() => {
                          const req = selectedWork.requesterName || selectedWork.directorName;
                          if ((selectedWork.collectionName === 'camera_requests' || selectedWork.collectionName === 'vehicle_requests') && (req === 'TFMC' || !req)) {
                            return selectedWork.hostName || selectedWork.requesterName || req || selectedWork.departmentName || 'General Request';
                          }
                          return req || selectedWork.departmentName || 'General Request';
                        })()}
                      </p>
                      <p className="text-[11px] text-dark-text-subtle mt-1 italic font-serif">
                        Originating Requester
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
                        <p className="text-[0.9rem] font-black text-black">
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
                        <h4 className="text-xl font-black text-black mb-2">Initialize Assignment</h4>
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
                        <h4 className="text-xl font-black text-black mb-2">Ready for Deployment</h4>
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
                            className="w-full bg-dark-main/80 border border-dark-border rounded-2xl p-6 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none min-h-[180px] resize-none shadow-inner"
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

                        <div className="mt-10 pt-8 border-t border-dark-border flex flex-col items-center gap-2">
                           <button
                             onClick={(e) => handleDeleteWork(e, selectedWork)}
                             className={cn(
                               "w-full max-w-xs flex items-center justify-center gap-3 font-bold py-3.5 px-6 rounded-xl transition-all shadow-xl border text-xs uppercase tracking-widest cursor-pointer",
                               deleteConfirmId === selectedWork.id
                                 ? "bg-rose-600 border-rose-700 text-white animate-pulse shadow-lg shadow-rose-900/40"
                                 : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                             )}
                           >
                             <Trash2 className="w-4 h-4" />
                             {deleteConfirmId === selectedWork.id ? "Click Again to Confirm Deletion" : "Delete Completed Task"}
                           </button>
                           <p className="text-[9px] text-[#f43f5e] font-sans font-bold uppercase tracking-widest mt-1">
                             Remove this completed record permanently
                           </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SIM Phone Simulator Floating toggle */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        
        {/* Unread message persistent chip alert */}
        <AnimatePresence>
          {lastSmsNotification && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="pointer-events-auto bg-slate-950/95 border border-amber-500/30 rounded-2xl p-4 shadow-2xl max-w-xs flex gap-3 text-slate-100 backdrop-blur-md"
            >
              <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-xl self-start">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Incoming SIM SMS</span>
                  <button onClick={() => setLastSmsNotification(null)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs font-semibold leading-relaxed mt-1 line-clamp-2 text-slate-100">{lastSmsNotification.message}</p>
                <button
                  onClick={() => {
                    setIsSmsPhoneOpen(true);
                    markSmsAsRead();
                  }}
                  className="mt-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View Simulator Mobile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <button
          onClick={() => {
            setIsSmsPhoneOpen(!isSmsPhoneOpen);
            if (!isSmsPhoneOpen) {
              markSmsAsRead();
            }
          }}
          className="pointer-events-auto relative group bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/20"
        >
          {unreadSmsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black text-white w-5 h-5 rounded-full flex items-center justify-center animate-bounce border border-slate-900 shadow">
              {unreadSmsCount}
            </span>
          )}
          <Smartphone className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        </button>
      </div>

      {/* Phone Simulator Panel */}
      <AnimatePresence>
        {isSmsPhoneOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-80 h-[560px] bg-slate-950 border-[6px] border-slate-800 rounded-[44px] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-slate-100"
            >
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-40 flex items-center justify-center gap-1.5 px-3">
                <span className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800/40"></span>
                <span className="w-10 h-1 bg-slate-950 rounded-full"></span>
              </div>

              {/* Status Bar */}
              <div className="flex justify-between items-center px-6 pt-7 pb-2 text-[9px] font-bold text-slate-400 font-mono z-30 bg-slate-900">
                <span>08:52 FMC</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500">📶 5G</span>
                  <span>🔋 99%</span>
                </div>
              </div>

              {/* Close Simulator X */}
              <button 
                onClick={() => setIsSmsPhoneOpen(false)}
                className="absolute top-10 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full z-40 transition-colors"
                title="Exit simulator"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Screen Contents */}
              <div className="flex-1 flex flex-col bg-slate-900/40 overflow-y-auto px-4 py-4 space-y-4 pt-6">
                <div className="text-center pb-2 border-b border-slate-800/60">
                  <p className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase">FMC TEXT MESSAGES</p>
                  <p className="text-[9px] font-mono text-slate-500 mt-0.5">Carrier SIM: 091XXXXXXX (Active)</p>
                </div>

                {smsLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center py-12 px-4">
                    <div className="bg-slate-800/30 p-3 rounded-full mb-3 text-slate-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">No Texts Dispatched</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">When dispatchers configure task assignments, SIM SMS alerts will feed here live</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {smsLogs.map((log, idx) => {
                      const timeStr = log.sentAt?.seconds 
                        ? format(new Date(log.sentAt.seconds * 1000), 'MMM d, h:mm a')
                        : format(new Date(), 'h:mm a');
                      return (
                        <div key={`${log.id || 'log'}-${idx}`} className="flex flex-col space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 font-mono">
                            <span>💬 DISPATCH COMMAND</span>
                            <span>{timeStr}</span>
                          </div>
                          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm p-3.5 shadow-md">
                            <p className="text-[11px] text-slate-100 font-medium leading-relaxed font-sans">{log.message}</p>
                            
                            <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex justify-between items-center gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">SIM DISPATCHED</span>
                              {log.requestId && (
                                <button
                                  onClick={() => handleOpenSmsTask(log.requestId)}
                                  className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors"
                                >
                                  Open Link
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* OS Bottom Pillar Pill */}
              <div className="h-6 bg-slate-900 border-t border-slate-800/30 flex items-center justify-center">
                <div className="w-24 h-1 bg-slate-700 rounded-full"></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'NEW': return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
    case 'APPROVED': return 'bg-cyan-500/10 text-cyan-700 border border-cyan-500/20';
    case 'ASSIGNED': return 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20';
    case 'ACCEPTED': return 'bg-violet-500/10 text-violet-700 border border-violet-500/20';
    case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-900 border border-amber-500/20';
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    case 'CONFIRMED': return 'bg-slate-500/10 text-teal-700 border border-slate-500/20';
    case 'CLOSED': return 'bg-slate-500/20 text-slate-800 border border-slate-500/30';
    case 'EXITED': return 'bg-pink-500/10 text-pink-700 border border-pink-500/20';
    case 'RETURNED': return 'bg-teal-500/10 text-teal-700 border border-teal-500/20';
    default: return 'bg-slate-500/10 text-slate-700 border border-slate-500/20';
  }
};
