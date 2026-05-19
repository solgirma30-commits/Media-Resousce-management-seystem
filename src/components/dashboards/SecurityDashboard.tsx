import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  X, 
  Tag, 
  ChevronRight,
  LogOut,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where,
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export function SecurityDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  useEffect(() => {
    // Security only sees APPROVED requests for items
    const q = query(
      collection(db, 'item_requests'),
      where('status', 'in', ['APPROVED', 'EXITED', 'RETURNED'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by creation time desc
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setRequests(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'item_requests');
    });

    return () => unsubscribe();
  }, []);

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
  );

  const pendingExits = filteredRequests.filter(r => r.status === 'APPROVED');
  const loggedExits = filteredRequests.filter(r => r.status === 'EXITED' || r.status === 'RETURNED');

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <LogOut className="w-4 h-4 text-pink-400" />
                Pending Exit Authorizations
              </h3>
              <span className="bg-pink-500/10 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded border border-pink-500/20 uppercase tracking-widest">
                {pendingExits.length} Active
              </span>
            </div>
            <div className="divide-y divide-dark-border max-h-[400px] overflow-auto scrollbar-hide">
              {loading ? (
                <div className="p-12 text-center text-dark-text-subtle italic">Synchronizing registry...</div>
              ) : pendingExits.length === 0 ? (
                <div className="p-12 text-center text-dark-text-subtle italic font-serif">No pending exit authorizations in queue</div>
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
            <div className="p-6 border-b border-dark-border bg-dark-card/50">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Operational Exit Log (Recent)
              </h3>
            </div>
            <div className="divide-y divide-dark-border max-h-[300px] overflow-auto scrollbar-hide">
               {loggedExits.length === 0 ? (
                 <div className="p-10 text-center text-dark-text-subtle text-xs italic">Operational registry clear</div>
               ) : (
                 loggedExits.map((req) => (
                   <div key={req.id} className="p-5 flex items-center justify-between bg-dark-main/20">
                      <div className="flex items-center gap-4">
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
                      <div className="text-right">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">
                          {req.status === 'RETURNED' ? 'Returned' : 'In Field'}
                        </p>
                        <p className="text-[9px] font-mono text-dark-accent mt-0.5">
                          {req.exitedAt ? format(req.exitedAt.toDate(), 'MMM dd, HH:mm') : 'N/A'}
                        </p>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </section> Section
        </div>

        <div className="space-y-6">
           <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg p-6">
              <h3 className="text-[11px] font-black text-dark-text-muted uppercase tracking-widest mb-4">Verification Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                    <p className="text-2xl font-bold text-slate-950 font-mono">{pendingExits.length.toString().padStart(2, '0')}</p>
                    <p className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest mt-1">Pending Gate</p>
                 </div>
                 <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                    <p className="text-2xl font-bold text-slate-950 font-mono">{loggedExits.length.toString().padStart(2, '0')}</p>
                    <p className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest mt-1">Total Verified</p>
                 </div>
              </div>
           </div>

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
              className="relative w-full max-w-lg bg-dark-card rounded-2xl border border-dark-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-medium text-slate-950 tracking-tight">Gate-Out Verification</h2>
                  <p className="text-dark-text-subtle text-sm mt-1">Authorized ID: #{selectedRequest.id.slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-dark-main border border-dark-border rounded-xl">
                      <div>
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">Asset Model</p>
                        <p className="text-lg font-bold text-slate-950">{selectedRequest.itemName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">Serial Number</p>
                        <p className="text-lg font-mono font-bold text-pink-400">{selectedRequest.serialNumber}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">Personnel</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRequest.userName}</p>
                      </div>
                      <div className="p-4 bg-dark-main border border-dark-border rounded-xl">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-1">Department</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRequest.departmentName}</p>
                      </div>
                   </div>

                   <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-pink-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Mission Reason</span>
                      </div>
                      <p className="text-xs text-pink-200 font-medium italic">{selectedRequest.exitReason}</p>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => handleGateOut(selectedRequest.id)}
                     className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-pink-900/40 flex items-center justify-center gap-3 text-sm active:scale-95"
                   >
                     <PackageCheck className="w-5 h-5" />
                     CONFIRM ASSET GATE-OUT
                   </button>
                   <button 
                     onClick={() => setSelectedRequest(null)}
                     className="w-full py-4 text-[10px] font-black text-dark-text-subtle hover:text-white uppercase tracking-widest transition-all"
                   >
                     Cancel Verification
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
