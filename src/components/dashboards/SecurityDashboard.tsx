import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  CheckCircle2, 
  X, 
  Tag, 
  LogOut,
  AlertCircle,
  PackageCheck,
  Trash2,
  BarChart3,
  Users,
  Activity
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where,
  updateDoc,
  doc,
  orderBy,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/LanguageContext';
import { useFcmToken } from '../../hooks/useFcmToken';
import { WeeklyReport } from '../WeeklyReport';

export function SecurityDashboard() {
  useFcmToken();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [guestRequests, setGuestRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [teamUpdates, setTeamUpdates] = useState<any[]>([]);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Real-time notepad updates subscription
  useEffect(() => {
    const qUpdates = query(
      collection(db, 'department_updates'),
      where('department', '==', 'PROP_CASUALTY')
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
  }, []);

  useEffect(() => {
    // Security only sees APPROVED requests for items
    const qItems = query(
      collection(db, 'item_requests'),
      where('status', 'in', ['APPROVED', 'EXITED', 'RETURNED'])
    );

    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, collectionName: 'item_requests', ...doc.data() }));
      
      // Sort by creation time desc
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setRequests(docs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'item_requests');
    });

    const qGuests = query(
      collection(db, 'guest_requests'),
      where('status', 'in', ['APPROVED', 'COMPLETED'])
    );

    const unsubscribeGuests = onSnapshot(qGuests, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, collectionName: 'guest_requests', ...doc.data() }));
      setGuestRequests(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guest_requests');
    });

    return () => {
      unsubscribeItems();
      unsubscribeGuests();
    };
  }, []);

  const handleDeleteRecord = async (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    if (deleteConfirmId === record.id) {
      try {
        await deleteDoc(doc(db, record.collectionName, record.id));
        toast.success('Record purged from registry');
        setDeleteConfirmId(null);
      } catch (error) {
        toast.error('Purge failed');
        console.error(error);
      }
    } else {
      setDeleteConfirmId(record.id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      toast('Click again to confirm PERMANENT purge', { icon: '⚠️' });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        const docRef = doc(db, 'item_requests', id);
        batch.delete(docRef);
      });
      await batch.commit();
      toast.success('Selected records purged');
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (error) {
      toast.error('Bulk purge failed');
      console.error(error);
    }
  };

  const handleGateOut = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'item_requests', requestId), {
        status: 'EXITED',
        exitedAt: serverTimestamp(),
        securityPersonnelId: profile?.uid,
        securityPersonnelName: profile?.displayName,
        updatedAt: serverTimestamp(),
      });
      toast.success('Item Exit Logged: Operational Release Confirmed');
      setSelectedRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `item_requests/${requestId}`);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.departmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const handleVerifyGuest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'guest_requests', requestId), {                
        status: 'COMPLETED',
        updatedAt: serverTimestamp()
      });
      toast.success('Guest entrance verified');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'guest_requests');
    }
  };

  const pendingExits = filteredRequests.filter(r => r.status === 'APPROVED');
  const loggedExits = filteredRequests.filter(r => r.status === 'EXITED' || r.status === 'RETURNED');
  
  const pendingGuests = guestRequests.filter(r => r.status === 'APPROVED');
  const loggedGuests = guestRequests.filter(r => r.status === 'COMPLETED');



  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-slate-950 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-pink-500" />
            Security Asset Monitoring
          </h1>
          <p className="text-dark-text-subtle mt-1 font-serif italic text-sm">Authorized Item Exit & Return Verification Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsReportOpen(true)}
            className="bg-dark-card border border-dark-border py-2.5 px-4 rounded-xl text-dark-accent hover:bg-dark-main flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Report
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-subtle" />
            <input 
              type="text"
              placeholder="Search S/N or Item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-black font-bold focus:ring-1 focus:ring-pink-500 outline-none w-64 transition-all"
            />
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
            {teamUpdates.map(msg => (
              <div key={msg.id} className="bg-slate-100 p-2.5 rounded text-sm text-black border border-slate-300 flex justify-between items-start group">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <LogOut className="w-4 h-4 text-pink-400" />
                Property and Casualty Service: Exits
              </h3>
              <span className="bg-pink-500/10 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded border border-pink-500/20 uppercase tracking-widest">
                {pendingExits.length} Active
              </span>
            </div>
            <div className="divide-y divide-dark-border max-h-[400px] overflow-auto scrollbar-hide">
              {loading ? (
                <div className="p-12 text-center text-dark-text-subtle italic">Synchronizing registry...</div>
              ) : pendingExits.length === 0 ? (
                <div className="p-12 text-center text-dark-text-subtle italic font-serif">No Property and Casualty Service exits in queue</div>
              ) : (
                pendingExits.map((req) => (
                  <div key={req.id} className="p-6 hover:bg-dark-main/40 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-dark-sidebar border border-dark-border flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                        <Tag className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-slate-900">{req.itemName}</h4>
                          <span className="text-[10px] font-mono text-dark-accent bg-dark-main px-1.5 py-0.5 rounded border border-dark-border">
                            #{req.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-dark-text-subtle">
                          <span className="font-mono text-pink-700">S/N: {req.serialNumber}</span>
                          <span className="text-dark-accent/40">•</span>
                          <span className="uppercase tracking-tight">{req.departmentName}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="px-6 py-2.5 bg-dark-main hover:bg-pink-500 text-dark-text-subtle hover:text-white border border-dark-border hover:border-pink-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      Verify Release
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

            <section className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-400" />
                Property and Casualty Service: Guests
              </h3>
              <span className="bg-pink-500/10 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded border border-pink-500/20 uppercase tracking-widest">
                {pendingGuests.length} Active
              </span>
            </div>
            <div className="divide-y divide-dark-border max-h-[400px] overflow-auto scrollbar-hide">
              {pendingGuests.length === 0 ? (
                <div className="p-12 text-center text-dark-text-subtle italic font-serif">No Property and Casualty Service guest entries</div>
              ) : (
                pendingGuests.map((req) => (
                  <div key={req.id} className="p-6 hover:bg-dark-main/40 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-dark-sidebar border border-dark-border flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-slate-900">{req.visitorNames}</h4>
                          <span className="text-[10px] font-mono text-dark-accent bg-dark-main px-1.5 py-0.5 rounded border border-dark-border">
                            #{req.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-dark-text-subtle">
                          <span className="text-pink-700">Purpose: {req.purpose}</span>
                          <span className="text-dark-accent/40">•</span>
                          <span className="uppercase tracking-tight">{req.departmentName}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleVerifyGuest(req.id)}
                      className="px-6 py-2.5 bg-dark-main hover:bg-emerald-600 text-dark-text-subtle hover:text-white border border-dark-border hover:border-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      Verify
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Guest Entrance Log (Recent)
              </h3>
            </div>
            <div className="divide-y divide-dark-border max-h-[300px] overflow-auto scrollbar-hide">
               {loggedGuests.length === 0 ? (
                 <div className="p-10 text-center text-dark-text-subtle text-xs italic">Operational guest registry clear</div>
               ) : (
                  loggedGuests.map((req) => (
                    <div key={req.id} className="p-5 flex items-center justify-between bg-dark-main/20">
                       <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-emerald-500/10 border-emerald-500/20 text-emerald-700">
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="text-xs font-bold text-slate-900">{req.visitorNames}</p>
                           <p className="text-[10px] text-dark-text-subtle font-mono">Purpose: {req.purpose}</p>
                         </div>
                       </div>
                       <div className="text-right flex items-center gap-4">
                         <div className="text-right">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Completed</p>
                           <p className="text-[9px] font-mono text-dark-accent mt-0.5">
                             {req.updatedAt ? format(req.updatedAt.toDate(), 'MMM dd, HH:mm') : 'N/A'}
                           </p>
                         </div>
                         <button 
                             onClick={(e) => handleDeleteRecord(e, req)}
                             className={cn(
                               "p-2 rounded-lg transition-all border",
                               deleteConfirmId === req.id
                                 ? "bg-rose-500 border-rose-600 text-white animate-pulse opacity-100"
                                 : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                             )}
                             title="Purge Guest Log"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                       </div>
                    </div>
                  ))
               )}
            </div>
          </section>

          <section className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Operational Exit Log (Recent)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-all", isSelectMode ? "bg-pink-500 text-white" : "hover:bg-dark-main text-dark-text-subtle")}
                >
                  {isSelectMode ? 'Cancel' : 'Manage List'}
                </button>
                {isSelectMode && (
                  <button 
                    onClick={() => {
                        if (selectedIds.length === loggedExits.length) setSelectedIds([]);
                        else setSelectedIds(loggedExits.map(r => r.id));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded hover:bg-dark-main text-dark-text-subtle"
                  >
                    Select All
                  </button>
                )}
                {isSelectMode && selectedIds.length > 0 && (
                  <button 
                    onClick={handleDeleteSelected}
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-rose-500 text-white hover:bg-rose-600 transition-all"
                  >
                    Delete ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-dark-border max-h-[300px] overflow-auto scrollbar-hide">
               {loggedExits.length === 0 ? (
                 <div className="p-10 text-center text-dark-text-subtle text-xs italic">Operational registry clear</div>
               ) : (
                  loggedExits.map((req) => (
                    <div key={req.id} className={cn("p-5 flex items-center justify-between group transition-all", isSelectMode ? "bg-dark-main/40" : "bg-dark-main/20")}>
                       <div className="flex items-center gap-4">
                         {isSelectMode && (
                             <input 
                                type="checkbox"
                                checked={selectedIds.includes(req.id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedIds([...selectedIds, req.id]);
                                    else setSelectedIds(selectedIds.filter(id => id !== req.id));
                                }}
                                className="w-4 h-4 rounded border-dark-border text-pink-500 accent-pink-500"
                             />
                         )}
                         <div className={cn(
                           "w-8 h-8 rounded-lg flex items-center justify-center border",
                           req.status === 'RETURNED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : "bg-pink-500/10 border-pink-500/20 text-pink-700"
                         )}>
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="text-xs font-bold text-slate-900">{req.itemName}</p>
                           <p className="text-[10px] text-dark-text-subtle font-mono">{req.serialNumber}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-6">
                         <div className="text-right flex items-center gap-4">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">
                             {req.status === 'RETURNED' ? 'Returned' : 'In Field'}
                           </p>
                           <p className="text-[9px] font-mono text-dark-accent mt-0.5">
                             {req.exitedAt ? format(req.exitedAt.toDate(), 'MMM dd, HH:mm') : 'N/A'}
                           </p>
                         </div>
                         {!isSelectMode && (
                           <button 
                             onClick={(e) => handleDeleteRecord(e, req)}
                             className={cn(
                               "p-2 rounded-lg transition-all border",
                               deleteConfirmId === req.id
                                 ? "bg-rose-500 border-rose-600 text-white animate-pulse opacity-100"
                                 : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                             )}
                             title="Purge Exit Log"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                    </div>
                  ))
               )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg p-6">
             <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest mb-4">Security Protocol</h3>
             <ul className="space-y-3">
                <li className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1"></div>
                   <p className="text-[11px] text-dark-text-subtle leading-relaxed">Match Item Name and S/N with physical asset before release.</p>
                </li>
                <li className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1"></div>
                   <p className="text-[11px] text-dark-text-subtle leading-relaxed">Verify operational approval status in system before gate-out.</p>
                </li>
                <li className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1"></div>
                   <p className="text-[11px] text-dark-text-subtle leading-relaxed">Ensure personnel identity matches the system assignment.</p>
                </li>
             </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isReportOpen && (
           <WeeklyReport 
             requests={requests} 
             workforce={[]} 
             onClose={() => setIsReportOpen(false)} 
           />
        )}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-dark-main/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-dark-card rounded-2xl border border-dark-border shadow-2xl overflow-hidden text-slate-900"
            >
              <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-medium text-slate-950 tracking-tight">{t('sec_gate_out_verif', 'Gate-Out Verification')}</h2>
                  <p className="text-dark-text-subtle text-sm mt-1">{t('sec_auth_id', 'Authorized ID')}: #{selectedRequest.id.slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 text-dark-text-subtle hover:text-white transition-colors cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-dark-main border border-dark-border rounded-xl">
                      <div>
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">{t('sec_asset_model', 'Asset Model')}</p>
                        <p className="text-lg font-bold text-slate-950">{selectedRequest.itemName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">{t('sec_serial_number', 'Serial Number')}</p>
                        <p className="text-lg font-mono font-bold text-pink-500">{selectedRequest.serialNumber}</p>
                      </div>
                   </div>
  
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">{t('sec_requester', 'Requester')}</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRequest.directorName || selectedRequest.requesterName}</p>
                      </div>
                      <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">{t('sec_department', 'Department')}</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRequest.departmentName}</p>
                      </div>
                   </div>
  
                   <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-pink-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('sec_mission_reason', 'Mission Reason')}</span>
                      </div>
                      <p className="text-xs text-slate-750 font-medium italic">{selectedRequest.purpose}</p>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => handleGateOut(selectedRequest.id)}
                     className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-pink-900/40 flex items-center justify-center gap-3 text-sm active:scale-95 cursor-pointer"
                   >
                     <PackageCheck className="w-5 h-5" />
                     {t('sec_confirm_gate_out', 'CONFIRM ASSET GATE-OUT')}
                   </button>
                   <button 
                     onClick={() => setSelectedRequest(null)}
                     className="w-full py-4 text-[10px] font-black text-dark-text-subtle hover:text-white uppercase tracking-widest transition-all cursor-pointer"
                   >
                     {t('sec_cancel_verification', 'Cancel Verification')}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
