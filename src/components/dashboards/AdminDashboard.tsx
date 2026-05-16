import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Clock, 
  MoreHorizontal,
  ChevronRight,
  UserPlus,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  X,
  Settings,
  ClipboardList,
  FileText,
  MessageSquare,
  Phone,
  Camera,
  Car,
  Image as ImageIcon
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  updateDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { WeeklyReport } from '../WeeklyReport';

export function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'CAMERA' | 'VEHICLE'>('SERVICE');
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [cameramen, setCameramen] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isFleetAssetModalOpen, setIsFleetAssetModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [selectedTechForSms, setSelectedTechForSms] = useState<any | null>(null);
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // Fleet Asset Form
  const [assetPlate, setAssetPlate] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetType, setAssetType] = useState('VEHICLE');
  const [assetStatus, setAssetStatus] = useState('OPERATIONAL');
  const [assetDept, setAssetDept] = useState('');

  useEffect(() => {
    const srPath = 'service_requests';
    const q = query(collection(db, srPath), orderBy('createdAt', 'desc'));
    const unsubscribeReq = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, srPath);
    });

    const camPath = 'camera_requests';
    const qCam = query(collection(db, camPath), orderBy('createdAt', 'desc'));
    const unsubscribeCam = onSnapshot(qCam, (snapshot) => {
      setCameraRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, camPath);
    });

    const vehPath = 'vehicle_requests';
    const qVeh = query(collection(db, vehPath), orderBy('createdAt', 'desc'));
    const unsubscribeVeh = onSnapshot(qVeh, (snapshot) => {
      setVehicleRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, vehPath);
    });

    const userPath = 'users';
    // Fetch all workforce users to avoid complex indexing issues in early setup
    const unsubscribeTech = onSnapshot(collection(db, userPath), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const techList = allUsers.filter((u: any) => 
        u.role === 'TECHNICIAN' || u.id === profile?.uid
      );
      const driverList = allUsers.filter((u: any) => 
        u.role === 'DRIVER' || u.id === profile?.uid
      );
      const cameraList = allUsers.filter((u: any) => 
        u.role === 'CAMERAMAN' || u.id === profile?.uid
      );
      setTechnicians(techList);
      setDrivers(driverList);
      setCameramen(cameraList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, userPath);
    });

    const fleetPath = 'fleet';
    const unsubscribeFleet = onSnapshot(collection(db, fleetPath), (snapshot) => {
      setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, fleetPath);
    });

    return () => {
      unsubscribeReq();
      unsubscribeCam();
      unsubscribeVeh();
      unsubscribeTech();
      unsubscribeFleet();
    };
  }, []);

  const collectionMap = {
    SERVICE: 'service_requests',
    CAMERA: 'camera_requests',
    VEHICLE: 'vehicle_requests'
  };

  const handleApprove = async (requestId: string, directorId: string) => {
    const colName = collectionMap[activeTab];
    const path = `${colName}/${requestId}`;
    try {
      await updateDoc(doc(db, colName, requestId), {
        status: 'APPROVED',
        updatedAt: serverTimestamp(),
      });

      // Create notification for director
      const notificationId = `notif_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        userId: directorId,
        title: 'Request Approved',
        message: `Your ${activeTab.toLowerCase()} request #${requestId.slice(-6).toUpperCase()} has been approved and moved to the dispatch queue.`,
        read: false,
        type: 'APPROVAL',
        requestId: requestId,
        createdAt: serverTimestamp(),
      });

      toast.success('Request approved');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleAssign = async (requestId: string, tech: any, directorId: string) => {
    const colName = collectionMap[activeTab];
    const path = `${colName}/${requestId}`;
    try {
      const updateData: any = {
        status: 'ASSIGNED',
        updatedAt: serverTimestamp(),
      };

      if (activeTab === 'VEHICLE') {
        updateData.assignedDriverId = tech.id;
        updateData.assignedDriverName = tech.displayName;
      } else {
        updateData.assignedTechnicianId = tech.id;
        updateData.assignedTechnicianName = tech.displayName;
      }

      await updateDoc(doc(db, colName, requestId), updateData);

      // Create in-app notification for technician
      const techNotificationId = `notif_tech_${Date.now()}_${tech.id}`;
      await setDoc(doc(db, 'notifications', techNotificationId), {
        userId: tech.id,
        title: `New ${activeTab === 'VEHICLE' ? 'Driver' : activeTab === 'CAMERA' ? 'Cameraman' : 'Dispatch'} Assignment`,
        message: `You have been assigned to ${activeTab.toLowerCase()} request #${requestId.slice(-6).toUpperCase()}`,
        read: false,
        type: 'ASSIGNMENT',
        requestId: requestId,
        createdAt: serverTimestamp(),
      });

      // Create notification for director
      const dirNotificationId = `notif_dir_${Date.now()}_${directorId}`;
      await setDoc(doc(db, 'notifications', dirNotificationId), {
        userId: directorId,
        title: `${activeTab === 'VEHICLE' ? 'Driver' : activeTab === 'CAMERA' ? 'Cameraman' : 'Technician'} Assigned`,
        message: `${activeTab === 'VEHICLE' ? 'Driver' : activeTab === 'CAMERA' ? 'Cameraman' : 'Technician'} ${tech.displayName} has been assigned to your request #${requestId.slice(-6).toUpperCase()}`,
        read: false,
        type: 'ASSIGNMENT',
        requestId: requestId,
        createdAt: serverTimestamp(),
      });

      toast.success(`${tech.displayName} assigned`);
      
      if (tech.phoneNumber) {
        const smsMessage = `Vector System: You have been assigned to ${activeTab.toLowerCase()} request #${requestId.slice(-6).toUpperCase()}. Please check your portal.`;
        
        toast.promise(
          fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              to: tech.phoneNumber, 
              message: smsMessage 
            }),
          }).then((res) => {
            if (!res.ok) throw new Error('SMS Gateway failure');
            return res.json();
          }),
          {
            loading: `Syncing dispatch data to ${tech.phoneNumber}...`,
            success: 'Notification delivered via SMS',
            error: (err) => `SMS Error: ${err.message}`,
          }
        );
      }

      setIsAssignModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleConfirm = async (requestId: string) => {
    const colName = collectionMap[activeTab];
    const path = `${colName}/${requestId}`;
    try {
      await updateDoc(doc(db, colName, requestId), {
        status: 'CLOSED',
        updatedAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
      });
      toast.success('Service decommissioned and finalized');
      setSelectedRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleClose = async (requestId: string) => {
    const colName = collectionMap[activeTab];
    const path = `${colName}/${requestId}`;
    try {
      await updateDoc(doc(db, colName, requestId), {
        status: 'CLOSED',
        updatedAt: serverTimestamp(),
      });
      toast.success('Service vector decommissioned');
      setSelectedRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const openAssignModal = (request: any) => {
    setSelectedRequest(request);
    setIsAssignModalOpen(true);
  };

  const handleUpdateTech = async () => {
    if (!editingTech && !isOnboarding) return;
    
    // If onboarding, generate a unique ID for the placeholder user
    const targetUid = isOnboarding ? `placeholder_${Date.now()}` : editingTech.uid;
    const path = `users/${targetUid}`;
    
    try {
      await setDoc(doc(db, 'users', targetUid), {
        uid: targetUid,
        displayName: editName,
        phoneNumber: editPhone,
        role: 'TECHNICIAN',
        isPlaceholder: isOnboarding,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      toast.success(isOnboarding ? 'New agent registered in sector' : 'Fleet registry updated');
      setEditingTech(null);
      setIsOnboarding(false);
      setEditName('');
      setEditPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUpdateAsset = async () => {
    const assetId = editingAsset?.id || `asset_${Date.now()}`;
    const path = `fleet/${assetId}`;
    try {
      await setDoc(doc(db, 'fleet', assetId), {
        id: assetId,
        plateNumber: assetPlate,
        model: assetModel,
        type: assetType,
        status: assetStatus,
        department: assetDept,
        updatedAt: serverTimestamp(),
        createdAt: editingAsset ? editingAsset.createdAt : serverTimestamp(),
      }, { merge: true });
      
      toast.success(editingAsset ? 'Asset specifications updated' : 'New asset registered in fleet');
      setEditingAsset(null);
      setIsFleetAssetModalOpen(false);
      setAssetPlate('');
      setAssetModel('');
      setAssetType('VEHICLE');
      setAssetStatus('OPERATIONAL');
      setAssetDept('');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleSendSms = async () => {
    if (!selectedTechForSms || !customSmsMessage) return;

    const promise = fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: selectedTechForSms.phoneNumber, 
        message: customSmsMessage 
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SMS Gateway failure');
      return data;
    });

    toast.promise(promise, {
      loading: 'Transmitting operational directive...',
      success: 'Notification delivered via SMS channel',
      error: (err) => `Comms Error: ${err.message}`,
    });

    try {
      await promise;
      setIsSmsModalOpen(false);
      setCustomSmsMessage('');
      setSelectedTechForSms(null);
    } catch (e) {
      console.error(e);
    }
  };

  const stats = [
    { label: 'Service Rep', value: requests.length, icon: Wrench, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Camera Cov', value: cameraRequests.length, icon: Camera, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Vehicle Req', value: vehicleRequests.length, icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Approved', value: [...requests, ...cameraRequests, ...vehicleRequests].filter(r => r.status === 'APPROVED').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight">Fleet Operations Command</h1>
          <p className="text-dark-text-subtle mt-1 font-serif italic">Operational overview and resource allocation</p>
        </div>
        <button 
          onClick={() => setIsReportOpen(true)}
          className="bg-dark-card hover:bg-dark-sidebar text-dark-accent border border-dark-border px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:border-dark-accent active:scale-95 shadow-xl shadow-black/20"
        >
          <FileText className="w-4 h-4" />
          Weekly Intelligence
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-dark-card p-6 rounded-xl border border-dark-border shadow-lg">
            <div className={cn("p-2 rounded-lg inline-flex mb-4 bg-dark-main/50", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-mono font-bold text-white tracking-tighter">{stat.value.toString().padStart(2, '0')}</p>
            <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 bg-dark-card p-1.5 rounded-xl border border-dark-border w-fit">
            <TabButton 
              active={activeTab === 'SERVICE'} 
              label="Service & Repair" 
              icon={Wrench} 
              onClick={() => { setActiveTab('SERVICE'); setSelectedRequest(null); }} 
            />
            <TabButton 
              active={activeTab === 'CAMERA'} 
              label="Camera" 
              icon={Camera} 
              onClick={() => { setActiveTab('CAMERA'); setSelectedRequest(null); }} 
            />
            <TabButton 
              active={activeTab === 'VEHICLE'} 
              label="Transportation" 
              icon={Car} 
              onClick={() => { setActiveTab('VEHICLE'); setSelectedRequest(null); }} 
            />
          </div>
          <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden flex flex-col h-[500px]">
             <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
               <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
                 {activeTab === 'SERVICE' ? 'Service Queue' : activeTab === 'CAMERA' ? 'Coverage Queue' : 'Transportation Queue'}
               </h3>
               <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-dark-text-subtle" />
                  <span className="text-[10px] font-bold text-dark-accent uppercase tracking-wide">Live Feed</span>
               </div>
             </div>

             <div className="overflow-auto flex-1 scrollbar-hide">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-dark-header sticky top-0 z-10">
                   <tr>
                     <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">ID</th>
                     <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Details</th>
                     <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Status</th>
                     <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-dark-border">
                   {loading ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-dark-text-subtle">Synchronizing data...</td>
                     </tr>
                   ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : vehicleRequests).length === 0 ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-dark-text-subtle text-sm font-serif italic">Main queue cleared</td>
                     </tr>
                   ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : vehicleRequests).map((request) => (
                       <tr key={request.id} className="hover:bg-dark-main/40 transition-colors group">
                         <td className="px-6 py-5 font-mono text-[10px] text-dark-accent">#{request.id.slice(-6).toUpperCase()}</td>
                         <td className="px-6 py-5">
                            <div className="text-[13px] font-medium text-slate-200">
                               {activeTab === 'SERVICE' ? request.description : activeTab === 'CAMERA' ? request.eventTitle : request.destination}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                               <span className="text-[10px] text-dark-text-subtle font-mono uppercase tracking-tighter bg-dark-main px-1.5 py-0.5 rounded border border-dark-border">
                                  {request.departmentName}
                               </span>
                               {activeTab === 'SERVICE' && request.fleetId && (
                                 <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10">
                                    {fleet.find(f => f.id === request.fleetId)?.plateNumber}
                                 </span>
                               )}
                               {activeTab === 'CAMERA' && (
                                 <span className="text-[9px] font-mono text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                                    {request.date}
                                 </span>
                               )}
                               {activeTab === 'VEHICLE' && (
                                 <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                    {request.departureDate} @ {request.departureTime}
                                 </span>
                               )}
                            </div>
                         </td>
                         <td className="px-6 py-5">
                           <span className={cn("status-pill", getStatusStyle(request.status))}>
                             {request.status.replace('_', ' ')}
                           </span>
                         </td>
                         <td className="px-6 py-5">
                            {request.status === 'NEW' ? (
                              <button onClick={() => handleApprove(request.id, request.directorId)} className="text-[10px] font-black uppercase text-dark-accent hover:text-indigo-400 transition-colors">Approve</button>
                            ) : request.status === 'APPROVED' ? (
                              <button onClick={() => openAssignModal(request)} className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 transition-colors">Assign</button>
                            ) : request.status === 'COMPLETED' ? (
                              <button 
                                onClick={() => setSelectedRequest(request)}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Review
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                 {request.status === 'CLOSED' ? (
                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                 ) : request.status === 'CONFIRMED' ? (
                               <button 
                                 onClick={() => handleClose(request.id)}
                                 className="text-[10px] font-black uppercase text-slate-400 hover:text-white border border-slate-500/20 px-3 py-1.5 rounded-lg hover:border-slate-400 transition-all font-mono"
                               >
                                 Decommission
                               </button>
                             ) : (
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                 )}
                                 <span className="text-[10px] text-dark-text-subtle font-mono">{activeTab === 'VEHICLE' ? request.assignedDriverName?.split(' ')[0] : request.assignedTechnicianName?.split(' ')[0]}</span>
                              </div>
                            )}
                         </td>
                       </tr>
                     ))
                   }
                 </tbody>
               </table>
             </div>
          </div>

          <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden flex flex-col h-[400px]">
             <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
               <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">Fleet Registry (Assets)</h3>
               <button 
                 onClick={() => {
                   setEditingAsset(null);
                   setAssetPlate('');
                   setAssetModel('');
                   setAssetType('VEHICLE');
                   setAssetStatus('OPERATIONAL');
                   setIsFleetAssetModalOpen(true);
                 }}
                 className="text-[9px] font-black uppercase text-dark-accent hover:underline flex items-center gap-2"
               >
                 <Truck className="w-3.5 h-3.5" />
                 Register Asset
               </button>
             </div>

             <div className="overflow-auto flex-1 scrollbar-hide p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fleet.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-dark-text-subtle text-sm font-serif italic">No assets registered in fleet registry</div>
                  ) : (
                    fleet.map((asset) => (
                      <div key={asset.id} className="p-4 bg-dark-main border border-dark-border rounded-xl flex items-center justify-between group hover:border-dark-accent/50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-lg flex items-center justify-center border",
                             asset.status === 'OPERATIONAL' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                             asset.status === 'MAINTENANCE' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                             "bg-red-500/10 border-red-500/20 text-red-400"
                           )}>
                             {asset.type === 'VEHICLE' ? <Truck className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-white">{asset.plateNumber}</p>
                              <p className="text-[10px] text-dark-text-subtle font-mono uppercase tracking-tight">{asset.model}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingAsset(asset);
                            setAssetPlate(asset.plateNumber);
                            setAssetModel(asset.model);
                            setAssetType(asset.type);
                            setAssetStatus(asset.status);
                            setAssetDept(asset.department || '');
                            setIsFleetAssetModalOpen(true);
                          }}
                          className="p-2 text-dark-text-subtle hover:text-white"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg flex flex-col h-[600px]">
          <div className="p-6 border-b border-dark-border bg-dark-card/50">
            <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">Technician Workload</h3>
          </div>
          <div className="overflow-auto flex-1 divide-y divide-dark-border">
            {[...technicians, ...drivers, ...cameramen].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map((tech) => (
              <div key={tech.id} className="p-5 flex items-center gap-3 hover:bg-dark-main/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-dark-sidebar flex items-center justify-center text-[11px] font-bold text-white border border-dark-border uppercase">
                  {tech.displayName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                  <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[0.85rem] font-medium text-slate-200">{tech.displayName}</div>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-dark-border uppercase tracking-tight text-dark-text-subtle">
                      {tech.role}
                    </span>
                    {tech.id === profile?.uid && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 tracking-widest uppercase">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.7rem] text-dark-text-subtle font-mono">{tech.phoneNumber || 'No Contact'}</span>
                    <span className="text-[0.7rem] text-dark-accent/40">•</span>
                    <span className={cn(
                      "text-[0.7rem] font-mono",
                      [...requests, ...cameraRequests, ...vehicleRequests].some(r => (r.assignedTechnicianId === tech.id || r.assignedDriverId === tech.id) && ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)) 
                        ? 'text-amber-500' 
                        : 'text-dark-text-subtle'
                    )}>
                      {[...requests, ...cameraRequests, ...vehicleRequests].some(r => (r.assignedTechnicianId === tech.id || r.assignedDriverId === tech.id) && ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)) 
                        ? 'Deployed' 
                        : 'Stationary'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (!tech.phoneNumber) {
                        toast.error('No contact number mapped for this agent');
                        return;
                      }
                      setSelectedTechForSms(tech);
                      setCustomSmsMessage(`COMMS [${profile?.displayName || 'ADMIN'}]: `);
                      setIsSmsModalOpen(true);
                    }}
                    className="p-2.5 bg-dark-main border border-dark-border rounded-xl text-dark-text-subtle hover:text-dark-accent hover:border-dark-accent transition-all shadow-lg shadow-black/20 group"
                    title="Notify via SMS/Phone"
                  >
                    <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    [...requests, ...cameraRequests, ...vehicleRequests].some(r => (r.assignedTechnicianId === tech.id || r.assignedDriverId === tech.id) && ['ACCEPTED', 'IN_PROGRESS'].includes(r.status)) 
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  )} />
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-dark-main/20">
             <button 
               onClick={() => setIsFleetModalOpen(true)}
               className="w-full bg-dark-accent hover:bg-indigo-600 text-white py-3.5 rounded-lg text-[0.8rem] font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95 group flex items-center justify-center gap-2"
             >
                <Settings className="w-4 h-4" />
                Fleet Configuration
             </button>
          </div>
        </div>
      </div>

      {/* Technician Allocation Modal */}
      <AnimatePresence>
        {selectedRequest && selectedRequest.status === 'COMPLETED' && !isAssignModalOpen && (
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
                      <h2 className="text-2xl font-medium text-white tracking-tight">Post-Operational Review</h2>
                      <p className="text-dark-text-subtle text-sm mt-1">Verify technical summary before ledger finalization</p>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                            {activeTab === 'VEHICLE' ? 'Assigned Driver' : 'Assigned Agent'}
                          </p>
                          <p className="text-sm font-medium text-slate-200">
                            {activeTab === 'VEHICLE' ? selectedRequest.assignedDriverName : selectedRequest.assignedTechnicianName}
                          </p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                            {activeTab === 'VEHICLE' ? 'Service Asset' : 'Fleet Asset'}
                          </p>
                          <p className="text-sm font-medium text-slate-200">
                             {activeTab === 'VEHICLE' ? (
                               selectedRequest.vehicleType || 'Company Vehicle'
                             ) : selectedRequest.fleetId ? (
                               fleet.find(f => f.id === selectedRequest.fleetId)?.plateNumber || 'Linked Asset'
                             ) : 'General Service'}
                          </p>
                       </div>
                    </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1">
                        {activeTab === 'VEHICLE' ? 'Mission Report' : 'Work Completion Summary'}
                      </label>
                      <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 text-sm text-slate-300 font-serif italic border-dashed">
                        {(activeTab === 'VEHICLE' ? selectedRequest.driverNotes : selectedRequest.technicianNotes) || "No summary provided by agent."}
                      </div>
                   </div>

                   {selectedRequest.completionImageUrl && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1 flex items-center gap-2">
                           <ImageIcon className="w-3 h-3" />
                           Field Evidence Tag
                        </label>
                        <div className="relative group max-w-sm overflow-hidden rounded-2xl border border-dark-border shadow-xl">
                          <img src={selectedRequest.completionImageUrl} alt="Maintenance outcome" className="w-full aspect-video object-cover" />
                        </div>
                      </div>
                   )}

                   {selectedRequest.directorComments && (
                     <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                           <MessageSquare className="w-3 h-3" />
                           Department Feedback
                        </label>
                        <div className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 text-sm text-indigo-200 font-medium italic">
                           {selectedRequest.directorComments}
                        </div>
                     </div>
                   )}

                   <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedRequest(null)}
                        className="flex-1 px-8 py-4 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white hover:border-white transition-all tracking-widest"
                      >
                        Discard Review
                      </button>
                      <button 
                        onClick={() => handleConfirm(selectedRequest.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-3"
                      >
                         <CheckCircle2 className="w-5 h-5" />
                         Confirm & Decommission
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {isSmsModalOpen && selectedTechForSms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSmsModalOpen(false)}
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
                  <h2 className="text-2xl font-medium text-white tracking-tight">Direct Comms</h2>
                  <p className="text-dark-text-subtle text-sm mt-1">Send SMS directive to {selectedTechForSms.displayName}</p>
                </div>
                <button onClick={() => setIsSmsModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Recipient Identity</label>
                  <div className="p-4 bg-dark-main border border-dark-border rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-dark-sidebar border border-dark-border flex items-center justify-center text-dark-accent font-bold">
                      {selectedTechForSms.displayName[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{selectedTechForSms.displayName}</p>
                      <p className="text-xs text-dark-accent font-mono">{selectedTechForSms.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Directive Payload</label>
                  <textarea 
                    value={customSmsMessage}
                    onChange={(e) => setCustomSmsMessage(e.target.value)}
                    placeholder="Enter message for field operator..."
                    className="w-full bg-dark-main border border-dark-border rounded-xl p-5 text-sm text-slate-200 focus:ring-1 focus:ring-dark-accent outline-none min-h-[150px] resize-none font-serif italic"
                  />
                  <div className="mt-2 flex justify-end">
                    <span className={cn("text-[10px] font-mono", customSmsMessage.length > 160 ? "text-red-400" : "text-dark-text-subtle")}>
                      {customSmsMessage.length} characters
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-dark-border">
                  <button 
                    onClick={() => setIsSmsModalOpen(false)}
                    className="flex-1 px-8 py-3.5 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white"
                  >
                    Abort
                  </button>
                  <button 
                    disabled={!customSmsMessage.trim()}
                    onClick={handleSendSms}
                    className="flex-1 bg-dark-accent hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-3"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Transmit SMS
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isFleetAssetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsFleetAssetModalOpen(false)}
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
                      <h2 className="text-2xl font-medium text-white tracking-tight">{editingAsset ? 'Edit Asset' : 'Register Vehicle'}</h2>
                      <p className="text-dark-text-subtle text-sm mt-1">Fleet registry update protocols</p>
                   </div>
                   <button onClick={() => setIsFleetAssetModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Plate Number</label>
                         <input 
                           type="text" 
                           value={assetPlate}
                           onChange={(e) => setAssetPlate(e.target.value)}
                           placeholder="ABC-123"
                           className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none font-mono"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Model/Description</label>
                         <input 
                           type="text" 
                           value={assetModel}
                           onChange={(e) => setAssetModel(e.target.value)}
                           placeholder="Toyota Hilux"
                           className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Category</label>
                         <select 
                           value={assetType}
                           onChange={(e) => setAssetType(e.target.value)}
                           className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none"
                         >
                           <option value="VEHICLE">Service Vehicle</option>
                           <option value="MACHINERY">Heavy Machinery</option>
                           <option value="OTHER">Utility Asset</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Operational Status</label>
                         <select 
                           value={assetStatus}
                           onChange={(e) => setAssetStatus(e.target.value)}
                           className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none"
                         >
                           <option value="OPERATIONAL">Operational</option>
                           <option value="MAINTENANCE">Maintenance</option>
                           <option value="OUT_OF_SERVICE">Out of Service</option>
                         </select>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Department Allocation</label>
                      <input 
                        type="text" 
                        value={assetDept}
                        onChange={(e) => setAssetDept(e.target.value)}
                        placeholder="Logistics / Maintenance"
                        className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none"
                      />
                   </div>

                   <div className="flex gap-4 pt-4 border-t border-dark-border">
                      <button 
                        onClick={() => setIsFleetAssetModalOpen(false)}
                        className="flex-1 px-8 py-3.5 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpdateAsset}
                        className="flex-1 bg-dark-accent hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-900/30"
                      >
                         {editingAsset ? 'Update Asset' : 'Register Asset'}
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute inset-0 bg-dark-main/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-medium text-white tracking-tight">
                        {activeTab === 'VEHICLE' ? 'Assign FMC DRIVER' : activeTab === 'CAMERA' ? 'Assign FMC CAMERA OPERATOR' : 'Assign FMC ENGINEER'}
                    </h2>
                    <p className="text-dark-text-subtle text-sm mt-1">
                        {activeTab === 'VEHICLE' ? 'Select an active FMC DRIVER for transportation mission' : 
                         activeTab === 'CAMERA' ? 'Select an FMC CAMERA OPERATOR for media coverage' : 
                         'Select an active FMC ENGINEER for maintenance vector'}
                    </p>
                 </div>
                 <button onClick={() => setIsAssignModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto">
                 {(activeTab === 'VEHICLE' ? drivers : activeTab === 'CAMERA' ? cameramen : technicians).length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-dark-text-subtle text-sm font-serif italic mb-4">No FMC ENGINEERS detected in sector</p>
                      <button 
                        onClick={() => {
                          setIsAssignModalOpen(false);
                          setIsFleetModalOpen(true);
                        }}
                        className="text-[10px] font-black uppercase text-dark-accent hover:underline tracking-widest"
                      >
                        Initialize Fleet Registry
                      </button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {(activeTab === 'VEHICLE' ? drivers : activeTab === 'CAMERA' ? cameramen : technicians).map((tech) => (
                          <div 
                            key={tech.id} 
                            className="flex items-center justify-between p-5 bg-dark-main border border-dark-border rounded-xl hover:bg-dark-sidebar transition-all group"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-dark-accent font-bold">
                                   {tech.displayName[0]}
                                </div>
                                <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                     <p className="font-bold text-white text-sm">{tech.displayName}</p>
                                     {tech.id === profile?.uid && <span className="bg-emerald-500/10 text-emerald-400 text-[7px] font-black px-1 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Self</span>}
                                   </div>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-[10px] text-dark-text-subtle uppercase tracking-widest font-black">
                                        {tech.role === 'DRIVER' ? 'FMC DRIVER' : tech.role === 'CAMERAMAN' ? 'FMC CAMERA OPERATOR' : 'FMC ENGINEER'}
                                      </p>
                                      <span className="text-[10px] text-dark-accent/40">•</span>
                                      <p className="text-[10px] text-dark-accent font-mono">{tech.phoneNumber || 'N/A'}</p>
                                   </div>
                                </div>
                             </div>
                             <button
                                onClick={() => handleAssign(selectedRequest?.id, tech, selectedRequest?.directorId)}
                                className="bg-dark-accent text-white font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                             >
                                Dispatch
                             </button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}

        {isReportOpen && (
          <WeeklyReport 
            requests={[...requests, ...cameraRequests, ...vehicleRequests]}
            workforce={[...technicians, ...drivers, ...cameramen]}
            onClose={() => setIsReportOpen(false)}
          />
        )}

        {isFleetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsFleetModalOpen(false)}
               className="absolute inset-0 bg-dark-main/90 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-2xl bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
               <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-medium text-white tracking-tight">Fleet Registry</h2>
                    <p className="text-dark-text-subtle text-sm mt-1">Manage personnel and communication protocols</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setIsOnboarding(true);
                        setEditName('');
                        setEditPhone('');
                      }}
                      className="px-4 py-2 bg-dark-accent/10 border border-dark-accent/30 rounded-lg text-[10px] font-black uppercase text-dark-accent hover:bg-dark-accent hover:text-white transition-all tracking-widest flex items-center gap-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Onboard Agent
                    </button>
                    <button onClick={() => setIsFleetModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
               </div>

                <div className="p-8 overflow-y-auto scrollbar-hide">
                  <div className="grid grid-cols-1 gap-4">
                    {technicians.map((tech) => (
                      <div key={tech.id} className="bg-dark-main border border-dark-border rounded-xl p-5 flex items-center justify-between group hover:border-dark-accent/50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-dark-sidebar border border-dark-border flex items-center justify-center text-dark-accent font-black text-xl">
                             {tech.displayName[0]}
                           </div>
                           <div>
                              <p className="font-bold text-white text-base">{tech.displayName}</p>
                              <p className="text-xs text-dark-text-subtle font-mono">{tech.phoneNumber || 'Contact Not Synchronized'}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingTech(tech);
                            setEditName(tech.displayName);
                            setEditPhone(tech.phoneNumber || '');
                          }}
                          className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] font-black uppercase text-dark-text-subtle hover:text-white hover:border-white transition-all uppercase tracking-widest"
                        >
                          Modify ID
                        </button>
                      </div>
                    ))}
                  </div>
               </div>

               <AnimatePresence>
                 {(editingTech || isOnboarding) && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="bg-dark-sidebar border-t border-dark-border overflow-hidden"
                   >
                     <div className="p-8 bg-dark-sidebar/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                           <div>
                              <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">User Name</label>
                              <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="User Name"
                                className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none font-medium"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Password</label>
                              <input 
                                type="password" 
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none font-mono"
                              />
                           </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                           <button onClick={() => { setEditingTech(null); setIsOnboarding(false); }} className="px-6 py-2.5 text-xs font-black text-dark-text-subtle hover:text-white uppercase tracking-widest">Abandon</button>
                           <button onClick={handleUpdateTech} className="bg-dark-accent text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95">
                             {isOnboarding ? 'Deploy to Registry' : 'Commit Identity'}
                           </button>
                        </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, label, icon: Icon, onClick }: { active: boolean, label: string, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-dark-accent text-white shadow-lg shadow-indigo-500/20" 
          : "text-dark-text-subtle hover:text-white"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
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
    case 'CONFIRMED': return 'bg-slate-500/10 text-emerald-400 border border-emerald-500/20';
    case 'CLOSED': return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};
