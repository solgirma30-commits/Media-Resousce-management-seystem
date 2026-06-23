import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  Phone,
  MapPin,
  Tag,
  X,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  Car,
  Pencil,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  setDoc,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../../lib/firebase';
import { useAuth } from '../../App';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/LanguageContext';
import { useFcmToken } from '../../hooks/useFcmToken';
import { RequestPasswordModal } from '../RequestPasswordModal';

export function DeptDirectorDashboard() {
  useFcmToken();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'SERVICE' | 'CAMERA' | 'VEHICLE' | 'OTHER'>('SERVICE');
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [itemRequests, setItemRequests] = useState<any[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<any[]>([]);
  const [guestRequests, setGuestRequests] = useState<any[]>([]);
  const [clearanceType, setClearanceType] = useState<'ITEM' | 'LABOR' | 'GUEST'>('ITEM');

  // Guest entrance specific
  const [visitorNames, setVisitorNames] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [hostName, setHostName] = useState('');
  const [guestPurpose, setGuestPurpose] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeletePasswordModalOpen, setIsDeletePasswordModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', request?: any } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [approvalPopup, setApprovalPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName: string;
    type: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [directorComments, setDirectorComments] = useState('');
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Phone/SMS logs state for Simulated SMS Popup & Phone Simulator Panel
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);
  const [isSmsPhoneOpen, setIsSmsPhoneOpen] = useState(false);
  const [lastSmsNotification, setLastSmsNotification] = useState<any | null>(null);

  // General Form states
  const [priority, setPriority] = useState('MEDIUM');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [workName, setWorkName] = useState('');

  // Service Request specific
  const [category, setCategory] = useState('Hardware');
  const [serviceRequester, setServiceRequester] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Camera Request specific
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cameraPurpose, setCameraPurpose] = useState('');
  const [cameraHostName, setCameraHostName] = useState('');

  // Vehicle Request specific
  const [destination, setDestination] = useState('');
  const [vehiclePurpose, setVehiclePurpose] = useState('');
  const [passengers, setPassengers] = useState<{name: string, location: string, phone: string}[]>([{ name: '', location: '', phone: '' }]);
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [retTime, setRetTime] = useState('');
  const [vehicleHostName, setVehicleHostName] = useState('');

  // Item Exit specific
  const [itemName, setItemName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [responsiblePerson, setResponsiblePerson] = useState('');

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
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeSR = onSnapshot(srQ, (snapshot) => {
      setRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: srPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
      if (activeTab === 'SERVICE') setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, srPath);
    });

    // Camera Requests
    const crPath = 'camera_requests';
    const crQ = query(
      collection(db, crPath),
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeCR = onSnapshot(crQ, (snapshot) => {
      setCameraRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: crPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
      if (activeTab === 'CAMERA') setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, crPath);
    });

    // Vehicle Requests
    const vrPath = 'vehicle_requests';
    const vrQ = query(
      collection(db, vrPath),
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeVR = onSnapshot(vrQ, (snapshot) => {
      setVehicleRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: vrPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
      if (activeTab === 'VEHICLE') setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, vrPath);
    });

    // Item Exit Requests
    const irPath = 'item_requests';
    const irQ = query(
      collection(db, irPath),
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeIR = onSnapshot(irQ, (snapshot) => {
      setItemRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: irPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, irPath);
    });

    // Device Requests (Other)
    const drPath = 'device_requests';
    const drQ = query(
      collection(db, drPath),
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeDR = onSnapshot(drQ, (snapshot) => {
      setDeviceRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: drPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, drPath);
    });

    // Guest Requests
    const grPath = 'guest_requests';
    const grQ = query(
      collection(db, grPath),
      where('departmentName', '==', profile.department || 'Unknown'),
      limit(50)
    );
    const unsubscribeGR = onSnapshot(grQ, (snapshot) => {
      setGuestRequests(
        snapshot.docs
          .map(doc => ({ id: doc.id, collectionName: grPath, ...doc.data() }))
          .filter((req: any) => !req.archived && !req.purgedByDeptDirector)
      );
      if (activeTab === 'OTHER') setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, grPath);
    });

    const fleetPath = 'fleet';
    const fleetQuery = query(
      collection(db, fleetPath), 
      where('status', '==', 'OPERATIONAL'),
      limit(20)
    );
    const unsubscribeFleet = onSnapshot(fleetQuery, (snapshot) => {
      setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, fleetPath);
    });

    return () => {
      unsubscribeSR();
      unsubscribeCR();
      unsubscribeVR();
      unsubscribeIR();
      unsubscribeDR();
      unsubscribeGR();
      unsubscribeFleet();
    };
  }, [profile, activeTab]);

  // Real-time SIM SMS logs subscription for simulated on-phone alerts
  useEffect(() => {
    if (!profile?.uid) return;

    const qSms = query(
      collection(db, 'sim_sms_logs'),
      where('recipientId', '==', profile.uid),
      limit(20)
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

      setSmsLogs(logs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));

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
      handleFirestoreError(error, OperationType.LIST, 'sim_sms_logs');
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
    const allRequests = [
      ...requests,
      ...cameraRequests,
      ...vehicleRequests,
      ...itemRequests,
      ...deviceRequests,
      ...guestRequests
    ];
    const matched = allRequests.find((r: any) => r.id === requestId);
    if (matched) {
      setSelectedRequest(matched);
      setIsSmsPhoneOpen(false);
    } else {
      toast.error(t("Request details not found or archived"));
    }
  };

  const currentList = useMemo(() => {
    const getRawList = () => {
      const sortByCreatedDesc = (arr: any[]) => {
        return [...arr].sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
      };
      switch(activeTab) {
        case 'SERVICE': return sortByCreatedDesc(requests);
        case 'CAMERA': return sortByCreatedDesc(cameraRequests);
        case 'VEHICLE': return sortByCreatedDesc(vehicleRequests);
        case 'OTHER': return sortByCreatedDesc([...itemRequests, ...deviceRequests, ...guestRequests]);
        default: return [];
      }
    };
    return getRawList().filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [activeTab, requests, cameraRequests, vehicleRequests, itemRequests, deviceRequests, guestRequests]);

  const groupedByDept = useMemo(() => {
    const groups: Record<string, any[]> = {};
    currentList.forEach(req => {
      const dept = req.departmentName || 'Default Sector';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(req);
    });
    return groups;
  }, [currentList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handleActualSubmit();
    } catch (err: any) {
      console.error("Submission failed:", err);
      let displayMsg = err?.message || String(err);
      try {
        const parsed = JSON.parse(displayMsg);
        if (parsed.error) {
          displayMsg = parsed.error;
        }
      } catch (parseErr) {
        // Fallback to original string
      }
      toast.error(`Request submission failed: ${displayMsg}`);
    }
  };

  const handleActualSubmit = async () => {

    if (!profile) return;

    if (activeTab === 'SERVICE') {
      const cleanPhone = phoneNumber.trim();
      if (!cleanPhone.startsWith('+')) {
        toast.error('Direct Phone must start with + and include country code (e.g., +251...)');
        return;
      }
      if (/[a-zA-Z?*]/.test(cleanPhone)) {
        toast.error('Direct Phone cannot contain letters or placeholder indices (e.g., XXXX)');
        return;
      }
    }

    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (attachedFile) {
        setIsUploading(true);
        try {
          const fileRef = ref(storage, `requests/${activeTab}/${Date.now()}_${attachedFile.name}`);
          const snapshot = await uploadBytes(fileRef, attachedFile);
          attachmentUrl = await getDownloadURL(snapshot.ref);
          attachmentName = attachedFile.name;
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
          toast.error('Failed to upload attachment. Submitting without it.');
        } finally {
          setIsUploading(false);
        }
      }

      let docRef;
      if (isEditing && editingId) {
        const colName = activeTab === 'SERVICE' ? 'service_requests' : 
                        activeTab === 'CAMERA' ? 'camera_requests' : 
                        activeTab === 'VEHICLE' ? 'vehicle_requests' : 
                        (clearanceType === 'ITEM' ? 'item_requests' : clearanceType === 'LABOR' ? 'device_requests' : 'guest_requests');
        
        let updateData: any = {
          updatedAt: serverTimestamp(),
        };

        if (attachmentUrl) {
          updateData.attachmentUrl = attachmentUrl;
          updateData.attachmentName = attachmentName;
        }

        if (activeTab === 'SERVICE') {
          updateData = { ...updateData, phoneNumber, location, serviceCategory: category, workName, description, priority, requesterName: serviceRequester || profile.displayName };
        } else if (activeTab === 'CAMERA') {
          updateData = { ...updateData, eventTitle, location, date: eventDate, startTime, endTime, purpose: cameraPurpose, hostName: cameraHostName, requesterName: cameraHostName || profile.displayName };
        } else if (activeTab === 'VEHICLE') {
          updateData = { ...updateData, destination, tripName: workName, purpose: vehiclePurpose, passengers, departureDate: depDate, departureTime: depTime, returnTime: retTime, hostName: vehicleHostName || profile.displayName, requesterName: vehicleHostName || profile.displayName };
        } else if (activeTab === 'OTHER') {
          if (clearanceType === 'ITEM') {
            updateData = { ...updateData, itemName, serialNumber, purpose: exitReason, expectedReturnDate, quantity: itemQuantity, responsiblePerson };
          } else if (clearanceType === 'LABOR') {
            updateData = { 
              ...updateData, 
              projectName: workName, 
              deviceModel, 
              quantity: requestQty, 
              purpose: description, 
              startTime: startTime, 
              endTime: endTime, 
              date: eventDate 
            };
          } else if (clearanceType === 'GUEST') {
            updateData = {
              ...updateData,
              visitorNames,
              visitorCompany,
              guestCount,
              visitDate,
              visitTime,
              hostName,
              purpose: guestPurpose,
            };
          }
        }

        await updateDoc(doc(db, colName, editingId), updateData);
        toast.success('Request updated successfully');
      } else {
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
            requesterName: serviceRequester || profile.displayName,
            status: 'NEW',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachmentUrl,
            attachmentName,
            };
            docRef = await addDoc(collection(db, path), newRequest);
        } else if (activeTab === 'CAMERA') {
            const path = 'camera_requests';
            const newRequest = {
            requestId: eventTitle || `CR-${Date.now()}`,
            directorId: profile.uid,
            directorName: profile.displayName,
            departmentName: profile.department || 'Unknown Dept',
            eventTitle,
            location,
            date: eventDate,
            startTime,
            endTime,
            purpose: cameraPurpose,
            requesterName: cameraHostName || profile.displayName,
            hostName: cameraHostName || profile.displayName,
            status: 'NEW',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachmentUrl,
            attachmentName,
            };
            docRef = await addDoc(collection(db, path), newRequest);
        } else if (activeTab === 'VEHICLE') {
            const path = 'vehicle_requests';
            const newRequest = {
            requestId: destination || `VR-${Date.now()}`,
            directorId: profile.uid,
            directorName: profile.displayName,
            departmentName: profile.department || 'Unknown Dept',
            destination,
            tripName: workName,
            purpose: vehiclePurpose,
            vehicleType: 'Standard',
            passengers,
            requesterName: vehicleHostName || profile.displayName,
            hostName: vehicleHostName || profile.displayName,
            departureDate: depDate,
            departureTime: depTime,
            returnTime: retTime,
            status: 'NEW',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attachmentUrl,
            attachmentName,
            };
            docRef = await addDoc(collection(db, path), newRequest);
        } else if (activeTab === 'OTHER') {
            if (clearanceType === 'ITEM') {
              const path = 'item_requests';
              const newRequest = {
                requestId: itemName || `EX-${Date.now()}`,
                directorId: profile.uid,
                directorName: profile.displayName,
                departmentName: profile.department || 'Unknown Dept',
                itemName,
                serialNumber,
                purpose: exitReason,
                requesterName: profile.displayName,
                expectedReturnDate,
                quantity: itemQuantity,
                responsiblePerson,
                status: 'NEW',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                attachmentUrl,
                attachmentName,
              };
              docRef = await addDoc(collection(db, path), newRequest);
            } else if (clearanceType === 'LABOR') {
              const path = 'device_requests';
              const newRequest = {
                requestId: workName || `LAB-${Date.now()}`,
                directorId: profile.uid,
                directorName: profile.displayName,
                departmentName: profile.department || 'Unknown Dept',
                projectName: workName,
                deviceModel: deviceModel || 'General Laborer',
                requesterName: profile.displayName,
                quantity: requestQty,
                startTime: startTime,
                endTime: endTime,
                date: eventDate,
                purpose: description,
                status: 'NEW',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                attachmentUrl,
                attachmentName,
              };
              docRef = await addDoc(collection(db, path), newRequest);
            } else if (clearanceType === 'GUEST') {
              const path = 'guest_requests';
              const newRequest = {
                requestId: visitorNames || `GST-${Date.now()}`,
                directorId: profile.uid,
                directorName: profile.displayName,
                departmentName: profile.department || 'Unknown Dept',
                visitorNames,
                visitorCompany,
                guestCount,
                requesterName: profile.displayName,
                visitDate,
                visitTime,
                hostName: hostName || profile.displayName,
                purpose: guestPurpose,
                status: 'NEW',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                attachmentUrl,
                attachmentName,
              };
              docRef = await addDoc(collection(db, path), newRequest);
            }
        }
      } // End of creation block

      if (isEditing) {
        toast.success('Record synchronized');
      }
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setAttachedFile(null);
      setIsUploading(false);
        
      if (!isEditing) {
        const realRequestId = docRef?.id || `REQ-${Date.now()}`;
        
        // Create notifications for Admins and relevant operators
        const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'ADMIN')));
        const adminDocs = adminsSnapshot.docs;
        
        // Target roles based on request type
        let targetRole = '';
        if (activeTab === 'CAMERA') targetRole = 'CAMERAMAN';
        else if (activeTab === 'VEHICLE') targetRole = 'DRIVER';
        else if (activeTab === 'SERVICE') targetRole = 'TECHNICIAN';
        else if (activeTab === 'OTHER') {
          if (clearanceType === 'ITEM') targetRole = 'SECURITY';
          else if (clearanceType === 'GUEST') targetRole = 'SECURITY';
          else targetRole = 'TECHNICIAN';
        }

        const staffSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', targetRole)));
        const staffDocs = staffSnapshot.docs;

        // Combine audiences (Admins + Relevant Staff)
        const audienceIds = Array.from(new Set([
          ...adminDocs.map(d => d.id),
          ...staffDocs.map(d => d.id)
        ]));

        const isApprovedItem = activeTab === 'OTHER' && (clearanceType === 'ITEM' || clearanceType === 'GUEST');
        
        let requestTypeLabel = '';
        let displayName = '';
        
        if (activeTab === 'CAMERA') {
          requestTypeLabel = 'Camera';
          displayName = eventTitle;
        } else if (activeTab === 'VEHICLE') {
          requestTypeLabel = 'Vehicle';
          displayName = workName;
        } else if (activeTab === 'SERVICE') {
          requestTypeLabel = 'Service';
          displayName = workName;
        } else if (activeTab === 'OTHER') {
          if (clearanceType === 'ITEM') {
            requestTypeLabel = 'Exit Permit';
            displayName = itemName;
          } else if (clearanceType === 'LABOR') {
            requestTypeLabel = 'Laborer Request';
            displayName = workName;
          } else if (clearanceType === 'GUEST') {
            requestTypeLabel = 'Guest Entrance';
            displayName = visitorNames;
          }
        }
        
        const notificationTitle = isApprovedItem
          ? `[APPROVED] [${profile.department}] ${requestTypeLabel}: ${displayName}`
          : `[${profile.department}] ${requestTypeLabel}: ${displayName}`;
          
        const notificationMessage = isApprovedItem
          ? (clearanceType === 'GUEST' 
              ? `APPROVED GUEST: ${profile.displayName} approved Guest Entrance for "${displayName}". Security gate clearance authorized.`
              : `APPROVED EXIT: ${profile.displayName} approved Exit Permit for item "${displayName}". Security clearance authorized.`)
          : `ALERT: ${profile.displayName} submitted a new ${requestTypeLabel.toLowerCase()} request: "${displayName}" for ${location || destination || 'unspecified site'}.`;
        
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

        // Add self-notification & background FCM for Director requestor
        // (Self-notification removed per user request)

        await Promise.all(notificationPromises);
      }
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

  const handleApproveClearance = async (requestId: string) => {
    if (!selectedRequest) return;
    const colName = selectedRequest.collectionName || 'item_requests';
    const path = `${colName}/${requestId}`;
    try {
      await updateDoc(doc(db, colName, requestId), {
        status: 'APPROVED',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Request approved successfully');
      
      const isItem = colName === 'item_requests';
      const isGuest = colName === 'guest_requests';
      const isLabor = colName === 'device_requests';
      
      if (isItem || isGuest || isLabor) {
        // Query users with role === 'SECURITY'
        const securitySnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'SECURITY')));
        const securityDocs = securitySnapshot.docs;
        
        let displayName = '';
        let requestTypeLabel = '';
        
        if (isItem) {
          displayName = selectedRequest.itemName || 'Untitled Item';
          requestTypeLabel = 'Exit Permit';
        } else if (isGuest) {
          displayName = selectedRequest.visitorNames || 'Untitled Guest';
          requestTypeLabel = 'Guest Entrance';
        } else {
          displayName = selectedRequest.projectName || 'Untitled Laborer Request';
          requestTypeLabel = 'Laborer Request';
        }
        
        const title = `[APPROVED] [${profile.department || 'Property Service'}] ${requestTypeLabel}: ${displayName}`;
        const message = isGuest
          ? `APPROVED GUEST: Director ${profile.displayName} approved Guest Entrance for "${displayName}". Security gate clearance authorized.`
          : isItem
          ? `APPROVED EXIT: Director ${profile.displayName} approved Exit Permit for item "${displayName}". Security clearance authorized.`
          : `APPROVED LABORER: Director ${profile.displayName} approved Laborer Request for "${displayName}". General access authorized.`;
          
        const notificationPromises = securityDocs.map(uDoc => {
          const targetUserId = uDoc.id;
          const notificationId = `notif_sec_approve_${Date.now()}_${targetUserId}`;
          return setDoc(doc(db, 'notifications', notificationId), {
            userId: targetUserId,
            title,
            message,
            read: false,
            role: 'SECURITY',
            type: 'APPROVAL',
            isClearanceApproval: true,
            requestId: requestId,
            createdAt: serverTimestamp(),
          });
        });
        await Promise.all(notificationPromises);

        setApprovalPopup({
          isOpen: true,
          title,
          message,
          itemName: displayName,
          type: requestTypeLabel,
        });
      }
      
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

    setDeleteTarget({ type: 'bulk' });
    setIsDeletePasswordModalOpen(true);
  };

  const executeBulkDelete = async () => {
    const currentTabRequests = activeTab === 'SERVICE' ? requests : 
                               activeTab === 'CAMERA' ? cameraRequests : 
                               activeTab === 'VEHICLE' ? vehicleRequests : 
                               [...itemRequests, ...deviceRequests, ...guestRequests];
    
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const req = currentTabRequests.find(r => r.id === id);
        if (req) {
          const collectionName = (req as any).collectionName || (
            activeTab === 'SERVICE' ? 'service_requests' :
            activeTab === 'CAMERA' ? 'camera_requests' :
            activeTab === 'VEHICLE' ? 'vehicle_requests' :
            activeTab === 'ITEM' ? 'item_requests' : 'device_requests'
          );
          return updateDoc(doc(db, collectionName as string, id as string), { purgedByDeptDirector: true });
        }
      });

      await Promise.all(promises);
      toast.success(`${selectedIds.size} records purged permanently`);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setBulkDeleteConfirm(false);
    } catch (error) {
      toast.error('Purge failure');
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
    setServiceRequester('');
    setItemName('');
    setSerialNumber('');
    setExitReason('');
    setExpectedReturnDate('');
    setItemQuantity(1);
    setResponsiblePerson('');
    setEventTitle('');
    setEventDate('');
    setStartTime('');
    setEndTime('');
    setCameraPurpose('');
    setCameraHostName('');
    setDestination('');
    setVehiclePurpose('');
    setPassengers([{ name: '', location: '', phone: '' }]);
    setDepDate('');
    setDepTime('');
    setRetTime('');
    setVehicleHostName('');
    setDeviceModel('');
    setRequestQty(1);
    setNeedDate('');
    // Guest states
    setVisitorNames('');
    setVisitorCompany('');
    setGuestCount(1);
    setVisitDate('');
    setVisitTime('');
    setHostName('');
    setGuestPurpose('');
  };

  const handleEdit = (e: React.MouseEvent, request: any) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(request.id);
    setIsModalOpen(true);
    
    // Set appropriate clearanceType for editing under Gate/Admin
    if (request.collectionName === 'item_requests') {
      setClearanceType('ITEM');
    } else if (request.collectionName === 'device_requests') {
      setClearanceType('LABOR');
    } else if (request.collectionName === 'guest_requests') {
      setClearanceType('GUEST');
    }

    // Populate form
    setWorkName(request.workName || request.tripName || request.projectName || '');
    setDescription(request.description || request.purpose || '');
    setCategory(request.serviceCategory || 'Hardware');
    setLocation(request.location || '');
    setPriority(request.priority || 'MEDIUM');
    setPhoneNumber(request.phoneNumber || profile?.phoneNumber || '');
    setServiceRequester(request.requesterName || '');
    setItemName(request.itemName || '');
    setSerialNumber(request.serialNumber || '');
    setExitReason(request.purpose || '');
    setExpectedReturnDate(request.expectedReturnDate || '');
    setItemQuantity(request.quantity || 1);
    setResponsiblePerson(request.responsiblePerson || '');
    setEventTitle(request.eventTitle || '');
    setEventDate(request.date || '');
    setStartTime(request.startTime || '');
    setEndTime(request.endTime || '');
    setCameraPurpose(request.purpose || '');
    setCameraHostName(request.hostName || '');
    setDestination(request.destination || '');
    setVehiclePurpose(request.purpose || '');
    setPassengers(request.passengers || [{ name: '', location: '', phone: '' }]);
    setDepDate(request.departureDate || '');
    setDepTime(request.departureTime || '');
    setRetTime(request.returnTime || '');
    setVehicleHostName(request.hostName || '');
    setDeviceModel(request.deviceModel || '');
    setRequestQty(request.quantity || 1);
    setNeedDate(request.neededBy || '');
  };

  const handleDeleteOne = async (e: React.MouseEvent, request: any) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'single', request });
    setIsDeletePasswordModalOpen(true);
  };

  const executeSingleDelete = async (request: any) => {
    try {
      const colName = request.collectionName || (
        activeTab === 'SERVICE' ? 'service_requests' :
        activeTab === 'CAMERA' ? 'camera_requests' :
        activeTab === 'VEHICLE' ? 'vehicle_requests' :
        activeTab === 'ITEM' ? 'item_requests' : 'device_requests'
      );
      await updateDoc(doc(db, colName, request.id), { purgedByDeptDirector: true });
      toast.success('Record purged permanently');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Purge failure');
      console.error(error);
    }
  };

  const categories = ['Hardware', 'Software', 'Network', 'Electrical', 'Furniture', 'Other'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-slate-950 tracking-tight">{t("Dept Director Portal", "FMC REQUEST Portal")}</h1>
          <p className="text-dark-text-subtle mt-1 font-serif italic text-sm">{t("Unified request management system")}</p>
        </div>
        <button
          id="new-request-btn"
          onClick={() => {
            setIsEditing(false);
            setEditingId(null);
            resetForm();
            setIsPasswordModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-dark-accent hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-lg transition-all shadow-lg shadow-indigo-900/40 active:scale-95 text-[0.85rem]"
        >
          <Plus className="w-4 h-4" />
          {t("Create New")} {activeTab === 'SERVICE' ? t("Service Request") : activeTab === 'CAMERA' ? t("Camera Request") : activeTab === 'VEHICLE' ? t("Vehicle Request") : t("Admin Clearance")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border overflow-x-auto pb-px">
        <TabButton 
          active={activeTab === 'SERVICE'} 
          onClick={() => setActiveTab('SERVICE')} 
          icon={Tag} 
          label={t("Service Request", "Service & Repairs")} 
          count={requests.length}
        />
        <TabButton 
          active={activeTab === 'CAMERA'} 
          onClick={() => setActiveTab('CAMERA')} 
          icon={Camera} 
          label={t("Camera Request", "Camera Coverage")} 
          count={cameraRequests.length}
        />
        <TabButton 
          active={activeTab === 'VEHICLE'} 
          onClick={() => setActiveTab('VEHICLE')} 
          icon={Car} 
          label={t("Vehicle Request", "Vehicle Request")} 
          count={vehicleRequests.length}
        />
        <TabButton 
          active={activeTab === 'OTHER'} 
          onClick={() => setActiveTab('OTHER')} 
          icon={ShieldCheck} 
          label={t("Property Service", "Property Service")} 
          count={itemRequests.length + deviceRequests.length + guestRequests.length}
        />
      </div>

      {/* Service Log Table section */}
      <div className="bg-dark-card rounded-xl border border-dark-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <div>
            <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
              {activeTab === 'SERVICE' ? 'Service Log' : activeTab === 'CAMERA' ? 'Camera Coverage Log' : activeTab === 'VEHICLE' ? 'Transportation Log' : 'Property Service Clearances Log'}
            </h3>
            <p className="text-[10px] text-dark-text-subtle mt-1">Operational records categorized by department resource load</p>
          </div>
          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-black text-dark-accent mr-2 uppercase tracking-widest">{selectedIds.size} Selected</span>
                <button 
                  onClick={handleClearSelected}
                  disabled={selectedIds.size === 0}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 border",
                    bulkDeleteConfirm 
                      ? "bg-rose-500 border-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/40" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                  )}
                >
                  {bulkDeleteConfirm ? 'CONFIRM PURGE' : 'Delete Selected'}
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
                Bulk Action Mode
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border bg-dark-main/30">
                {isSelectMode && <th className="py-4 px-6 w-10"></th>}
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest">{t("Order No", "Order No")}</th>
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest">{t("Dept / Requester")}</th>
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest">{t("Request Details")}</th>
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest">{t("Status")}</th>
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest">{t("Schedule")}</th>
                <th className="py-4 px-6 text-[10px] font-black text-dark-text-muted uppercase tracking-widest text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-dark-text-subtle">Retreiving records...</td></tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="w-16 h-16 bg-dark-main rounded-xl flex items-center justify-center mx-auto mb-4 border border-dark-border">
                      {activeTab === 'SERVICE' ? <Clock className="w-8 h-8 text-dark-border" /> : activeTab === 'CAMERA' ? <Camera className="w-8 h-8 text-dark-border" /> : activeTab === 'VEHICLE' ? <Car className="w-8 h-8 text-dark-border" /> : <ShieldCheck className="w-8 h-8 text-dark-border" />}
                    </div>
                    <p className="text-slate-400 font-medium">No records found</p>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedByDept).map(([dept, deptRequests]) => (
                  <React.Fragment key={dept}>
                    <tr className="bg-dark-main/40">
                      <td colSpan={7} className="px-6 py-2 border-y border-dark-border">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-dark-accent rounded-full" />
                          <span className="text-[10px] font-black text-dark-text-muted uppercase tracking-[0.2em]">{dept}</span>
                          <span className="text-[9px] font-mono text-dark-text-subtle ml-2 opacity-50">{(deptRequests as any[]).length} Operations</span>
                        </div>
                      </td>
                    </tr>
                    {(deptRequests as any[]).map((request, idx) => (
                      <tr 
                        key={`dept-req-${dept}-${request.id || 'req'}-${idx}`} 
                        className={cn(
                           "group transition-colors",
                           isSelectMode && selectedIds.has(request.id) ? "bg-dark-accent/5" : "hover:bg-dark-main/20"
                        )}
                      >
                        {isSelectMode && (
                          <td className="py-4 px-6">
                            <div 
                              onClick={() => toggleSelect(request.id)}
                              className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
                                selectedIds.has(request.id) ? "bg-dark-accent border-dark-accent" : "border-dark-border bg-dark-main"
                              )}
                            >
                              {selectedIds.has(request.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-6">
                          <span className="text-[11px] font-mono font-black text-slate-800 tracking-wider">
                            #{request.id ? request.id.slice(-6).toUpperCase() : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs font-black text-black uppercase tracking-tight">{request.departmentName || 'General Dept'}</p>
                          <p className="text-[10px] text-dark-text-subtle font-medium uppercase tracking-widest">{request.requesterName || request.directorName || 'Unknown Agent'}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-slate-900 line-clamp-1 flex items-center gap-2">
                            <span>
                              {activeTab === 'SERVICE' ? request.workName :
                               activeTab === 'CAMERA' ? request.eventTitle :
                               activeTab === 'VEHICLE' ? request.tripName :
                               (request.collectionName === 'item_requests' ? request.itemName :
                                request.collectionName === 'guest_requests' ? `Guest Entrance: ${request.visitorNames}` :
                                request.projectName)}
                            </span>
                            
                            {activeTab === 'OTHER' && (
                              <span className={cn(
                                "text-[9px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                request.collectionName === 'item_requests' 
                                  ? "text-pink-500 bg-pink-500/10 border-pink-500/20" 
                                  : request.collectionName === 'guest_requests'
                                  ? "text-sky-500 bg-sky-500/10 border-sky-500/20"
                                  : "text-violet-500 bg-violet-500/10 border-violet-500/20"
                              )}>
                                {request.collectionName === 'item_requests' ? 'Item Exit' : request.collectionName === 'guest_requests' ? 'Guest Entry' : 'Laborer Request'}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-dark-text-subtle line-clamp-1 italic font-serif">
                            {activeTab === 'SERVICE' ? request.description :
                             activeTab === 'CAMERA' ? request.purpose :
                             activeTab === 'VEHICLE' ? request.destination :
                             (request.collectionName === 'item_requests' ? `S/N: ${request.serialNumber || 'N/A'} | Qty: ${request.quantity || 1} | Reason: ${request.purpose}` :
                              request.collectionName === 'guest_requests' ? `Guests: ${request.guestCount || 1} | Company: ${request.visitorCompany || 'N/A'} | Purpose: ${request.purpose}` :
                              `${request.deviceModel || 'General Service Request'} (${request.quantity || 1} Person[s])`)}
                          </p>
                          {activeTab === 'OTHER' && request.collectionName === 'item_requests' && request.responsiblePerson && (
                            <p className="text-[9px] font-black uppercase text-dark-text-muted mt-1 font-mono tracking-wider">
                              Responsible: <span className="text-dark-accent">{request.responsiblePerson}</span>
                            </p>
                          )}
                          {activeTab === 'OTHER' && request.collectionName === 'guest_requests' && request.hostName && (
                            <p className="text-[9px] font-black uppercase text-dark-text-muted mt-1 font-mono tracking-wider">
                              Host: <span className="text-dark-accent">{request.hostName}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={cn("status-pill text-[9px]", getStatusStyle(request.status))}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-dark-text-subtle">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-mono">
                              {request.createdAt ? format(request.createdAt.toDate(), 'MM/dd HH:mm') : 'Sync...'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                           <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequest(request);
                                }}
                                className="p-2 bg-dark-card border border-dark-border rounded-lg text-dark-text-subtle hover:text-white transition-colors"
                                title="View Details"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => handleEdit(e, request)}
                                className="p-2 bg-dark-accent/10 border border-dark-border/20 text-dark-accent rounded-lg hover:bg-dark-accent hover:text-white transition-colors"
                                title="Edit Record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteOne(e, request)}
                                className={cn(
                                  "p-2 rounded-lg transition-all border",
                                  deleteConfirmId === request.id
                                    ? "bg-rose-500 border-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/40"
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                                )}
                                title={deleteConfirmId === request.id ? "Confirm Purge" : "Delete Record"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      <RequestPasswordModal 
         isOpen={isPasswordModalOpen} 
         onClose={() => setIsPasswordModalOpen(false)} 
         expectedPassword={['654', profile?.phoneNumber].filter(Boolean) as string[]}
         onAuthenticated={() => {
            setIsPasswordModalOpen(false);
            setIsModalOpen(true);
         }} 
      />
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
                      <h2 className="text-2xl font-medium text-slate-950 tracking-tight">{t('Request Details')}</h2>
                      <p className="text-dark-text-subtle text-sm mt-1">Status: {selectedRequest.status.replace('_', ' ')}</p>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="p-2 text-dark-text-subtle hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="p-10 space-y-8">
                   {activeTab === 'OTHER' ? (
                     <div className="grid grid-cols-2 gap-6">
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Laborers Needed</p>
                         <p className="text-sm font-black text-black">{selectedRequest.quantity || 1} Laborer(s)</p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Special Skill / Focus</p>
                         <p className="text-sm font-black text-black">{selectedRequest.deviceModel || 'General Laborer'}</p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Work Start Time</p>
                         <p className="text-sm font-black text-black">{selectedRequest.startTime || 'Not Specified'}</p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Work Ending Time</p>
                         <p className="text-sm font-black text-black">{selectedRequest.endTime || 'Not Specified'}</p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl col-span-2">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Assignment Date & Year</p>
                         <p className="text-sm font-black text-indigo-500 font-mono">{selectedRequest.date || selectedRequest.neededBy || 'Not Specified'}</p>
                       </div>
                     </div>
                   ) : activeTab === 'ITEM' ? (
                     <div className="grid grid-cols-2 gap-6">
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Responsible Person</p>
                         <p className="text-sm font-black text-black">{selectedRequest.responsiblePerson || 'Not Specified'}</p>
                       </div>
                       <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                         <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Quantity / Serial Number</p>
                         <p className="text-sm font-black text-black">Qty: {selectedRequest.quantity || 1} ({selectedRequest.serialNumber || 'No S/N'})</p>
                       </div>
                       {selectedRequest.expectedReturnDate && (
                         <div className="p-5 bg-dark-main border border-dark-border rounded-xl col-span-2">
                           <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">Expected Return Date</p>
                           <p className="text-sm font-black text-black">{selectedRequest.expectedReturnDate}</p>
                         </div>
                       )}
                     </div>
                   ) : (
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
                   )}

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
                      {selectedRequest.status === 'NEW' && activeTab === 'OTHER' && (
                        <button 
                          onClick={() => {
                            handleApproveClearance(selectedRequest.id);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-3 animate-in fade-in zoom-in-95 duration-200"
                        >
                           <CheckCircle2 className="w-5 h-5" />
                           Director Approve
                        </button>
                      )}
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
                  {isEditing ? 'Sync / Update Record' : (activeTab === 'SERVICE' ? 'Initialize Service Request' : activeTab === 'CAMERA' ? 'Request Camera Coverage' : activeTab === 'VEHICLE' ? 'Request Vehicle Assignment' : activeTab === 'ITEM' ? 'Request Item Exit Permit' : 'Request Service')}
                </h2>
                <p className="text-dark-text-subtle text-sm mt-1">
                  {isEditing ? 'Modify or update the parameters of this operational record' : (activeTab === 'SERVICE' ? 'Specify operational details for the technical team' : activeTab === 'CAMERA' ? 'Describe the event and coverage requirements' : activeTab === 'VEHICLE' ? 'Define destination and trip specifications' : activeTab === 'ITEM' ? 'Specify items leaving boundaries' : 'Define work requirements and headcount of laborers')}
                </p>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto">
                {activeTab === 'SERVICE' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Service Category")}</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
                        >
                          {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Requested Person Name")}</label>
                        <input
                          type="text"
                          required
                          placeholder={t("e.g. John Doe")}
                          value={serviceRequester}
                          onChange={(e) => setServiceRequester(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Priority Vector")}</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all appearance-none"
                        >
                          {priorities.map(p => <option key={p} value={p}>{t(p)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Deployment Zone")}</label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
                          <input
                            required
                            type="text"
                            placeholder={t("Location ID")}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Communication Link")}</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-subtle" />
                        <input
                          required
                          type="tel"
                          placeholder={t("Direct phone")}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Work Name / Title")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("e.g., Office AC Repair")}
                        value={workName}
                        onChange={(e) => setWorkName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold placeholder:text-dark-text-muted/50 focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                      <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Issue Specifications")}</label>
                      <textarea
                        required
                        rows={4}
                        placeholder={t("Provide technical descriptors...")}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold placeholder:text-dark-text-muted/50 focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'OTHER' && (
                  <>
                    <div className="mb-6">
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">Clearance Permit Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setClearanceType('ITEM')}
                          className={cn(
                            "py-3 px-4 rounded-lg font-bold text-xs border transition-all text-center",
                            clearanceType === 'ITEM' 
                              ? "bg-dark-accent text-white border-dark-accent shadow-lg shadow-indigo-950/40" 
                              : "bg-dark-main text-dark-text-muted border-dark-border hover:text-white hover:bg-dark-card"
                          )}
                        >
                          Item Exit Permit
                        </button>
                        <button
                          type="button"
                          onClick={() => setClearanceType('LABOR')}
                          className={cn(
                            "py-3 px-4 rounded-lg font-bold text-xs border transition-all text-center",
                            clearanceType === 'LABOR' 
                              ? "bg-dark-accent text-white border-dark-accent shadow-lg shadow-indigo-950/40" 
                              : "bg-dark-main text-dark-text-muted border-dark-border hover:text-white hover:bg-dark-card"
                          )}
                        >
                          Laborer Request
                        </button>
                        <button
                          type="button"
                          onClick={() => setClearanceType('GUEST')}
                          className={cn(
                            "py-3 px-4 rounded-lg font-bold text-xs border transition-all text-center",
                            clearanceType === 'GUEST' 
                              ? "bg-dark-accent text-white border-dark-accent shadow-lg shadow-indigo-950/40" 
                              : "bg-dark-main text-dark-text-muted border-dark-border hover:text-white hover:bg-dark-card"
                          )}
                        >
                          Guest Entrance
                        </button>
                      </div>
                    </div>

                    {clearanceType === 'ITEM' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Item Name / Model")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g., Dell Laptop XPS 15")}
                              value={itemName}
                              onChange={(e) => setItemName(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Serial Number / Asset Tag")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g., S/N 12345678")}
                              value={serialNumber}
                              onChange={(e) => setSerialNumber(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Quantity")}</label>
                            <input
                              required
                              type="number"
                              min="1"
                              placeholder={t("e.g., 1")}
                              value={itemQuantity}
                              onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Responsible for Item")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("Name of person responsible")}
                              value={responsiblePerson}
                              onChange={(e) => setResponsiblePerson(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="mb-6 mt-6">
                          <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Expected Return Date (Optional)")}</label>
                          <input
                            type="date"
                            value={expectedReturnDate}
                            onChange={(e) => setExpectedReturnDate(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                          />
                          <p className="text-[10px] text-dark-text-subtle mt-1 italic font-serif">{t("Leave blank if the item is not expected to return")}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Reason for Exit")}</label>
                          <textarea
                            required
                            rows={3}
                            placeholder={t("Explain why this item is leaving the premises...")}
                            value={exitReason}
                            onChange={(e) => setExitReason(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                          />
                        </div>
                      </>
                    )}

                    {clearanceType === 'LABOR' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Labor Project Name")}</label>
                          <input
                            required
                            type="text"
                            placeholder={t("e.g., Server Room Network Cabling")}
                            value={workName}
                            onChange={(e) => setWorkName(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Laborer Skills / Category")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g., General Laborer, Electrician")}
                              value={deviceModel}
                              onChange={(e) => setDeviceModel(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Headcount Required")}</label>
                            <input
                              required
                              type="number"
                              min="1"
                              placeholder={t("e.g., 2")}
                              value={requestQty}
                              onChange={(e) => setRequestQty(parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Event Date")}</label>
                            <input
                              required
                              type="date"
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Start Time")}</label>
                              <input
                                required
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("End Time")}</label>
                              <input
                                required
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-6">
                          <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Task Description")}</label>
                          <textarea
                            required
                            rows={3}
                            placeholder={t("Detailed description of work to be performed...")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-xl text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all resize-none"
                          />
                        </div>
                      </>
                    )}

                    {clearanceType === 'GUEST' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Visitor Names (comma separated)")}</label>
                          <input
                            required
                            type="text"
                            placeholder={t("e.g. John Doe, Jane Smith")}
                            value={visitorNames}
                            onChange={(e) => setVisitorNames(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Visitor Affiliation / Company")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g. Acme Corp")}
                              value={visitorCompany}
                              onChange={(e) => setVisitorCompany(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Guest Count")}</label>
                            <input
                              required
                              type="number"
                              min="1"
                              placeholder={t("e.g. 1")}
                              value={guestCount}
                              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Visit Date")}</label>
                            <input
                              required
                              type="date"
                              value={visitDate}
                              onChange={(e) => setVisitDate(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Arrival Time")}</label>
                            <input
                              required
                              type="time"
                              value={visitTime}
                              onChange={(e) => setVisitTime(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Host Name")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g. Dr. Arthur")}
                              value={hostName}
                              onChange={(e) => setHostName(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Purpose of Visit")}</label>
                            <input
                              required
                              type="text"
                              placeholder={t("e.g. Audit / Research / Maintenance")}
                              value={guestPurpose}
                              onChange={(e) => setGuestPurpose(e.target.value)}
                              className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {activeTab === 'CAMERA' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Event Title")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("Event name or project title")}
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t("Deployment Zone")}</label>
                        <input
                          required
                          type="text"
                          placeholder={t("Location")}
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Event Date")}</label>
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
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Start Time")}</label>
                        <input
                          required
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("End Time")}</label>
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
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Requester Name / Host Name")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("e.g. Dr. Arthur or self")}
                        value={cameraHostName}
                        onChange={(e) => setCameraHostName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Purpose / Equipment Needed")}</label>
                      <textarea
                        required
                        rows={3}
                        placeholder={t("Explain coverage requirements...")}
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
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Trip Name / Purpose Title")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("e.g., Site Inspection Trip")}
                        value={workName}
                        onChange={(e) => setWorkName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Destination")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("Trip destination")}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Passengers")}</label>
                        {passengers.map((p, index) => (
                          <div key={`passenger-${index}-${(p.name || '').replace(/\s+/g, '-').toLowerCase()}`} className="grid grid-cols-3 gap-2 mb-2">
                            <input placeholder="Name" value={p.name} onChange={(e) => { const n = [...passengers]; n[index].name = e.target.value; setPassengers(n); }} className="w-full px-3 py-2 bg-dark-main border border-dark-border rounded-lg text-xs text-black font-bold outline-none" />
                            <input placeholder="Loc" value={p.location} onChange={(e) => { const n = [...passengers]; n[index].location = e.target.value; setPassengers(n); }} className="w-full px-3 py-2 bg-dark-main border border-dark-border rounded-lg text-xs text-black font-bold outline-none" />
                            <input placeholder="Phone" value={p.phone} onChange={(e) => { const n = [...passengers]; n[index].phone = e.target.value; setPassengers(n); }} className="w-full px-3 py-2 bg-dark-main border border-dark-border rounded-lg text-xs text-black font-bold outline-none" />
                            {index > 0 && <button type="button" onClick={() => { setPassengers(passengers.filter((_, i) => i !== index)); }} className="text-rose-500 font-bold text-xs">X</button>}
                          </div>
                        ))}
                        <button type="button" onClick={() => setPassengers([...passengers, {name: '', location: '', phone: ''}])} className="w-full py-2 bg-dark-main border border-dashed border-dark-border rounded-lg text-[10px] text-black font-bold uppercase tracking-widest mb-4">+ {t("Add Passenger")}</button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Departure Date")}</label>
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
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Departure Time")}</label>
                        <input
                          required
                          type="time"
                          value={depTime}
                          onChange={(e) => setDepTime(e.target.value)}
                          className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Estimated Return")}</label>
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
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Requester Name / Contact Person")}</label>
                      <input
                        required
                        type="text"
                        placeholder={t("Name of the person requesting the trip")}
                        value={vehicleHostName}
                        onChange={(e) => setVehicleHostName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-main border border-dark-border rounded-lg text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all mb-4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-3">{t("Purpose of Trip")}</label>
                      <textarea
                        required
                        rows={3}
                        placeholder={t("Explain mission details...")}
                        value={vehiclePurpose}
                        onChange={(e) => setVehiclePurpose(e.target.value)}
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
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 px-6 py-4 rounded-lg bg-dark-accent text-white font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-900/30 active:scale-95 text-[0.8rem]"
                  >
                    {isEditing ? 'Sync & Update Record' : (activeTab === 'SERVICE' ? 'Submit Service Request' : activeTab === 'CAMERA' ? 'Request Coverage' : activeTab === 'VEHICLE' ? 'Request Assignment' : 'Submit Payload')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {approvalPopup && approvalPopup.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApprovalPopup(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-md bg-dark-card rounded-2xl border border-dark-border shadow-2xl p-8 text-center text-slate-900 overflow-hidden"
            >
              {/* Decorative radial brand glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-950 tracking-tight mb-2">
                Clearance Approved Successfully!
              </h3>
              
              <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-700 text-[10px] font-black rounded uppercase tracking-wider mb-4 border border-emerald-500/20">
                {approvalPopup.type}: Approved
              </div>
              
              <p className="text-sm font-semibold text-black mb-1">
                {approvalPopup.itemName}
              </p>
              
              <p className="text-xs text-dark-text-subtle font-medium leading-relaxed mb-6 bg-dark-main border border-dark-border rounded-xl p-4 italic">
                {approvalPopup.message}
              </p>

              <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 mb-6 text-left">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Gate Clearance
                </p>
                <p className="text-[11px] text-dark-text-subtle leading-normal font-sans">
                  Approval permissions and authorization documents have been securely dispatched and logged in the Security Gate portal.
                </p>
              </div>
              
              <button
                onClick={() => setApprovalPopup(null)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
              >
                Dismiss Dialog
              </button>
            </motion.div>
          </div>
        )}

        <RequestPasswordModal 
          isOpen={isDeletePasswordModalOpen}
          onClose={() => setIsDeletePasswordModalOpen(false)}
          expectedPassword="123"
          onAuthenticated={() => {
            setIsDeletePasswordModalOpen(false);
            if (deleteTarget?.type === 'single') {
              executeSingleDelete(deleteTarget.request);
            } else if (deleteTarget?.type === 'bulk') {
              executeBulkDelete();
            }
          }}
        />

      </AnimatePresence>

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
          className="pointer-events-auto w-12 h-12 rounded-full bg-slate-950 border border-slate-850 text-amber-400 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all relative cursor-pointer"
          title="Toggle PWA Mobile Simulator"
        >
          <Smartphone className="w-5 h-5" />
          {unreadSmsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center rounded-full animate-bounce">
              {unreadSmsCount}
            </span>
          )}
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
                        <div key={`sms-log-${log.id || `idx-${idx}`}`} className="flex flex-col space-y-1">
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

              {/* Phone Home Indicator bar */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-center text-center">
                <button onClick={() => setIsSmsPhoneOpen(false)} className="w-28 h-1 bg-slate-700 rounded-full hover:bg-slate-500 transition-colors pointer-events-auto"></button>
              </div>
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
