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
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'CAMERA' | 'VEHICLE' | 'ITEM' | 'OTHER'>('SERVICE');
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [itemRequests, setItemRequests] = useState<any[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [directorComments, setDirectorComments] = useState('');
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // General Form states
  const [priority, setPriority] = useState('MEDIUM');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [workName, setWorkName] = useState('');

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

  // Item Exit specific
  const [itemName, setItemName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  // Other Device Request unique
  const [deviceModel, setDeviceModel] = useState('');
  const [requestQty, setRequestQty] = useState(1);
  const [needDate, setNeedDate] = useState('');

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

    // Item Exit Requests
    const irPath = 'item_requests';
    const irQ = query(
      collection(db, irPath),
      where('directorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeIR = onSnapshot(irQ, (snapshot) => {
      setItemRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: irPath, ...doc.data() }))
          .filter((req: any) => !req.archived)
      );
      if (activeTab === 'ITEM') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, irPath);
    });

    // Device Requests (Other)
    const drPath = 'device_requests';
    const drQ = query(
      collection(db, drPath),
      where('directorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeDR = onSnapshot(drQ, (snapshot) => {
      setDeviceRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: drPath, ...doc.data() }))
          .filter((req: any) => !req.archived)
      );
      if (activeTab === 'OTHER') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, drPath);
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
      unsubscribeIR();
      unsubscribeDR();
      unsubscribeFleet();
    };
  }, [profile, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      let docRef;
      if (activeTab === 'SERVICE') {
        const path = 'service_requests';
        const newRequest = {
          departmentName: profile.department || 'Unknown Dept',
          directorName: profile.displayName,
          directorId: profile.uid,
          phoneNumber,
          location,
          serviceCategory: category,
          workName,
          description,
          priority,
          fleetId: selectedFleetId || null,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        docRef = await addDoc(collection(db, path), newRequest);
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
        docRef = await addDoc(collection(db, path), newRequest);
      } else if (activeTab === 'VEHICLE') {
        const path = 'vehicle_requests';
        const newRequest = {
          requestId: `VR-${Date.now()}`,
          directorId: profile.uid,
          directorName: profile.displayName,
          departmentName: profile.department || 'Unknown Dept',
          destination,
          tripName: workName,
          purpose: vehiclePurpose,
          passengersCount,
          departureDate: depDate,
          departureTime: depTime,
          returnTime: retTime,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        docRef = await addDoc(collection(db, path), newRequest);
      } else if (activeTab === 'ITEM') {
        const path = 'item_requests';
        const newRequest = {
          requestId: `EX-${Date.now()}`,
          directorId: profile.uid,
          directorName: profile.displayName,
          departmentName: profile.department || 'Unknown Dept',
          itemName,
          serialNumber,
          purpose: exitReason,
          expectedReturnDate,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        docRef = await addDoc(collection(db, path), newRequest);
      } else if (activeTab === 'OTHER') {
        const path = 'device_requests';
        const newRequest = {
          requestId: `DEV-${Date.now()}`,
          directorId: profile.uid,
          directorName: profile.displayName,
          departmentName: profile.department || 'Unknown Dept',
          projectName: workName,
          deviceModel,
          quantity: requestQty,
          purpose: description,
          neededBy: needDate,
          status: 'NEW',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        docRef = await addDoc(collection(db, path), newRequest);
      }

      toast.success('Request submitted for processing');
      setIsModalOpen(false);
      
      const realRequestId = docRef?.id || `REQ-${Date.now()}`;
      
      // Create notifications for Admins and relevant operators
      const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN')));
      const adminDocs = adminsSnapshot.docs;
      
      // Target roles based on request type
      let targetRole = '';
      if (activeTab === 'CAMERA') targetRole = 'CAMERAMAN';
      else if (activeTab === 'VEHICLE') targetRole = 'DRIVER';
      else if (activeTab === 'SERVICE') targetRole = 'TECHNICIAN';
      else if (activeTab === 'ITEM') targetRole = 'SECURITY';
      else if (activeTab === 'OTHER') targetRole = 'TECHNICIAN'; // Generic device requests go to Tech Team

      const staffSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', targetRole)));
      const staffDocs = staffSnapshot.docs;

      // Combine audiences (Admins + Relevant Staff)
      const audienceIds = Array.from(new Set([
        ...adminDocs.map(d => d.id),
        ...staffDocs.map(d => d.id)
      ]));

      const requestTypeLabel = activeTab === 'CAMERA' ? 'Camera' : activeTab === 'VEHICLE' ? 'Vehicle' : activeTab === 'ITEM' ? 'Exit Permit' : activeTab === 'OTHER' ? 'Device Request' : 'Service';
      const displayName = activeTab === 'SERVICE' ? workName : activeTab === 'CAMERA' ? eventTitle : activeTab === 'ITEM' ? itemName : activeTab === 'OTHER' ? deviceModel : workName;
      const notificationTitle = `[${profile.department}] ${requestTypeLabel}: ${displayName}`;
      const notificationMessage = `ALERT: ${profile.displayName} submitted a new ${requestTypeLabel.toLowerCase()} request: "${displayName}" for ${location || destination || 'unspecified site'}.`;
      
      const notificationPromises = audienceIds.map(userId => {
        const notificationId = `notif_new_${Date.now()}_${userId}`;
        return setDoc(doc(db, 'notifications', notificationId), {
          userId,
          title: notificationTitle,
          message: notificationMessage,
          read: false,
          role: 'ADMIN_OR_STAFF', // Helpful for filtering if needed
          type: 'NEW_REQUEST',
          requestId: realRequestId, 
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

  const handleClearSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No records selected');
      return;
    }

    const confirm = window.confirm(`Archive ${selectedIds.size} selected records from your log?`);
    if (!confirm) return;

    const currentTabRequests = activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests;
    
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const req = currentTabRequests.find(r => r.id === id);
        if (req) {
          const collectionName = (req as any).collectionName || 'service_requests';
          return updateDoc(doc(db, collectionName, id), {
            archived: true,
            updatedAt: serverTimestamp()
          });
        }
      });

      await Promise.all(promises);
      toast.success(`${selectedIds.size} records archived`);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (error) {
      toast.error('Failed to clear some records');
      console.error(error);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resetForm = () => {
    setWorkName('');
    setDescription('');
    setCategory('Hardware');
    setLocation('');
    setPriority('MEDIUM');
    setPhoneNumber(profile?.phoneNumber || '');
    setSelectedFleetId('');
    setItemName('');
    setSerialNumber('');
    setExitReason('');
    setExpectedReturnDate('');
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
    setDeviceModel('');
    setRequestQty(1);
    setNeedDate('');
  };

  const categories = ['Hardware', 'Software', 'Network', 'Electrical', 'Furniture', 'Other'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-slate-950 tracking-tight">FMC REQUEST Portal</h1>
          <p className="text-dark-text-subtle mt-1 font-serif italic text-sm">Unified request management system</p>
        </div>
        <button
          id="new-request-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-dark-accent hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-lg transition-all shadow-lg shadow-indigo-900/40 active:scale-95 text-[0.85rem]"
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
        <TabButton 
          active={activeTab === 'ITEM'} 
          onClick={() => setActiveTab('ITEM')} 
          icon={Tag} 
          label="Item Exit Permit" 
          count={itemRequests.length}
        />
        <TabButton 
          active={activeTab === 'OTHER'} 
          onClick={() => setActiveTab('OTHER')} 
          icon={Plus} 
          label="Other Request" 
          count={deviceRequests.length}
        />
      </div>

      {/* Stats row */}
      {activeTab === 'SERVICE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Requests" 
            value={requests.length} 
            icon={Tag} 
            color="text-indigo-700 bg-indigo-500/10" 
          />
          <StatCard 
            label="Active Tasks" 
            value={requests.filter(r => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length} 
            icon={Clock} 
            color="text-amber-700 bg-amber-500/10" 
          />
          <StatCard 
            label="Pending Sync" 
            value={requests.filter(r => r.status === 'COMPLETED').length} 
            icon={AlertCircle} 
            color="text-rose-700 bg-rose-500/10" 
          />
          <StatCard 
            label="Finalized" 
            value={requests.filter(r => ['CONFIRMED', 'CLOSED'].includes(r.status)).length} 
            icon={CheckCircle2} 
            color="text-emerald-700 bg-emerald-500/10" 
          />
        </div>
      )}

      {/* Requests List */}
      <div className="bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
            {activeTab === 'SERVICE' ? 'Service Log' : activeTab === 'CAMERA' ? 'Camera Coverage Log' : activeTab === 'VEHICLE' ? 'Transportation Log' : activeTab === 'ITEM' ? 'Exit Permit Log' : 'Other Device Log'}
          </h3>
          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-black text-dark-accent mr-2 uppercase tracking-widest">{selectedIds.size} Selected</span>
                <button 
                  onClick={handleClearSelected}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-20"
                >
                  Archive Selected
                </button>
                <button 
                  onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                  className="px-4 py-1.5 bg-dark-main border border-dark-border text-dark-text-subtle rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSelectMode(true)}
                className="px-4 py-1.5 bg-dark-main border border-dark-border text-dark-text-subtle rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2"
              >
                Select Mode
              </button>
            )}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
              <input 
                type="text" 
                placeholder="Find record..." 
                className="pl-9 pr-4 py-2 bg-dark-main border border-dark-border rounded-lg text-xs text-black font-bold focus:ring-1 focus:ring-indigo-500 outline-none w-48 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-dark-border">
          {loading ? (
             <div className="p-12 text-center text-dark-text-subtle">Retreiving records...</div>
          ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-dark-main rounded-xl flex items-center justify-center mx-auto mb-4 border border-dark-border">
                {activeTab === 'SERVICE' ? <Clock className="w-8 h-8 text-dark-border" /> : activeTab === 'CAMERA' ? <Camera className="w-8 h-8 text-dark-border" /> : activeTab === 'VEHICLE' ? <Car className="w-8 h-8 text-dark-border" /> : activeTab === 'ITEM' ? <Tag className="w-8 h-8 text-dark-border" /> : <Plus className="w-8 h-8 text-dark-border" />}
              </div>
              <p className="text-slate-400 font-medium">No records found</p>
              <p className="text-dark-text-subtle text-xs mt-1">Submit a new request to populate your logs</p>
            </div>
          ) : (
            (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).map((request) => (
              <motion.div 
                layout
                key={request.id} 
                onClick={() => isSelectMode && toggleSelect(request.id)}
                className={cn(
                  "p-6 transition-colors group relative cursor-pointer",
                  isSelectMode && selectedIds.has(request.id) ? "bg-dark-accent/5" : "hover:bg-dark-main/40"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {isSelectMode && (
                    <div className="shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        selectedIds.has(request.id) ? "bg-dark-accent border-dark-accent" : "border-dark-border bg-dark-main"
                      )}>
                        {selectedIds.has(request.id) && <Plus className="w-3 h-3 text-white rotate-45" />}
                        {/* Using rotate-45 Plus as a checkmark if Check isn't imported, but Check is likely there if CheckCircle2 is. Wait, Lucide has Check. */}
                        {selectedIds.has(request.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-dark-accent bg-dark-accent/10 px-2 py-0.5 rounded border border-dark-accent/20 font-mono">
                        {activeTab === 'SERVICE' ? (request.workName || 'UNNAMED JOB') : activeTab === 'CAMERA' ? (request.eventTitle || 'UNNAMED EVENT') : activeTab === 'ITEM' ? (request.itemName || 'UNNAMED ITEM') : activeTab === 'OTHER' ? (request.projectName || 'UNNAMED DEVICE REQ') : (request.tripName || 'UNNAMED TRIP')}
                      </span>
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
                      <span className="text-[10px] text-black flex items-center gap-1 font-mono uppercase tracking-tighter">
                        <Clock className="w-3 h-3 opacity-50" />
                        {request.createdAt ? format(request.createdAt.toDate(), 'MMM d, HH:mm') : 'Syncing...'}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-slate-900 text-lg group-hover:text-slate-950 transition-colors">
                      {activeTab === 'SERVICE' ? request.description : activeTab === 'CAMERA' ? request.purpose : activeTab === 'ITEM' ? request.purpose : activeTab === 'OTHER' ? request.deviceModel : request.destination}
                    </h4>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[0.75rem] text-black font-medium">
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
                      {activeTab === 'OTHER' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            Qty: {request.quantity}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Needed By: {request.neededBy}
                          </div>
                        </>
                      )}
                      {activeTab === 'ITEM' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            S/N: {request.serialNumber || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Return: {request.expectedReturnDate || 'Permanent'}
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
                      <h2 className="text-2xl font-medium text-slate-950 tracking-tight">Request Details</h2>
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
                         <p className="text-sm font-black text-black">
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
                         <p className="text-sm font-black text-black">
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
                      <p className="text-sm text-black font-bold leading-relaxed">
                        {activeTab === 'SERVICE' ? selectedRequest.description : activeTab === 'CAMERA' ? selectedRequest.purpose : selectedRequest.purpose}
                      </p>
                   </div>

                   {activeTab === 'CAMERA' && (
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Start Time</p>
                           <p className="text-sm font-black text-black">{selectedRequest.startTime}</p>
                        </div>
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">End Time</p>
                           <p className="text-sm font-black text-black">{selectedRequest.endTime}</p>
                        </div>
                     </div>
                   )}

                   {activeTab === 'VEHICLE' && (
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Passengers</p>
                           <p className="text-sm font-black text-black">{selectedRequest.passengersCount}</p>
                        </div>
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Return Time</p>
                           <p className="text-sm font-black text-black">{selectedRequest.returnTime}</p>
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
                          <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 text-sm text-black font-bold font-serif italic border-dashed">
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
                               className="w-full bg-dark-main border border-dark-border rounded-xl p-5 text-sm text-black font-bold focus:ring-1 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                             />
                          </div>
                        )}

                        {selectedRequest.directorComments && selectedRequest.status !== 'COMPLETED' && (
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                               <MessageSquare className="w-3 h-3" />
                               Your Feedback
                             </label>
                             <div className="w-full bg-dark-main/40 border border-dark-border rounded-xl p-5 text-sm text-black font-bold italic border-dotted">
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
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Fleet Asset (Optional)</label>
                        <select
                          value={selectedFleetId}
                          onChange={(e) => setSelectedFleetId(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
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
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
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
                            className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
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
                          className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Work Name / Title</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g., Office AC Repair"
                        value={workName}
                        onChange={(e) => setWorkName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold placeholder:text-dark-text-muted/50 focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Issue Specifications</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Provide technical descriptors..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold placeholder:text-dark-text-muted/50 focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'OTHER' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Project / Work Name</label>
                      <input
                        required
                        type="text"
                        placeholder="Project name using the device"
                        value={workName}
                        onChange={(e) => setWorkName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Device Model / Type</label>
                      <input
                        required
                        type="text"
                        placeholder="Specify device needed"
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Quantity</label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={requestQty}
                          onChange={(e) => setRequestQty(parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Needed By Date</label>
                        <input
                          required
                          type="date"
                          value={needDate}
                          onChange={(e) => setNeedDate(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Reason for Request</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain why this device is needed"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'CAMERA' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Event Title</label>
                      <input
                        required
                        type="text"
                        placeholder="Event name or project title"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
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
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Event Date</label>
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Start Time</label>
                        <input
                          required
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">End Time</label>
                        <input
                          required
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Purpose / Equipment Needed</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain coverage requirements..."
                        value={cameraPurpose}
                        onChange={(e) => setCameraPurpose(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'VEHICLE' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Trip Name / Purpose Title</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g., Site Inspection Trip"
                        value={workName}
                        onChange={(e) => setWorkName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Destination</label>
                      <input
                        required
                        type="text"
                        placeholder="Trip destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Passengers</label>
                        <input
                          required
                          type="number"
                          min={1}
                          value={passengersCount}
                          onChange={(e) => setPassengersCount(parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Departure Date</label>
                        <input
                          required
                          type="date"
                          value={depDate}
                          onChange={(e) => setDepDate(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Departure Time</label>
                        <input
                          required
                          type="time"
                          value={depTime}
                          onChange={(e) => setDepTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Estimated Return</label>
                        <input
                          required
                          type="time"
                          value={retTime}
                          onChange={(e) => setRetTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Purpose of Trip</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain mission details..."
                        value={vehiclePurpose}
                        onChange={(e) => setVehiclePurpose(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'ITEM' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Item Name / Model</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g., Dell Laptop XPS 15"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Serial Number / Asset Tag</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g., S/N 12345678"
                          value={serialNumber}
                          onChange={(e) => setSerialNumber(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Expected Return Date (Optional)</label>
                      <input
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                      <p className="text-[10px] text-dark-text-subtle mt-1 italic font-serif">Leave blank if the item is not expected to return</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Reason for Exit</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain why this item is leaving the premises..."
                        value={exitReason}
                        onChange={(e) => setExitReason(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
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
        <p className="text-3xl font-mono font-bold text-black tracking-widest">{value.toString().padStart(3, '0')}</p>
        <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">{label}</p>
      </div>
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
    case 'CONFIRMED': return 'bg-slate-500/10 text-emerald-800 border border-emerald-500/20';
    case 'CLOSED': return 'bg-slate-500/20 text-slate-800 border border-slate-500/30';
    case 'EXITED': return 'bg-pink-500/10 text-pink-700 border border-pink-500/20';
    case 'RETURNED': return 'bg-teal-500/10 text-teal-700 border border-teal-500/20';
    default: return 'bg-slate-500/10 text-slate-700 border border-slate-500/20';
  }
};
