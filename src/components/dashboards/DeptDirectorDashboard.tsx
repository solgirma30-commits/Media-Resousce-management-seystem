import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  ChevronRight,
  Phone,
  MapPin,
  Tag,
  X,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  Car,
  Users
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export function DeptDirectorDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'CAMERA' | 'VEHICLE'>('SERVICE');
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [directorComments, setDirectorComments] = useState('');
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // General Form states
  const [priority, setPriority] = useState('MEDIUM');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Service Request specific
  const [category, setCategory] = useState('Hardware');
  const [selectedFleetId, setSelectedFleetId] = useState('');

  // Camera Request specific
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cameraPurpose, setCameraPurpose] = useState('');

  // Vehicle Request specific
  const [destination, setDestination] = useState('');
  const [vehiclePurpose, setVehiclePurpose] = useState('');
  const [passengersCount, setPassengersCount] = useState(1);
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [retTime, setRetTime] = useState('');

  useEffect(() => {
    if (!profile) return;

    setLoading(true);

    // Service Requests
    const srPath = 'service_requests';
    const srQ = query(
      collection(db, srPath),
      where('directorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeSR = onSnapshot(srQ, (snapshot) => {
      setRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: srPath, ...doc.data() }))
          .filter((req: any) => !req.archived)
      );
      if (activeTab === 'SERVICE') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, srPath);
    });

    // Camera Requests
    const crPath = 'camera_requests';
    const crQ = query(
      collection(db, crPath),
      where('directorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeCR = onSnapshot(crQ, (snapshot) => {
      setCameraRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: crPath, ...doc.data() }))
          .filter((req: any) => !req.archived)
      );
      if (activeTab === 'CAMERA') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, crPath);
    });

    // Vehicle Requests
    const vrPath = 'vehicle_requests';
    const vrQ = query(
      collection(db, vrPath),
      where('directorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeVR = onSnapshot(vrQ, (snapshot) => {
      setVehicleRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: vrPath, ...doc.data() }))
          .filter((req: any) => !req.archived)
      );
      if (activeTab === 'VEHICLE') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, vrPath);
    });

    const fleetPath = 'fleet';
    const fleetQuery = query(collection(db, fleetPath), where('status', '==', 'OPERATIONAL'));
    const unsubscribeFleet = onSnapshot(fleetQuery, (snapshot) => {
      setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, fleetPath);
    });

    return () => {
      unsubscribeSR();
      unsubscribeCR();
      unsubscribeVR();
      unsubscribeFleet();
    };
  }, [profile, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (activeTab === 'SERVICE') {
        const path = 'service_requests';
        const newRequest = {
          departmentName: profile.department || 'Unknown Dept',
          directorName: profile.displayName,
          directorId: profile.uid,
          phoneNumber,
          location,
          serviceCategory: category,
          description,
          priority,
          fleetId: selectedFleetId || null,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, path), newRequest);
      } else if (activeTab === 'CAMERA') {
        const path = 'camera_requests';
        const newRequest = {
          requestId: `CR-${Date.now()}`,
          directorId: profile.uid,
          directorName: profile.displayName,
          departmentName: profile.department || 'Unknown Dept',
          eventTitle,
          location,
          date: eventDate,
          startTime,
          endTime,
          purpose: cameraPurpose,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, path), newRequest);
      } else if (activeTab === 'VEHICLE') {
        const path = 'vehicle_requests';
        const newRequest = {
          requestId: `VR-${Date.now()}`,
          directorId: profile.uid,
          directorName: profile.displayName,
          departmentName: profile.department || 'Unknown Dept',
          destination,
          purpose: vehiclePurpose,
          passengersCount,
          departureDate: depDate,
          departureTime: depTime,
          returnTime: retTime,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, path), newRequest);
      }

      toast.success('Request submitted for processing');
      setIsModalOpen(false);
      
      // Create notifications for Admins and relevant operators
      const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN')));
      const adminDocs = adminsSnapshot.docs;
      
      // Target roles based on request type
      let targetRole = '';
      if (activeTab === 'CAMERA') targetRole = 'CAMERAMAN';
      else if (activeTab === 'VEHICLE') targetRole = 'DRIVER';
      else if (activeTab === 'SERVICE') targetRole = 'TECHNICIAN';

      const staffSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', targetRole)));
      const staffDocs = staffSnapshot.docs;

      // Combine audiences (Admins + Relevant Staff)
      const audienceIds = Array.from(new Set([
        ...adminDocs.map(d => d.id),
        ...staffDocs.map(d => d.id)
      ]));

      const requestTypeLabel = activeTab === 'CAMERA' ? 'Camera' : activeTab === 'VEHICLE' ? 'Vehicle' : 'Service';
      
      const notificationPromises = audienceIds.map(userId => {
        const notificationId = `notif_new_${Date.now()}_${userId}`;
        return setDoc(doc(db, 'notifications', notificationId), {
          userId,
          title: `New ${requestTypeLabel} Request`,
          message: `A new ${requestTypeLabel.toLowerCase()} request has been submitted by ${profile.displayName} (${profile.department}).`,
          read: false,
          type: 'NEW_REQUEST',
          requestId: `REQ-${Date.now()}`, // Temporary or just context
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(notificationPromises);
      resetForm();
    } catch (error) {
      const path = activeTab === 'SERVICE' ? 'service_requests' : activeTab === 'CAMERA' ? 'camera_requests' : 'vehicle_requests';
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleConfirm = async (requestId: string) => {
    if (!selectedRequest) return;
    const colName = selectedRequest.collectionName || 'service_requests';
    const path = `${colName}/${requestId}`;
    try {
      await updateDoc(doc(db, colName, requestId), {
        status: 'CONFIRMED',
        directorComments,
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Completion confirmed');
      setDirectorComments('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const resetForm = () => {
    setDescription('');
    setCategory('Hardware');
    setLocation('');
    setPriority('MEDIUM');
    setPhoneNumber(profile?.phoneNumber || '');
    setSelectedFleetId('');
    setEventTitle('');
    setEventDate('');
    setStartTime('');
    setEndTime('');
    setCameraPurpose('');
    setDestination('');
    setVehiclePurpose('');
    setPassengersCount(1);
    setDepDate('');
    setDepTime('');
    setRetTime('');
  };

  const categories = ['Hardware', 'Software', 'Network', 'Electrical', 'Furniture', 'Other'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-200">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight">FMC REQUEST Portal</h1>
          <p className="text-dark-text-subtle mt-1 font-serif italic text-sm">Unified request management system</p>
        </div>
        <button
          id="new-request-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-dark-accent hover:bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all shadow-lg shadow-indigo-900/40 active:scale-95 text-[0.85rem]"
        >
          <Plus className="w-4 h-4" />
          Create New {activeTab === 'SERVICE' ? 'Service' : activeTab === 'CAMERA' ? 'Camera' : 'Vehicle'} Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border overflow-x-auto pb-px">
        <TabButton 
          active={activeTab === 'SERVICE'} 
          onClick={() => setActiveTab('SERVICE')} 
          icon={Tag} 
          label="Service & Repairs" 
          count={requests.length}
        />
        <TabButton 
          active={activeTab === 'CAMERA'} 
          onClick={() => setActiveTab('CAMERA')} 
          icon={Camera} 
          label="Camera Coverage" 
          count={cameraRequests.length}
        />
        <TabButton 
          active={activeTab === 'VEHICLE'} 
          onClick={() => setActiveTab('VEHICLE')} 
          icon={Car} 
          label="Vehicle Request" 
          count={vehicleRequests.length}
        />
      </div>

      {/* Stats row */}
      {activeTab === 'SERVICE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Requests" 
            value={requests.length} 
            icon={Tag} 
            color="text-indigo-400 bg-indigo-500/10" 
          />
          <StatCard 
            label="Active Tasks" 
            value={requests.filter(r => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length} 
            icon={Clock} 
            color="text-amber-400 bg-amber-500/10" 
          />
          <StatCard 
            label="Pending Sync" 
            value={requests.filter(r => r.status === 'COMPLETED').length} 
            icon={AlertCircle} 
            color="text-rose-400 bg-rose-500/10" 
          />
          <StatCard 
            label="Finalized" 
            value={requests.filter(r => ['CONFIRMED', 'CLOSED'].includes(r.status)).length} 
            icon={CheckCircle2} 
            color="text-emerald-400 bg-emerald-500/10" 
          />
        </div>
      )}

      {/* Requests List */}
      <div className="bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
            {activeTab === 'SERVICE' ? 'Service Log' : activeTab === 'CAMERA' ? 'Camera Coverage Log' : 'Transportation Log'}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
              <input 
                type="text" 
                placeholder="Find record..." 
                className="pl-9 pr-4 py-2 bg-dark-main border border-dark-border rounded-lg text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none w-48 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-dark-border">
          {loading ? (
             <div className="p-12 text-center text-dark-text-subtle">Retreiving records...</div>
          ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : vehicleRequests).length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-dark-main rounded-xl flex items-center justify-center mx-auto mb-4 border border-dark-border">
                {activeTab === 'SERVICE' ? <Clock className="w-8 h-8 text-dark-border" /> : activeTab === 'CAMERA' ? <Camera className="w-8 h-8 text-dark-border" /> : <Car className="w-8 h-8 text-dark-border" />}
              </div>
              <p className="text-slate-400 font-medium">No records found</p>
              <p className="text-dark-text-subtle text-xs mt-1">Submit a new request to populate your logs</p>
            </div>
          ) : (
            (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : vehicleRequests).map((request) => (
              <motion.div 
                layout
                key={request.id} 
                className="p-6 hover:bg-dark-main/40 transition-colors group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn("status-pill", getStatusStyle(request.status))}>
                        {request.status.replace('_', ' ')}
                      </span>
                      {request.priority && (
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                          request.priority === 'URGENT' ? 'text-red-400 border-red-500/20 bg-red-500/5' : 
                          request.priority === 'HIGH' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' : 'text-slate-400 border-dark-border bg-dark-main'
                        )}>
                          {request.priority}
                        </span>
                      )}
                      <span className="text-[10px] text-dark-text-subtle flex items-center gap-1 font-mono uppercase tracking-tighter">
                        <Clock className="w-3 h-3 opacity-50" />
                        {request.createdAt ? format(request.createdAt.toDate(), 'MMM d, HH:mm') : 'Syncing...'}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-slate-200 text-lg group-hover:text-white transition-colors">
                      {activeTab === 'SERVICE' ? request.description : activeTab === 'CAMERA' ? request.eventTitle : request.destination}
                    </h4>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[0.75rem] text-dark-text-subtle font-medium">
                      {activeTab === 'SERVICE' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            {request.serviceCategory}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            {request.location}
                          </div>
                        </>
                      )}
                      {activeTab === 'CAMERA' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            {request.date} ({request.startTime} - {request.endTime})
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            {request.location}
                          </div>
                        </>
                      )}
                      {activeTab === 'VEHICLE' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            {request.departureDate} @ {request.departureTime}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            {request.passengersCount} Passengers
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button 
                      onClick={() => setSelectedRequest(request)}
                      className="p-2 border border-dark-border rounded-lg text-dark-text-subtle hover:text-white hover:bg-dark-card transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* New Request Modal */}
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
               className="relative w-full max-w-xl bg-dark-card rounded-2xl border border-dark-border shadow-2xl overflow-hidden"
             >
                <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-medium text-white tracking-tight">Request Details</h2>
                      <p className="text-dark-text-subtle text-sm mt-1">Status: {selectedRequest.status.replace('_', ' ')}</p>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="p-10 space-y-8">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                           {activeTab === 'VEHICLE' ? 'Driver Details' : 'Assigned Agent'}
                         </p>
                         <p className="text-sm font-medium text-slate-200">
                           {activeTab === 'VEHICLE' 
                             ? (selectedRequest.assignedDriverName || 'Pending Allocation')
                             : (selectedRequest.assignedTechnicianName || 'Pending Assignment')}
                         </p>
                         {(selectedRequest.assignedDriverPhone || selectedRequest.assignedTechnicianPhone) && (
                           <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-border/10">
                             <Phone className="w-3 h-3 text-dark-accent" />
                             <span className="text-[11px] font-mono text-dark-text-subtle">
                               {selectedRequest.assignedDriverPhone || selectedRequest.assignedTechnicianPhone}
                             </span>
                           </div>
                         )}
                      </div>
                      <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Fleet Asset</p>
                         <p className="text-sm font-medium text-slate-200">
                            {selectedRequest.fleetId ? (
                              fleet.find(f => f.id === selectedRequest.fleetId)?.plateNumber || 'Linked Asset'
                            ) : 'No specific asset'}
                         </p>
                      </div>
                   </div>

                   <div className="p-6 bg-dark-main border border-dark-border rounded-xl">
                      <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">
                        {activeTab === 'SERVICE' ? 'Incident Description' : activeTab === 'CAMERA' ? 'Purpose / Equipment' : 'Trip Purpose'}
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {activeTab === 'SERVICE' ? selectedRequest.description : activeTab === 'CAMERA' ? selectedRequest.purpose : selectedRequest.purpose}
                      </p>
                   </div>

                   {activeTab === 'CAMERA' && (
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Start Time</p>
                           <p className="text-sm font-medium text-slate-200">{selectedRequest.startTime}</p>
                        </div>
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">End Time</p>
                           <p className="text-sm font-medium text-slate-200">{selectedRequest.endTime}</p>
                        </div>
                     </div>
                   )}

                   {activeTab === 'VEHICLE' && (
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Passengers</p>
                           <p className="text-sm font-medium text-slate-200">{selectedRequest.passengersCount}</p>
                        </div>
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Return Time</p>
                           <p className="text-sm font-medium text-slate-200">{selectedRequest.returnTime}</p>
                        </div>
                     </div>
                   )}

                   {['COMPLETED', 'CONFIRMED', 'CLOSED'].includes(selectedRequest.status) && (
                     <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3" />
                            {activeTab === 'VEHICLE' ? 'Mission Report' : activeTab === 'CAMERA' ? 'Event Report' : 'Work Completion Summary'}
                          </label>
                          <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 text-sm text-slate-300 font-serif italic border-dashed">
                            {(activeTab === 'VEHICLE' ? selectedRequest.driverNotes : selectedRequest.technicianNotes) || "No summary provided by agent."}
                          </div>
                        </div>

                        {selectedRequest.completionImageUrl && (
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                               <ImageIcon className="w-3 h-3" />
                               Operation Outcome Reference
                             </label>
                             <div className="relative group max-w-sm overflow-hidden rounded-2xl border border-dark-border">
                               <img src={selectedRequest.completionImageUrl} alt="Maintenance outcome" className="w-full aspect-video object-cover" />
                             </div>
                          </div>
                        )}

                        {selectedRequest.status === 'COMPLETED' && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                             <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                               <MessageSquare className="w-3 h-3" />
                               Quality of Service Feedback / Comments
                             </label>
                             <textarea
                               placeholder="Add your comments or feedback on the completed work..."
                               value={directorComments}
                               onChange={(e) => setDirectorComments(e.target.value)}
                               className="w-full bg-dark-main border border-dark-border rounded-xl p-5 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                             />
                          </div>
                        )}

                        {selectedRequest.directorComments && selectedRequest.status !== 'COMPLETED' && (
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                               <MessageSquare className="w-3 h-3" />
                               Your Feedback
                             </label>
                             <div className="w-full bg-dark-main/40 border border-dark-border rounded-xl p-5 text-sm text-slate-300 italic border-dotted">
                               {selectedRequest.directorComments}
                             </div>
                          </div>
                        )}
                     </div>
                   )}

                   <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedRequest(null)}
                        className="flex-1 px-8 py-4 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white hover:border-white transition-all tracking-widest"
                      >
                        Close View
                      </button>
                      {selectedRequest.status === 'COMPLETED' && (
                        <button 
                          onClick={() => {
                            handleConfirm(selectedRequest.id);
                            setSelectedRequest(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-3"
                        >
                           <CheckCircle2 className="w-5 h-5" />
                           Confirm Sync
                        </button>
                      )}
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-dark-main/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-dark-border bg-dark-card/50">
                <h2 className="text-2xl font-medium text-white tracking-tight">
                  {activeTab === 'SERVICE' ? 'Initialize Service Request' : activeTab === 'CAMERA' ? 'Request Camera Coverage' : 'Request Vehicle Assignment'}
                </h2>
                <p className="text-dark-text-subtle text-sm mt-1">
                  {activeTab === 'SERVICE' ? 'Specify operational details for the technical team' : activeTab === 'CAMERA' ? 'Describe the event and coverage requirements' : 'Define destination and trip specifications'}
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                {activeTab === 'SERVICE' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Service Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Fleet Asset (Optional)</label>
                        <select
                          value={selectedFleetId}
                          onChange={(e) => setSelectedFleetId(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
                        >
                          <option value="">No specific asset</option>
                          {fleet.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.plateNumber} ({f.model})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Priority Vector</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all font-bold appearance-none"
                        >
                          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Deployment Zone</label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
                          <input
                            required
                            type="text"
                            placeholder="Location ID"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Communication Link</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
                        <input
                          required
                          type="tel"
                          placeholder="Direct phone"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Issue Specifications</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Provide technical descriptors..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'CAMERA' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Event Title</label>
                      <input
                        required
                        type="text"
                        placeholder="Event name or project title"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Deployment Zone</label>
                        <input
                          required
                          type="text"
                          placeholder="Location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Event Date</label>
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Start Time</label>
                        <input
                          required
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">End Time</label>
                        <input
                          required
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Purpose / Equipment Needed</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain coverage requirements..."
                        value={cameraPurpose}
                        onChange={(e) => setCameraPurpose(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'VEHICLE' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Destination</label>
                      <input
                        required
                        type="text"
                        placeholder="Trip destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Passengers</label>
                        <input
                          required
                          type="number"
                          min={1}
                          value={passengersCount}
                          onChange={(e) => setPassengersCount(parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Departure Date</label>
                        <input
                          required
                          type="date"
                          value={depDate}
                          onChange={(e) => setDepDate(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Departure Time</label>
                        <input
                          required
                          type="time"
                          value={depTime}
                          onChange={(e) => setDepTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Estimated Return</label>
                        <input
                          required
                          type="time"
                          value={retTime}
                          onChange={(e) => setRetTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Purpose of Trip</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain mission details..."
                        value={vehiclePurpose}
                        onChange={(e) => setVehiclePurpose(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-slate-300 focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-lg bg-dark-main text-dark-text-muted font-bold hover:text-white transition-all border border-dark-border text-[0.8rem]"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 rounded-lg bg-dark-accent text-white font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-900/30 active:scale-95 text-[0.8rem]"
                  >
                    Submit Payload
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative",
        active 
          ? "text-white border-dark-accent bg-dark-accent/5" 
          : "text-dark-text-subtle border-transparent hover:text-white hover:bg-dark-card"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", active ? "text-dark-accent" : "text-dark-text-muted")} />
      {label}
      {count > 0 && <span className="text-[10px] opacity-40 ml-1">({count})</span>}
      {active && (
        <motion.div 
          layoutId="activeTab" 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-dark-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
        />
      )}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-dark-card p-6 rounded-xl border border-dark-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-mono font-bold text-white tracking-widest">{value.toString().padStart(3, '0')}</p>
        <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">{label}</p>
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
