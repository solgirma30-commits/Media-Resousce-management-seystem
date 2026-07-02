import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  User,
  Building2,
  CalendarDays
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../App';
import { cn } from '../../lib/utils';

export function SupervisorDashboard() {
  const { profile } = useAuth();
  const [studioRequests, setStudioRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'TV' | 'RADIO' | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await dataService.list<any>('studio_requests');
        if (!isMounted) return;

        const approved = data.filter((req: any) => req.status === 'APPROVED');
        // Sort locally
        const sorted = approved.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setStudioRequests(sorted);
      } catch (error) {
        console.warn("SupervisorDashboard fetch error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Poll every 30s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile]);

  const filteredRequests = studioRequests.filter(req => {
    if (activeTab !== 'ALL' && req.studioCategory !== activeTab) return false;
    const term = searchQuery.toLowerCase();
    return (req.eventName && req.eventName.toLowerCase().includes(term)) ||
           (req.requestedPerson && req.requestedPerson.toLowerCase().includes(term)) ||
           (req.departmentName && req.departmentName.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Studio Monitor</h1>
          <p className="text-sm text-slate-500 font-medium">Monitoring all approved studio bookings across the network.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-4">
            <button 
              onClick={() => setActiveTab('ALL')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'ALL' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              All
            </button>
            <button 
              onClick={() => setActiveTab('TV')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'TV' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              TV Booking Approval
            </button>
            <button 
              onClick={() => setActiveTab('RADIO')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'RADIO' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Radio Booking Approval
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List View */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Live Feed • {filteredRequests.length} Approved
            </span>
          </div>
          
          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 animate-pulse">
                    <div className="h-4 w-1/3 bg-slate-100 rounded mb-3"></div>
                    <div className="h-6 w-3/4 bg-slate-100 rounded mb-2"></div>
                    <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                  </div>
                ))
              ) : filteredRequests.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Video className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <p className="text-sm font-medium text-slate-500">No approved studio bookings found.</p>
                </div>
              ) : (
                filteredRequests.map((req, idx) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={`stu-req-${req.id}-${idx}`}
                    onClick={() => setSelectedRequest(req)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                      selectedRequest?.id === req.id
                        ? "bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-100"
                        : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-100">
                        APPROVED
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono tracking-tighter">
                          {req.time || 'TBD'}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className={cn(
                      "font-bold text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors",
                      selectedRequest?.id === req.id ? "text-indigo-900" : "text-slate-900"
                    )}>
                      {req.eventName || 'Untitled Production'}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{req.departmentName || 'General Operation'}</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-600">{req.date || 'No Date'}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details →
                      </span>
                    </div>

                    {selectedRequest?.id === req.id && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"
                      />
                    )}
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!selectedRequest ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                  <Video className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Queue Monitor Active</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Global view of all studio operations. Select a booking from the feed to examine parameters.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedRequest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Approval
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 border border-slate-200 rounded-md">
                      UID: {selectedRequest.id.slice(0, 12)}
                    </span>
                  </div>

                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {selectedRequest.eventName || 'Untitled Studio Production'}
                  </h2>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Department</p>
                        <p className="text-sm font-bold text-slate-700">{selectedRequest.departmentName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Video className="w-3 h-3" /> Category
                      </p>
                      <p className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest inline-block",
                        selectedRequest.studioCategory === 'TV' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                      )}>
                        {selectedRequest.studioCategory || 'Studio'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" /> Date
                      </p>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.date || "Not Specified"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Time
                      </p>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.time || "Not Specified"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Guest Total
                      </p>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.guestCount || 1}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Video className="w-3 h-3" /> Camera Rig
                      </p>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.cameraCount || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-indigo-50/30 rounded-2xl p-6 border border-indigo-100/50">
                      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Operational Personnel
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">Lead Host / Subject</p>
                          <p className="text-sm text-slate-900 font-bold border-l-2 border-indigo-200 pl-3">
                            {selectedRequest.requestedPerson || "System Reserved"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">Representative / Contact</p>
                          <p className="text-sm text-slate-900 font-bold border-l-2 border-indigo-200 pl-3">
                            {selectedRequest.requesterName || "Internal System"}
                          </p>
                        </div>
                      </div>
                    </div>
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
