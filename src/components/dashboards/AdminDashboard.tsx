import React, { useState, useEffect } from 'react';
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
  Check,
  AlertCircle,
  Wrench,
  X,
  Archive,
  Trash2,
  Settings,
  ClipboardList,
  Tag,
  Lock,
  Unlock,
  Key,
  FileText,
  MessageSquare,
  Phone,
  Camera,
  Car,
  Image as ImageIcon,
  Bell,
  TowerControl
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

import { notificationService } from '../../services/notificationService';

export function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'CAMERA' | 'VEHICLE' | 'ITEM' | 'OTHER' | 'SYSTEM'>('SERVICE');
  const [globalAlertTitle, setGlobalAlertTitle] = useState('SYSTEM ADVISORY');
  const [globalAlertMessage, setGlobalAlertMessage] = useState('Operational vector established. All stations verify handshake.');
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [itemRequests, setItemRequests] = useState<any[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [cameramen, setCameramen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [selectedTechForSms, setSelectedTechForSms] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // Operational Protection (Sector Level)
  const [unlockedSectors, setUnlockedSectors] = useState<Set<string>>(new Set());
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'APPROVE' | 'ASSIGN', data: any, sector: string } | null>(null);
  
  const SECTOR_AUTH = {
    SERVICE: { label: 'Maintenance Director', pin: '1010', icon: Wrench },
    CAMERA: { label: 'Surveillance Director', pin: '2020', icon: Camera },
    VEHICLE: { label: 'Logistics Director', pin: '3030', icon: Car },
    ITEM: { label: 'Security Director', pin: '4040', icon: Tag },
    OTHER: { label: 'Operations Director', pin: '5050', icon: ClipboardList },
    SYSTEM: { label: 'IT Systems Director', pin: '9090', icon: Settings }
  };
  
  useEffect(() => {
    const srPath = 'service_requests';
    const q = query(collection(db, srPath));
    let isFirstLoad = true;
    const unsubscribeReq = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => !req.archived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setRequests(docs);
      
      if (!isFirstLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            if (data.status === 'NEW' && !data.archived) {
              const displayName = data.workName || data.description;
              notificationService.notify(`NEW SERVICE: ${displayName}`, {
                body: `Department: ${data.departmentName}`,
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }
      
      setLoading(false);
      isFirstLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, srPath);
    });

    let isFirstLoadCam = true;
    const camPath = 'camera_requests';
    const qCam = query(collection(db, camPath));
    const unsubscribeCam = onSnapshot(qCam, (snapshot) => {
      const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => !req.archived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setCameraRequests(docs);

      if (!isFirstLoadCam) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            if (data.status === 'NEW' && !data.archived) {
              const displayName = data.eventTitle || data.purpose;
              notificationService.notify(`NEW CAMERA: ${displayName}`, {
                body: `Department: ${data.departmentName}`,
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }
      isFirstLoadCam = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, camPath);
    });

    let isFirstLoadVeh = true;
    const vehPath = 'vehicle_requests';
    const qVeh = query(collection(db, vehPath));
    const unsubscribeVeh = onSnapshot(qVeh, (snapshot) => {
      const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => !req.archived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setVehicleRequests(docs);

      if (!isFirstLoadVeh) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            if (data.status === 'NEW' && !data.archived) {
              const displayName = data.tripName || data.destination;
              notificationService.notify(`NEW SHIPMENT: ${displayName}`, {
                body: `Department: ${data.departmentName}`,
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }
      isFirstLoadVeh = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, vehPath);
    });

    let isFirstLoadItem = true;
    const itemPath = 'item_requests';
    const qItem = query(collection(db, itemPath));
    const unsubscribeItem = onSnapshot(qItem, (snapshot) => {
      const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => !req.archived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setItemRequests(docs);

      if (!isFirstLoadItem) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            if (data.status === 'NEW' && !data.archived) {
              const displayName = data.itemName || data.purpose;
              notificationService.notify(`NEW EXIT PERMIT: ${displayName}`, {
                body: `Department: ${data.departmentName}`,
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }
      isFirstLoadItem = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, itemPath);
    });

    let isFirstLoadDev = true;
    const devPath = 'device_requests';
    const qDev = query(collection(db, devPath));
    const unsubscribeDev = onSnapshot(qDev, (snapshot) => {
      const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => !req.archived);
      
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setDeviceRequests(docs);

      if (!isFirstLoadDev) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as any;
            if (data.status === 'NEW' && !data.archived) {
              const displayName = data.projectName || data.deviceModel;
              notificationService.notify(`NEW DEVICE REQUEST: ${displayName}`, {
                body: `Department: ${data.departmentName}`,
                icon: '/pwa-512x512.png'
              });
            }
          }
        });
      }
      isFirstLoadDev = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, devPath);
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

    return () => {
      unsubscribeReq();
      unsubscribeCam();
      unsubscribeVeh();
      unsubscribeItem();
      unsubscribeDev();
      unsubscribeTech();
    };
  }, []);

  const collectionMap = {
    SERVICE: 'service_requests',
    CAMERA: 'camera_requests',
    VEHICLE: 'vehicle_requests',
    ITEM: 'item_requests',
    OTHER: 'device_requests'
  };

  const handleApprove = async (requestId: string, directorId: string) => {
    if (!unlockedSectors.has(activeTab)) {
      setPendingAction({ type: 'APPROVE', data: { requestId, directorId }, sector: activeTab });
      setIsUnlockModalOpen(true);
      return;
    }

    const colName = collectionMap[activeTab];
    const req = (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).find(r => r.id === requestId);
    const displayName = activeTab === 'SERVICE' ? (req?.workName || 'Untitled Job') : activeTab === 'CAMERA' ? (req?.eventTitle || 'Untitled Event') : activeTab === 'ITEM' ? (req?.itemName || 'Untitled Item') : activeTab === 'OTHER' ? (req?.projectName || 'Untitled Device Request') : (req?.tripName || 'Untitled Trip');
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
        message: `Your ${activeTab.toLowerCase()} request "${displayName}" has been approved and moved to the dispatch queue.`,
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
    const req = (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).find(r => r.id === requestId);
    const displayName = activeTab === 'SERVICE' ? (req?.workName || 'Untitled Job') : activeTab === 'CAMERA' ? (req?.eventTitle || 'Untitled Event') : activeTab === 'ITEM' ? (req?.itemName || 'Untitled Item') : activeTab === 'OTHER' ? (req?.projectName || 'Untitled Device Request') : (req?.tripName || 'Untitled Trip');
    const path = `${colName}/${requestId}`;
    try {
      const updateData: any = {
        status: 'ASSIGNED',
        updatedAt: serverTimestamp(),
      };

      if (activeTab === 'VEHICLE') {
        updateData.assignedDriverId = tech.id;
        updateData.assignedDriverName = tech.displayName;
        updateData.assignedDriverPhone = tech.phoneNumber || '';
      } else {
        updateData.assignedTechnicianId = tech.id;
        updateData.assignedTechnicianName = tech.displayName;
        updateData.assignedTechnicianPhone = tech.phoneNumber || '';
      }

      await updateDoc(doc(db, colName, requestId), updateData);

      // Create in-app notification for technician
      const techNotificationId = `notif_tech_${Date.now()}_${tech.id}`;
      await setDoc(doc(db, 'notifications', techNotificationId), {
        userId: tech.id,
        title: `New Assignment: ${displayName}`,
        message: `Hello ${tech.displayName}, you have been assigned to ${activeTab.toLowerCase()} assignment: "${displayName}". Please check your portal for details.`,
        read: false,
        type: 'ASSIGNMENT',
        requestId: requestId,
        createdAt: serverTimestamp(),
      });

      // Create notification for director
      const dirNotificationId = `notif_dir_${Date.now()}_${directorId}`;
      await setDoc(doc(db, 'notifications', dirNotificationId), {
        userId: directorId,
        title: 'Agent Assigned',
        message: `${activeTab === 'VEHICLE' ? 'Driver' : activeTab === 'CAMERA' ? 'Cameraman' : 'Technician'} ${tech.displayName} has been assigned to your request: "${displayName}"`,
        read: false,
        type: 'ASSIGNMENT',
        requestId: requestId,
        createdAt: serverTimestamp(),
      });

      toast.success(`${tech.displayName} assigned`);
      
      if (tech.phoneNumber) {
        const smsMessage = `Vector System: Hello ${tech.displayName}, you have been assigned to ${activeTab.toLowerCase()} request #${requestId.slice(-6).toUpperCase()}. Please check your portal.`;
        
        const smsPromise = fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            to: tech.phoneNumber, 
            message: smsMessage 
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'SMS Gateway failure');
          }
          return res.json();
        });

        toast.promise(
          smsPromise,
          {
            loading: `Syncing dispatch data to ${tech.phoneNumber}...`,
            success: 'Notification delivered via SMS',
            error: (err) => (
              <div className="flex flex-col gap-2">
                <span>{err.message === 'SMS_NOT_CONFIGURED' ? 'Cloud SMS Channel Not Configured' : `SMS Error: ${err.message}`}</span>
                <a 
                  href={`sms:${tech.phoneNumber}?body=${encodeURIComponent(smsMessage)}`}
                  className="bg-white/10 px-2 py-1 rounded text-xs hover:bg-white/20 transition-colors inline-block text-center border border-white/10 font-black uppercase"
                >
                  Dispatch via SIM Card
                </a>
              </div>
            ),
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
        archived: true, // Auto-delete from active view
        updatedAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
      });
      toast.success('Service decommissioned and archived');
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
        archived: true, // Auto-delete from active view
        updatedAt: serverTimestamp(),
      });
      toast.success('Service vector decommissioned and archived');
      setSelectedRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleClearSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No records selected');
      return;
    }

    const confirm = window.confirm(`Archive ${selectedIds.size} selected records from the queue?`);
    if (!confirm) return;

    const currentTabRequests = activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests;
    
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const req = currentTabRequests.find(r => r.id === id);
        if (req) {
          const collectionName = collectionMap[activeTab as keyof typeof collectionMap];
          if (collectionName) {
            return updateDoc(doc(db, collectionName, id), {
              archived: true,
              updatedAt: serverTimestamp()
            });
          }
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

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const openAssignModal = (request: any) => {
    if (!unlockedSectors.has(activeTab)) {
      setPendingAction({ type: 'ASSIGN', data: request, sector: activeTab });
      setIsUnlockModalOpen(true);
      return;
    }
    setSelectedRequest(request);
    setIsAssignModalOpen(true);
  };

  const handleUpdateTech = async () => {
    if (!editingTech && !isOnboarding) return;
    
    // If onboarding, generate a unique ID for the placeholder user
    const targetUid = isOnboarding ? `placeholder_${Date.now()}` : editingTech.uid;
    const path = `users/${targetUid}`;
    
    if (editPhone && !editPhone.startsWith('+')) {
      toast.error('Agent contact must start with + and include country code (e.g., +251...)');
      return;
    }

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

  const handleUnlock = () => {
    const sectorToUnlock = pendingAction?.sector || activeTab;
    const sectorConfig = SECTOR_AUTH[sectorToUnlock as keyof typeof SECTOR_AUTH];

    if (unlockPassword === sectorConfig.pin) {
      setUnlockedSectors(prev => new Set(prev).add(sectorToUnlock));
      setIsUnlockModalOpen(false);
      setUnlockPassword('');
      toast.success(`${sectorConfig.label} authenticated`, {
        icon: '🔓',
        style: { background: '#064e3b', color: '#34d399', border: '1px solid #059669' }
      });
      
      if (pendingAction) {
        if (pendingAction.type === 'APPROVE' && pendingAction.data) {
          handleApprove(pendingAction.data.requestId, pendingAction.data.directorId);
        } else if (pendingAction.type === 'ASSIGN' && pendingAction.data) {
          const req = pendingAction.data;
          setSelectedRequest(req);
          setIsAssignModalOpen(true);
        }
        setPendingAction(null);
      }
    } else {
      toast.error('Invalid Sector PIN', {
        icon: '🔒',
        style: { background: '#450a0a', color: '#f87171', border: '1px solid #991b1b' }
      });
      setUnlockPassword('');
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
      error: (err) => (
        <div className="flex flex-col gap-2">
          <span>{err.message === 'SMS_NOT_CONFIGURED' ? 'Cloud SMS Gateway Not Configured' : `Comms Error: ${err.message}`}</span>
          <a 
            href={`sms:${selectedTechForSms.phoneNumber}?body=${encodeURIComponent(customSmsMessage)}`}
            className="bg-white/10 px-2 py-1 rounded text-[10px] font-black uppercase hover:bg-white/20 transition-colors inline-block text-center border border-white/10"
          >
            Dispatch via SIM Card
          </a>
        </div>
      ),
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
    { label: 'Exit Permits', value: itemRequests.length, icon: Tag, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Device Req', value: deviceRequests.length, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Approved', value: [...requests, ...cameraRequests, ...vehicleRequests, ...itemRequests, ...deviceRequests].filter(r => r.status === 'APPROVED').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-medium text-slate-950 tracking-tight">Fleet Operations Command</h1>
            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  if (unlockedSectors.has(activeTab)) {
                                    setUnlockedSectors(prev => {
                                      const next = new Set(prev);
                                      next.delete(activeTab);
                                      return next;
                                    });
                                  } else {
                                    setPendingAction({ type: 'APPROVE', data: null, sector: activeTab });
                                    setIsUnlockModalOpen(true);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95",
                                  unlockedSectors.has(activeTab) 
                                    ? "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" 
                                    : "bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/10"
                                )}
                              >
                                {unlockedSectors.has(activeTab) ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {unlockedSectors.has(activeTab) ? `${activeTab} Sector Authorized` : `${activeTab} Auth Required`}
                              </button>
              
              {unlockedSectors.size > 0 && (
                <button 
                  onClick={() => setUnlockedSectors(new Set())}
                  className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                  title="Lock All Sectors"
                >
                  <Lock className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
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
            <p className="text-2xl font-mono font-bold text-slate-950 tracking-tighter">{stat.value.toString().padStart(2, '0')}</p>
            <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 bg-dark-card p-1.5 rounded-xl border border-dark-border w-full overflow-x-auto scrollbar-hide shrink-0">
            <TabButton 
              active={activeTab === 'SYSTEM'} 
              label="System Control" 
              icon={Settings} 
              onClick={() => { setActiveTab('SYSTEM'); setSelectedRequest(null); }} 
            />
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
            <TabButton 
              active={activeTab === 'ITEM'} 
              label="Exit Permit" 
              icon={Tag} 
              onClick={() => { setActiveTab('ITEM'); setSelectedRequest(null); }} 
            />
            <TabButton 
              active={activeTab === 'OTHER'} 
              label="Other" 
              icon={ClipboardList} 
              onClick={() => { setActiveTab('OTHER'); setSelectedRequest(null); }} 
            />
          </div>
          <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden flex flex-col h-[500px]">
             <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
               <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
                 {activeTab === 'SERVICE' ? 'Service Queue' : activeTab === 'CAMERA' ? 'Coverage Queue' : activeTab === 'VEHICLE' ? 'Transportation Queue' : activeTab === 'ITEM' ? 'Exit Permits Queue' : 'Other Requests Queue'}
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
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-dark-text-subtle" />
                    <span className="text-[10px] font-bold text-dark-accent uppercase tracking-wide">Live Feed</span>
                  </div>
               </div>
             </div>

             <div className="overflow-auto flex-1 scrollbar-hide">
               {activeTab === 'SYSTEM' ? (
                 <div className="p-8 space-y-8 bg-dark-main/20">
                   {/* Communication Gateway Status */}
                   <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                       <MessageSquare className="w-3 h-3" />
                       Communication Gateway Status
                     </h3>
                     <div className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-dark-card border border-dark-border shadow-md">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-dark-accent rounded-xl flex items-center justify-center border border-slate-900/10 shadow-sm">
                            <Settings className="w-6 h-6 text-yellow-400 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-black font-black tracking-tight">Twilio Cloud Gateway</h4>
                            <p className="text-[11px] text-dark-text-subtle font-serif italic mt-0.5">Primary vector for technician dispatch via SMS</p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!profile?.phoneNumber) {
                              toast.error('Mission Protocol Failed: Self-contact number missing from profile. Please update security registry.');
                              return;
                            }

                            const testPromise = fetch('/api/send-sms', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                to: profile.phoneNumber, 
                                message: `TEST: FMC Vector System Cloud Gateway Online. Verified at ${new Date().toLocaleTimeString()}` 
                              }),
                            }).then(async (res) => {
                              const data = await res.json();
                              if (!res.ok) {
                                const error = new Error(data.message || data.error || 'Gateway offline');
                                (error as any).code = data.error;
                                throw error;
                              }
                              return data;
                            });

                            toast.promise(testPromise, {
                              loading: 'Pinging cloud gateway...',
                              success: 'Twilio Gateway responds: ONLINE',
                              error: (err: any) => (
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold">Transmission Failure</span>
                                  <span className="text-[10px] leading-relaxed">
                                    {err.code?.startsWith('TWILIO_') ? `Gateway Error: ${err.message}` : err.message}
                                  </span>
                                  {err.code === 'TWILIO_21608' || err.message.toLowerCase().includes('unverified') ? (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                      <p className="text-[10px] text-amber-500 font-bold uppercase">Trial Account Restriction</p>
                                      <p className="text-[9px] text-amber-600 leading-tight mt-1">Recipient number must be verified in your Twilio Console (twilio.com/user/account/phone-numbers/verified)</p>
                                    </div>
                                  ) : err.code === 'TWILIO_21211' || err.message.includes('Invalid') ? (
                                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                      <p className="text-[10px] text-red-500 font-bold uppercase">Invalid Format</p>
                                      <p className="text-[9px] text-red-600 leading-tight mt-1">Ethiopian numbers must be +251 9... or +251 7... (Total 12 digits)</p>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            });
                          }}
                          className="px-8 py-3 bg-dark-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Ping Connection
                        </button>
                      </div>
                   </div>

                    {/* Global Alert Dispatcher */}
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                         <Bell className="w-3 h-3" />
                         Global Alert Dispatcher
                       </h3>
                       <div className="p-6 rounded-2xl bg-dark-card border border-dark-border shadow-md space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest">Alert Header</label>
                             <input 
                               type="text" 
                               value={globalAlertTitle}
                               onChange={(e) => setGlobalAlertTitle(e.target.value)}
                               className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-2 text-black text-xs font-bold focus:outline-none focus:border-dark-accent transition-all"
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-dark-text-subtle uppercase tracking-widest">Broadcast Narrative</label>
                             <input 
                               type="text" 
                               value={globalAlertMessage}
                               onChange={(e) => setGlobalAlertMessage(e.target.value)}
                               className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-2 text-black text-xs font-bold focus:outline-none focus:border-dark-accent transition-all"
                             />
                           </div>
                         </div>
                         <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                           <div className="flex items-center gap-2">
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               notificationService.getPermissionStatus() === 'granted' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                             )} />
                             <span className="text-[9px] font-bold text-dark-text-subtle uppercase tracking-widest">
                               {notificationService.getPermissionStatus() === 'granted' ? 'Native Alerts Active' : 'Native Alerts Restricted'}
                             </span>
                           </div>
                           <button 
                             onClick={() => {
                               notificationService.notify(globalAlertTitle, {
                                 body: globalAlertMessage,
                                 icon: '/favicon.ico'
                               });
                             }}
                             className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                           >
                             <TowerControl className="w-4 h-4" />
                             Broadcast to All Vectors
                           </button>
                         </div>
                       </div>
                    </div>

                    {/* Registry Overview */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          Workforce Command
                        </h3>
                        <button 
                          onClick={() => setIsPersonnelModalOpen(true)}
                          className="text-[10px] font-black text-dark-accent uppercase tracking-widest hover:underline"
                        >
                          Expand Registry
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {technicians.slice(0, 4).map(tech => (
                          <div key={tech.id} className="bg-dark-card border border-dark-border p-4 rounded-xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-dark-sidebar flex items-center justify-center text-[10px] font-black text-dark-accent border border-dark-border">
                                {tech.displayName[0]}
                               </div>
                               <div>
                                 <p className="text-xs font-black text-black">{tech.displayName}</p>
                                 <p className="text-[10px] text-dark-text-subtle font-mono tracking-tighter">{tech.phoneNumber || 'Contact Null'}</p>
                               </div>
                             </div>
                             <div className={cn(
                                "w-2 h-2 rounded-full",
                                tech.phoneNumber ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                             )} />
                          </div>
                        ))}
                        {technicians.length > 4 && (
                          <button 
                            onClick={() => setIsPersonnelModalOpen(true)}
                            className="bg-dark-card/50 border border-dashed border-dark-border p-4 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-dark-text-subtle hover:text-white hover:border-dark-accent transition-all"
                          >
                            + View {technicians.length - 4} More Records
                          </button>
                        )}
                      </div>
                   </div>
                 </div>
               ) : (
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-dark-header sticky top-0 z-10">
                     <tr>
                       {isSelectMode && (
                         <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border w-10"></th>
                       )}
                       <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Request Reference</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Details & Context</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Status</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-dark-border">
                     {loading ? (
                       <tr>
                          <td colSpan={isSelectMode ? 5 : 4} className="px-6 py-12 text-center text-dark-text-subtle">Synchronizing data...</td>
                       </tr>
                     ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).length === 0 ? (
                       <tr>
                          <td colSpan={isSelectMode ? 5 : 4} className="px-6 py-12 text-center text-dark-text-subtle text-sm font-serif italic">Main queue cleared</td>
                       </tr>
                     ) : (activeTab === 'SERVICE' ? requests : activeTab === 'CAMERA' ? cameraRequests : activeTab === 'VEHICLE' ? vehicleRequests : activeTab === 'ITEM' ? itemRequests : deviceRequests).map((request) => (
                       <tr 
                         key={request.id} 
                         onClick={() => isSelectMode && toggleSelect(request.id)}
                         className={cn(
                           "transition-colors group",
                           isSelectMode && selectedIds.has(request.id) ? "bg-dark-accent/5" : "hover:bg-dark-main/40",
                           isSelectMode && "cursor-pointer"
                         )}
                       >
                         {isSelectMode && (
                           <td className="px-6 py-5">
                             <div className={cn(
                               "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                               selectedIds.has(request.id) ? "bg-dark-accent border-dark-accent" : "border-dark-border bg-dark-main"
                             )}>
                               {selectedIds.has(request.id) && <Check className="w-3 h-3 text-white" />}
                             </div>
                           </td>
                         )}
                         <td className="px-6 py-5">
                             <div className="text-[12px] font-bold text-dark-accent mb-1 tracking-tight">
                                {activeTab === 'SERVICE' ? (request.workName || 'SVC-RQ') : activeTab === 'CAMERA' ? (request.eventTitle || 'CAM-RQ') : activeTab === 'ITEM' ? (request.itemName || 'EXIT-RQ') : activeTab === 'OTHER' ? (request.projectName || 'DEV-RQ') : (request.tripName || 'TRP-RQ')}
                             </div>
                             <div className="text-[10px] font-mono text-dark-text-subtle opacity-50 uppercase tracking-widest">#{request.id.slice(-6).toUpperCase()}</div>
                          </td>
                         <td className="px-6 py-5">
                            <div className="text-[13px] font-black text-black">
                               {activeTab === 'SERVICE' ? (request.workName || request.description) : activeTab === 'CAMERA' ? (request.eventTitle || request.purpose) : activeTab === 'ITEM' ? (request.itemName || request.purpose) : activeTab === 'OTHER' ? (request.projectName || request.deviceModel) : (request.tripName || request.destination)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                               <span className="text-[10px] text-black font-mono uppercase tracking-tighter bg-dark-main px-1.5 py-0.5 rounded border border-dark-border">
                                  {request.departmentName}
                               </span>
                               {activeTab === 'ITEM' && (
                                  <span className="text-[9px] font-mono text-pink-700 bg-pink-500/5 px-1.5 py-0.5 rounded border border-pink-500/10">
                                     S/N: {request.serialNumber || 'N/A'}
                                  </span>
                                )}
                               {activeTab === 'CAMERA' && (
                                 <span className="text-[9px] font-mono text-amber-700 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                                    {request.date}
                                 </span>
                               )}
                               {activeTab === 'VEHICLE' && (
                                 <span className="text-[9px] font-mono text-indigo-700 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
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
                              activeTab === 'ITEM' ? (
                                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 flex items-center gap-2 w-fit">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <button onClick={() => openAssignModal(request)} className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 transition-colors">Assign</button>
                              )
                            ) : request.status === 'COMPLETED' ? (
                              <button 
                                onClick={() => setSelectedRequest(request)}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
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
              )}
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
                <div className="w-10 h-10 rounded-full bg-dark-sidebar flex items-center justify-center text-[11px] font-bold text-slate-950 border border-dark-border uppercase">
                  {tech.displayName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                  <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[0.85rem] font-medium text-slate-900">{tech.displayName}</div>
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
               onClick={() => setIsPersonnelModalOpen(true)}
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
                      <h2 className="text-2xl font-black text-black tracking-tight">Post-Operational Review</h2>
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
                          <p className="text-sm font-black text-black">
                            {activeTab === 'VEHICLE' ? selectedRequest.assignedDriverName : selectedRequest.assignedTechnicianName}
                          </p>
                          {(selectedRequest.assignedDriverPhone || selectedRequest.assignedTechnicianPhone) && (
                            <p className="text-[10px] font-mono text-dark-accent mt-1">
                              {selectedRequest.assignedDriverPhone || selectedRequest.assignedTechnicianPhone}
                            </p>
                          )}
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                            {activeTab === 'VEHICLE' ? 'Service Asset' : 'Fleet Asset'}
                          </p>
                          <p className="text-sm font-black text-black">
                             {activeTab === 'VEHICLE' ? (
                               selectedRequest.vehicleType || 'Company Vehicle'
                             ) : 'General Service'}
                          </p>
                       </div>
                    </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1">
                        {activeTab === 'VEHICLE' ? 'Mission Report' : 'Work Completion Summary'}
                      </label>
                      <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 text-sm text-black font-bold font-serif italic border-dashed">
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
                        <div className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 text-sm text-black font-bold italic">
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
                  <h2 className="text-2xl font-black text-black tracking-tight">Direct Comms</h2>
                  <p className="text-dark-text-subtle text-sm mt-1">Send SMS directive to {selectedTechForSms.displayName}</p>
                </div>
                <button onClick={() => setIsSmsModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Recipient Identity</label>
                  <div className="p-5 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-slate-700/50 rounded-2xl relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-dark-accent/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-dark-accent/10" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full -ml-12 -mb-12 blur-2xl" />
                    
                    <div className="relative flex items-center gap-5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-dark-accent font-bold text-xl shadow-inner shadow-black/40">
                          {selectedTechForSms.displayName[0]}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#1e293b] shadow-lg flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Carrier: FMC Mobile</p>
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-slate-700 rounded-px" />
                          </div>
                        </div>
                        <p className="font-black text-black text-lg tracking-tight leading-none mb-1">{selectedTechForSms.displayName}</p>
                        <p className="text-[0.8rem] text-dark-accent font-mono font-medium tracking-wider">{selectedTechForSms.phoneNumber || '+251 912 345 678'}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">IMSI: VECTOR_AUTH_{selectedTechForSms.id.slice(-6).toUpperCase()}</span>
                      <div className="w-8 h-5 bg-amber-500/20 rounded border border-amber-500/30 flex items-center justify-center">
                         <div className="w-4 h-3 bg-amber-500/40 rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">Directive Payload</label>
                  <textarea 
                    value={customSmsMessage}
                    onChange={(e) => setCustomSmsMessage(e.target.value)}
                    placeholder="Enter message for field operator..."
                    className="w-full bg-dark-main border border-dark-border rounded-xl p-5 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none min-h-[150px] resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <span className={cn("text-[10px] font-mono", customSmsMessage.length > 160 ? "text-red-400" : "text-dark-text-subtle")}>
                      {customSmsMessage.length} characters
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-dark-border">
                  <div className="flex-1 flex flex-col gap-2">
                    <button 
                      onClick={() => setIsSmsModalOpen(false)}
                      className="w-full px-8 py-3.5 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white"
                    >
                      Abort
                    </button>
                    <a 
                      href={`sms:${selectedTechForSms.phoneNumber}?body=${encodeURIComponent(customSmsMessage)}`}
                      className="w-full px-8 py-2 text-[10px] font-black uppercase text-center text-dark-accent hover:text-indigo-400 transition-colors"
                    >
                      Use Device Messages (SIM)
                    </a>
                  </div>
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
                    <h2 className="text-2xl font-medium text-slate-950 tracking-tight">
                        {activeTab === 'VEHICLE' ? 'Assign FMC DRIVER' : activeTab === 'CAMERA' ? 'Assign FMC CAMERA OPERATOR' : 'Assign FMC ENGINEER'}
                    </h2>
                    <p className="text-slate-800 text-sm mt-1">
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
                          setIsPersonnelModalOpen(true);
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
                                     <p className="font-black text-black text-sm">{tech.displayName}</p>
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
            requests={[...requests, ...cameraRequests, ...vehicleRequests, ...itemRequests, ...deviceRequests]}
            workforce={[...technicians, ...drivers, ...cameramen]}
            onClose={() => setIsReportOpen(false)}
          />
        )}

        {isPersonnelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsPersonnelModalOpen(false)}
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
                    <h2 className="text-2xl font-black text-black tracking-tight">Workforce Registry</h2>
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
                    <button onClick={() => setIsPersonnelModalOpen(false)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
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
                              <p className="font-black text-black text-base">{tech.displayName}</p>
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
                                className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">Agent Contact (SMS)</label>
                              <input 
                                type="tel" 
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="+251..."
                                className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none font-mono"
                              />
                              <p className="text-[9px] text-dark-text-subtle mt-1 italic font-serif">Must include + and country code for SMS delivery</p>
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
        {isUnlockModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsUnlockModalOpen(false);
                setPendingAction(null);
                setUnlockPassword('');
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {SECTOR_AUTH[(pendingAction?.sector || activeTab) as keyof typeof SECTOR_AUTH]?.icon ? (
                      (() => {
                        const Icon = SECTOR_AUTH[(pendingAction?.sector || activeTab) as keyof typeof SECTOR_AUTH].icon;
                        return <Icon className="w-8 h-8 text-amber-500" />;
                      })()
                    ) : (
                      <Lock className="w-8 h-8 text-amber-500" />
                    )}
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
                   {SECTOR_AUTH[(pendingAction?.sector || activeTab) as keyof typeof SECTOR_AUTH]?.label || 'Director Authorization'}
                 </h2>
                 <p className="text-dark-text-subtle text-sm mb-8 font-serif italic">Enter sector-specific access key to continue.</p>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-subtle" />
                       <input 
                         type="password"
                         value={unlockPassword}
                         onChange={(e) => setUnlockPassword(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                         placeholder="••••"
                         autoFocus
                         className="w-full bg-dark-main border border-dark-border rounded-xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-dark-text-muted text-center tracking-[0.5em] text-2xl font-black"
                       />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                       <button 
                         onClick={() => {
                           setIsUnlockModalOpen(false);
                           setPendingAction(null);
                           setUnlockPassword('');
                         }}
                         className="px-6 py-3.5 bg-dark-main border border-dark-border rounded-xl text-[10px] font-black uppercase tracking-widest text-dark-text-subtle hover:text-white transition-all underline decoration-dark-border underline-offset-4"
                       >
                         Abort
                       </button>
                       <button 
                         onClick={handleUnlock}
                         className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/40 transition-all active:scale-95"
                       >
                         Verify PIN
                       </button>
                    </div>
                 </div>
              </div>
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
