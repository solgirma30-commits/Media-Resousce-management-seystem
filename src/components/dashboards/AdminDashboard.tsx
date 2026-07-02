import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TeamNotepad } from "../TeamNotepad";
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
  Edit2,
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
  TowerControl,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Video
} from "lucide-react";
import { LogOut } from "lucide-react";
import { UserProfile } from "../../App";
import { toast } from "react-hot-toast";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { WeeklyReport } from "../WeeklyReport";
import { SignaturePad } from "../SignaturePad";
import { seedWorkforce } from "../../lib/seed";
import { useLanguage } from "../../lib/LanguageContext";
import { notificationService } from "../../services/notificationService";
import { RequestPasswordModal } from "../RequestPasswordModal";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../App";
import { dataService } from "../../services/dataService";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function AdminDashboard() {
  const { profile, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "SERVICE" | "CAMERA" | "VEHICLE" | "PROP_CASUALTY" | "STUDIO"
  >("SERVICE");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearanceType, setClearanceType] = useState<
    "ITEM" | "LABOR" | "GUEST"
  >("ITEM");
  const [globalAlertTitle, setGlobalAlertTitle] = useState("SYSTEM ADVISORY");
  const [globalAlertMessage, setGlobalAlertMessage] = useState(
    "Operational vector established. All stations verify handshake.",
  );
  const [requests, setRequests] = useState<any[]>([]);
  const [cameraRequests, setCameraRequests] = useState<any[]>([]);
  const [vehicleRequests, setVehicleRequests] = useState<any[]>([]);
  const [studioRequests, setStudioRequests] = useState<any[]>([]);
  const [itemRequests, setItemRequests] = useState<any[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<any[]>([]);
  const [guestRequests, setGuestRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [cameramen, setCameramen] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignIds, setSelectedAssignIds] = useState<string[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [studioSubTab, setStudioSubTab] = useState<"ALL" | "TV" | "RADIO">("ALL");
  const [reportCategory, setReportCategory] = useState<
    "SERVICE" | "CAMERA" | "VEHICLE" | "PROP_CASUALTY" | null
  >(null);

  const getFilteredRequestsForReport = () => {
    switch (reportCategory) {
      case "SERVICE":
        return requests;
      case "CAMERA":
        return cameraRequests;
      case "VEHICLE":
        return vehicleRequests;
      case "STUDIO":
        return studioRequests;
      case "PROP_CASUALTY":
        return [...itemRequests, ...deviceRequests, ...guestRequests];
      default:
        return [
          ...requests,
          ...cameraRequests,
          ...vehicleRequests,
          ...studioRequests,
          ...itemRequests,
          ...deviceRequests,
        ];
    }
  };

  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [selectedTechForSms, setSelectedTechForSms] = useState<any | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [customSmsMessage, setCustomSmsMessage] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isDeletePasswordModalOpen, setIsDeletePasswordModalOpen] =
    useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "bulk" | "tech";
    request?: any;
    techId?: string;
  } | null>(null);
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [isEditingInlineAssigned, setIsEditingInlineAssigned] = useState(false);
  const [inlineAssignedName, setInlineAssignedName] = useState("");
  const [inlineAssignedPhone, setInlineAssignedPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<
    "TECHNICIAN" | "DRIVER" | "CAMERAMAN"
  >("TECHNICIAN");
  const [isSeeding, setIsSeeding] = useState(false);

  // Operational Protection (Sector Level)
  const [unlockedSectors, setUnlockedSectors] = useState<Set<string>>(
    new Set(),
  );
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [currentSignatureBase64, setCurrentSignatureBase64] = useState<string | null>(null);
  const [currentApplyStamp, setCurrentApplyStamp] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "APPROVE" | "ASSIGN";
    data: any;
    sector: string;
  } | null>(null);

  const SECTOR_AUTH = {
    SERVICE: { label: "Maintenance Director", pin: "1010", icon: Wrench },
    CAMERA: { label: "Surveillance Director", pin: "2020", icon: Camera },
    VEHICLE: { label: "Logistics Director", pin: "3030", icon: Car },
    STUDIO: { label: "Studio Director", pin: "7070", icon: Video },
    ITEM: { label: "Security Director", pin: "4040", icon: Tag },
    PROP_CASUALTY: {
      label: "Property Service Director",
      pin: "6060",
      icon: ClipboardList,
    },
    OTHER: { label: "Operations Director", pin: "5050", icon: ClipboardList },
    SYSTEM: { label: "IT Systems Director", pin: "9090", icon: Settings },
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [
          srDocs,
          camDocs,
          stuDocs,
          vehDocs,
          itemDocs,
          devDocs,
          guestDocs,
          userDocs
        ] = await Promise.all([
          dataService.list<any>('service_requests'),
          dataService.list<any>('camera_requests'),
          dataService.list<any>('studio_requests'),
          dataService.list<any>('vehicle_requests'),
          dataService.list<any>('item_requests'),
          dataService.list<any>('device_requests'),
          dataService.list<any>('guest_requests'),
          dataService.list<any>('users')
        ]);

        if (!isMounted) return;

        const filterActive = (docs: any[], colName: string, typeLabel: string) => 
          docs.filter(req => !req.archived && !req.purgedByAdmin)
              .map(doc => ({ ...doc, collectionName: colName, type: typeLabel }))
              .sort((a, b) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tB - tA;
              });

        setRequests(filterActive(srDocs, 'service_requests', 'Service'));
        setCameraRequests(filterActive(camDocs, 'camera_requests', 'Camera'));
        setStudioRequests(filterActive(stuDocs, 'studio_requests', 'Studio'));
        setVehicleRequests(filterActive(vehDocs, 'vehicle_requests', 'Vehicle'));
        setItemRequests(filterActive(itemDocs, 'item_requests', 'Exit Permit'));
        setDeviceRequests(filterActive(devDocs, 'device_requests', 'Device'));
        setGuestRequests(filterActive(guestDocs, 'guest_requests', 'Guest Entry'));

        setAllUsers(userDocs);
        setTechnicians(userDocs.filter((u: any) => u.role === "TECHNICIAN"));
        setDrivers(userDocs.filter((u: any) => u.role === "DRIVER"));
        setCameramen(userDocs.filter((u: any) => u.role === "CAMERAMAN"));

        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setLoading(false);
        console.error("Data fetch error:", error);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Poll every 30s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteTechConfirmId, setDeleteTechConfirmId] = useState<string | null>(
    null,
  );

  const getCollectionForActiveSelection = () => {
    if (activeTab === "SERVICE") return "service_requests";
    if (activeTab === "CAMERA") return "camera_requests";
    if (activeTab === "VEHICLE") return "vehicle_requests";
    if (activeTab === "STUDIO") return "studio_requests";
    if (activeTab === "PROP_CASUALTY") {
      if (clearanceType === "ITEM") return "item_requests";
      if (clearanceType === "LABOR") return "device_requests";
      if (clearanceType === "GUEST") return "guest_requests";
    }
    return "service_requests";
  };

  const getCurrentRequestsSource = () => {
    if (activeTab === "SERVICE") return requests;
    if (activeTab === "CAMERA") return cameraRequests;
    if (activeTab === "VEHICLE") return vehicleRequests;
    if (activeTab === "STUDIO") {
      if (studioSubTab === "TV") {
        return studioRequests.filter((req) => req.studioCategory === "TV");
      }
      if (studioSubTab === "RADIO") {
        return studioRequests.filter((req) => req.studioCategory === "RADIO");
      }
      return studioRequests;
    }
    if (activeTab === "PROP_CASUALTY") {
      if (clearanceType === "ITEM") return itemRequests;
      if (clearanceType === "LABOR") return deviceRequests;
      if (clearanceType === "GUEST") return guestRequests;
    }
    return [];
  };

  const getSectorForActiveSelection = () => {
    if (activeTab === "SERVICE") return "SERVICE";
    if (activeTab === "CAMERA") return "CAMERA";
    if (activeTab === "VEHICLE") return "VEHICLE";
    if (activeTab === "STUDIO") return "STUDIO";
    if (activeTab === "PROP_CASUALTY") return "PROP_CASUALTY";
    return activeTab as string;
  };

  const isSectorAuthorized = (
    sector: string = getSectorForActiveSelection(),
  ) => {
    return unlockedSectors.has(sector);
  };

  const collectionMap = {
    SERVICE: "service_requests",
    CAMERA: "camera_requests",
    VEHICLE: "vehicle_requests",
    STUDIO: "studio_requests",
    ITEM: "item_requests",
    OTHER: "device_requests",
    PROP_CASUALTY: "item_requests",
  };

  const handleUpdateRecord = async () => {
    if (!selectedRequest) return;
    try {
      const colName = getCollectionForActiveSelection();
      await dataService.update(colName, selectedRequest.id, {
        ...editFormData,
        updatedAt: new Date(),
      });
      toast.success("Record updated successfully");
      setSelectedRequest({ ...selectedRequest, ...editFormData });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const handleSaveInlineAssigned = async () => {
    if (!selectedRequest) return;
    try {
      const colName = getCollectionForActiveSelection();
      const isVehicle =
        selectedRequest.type === "Vehicle" || activeTab === "VEHICLE";
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (isVehicle) {
        updateData.assignedDriverName = inlineAssignedName;
        updateData.assignedDriverPhone = inlineAssignedPhone;
      } else {
        updateData.assignedTechnicianName = inlineAssignedName;
        updateData.assignedTechnicianPhone = inlineAssignedPhone;
      }
      await dataService.update(colName, selectedRequest.id, updateData);
      toast.success("Assigned member details updated successfully");
      setSelectedRequest({
        ...selectedRequest,
        assignedDriverName: isVehicle
          ? inlineAssignedName
          : selectedRequest.assignedDriverName,
        assignedDriverPhone: isVehicle
          ? inlineAssignedPhone
          : selectedRequest.assignedDriverPhone,
        assignedTechnicianName: !isVehicle
          ? inlineAssignedName
          : selectedRequest.assignedTechnicianName,
        assignedTechnicianPhone: !isVehicle
          ? inlineAssignedPhone
          : selectedRequest.assignedTechnicianPhone,
      });
      setIsEditingInlineAssigned(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update details");
    }
  };

  const handleApprove = async (
    requestId: string,
    directorId: string,
    bypassLockCheck = false,
    signatureBase64?: string | null,
    hasOfficialStamp?: boolean
  ) => {
    if (!bypassLockCheck && !isSectorAuthorized()) {
      setPendingAction({
        type: "APPROVE",
        data: { requestId, directorId, signatureBase64, hasOfficialStamp },
        sector: getSectorForActiveSelection(),
      });
      setIsUnlockModalOpen(true);
      return;
    }

    const colName = getCollectionForActiveSelection();
    const req = getCurrentRequestsSource().find((r) => r.id === requestId);
    const displayName =
      activeTab === "SERVICE"
        ? req?.workName || "Untitled Job"
        : activeTab === "CAMERA"
          ? req?.eventTitle || "Untitled Event"
          : activeTab === "VEHICLE"
            ? req?.tripName || "Untitled Trip"
            : activeTab === "STUDIO"
              ? req?.eventName || "Untitled Studio Request"
              : clearanceType === "ITEM"
                ? req?.itemName || "Untitled Item"
                : clearanceType === "GUEST"
                  ? req?.visitorNames || "Untitled Guest"
                  : req?.projectName || "Untitled Laborer Request";

    try {
      await dataService.update(colName, requestId, {
        status: "APPROVED",
        updatedAt: new Date(),
        approvedBy: profile?.displayName || "System Administrator",
        ...(signatureBase64 ? { signatureBase64 } : {}),
        ...(hasOfficialStamp ? { hasOfficialStamp } : {}),
      });

      const isClearance = activeTab === "PROP_CASUALTY";
      const audienceIds = new Set<string>();
      if (directorId) {
        audienceIds.add(directorId);
      }

      const userMap = new Map<string, Partial<UserProfile>>();

      if (directorId && !userMap.has(directorId)) {
        try {
          const directorData = await dataService.get<any>("users", directorId);
          if (directorData) {
            userMap.set(directorId, {
              fcmToken: directorData?.fcmToken,
              displayName: directorData?.displayName,
            });
          }
        } catch (e) {
          console.error("Failed to fetch director details:", e);
        }
      }

      // Create notification for director
      if (isClearance) {
        const clearancePromises = Array.from(audienceIds).map(
          async (targetUserId) => {
            let title: string;
            let message: string;

            if (clearanceType === "ITEM") {
              title = `[APPROVED] Exit Permit: ${displayName}`;
              message = `APPROVED EXIT: Administrator approved Exit Permit for item "${displayName}". Security clearance authorized.`;
            } else if (clearanceType === "GUEST") {
              title = `[APPROVED] Guest Entrance: ${displayName}`;
              message = `APPROVED ENTRY: Administrator approved Guest Entrance for "${displayName}". Security gate clearance authorized.`;
            } else {
              title = `[APPROVED] Laborer Request: ${displayName}`;
              message = `APPROVED LABORER: Administrator approved Laborer Request for "${displayName}". General access authorized.`;
            }

            // 1. Save local in-app notification doc
            await dataService.createNotification({
              userId: targetUserId,
              title,
              message,
              read: false,
              type: "APPROVAL",
              isClearanceApproval: isClearance, // This signals Layout.tsx to trigger a browser & toast popup immediately!
              requestId: requestId,
              createdAt: new Date(),
            });

            // 2. Dispatch real/simulated FCM Push Notification for both target and director
            const uDetails = userMap.get(targetUserId);
            const dDetails = directorId ? userMap.get(directorId) : null;
            
            const notifyPromises = [];                
            if (uDetails?.fcmToken) {
              notifyPromises.push(
                fetch("/api/send-fcm-notification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    targetUserId,
                    title,
                    body: message,
                    requestId,
                    fcmToken: uDetails.fcmToken,
                  }),
                }).catch(e => console.error("FCM target notification failed:", e))
              );
            }
            if (dDetails?.fcmToken && (dDetails as any).uid !== targetUserId) {
              notifyPromises.push(
                fetch("/api/send-fcm-notification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    targetUserId: (dDetails as any).uid,
                    title,
                    body: message,
                    requestId,
                    fcmToken: dDetails.fcmToken,
                  }),
                }).catch(e => console.error("FCM director notification failed:", e))
              );
            }
            await Promise.all(notifyPromises);
          },
        );
        await Promise.all(clearancePromises);

        // Create simulated SMS log for the director/requested person if they have a phone number
        if (directorId) {
          try {
            const dData = await dataService.get<any>("users", directorId);
            if (dData) {
              const phoneNumber = dData?.phoneNumber;
              if (phoneNumber) {
                let smsMessage = "";
                if (clearanceType === "ITEM") {
                  smsMessage = `TRANSIT PERMIT: Your exit permit for "${displayName}" is APPROVED. Security gate notified.`;
                } else if (clearanceType === "GUEST") {
                  smsMessage = `GATE ENTRY: Your guest entrance request for "${displayName}" is APPROVED. Gate clearance authorized.`;
                } else {
                  smsMessage = `LABOR ACCESS: Your laborer request for "${displayName}" is APPROVED. Site access cleared.`;
                }

                await dataService.create('sim_sms_logs', {
                  recipientId: directorId,
                  recipientName: dData.displayName || "",
                  recipientPhone: phoneNumber,
                  role: dData.role || "DEPT_DIRECTOR",
                  message: smsMessage,
                  status: "SENT",
                  sentAt: new Date(),
                  requestId: requestId,
                  requestType: activeTab,
                });
              }
            }
          } catch (smsErr) {
            console.error("Simulated SMS dispatch error on approval:", smsErr);
          }
        }
      }

      toast.success("Request approved");
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Approval failed");
    }
  };

  const handleAssign = async (
    requestId: string,
    techOrTechs: any,
    directorId: string,
  ) => {
    setPersonnelSearch("");
    const colName = getCollectionForActiveSelection();
    const req = getCurrentRequestsSource().find((r) => r.id === requestId);
    const displayName =
      activeTab === "SERVICE"
        ? req?.workName || "Untitled Job"
        : activeTab === "CAMERA"
          ? req?.eventTitle || "Untitled Event"
          : activeTab === "VEHICLE"
            ? req?.tripName || "Untitled Trip"
            : activeTab === "STUDIO"
              ? req?.eventName || "Untitled Studio Request"
              : clearanceType === "ITEM"
                ? req?.itemName || "Untitled Item"
                : clearanceType === "GUEST"
                  ? req?.visitorNames || "Untitled Guest"
                  : req?.projectName || "Untitled Laborer Request";

    const selectedTechs = Array.isArray(techOrTechs)
      ? techOrTechs
      : techOrTechs
        ? [techOrTechs]
        : [];
    if (selectedTechs.length === 0) {
      toast.error("No personnel selected for assignment");
      return;
    }

    const tech = selectedTechs[0];

    try {
      const updateData: any = {
        status: "ASSIGNED",
        updatedAt: new Date(),
      };

      const names = selectedTechs.map((t) => t.displayName).join(", ");
      const phones = selectedTechs
        .map((t) => t.phoneNumber || "")
        .filter(Boolean)
        .join(", ");
      const ids = selectedTechs.map((t) => t.id);

      if (activeTab === "VEHICLE") {
        updateData.assignedDriverId = tech.id;
        updateData.assignedDriverName = names;
        updateData.assignedDriverPhone = phones;
        updateData.assignedDriverIds = ids;
        updateData.assignedDrivers = selectedTechs.map((t) => ({
          id: t.id,
          name: t.displayName,
          phone: t.phoneNumber || "",
        }));
      } else {
        updateData.assignedTechnicianId = tech.id;
        updateData.assignedTechnicianName = names;
        updateData.assignedTechnicianPhone = phones;
        updateData.assignedTechnicianIds = ids;
        updateData.assignedTechnicians = selectedTechs.map((t) => ({
          id: t.id,
          name: t.displayName,
          phone: t.phoneNumber || "",
        }));
      }

      await dataService.update(colName, requestId, updateData);
      
      const userMap = new Map<string, Partial<UserProfile>>();
      for (const t of allUsers) {
        userMap.set(t.id, { fcmToken: t.fcmToken });
      }

      // Create notification for director/requestor
      const requestorId = req?.userId || req?.directorId || directorId;
      const audienceIds = new Set<string>();
      if (requestorId) audienceIds.add(requestorId);
      
      for (const targetUserId of audienceIds) {
        const title = `[APPROVED] Request Assigned`;
        const message = `Your request for "${displayName}" is approved and ${names} is assigned for your request.`;

        await dataService.createNotification({
          userId: targetUserId,
          title: title,
          message: message,
          read: false,
          type: "APPROVAL_ASSIGNMENT",
          requestId: requestId,
          createdAt: new Date(),
        });
        
        // FCM notification for requestor/director
        const userDetails = userMap.get(targetUserId);
        if (userDetails?.fcmToken) {
           fetch("/api/send-fcm-notification", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               targetUserId: targetUserId,
               title,
               body: message,
               requestId: requestId,
               fcmToken: userDetails.fcmToken,
             }),
           }).catch(e => console.error("FCM approval/assignment notification failed:", e));
        }
      }

      const shortId = requestId.slice(-6).toUpperCase();

      for (const currentTech of selectedTechs) {
        // Create in-app notification for technician
        const techTitle = `[NEW ASSIGNMENT] Service No ${shortId}`;
        const techMessage = `You are assigned for service no ${shortId}. Check your portal.`;

        await dataService.createNotification({
          userId: currentTech.id,
          title: techTitle,
          message: techMessage,
          read: false,
          type: "ASSIGNMENT",
          requestId: requestId,
          createdAt: new Date(),
        });

        // Send FCM notification
        try {
          await fetch("/api/send-fcm-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUserId: currentTech.id,
              title: techTitle,
              body: techMessage,
              requestId: requestId,
              fcmToken: currentTech.fcmToken || null, // Pass FCM token directly from client to bypass server-side Firestore lookup !
            }),
          });
        } catch (e) {
          console.error("FCM failed but non-blocking:", e);
        }

        if (currentTech.phoneNumber) {
          const smsMessage = `Dear ${currentTech.displayName}, you are assigned for service no ${shortId}. Check your portal.`;

          // Write to 'sim_sms_logs' so the target user sees it immediately on their in-app simulated screen
          try {
            await dataService.create("sim_sms_logs", {
              recipientId: currentTech.id,
              recipientName: currentTech.displayName,
              recipientPhone: currentTech.phoneNumber,
              role:
                currentTech.role ||
                (activeTab === "VEHICLE"
                  ? "DRIVER"
                  : activeTab === "CAMERA"
                    ? "CAMERAMAN"
                    : "TECHNICIAN"),
              message: smsMessage,
              status: "SENT",
              sentAt: new Date(),
              requestId: requestId,
              requestType: activeTab,
            });
          } catch (err) {
            console.error("Failed to write to sim_sms_logs:", err);
          }

          const smsPromise = fetch("/api/dispatch-personnel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: requestId,
              personnelId: currentTech.id,
              role:
                currentTech.role ||
                (activeTab === "VEHICLE"
                  ? "DRIVER"
                  : activeTab === "CAMERA"
                    ? "CAMERAMAN"
                    : "TECHNICIAN"),
              phoneNumber: currentTech.phoneNumber,
              message: smsMessage,
            }),
          }).then(async (res) => {
            const errorData = await res.json().catch(() => ({}));
            if (!res.ok) {
              const error = new Error(
                errorData.message || errorData.error || "SMS Gateway failure",
              );
              (error as any).code = errorData.error;
              throw error;
            }
            return errorData;
          });

          toast.promise(smsPromise, {
            loading: `Syncing dispatch data to ${currentTech.phoneNumber}...`,
            success: `Notification delivered to ${currentTech.displayName} via SMS`,
            error: (err: any) => (
              <div className="flex flex-col gap-2 max-w-xs text-left">
                <span className="font-bold text-red-400 text-xs">
                  {err.code === "SMS_NOT_CONFIGURED"
                    ? "Cloud SMS Channel Not Configured"
                    : `SMS Dispatch Failed`}
                </span>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  {err.message}
                </p>
                <a
                  href={`sms:${currentTech.phoneNumber}?body=${encodeURIComponent(smsMessage)}`}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors inline-block text-center shadow-lg shadow-emerald-950/25 border border-emerald-400/20 mt-1"
                >
                  Dispatch via Local SIM
                </a>
              </div>
            ),
          });
        }
      }

      // Fetch director/requester details to send FCM and SMS alerts (only for PROP_CASUALTY/Property and Service)
      if (
        activeTab === "PROP_CASUALTY" ||
        activeTab === "SERVICE" ||
        activeTab === "CAMERA" ||
        activeTab === "VEHICLE"
      ) {
        let directorFcmToken = "";
        let directorPhone = "";
        let directorNameVal = "";
        if (directorId) {
          try {
            const dData = await dataService.get<any>("users", directorId);
            if (dData) {
              directorFcmToken = dData?.fcmToken || "";
              directorPhone = dData?.phoneNumber || "";
              directorNameVal = dData?.displayName || "";
            }
          } catch (e) {
            console.error(
              "Failed to fetch director details in handleAssign:",
              e,
            );
          }
        }

        // Create notification for director
        const dirTitle = `[ASSIGNED] Request Status`;
        const dirMessage = `Your request for your service "${displayName}" is approved and ${names} is assigned for your request.`;

        await dataService.createNotification({
          userId: directorId,
          title: dirTitle,
          message: dirMessage,
          read: false,
          type: "ASSIGNMENT",
          isClearanceApproval: true, // Triggers immediate local UI and browser popup/notification
          requestId: requestId,
          createdAt: new Date(),
        });

        // Send real/simulated FCM push notification to director's phone/screen
        if (directorFcmToken) {
          try {
            await fetch("/api/send-fcm-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                targetUserId: directorId,
                title: dirTitle,
                body: dirMessage,
                requestId: requestId,
                fcmToken: directorFcmToken,
              }),
            });
          } catch (e) {
            console.error("FCM dispatch failed for Director:", e);
          }
        }

        // Write SMS simulated log for Director
        if (directorPhone) {
          try {
            await dataService.create("sim_sms_logs", {
              recipientId: directorId,
              recipientName: directorNameVal,
              recipientPhone: directorPhone,
              role: "DEPT_DIRECTOR",
              message: dirMessage,
              status: "SENT",
              sentAt: new Date(),
              requestId: requestId,
              requestType: activeTab,
            });
          } catch (err) {
            console.error("Failed to write Director sim_sms_logs:", err);
          }
        }
      }

      setIsAssignModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Assign error:", error);
      toast.error("Assignment failed");
    }
  };

  const handleConfirm = async (requestId: string) => {
    const colName = getCollectionForActiveSelection();
    try {
      await dataService.update(colName, requestId, {
        status: "CLOSED",
        archived: true, // Auto-delete from active view
        updatedAt: new Date(),
        confirmedAt: new Date(),
      });
      toast.success("Service decommissioned and archived");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Confirm error:", error);
      toast.error("Failed to confirm request");
    }
  };

  const handleClose = async (requestId: string) => {
    const colName = getCollectionForActiveSelection();
    try {
      await dataService.update(colName, requestId, {
        status: "CLOSED",
        archived: true, // Auto-delete from active view
        updatedAt: new Date(),
      });
      toast.success("Service vector decommissioned and archived");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Close error:", error);
      toast.error("Failed to close request");
    }
  };

  const handleClearSelected = () => {
    if (selectedIds.size === 0) {
      toast.error("No records selected");
      return;
    }

    setDeleteTarget({ type: "bulk" });
    setIsDeletePasswordModalOpen(true);
  };

  const executeBulkDelete = async () => {
    const currentTabRequests = getCurrentRequestsSource();

    try {
      const promises = Array.from(selectedIds).map(async (id: string) => {
        const req = currentTabRequests.find((r) => r.id === id);
        if (req) {
          const collectionName = getCollectionForActiveSelection();
          if (collectionName) {
            return dataService.update(collectionName, id, {
              purgedByAdmin: true,
            });
          }
        }
      });

      await Promise.all(promises);
      toast.success(`${selectedIds.size} records purged permanently`);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setBulkDeleteConfirm(false);
    } catch (error) {
      toast.error("Failed to delete some records");
      console.error(error);
    }
  };

  const executeSingleDelete = async (request: any) => {
    try {
      const colName =
        request.collectionName || getCollectionForActiveSelection();
      await dataService.update(colName, request.id, { purgedByAdmin: true });
      toast.success("Record purged from queue");
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error("Purge failure");
      console.error(err);
    }
  };

  const handleDeleteTech = (techId: string) => {
    if (!techId) return;
    if (techId === profile?.uid) {
      toast.error("You cannot delete your own admin account");
      return;
    }
    setDeleteTarget({ type: "tech", techId });
    setIsDeletePasswordModalOpen(true);
  };

  const executeTechDelete = async (techId: string) => {
    try {
      await dataService.delete("users", techId);
      toast.success("Agent removed from registry");
      setDeleteTechConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        "De-registration failure: " +
          (error instanceof Error ? error.message : "Unknown"),
      );
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
    setPersonnelSearch("");
    setSelectedAssignIds([]);
    if (!isSectorAuthorized()) {
      setPendingAction({
        type: "ASSIGN",
        data: request,
        sector: getSectorForActiveSelection(),
      });
      setIsUnlockModalOpen(true);
      return;
    }
    setSelectedRequest(request);
    setIsAssignModalOpen(true);
  };

  const handleCloseReport = async () => {
    setIsReportOpen(false);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const collections = [
      "service_requests",
      "camera_requests",
      "vehicle_requests",
      "item_requests",
      "device_requests",
    ];

    for (const colName of collections) {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const oldRecords = await dataService.list<any>(colName, {
          createdAtBefore: weekAgo.toISOString()
        });
        const promises = oldRecords.map(r => dataService.update(colName, r.id, { purgedByAdmin: true }));
        await Promise.all(promises);
      } catch (err) {
        console.error(`Failed to cleanup ${colName}:`, err);
      }
    }
    toast.success("Old records cleaned up");
  };

  const handleUpdateTech = async () => {
    if (!editingTech && !isOnboarding) return;

    // If onboarding, generate a unique ID for the placeholder user
    const targetUid = isOnboarding
      ? `placeholder_${Date.now()}`
      : editingTech.id;
    const path = `users/${targetUid}`;

    let formattedPhone = editPhone.trim();
    if (formattedPhone) {
      if (formattedPhone.startsWith("09") && formattedPhone.length === 10) {
        formattedPhone = "+251" + formattedPhone.substring(1);
      } else if (
        formattedPhone.startsWith("07") &&
        formattedPhone.length === 10
      ) {
        formattedPhone = "+251" + formattedPhone.substring(1);
      }

      if (!formattedPhone.startsWith("+")) {
        toast.error(
          "Agent contact must start with + and include country code or start with 09/07 (e.g., +251...)",
        );
        return;
      }
    }

    try {
      await dataService.update(
        "users", targetUid,
        {
          uid: targetUid,
          displayName: editName,
          phoneNumber: formattedPhone,
          role: editRole,
          isPlaceholder: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      toast.success(
        isOnboarding
          ? "New agent registered in sector"
          : "Fleet registry updated",
      );
      setEditingTech(null);
      setIsOnboarding(false);
      setEditName("");
      setEditPhone("");
      setEditRole("TECHNICIAN");
    } catch (error) {
      console.error("Agent update error:", error);
      toast.error("Fleet registry update failure");
    }
  };

  const handleSeedData = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const count = await seedWorkforce();
      toast.success(
        `System initialization complete: ${count} agents deployed to registry`,
        {
          icon: "🚀",
          duration: 5000,
        },
      );
    } catch (err) {
      console.error(err);
      toast.error("Initialization failed");
    } finally {
      setIsSeeding(false);
    }
  };
  const handleUnlock = () => {
    const sectorToUnlock = pendingAction?.sector || activeTab;
    const sectorConfig =
      SECTOR_AUTH[sectorToUnlock as keyof typeof SECTOR_AUTH];

    if (unlockPassword === sectorConfig.pin) {
      setUnlockedSectors((prev) => new Set(prev).add(sectorToUnlock));
      setIsUnlockModalOpen(false);
      setUnlockPassword("");
      toast.success(`${sectorConfig.label} authenticated`, {
        icon: "🔓",
        style: {
          background: "#064e3b",
          color: "#34d399",
          border: "1px solid #059669",
        },
      });

      if (pendingAction) {
        if (pendingAction.type === "APPROVE" && pendingAction.data) {
          handleApprove(
            pendingAction.data.requestId,
            pendingAction.data.directorId,
            true,
            pendingAction.data.signatureBase64,
            pendingAction.data.hasOfficialStamp
          );
        } else if (pendingAction.type === "ASSIGN" && pendingAction.data) {
          const req = pendingAction.data;
          setSelectedRequest(req);
          setSelectedAssignIds([]);
          setIsAssignModalOpen(true);
        }
        setPendingAction(null);
      }
    } else {
      toast.error("Invalid Sector PIN", {
        icon: "🔒",
        style: {
          background: "#450a0a",
          color: "#f87171",
          border: "1px solid #991b1b",
        },
      });
      setUnlockPassword("");
    }
  };

  const handleSendSimulatedSms = async () => {
    if (!selectedTechForSms || !customSmsMessage) return;

    try {
      const smsLogId = `sms_${Date.now()}_${selectedTechForSms.id}`;
      await dataService.create("sim_sms_logs", {
        id: smsLogId,
        recipientId: selectedTechForSms.id,
        recipientName: selectedTechForSms.displayName,
        recipientPhone: selectedTechForSms.phoneNumber,
        role: selectedTechForSms.role || "TECHNICIAN",
        message: customSmsMessage,
        status: "SENT",
        sentAt: new Date(),
        requestType: "MANUAL",
      });
      toast.success(`Simulated SMS sent to ${selectedTechForSms.displayName}`, {
        icon: "📱",
        style: {
          background: "#1e293b",
          color: "#fbbf24",
          border: "1px solid #78350f",
        },
      });
      setSelectedTechForSms(null);
      setCustomSmsMessage("");
    } catch (err) {
      console.error("Failed to send simulated SMS", err);
      toast.error("Failed to send simulated SMS");
    }
  };

  const handleSendSms = async () => {
    if (!selectedTechForSms || !customSmsMessage) return;

    const promise = fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: selectedTechForSms.phoneNumber,
        message: customSmsMessage,
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(
          data.message || data.error || "SMS Gateway failure",
        );
        (error as any).code = data.error;
        throw error;
      }
      return data;
    });

    toast.promise(promise, {
      loading: "Transmitting operational directive...",
      success: "Notification delivered via SMS channel",
      error: (err: any) => (
        <div className="flex flex-col gap-2 max-w-xs text-left">
          <span className="font-bold text-red-400 text-xs">
            {err.code === "SMS_NOT_CONFIGURED"
              ? "Cloud SMS Gateway Not Configured"
              : `Comms Error: ${err.message}`}
          </span>
          {err.code === "TWILIO_21608" ||
          err.message.toLowerCase().includes("unverified") ? (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 mt-1">
              <p className="text-[10px] font-black uppercase tracking-wider">
                Twilio Trial Account Limitation
              </p>
              <p className="text-[9px] leading-tight mt-1 opacity-90">
                Unverified number. Trial accounts can only send to verified
                phone numbers. Direct fallback to Local carrier option below:
              </p>
            </div>
          ) : null}
          <a
            href={`sms:${selectedTechForSms.phoneNumber}?body=${encodeURIComponent(customSmsMessage)}`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors inline-block text-center shadow-lg shadow-emerald-950/25 border border-emerald-400/20 mt-1"
          >
            Dispatch via Local SIM
          </a>
        </div>
      ),
    });

    try {
      await promise;
      setIsSmsModalOpen(false);
      setCustomSmsMessage("");
      setSelectedTechForSms(null);
    } catch (e) {
      console.error(e);
    }
  };

  const stats = [
    {
      id: "service",
      label: t("Service Request", "Service Rep"),
      value: requests.length,
      icon: Wrench,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      id: "camera",
      label: t("Camera Request", "Camera Cov"),
      value: cameraRequests.length,
      icon: Camera,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      id: "vehicle",
      label: t("Vehicle Request", "Vehicle Req"),
      value: vehicleRequests.length,
      icon: Car,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      id: "permits",
      label: t("P&C Permits", "P&C Permits"),
      value: [...itemRequests, ...deviceRequests, ...guestRequests].length,
      icon: ClipboardList,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
  ];

  const activeRequestsList = getCurrentRequestsSource();
  const uniqueActiveRequests = activeRequestsList.filter(
    (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-medium text-slate-950 tracking-tight">
              {t("Fleet Operations Command")}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (unlockedSectors.has(activeTab)) {
                    setUnlockedSectors((prev) => {
                      const next = new Set(prev);
                      next.delete(activeTab);
                      return next;
                    });
                  } else {
                    setPendingAction({
                      type: "APPROVE",
                      data: null,
                      sector: activeTab,
                    });
                    setIsUnlockModalOpen(true);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95",
                  unlockedSectors.has(activeTab)
                    ? "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                    : "bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/10",
                )}
              >
                {unlockedSectors.has(activeTab) ? (
                  <Unlock className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {unlockedSectors.has(activeTab)
                  ? `${activeTab} Sector Authorized`
                  : `${activeTab} Auth Required`}
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
          <p className="text-dark-text-subtle mt-1 font-serif italic">
            {t("Operational overview and resource allocation")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-dark-card p-6 rounded-xl border border-dark-border shadow-lg"
          >
            <div
              className={cn(
                "p-2 rounded-lg inline-flex mb-4 bg-dark-main/50",
                stat.color,
              )}
            >
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-mono font-bold text-slate-950 tracking-tighter">
              {stat.value.toString().padStart(2, "0")}
            </p>
            <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          className={cn(
            "space-y-8",
            activeTab === "PROP_CASUALTY" || activeTab === "STUDIO"
              ? "lg:col-span-3"
              : "lg:col-span-2",
          )}
        >
          <div className="flex items-center gap-3 bg-dark-card p-1.5 rounded-xl border border-dark-border w-full overflow-x-auto scrollbar-hide shrink-0">
            <TabButton
              active={activeTab === "SERVICE"}
              label={t("Service Request", "Service & Repair")}
              icon={Wrench}
              onClick={() => {
                setActiveTab("SERVICE");
                setSelectedRequest(null);
              }}
            />
            <TabButton
              active={activeTab === "CAMERA"}
              label={t("Camera Request", "Camera")}
              icon={Camera}
              onClick={() => {
                setActiveTab("CAMERA");
                setSelectedRequest(null);
              }}
            />
            <TabButton
              active={activeTab === "VEHICLE"}
              label={t("Vehicle Request", "Transportation")}
              icon={Car}
              onClick={() => {
                setActiveTab("VEHICLE");
                setSelectedRequest(null);
              }}
            />
            <TabButton
              active={activeTab === "STUDIO"}
              label={t("Studio Booking", "Studio")}
              icon={Video}
              onClick={() => {
                setActiveTab("STUDIO");
                setStudioSubTab("ALL");
                setSelectedRequest(null);
              }}
            />
            <TabButton
              active={activeTab === "PROP_CASUALTY"}
              label={t("Property Service", "Property Service")}
              icon={ClipboardList}
              onClick={() => {
                setActiveTab("PROP_CASUALTY");
                setSelectedRequest(null);
              }}
            />
          </div>
          {activeTab === "STUDIO" && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setStudioSubTab("ALL")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                  studioSubTab === "ALL"
                    ? "bg-dark-accent text-white"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("All Bookings", "All Bookings")}
              </button>
              <button
                onClick={() => setStudioSubTab("TV")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                  studioSubTab === "TV"
                    ? "bg-indigo-600 text-white border border-indigo-500/20"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("TV Studio Approval", "TV Studio Approval")} ({studioRequests.filter(r => r.studioCategory === "TV").length})
              </button>
              <button
                onClick={() => setStudioSubTab("RADIO")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                  studioSubTab === "RADIO"
                    ? "bg-orange-600 text-white border border-orange-500/20"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("Radio Studio Approval", "Radio Studio Approval")} ({studioRequests.filter(r => r.studioCategory === "RADIO").length})
              </button>
            </div>
          )}
          {activeTab === "PROP_CASUALTY" && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setClearanceType("ITEM")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  clearanceType === "ITEM"
                    ? "bg-dark-accent text-white"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("Item Exit")}
              </button>
              <button
                onClick={() => setClearanceType("LABOR")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  clearanceType === "LABOR"
                    ? "bg-dark-accent text-white"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("Laborer")}
              </button>
              <button
                onClick={() => setClearanceType("GUEST")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  clearanceType === "GUEST"
                    ? "bg-dark-accent text-white"
                    : "bg-dark-main text-dark-text-subtle",
                )}
              >
                {t("Guest")}
              </button>
            </div>
          )}
          <div
            className={cn(
              "bg-dark-card rounded-xl border border-dark-border shadow-lg overflow-hidden flex flex-col transition-all duration-300",
              isFullscreen
                ? "fixed inset-0 z-[110] rounded-none border-none h-screen"
                : "h-[500px]",
            )}
          >
            <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
              <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
                {activeTab === "SERVICE"
                  ? "Service Queue"
                  : activeTab === "CAMERA"
                    ? "Coverage Queue"
                    : activeTab === "VEHICLE"
                      ? "Transportation Queue"
                      : activeTab === "PROP_CASUALTY"
                        ? `${clearanceType === "ITEM" ? "Exit Permits" : clearanceType === "GUEST" ? "Guest Entrances" : "Laborer Requests"} Queue`
                        : "Queue"}
              </h3>
              <div className="flex items-center gap-3">
                {isSelectMode ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <span className="text-[10px] font-black text-dark-accent mr-2 uppercase tracking-widest">
                      {selectedIds.size} Selected
                    </span>
                    <button
                      onClick={handleClearSelected}
                      disabled={selectedIds.size === 0}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 border",
                        bulkDeleteConfirm
                          ? "bg-rose-500 border-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/40"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white",
                      )}
                    >
                      {bulkDeleteConfirm ? "CONFIRM PURGE" : "Delete Selected"}
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectMode(false);
                        setSelectedIds(new Set());
                        setBulkDeleteConfirm(false);
                      }}
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
                  <span className="text-[10px] font-bold text-dark-accent uppercase tracking-wide">
                    Live Feed
                  </span>
                </div>

                {/* Fullscreen Toggle Button */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-dark-sidebar rounded-lg text-dark-text-subtle hover:text-dark-accent transition-colors flex items-center gap-2 border border-transparent hover:border-dark-border ml-2"
                  title={
                    isFullscreen ? t("Exit Fullscreen") : t("Fullscreen Mode")
                  }
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {t("Exit")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {t("Fullscreen")}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1 scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="bg-dark-header sticky top-0 z-10">
                  <tr>
                    {isSelectMode && (
                      <th className="px-6 py-4 text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest border-b border-dark-border w-10"></th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border">
                      {t("Order No")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border">
                      {t("Requester")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border">
                      {t("Requestor Dept")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border">
                      {t("Type of Order")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border">
                      {t("Status")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-dark-text-subtle uppercase tracking-widest text-black border-b border-dark-border text-right">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={isSelectMode ? 6 : 5}
                        className="px-6 py-12 text-center text-dark-text-subtle"
                      >
                        Synchronizing data...
                      </td>
                    </tr>
                  ) : uniqueActiveRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isSelectMode ? 6 : 5}
                        className="px-6 py-12 text-center text-dark-text-subtle text-sm font-serif italic"
                      >
                        Main queue cleared
                      </td>
                    </tr>
                  ) : (
                      uniqueActiveRequests.map((request, idx) => (
                        <tr
                        key={`admin-dashboard-req-${request.collectionName || 'none'}-${request.id || 'req'}-${idx}`}
                        onClick={() =>
                          isSelectMode
                            ? toggleSelect(request.id)
                            : setSelectedRequest(request)
                        }
                        className={cn(
                          "transition-colors group cursor-pointer",
                          isSelectMode && selectedIds.has(request.id)
                            ? "bg-dark-accent/5"
                            : "hover:bg-dark-main/40",
                        )}
                      >
                        {isSelectMode && (
                          <td className="px-6 py-5">
                            <div
                              className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                selectedIds.has(request.id)
                                  ? "bg-dark-accent border-dark-accent"
                                  : "border-dark-border bg-dark-main",
                              )}
                            >
                              {selectedIds.has(request.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-5">
                          <div className="text-[10px] font-mono text-dark-accent font-bold">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-black">
                            <div className="w-6 h-6 rounded bg-dark-sidebar flex items-center justify-center text-[8px] font-black text-dark-text-muted border border-dark-border">
                              {(() => {
                                const req =
                                  request.requesterName || request.directorName;
                                if (
                                  activeTab === "CAMERA" ||
                                  activeTab === "VEHICLE"
                                ) {
                                  return (
                                    request.hostName ||
                                    req ||
                                    "??"
                                  ).charAt(0);
                                }
                                return (req || "??").charAt(0);
                              })()}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-tight text-slate-800">
                              {(() => {
                                if (
                                  activeTab === "CAMERA" ||
                                  activeTab === "VEHICLE"
                                ) {
                                  return (
                                    request.hostName ||
                                    request.requesterName ||
                                    request.directorName ||
                                    "Unknown"
                                  );
                                }
                                return (
                                  request.requesterName ||
                                  request.directorName ||
                                  "Unknown"
                                );
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-[13px] font-black text-black flex items-center gap-2">
                            <span>
                              {request.departmentName || "General Ops"}
                            </span>
                            {activeTab === "ITEM" && (
                              <span className="text-[9px] font-mono font-bold text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                                Qty: {request.quantity || 1}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-dark-text-subtle mt-0.5 line-clamp-1 opacity-70 italic">
                            {activeTab === "SERVICE"
                              ? request.description
                              : activeTab === "CAMERA"
                                ? request.purpose
                                : activeTab === "ITEM"
                                  ? `Item: ${request.itemName || "Unnamed"} — S/N: ${request.serialNumber || "N/A"}`
                                  : activeTab === "OTHER"
                                    ? `${request.deviceModel || "General Laborer"} (${request.quantity || 1} Person[s]) | Start: ${request.startTime || "N/A"} - End: ${request.endTime || "N/A"}`
                                    : request.destination}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            {activeTab === "SERVICE" && (
                              <Wrench className="w-3 h-3 text-indigo-400" />
                            )}
                            {activeTab === "CAMERA" && (
                              <Camera className="w-3 h-3 text-orange-400" />
                            )}
                            {activeTab === "VEHICLE" && (
                              <Car className="w-3 h-3 text-blue-400" />
                            )}
                            {activeTab === "STUDIO" && (
                              <Video className="w-3 h-3 text-indigo-400" />
                            )}
                            {activeTab === "ITEM" && (
                              <Tag className="w-3 h-3 text-pink-400" />
                            )}
                            {activeTab === "OTHER" && (
                              <Users className="w-3 h-3 text-purple-400" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-600">
                              {activeTab === "SERVICE"
                                ? "Service"
                                : activeTab === "CAMERA"
                                  ? "Camera"
                                  : activeTab === "VEHICLE"
                                    ? "Vehicle"
                                    : activeTab === "STUDIO"
                                      ? "Studio"
                                      : activeTab === "ITEM"
                                        ? "Exit Permit"
                                        : "Laborer"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap",
                              request.status === "NEW"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : request.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : request.status === "ASSIGNED"
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                    : "bg-slate-500/10 text-slate-600 border-slate-500/20",
                            )}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td
                          className="px-6 py-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setEditFormData({
                                  departmentName: request.departmentName || "",
                                  workName: request.workName || "",
                                  description: request.description || "",
                                  purpose: request.purpose || "",
                                  eventTitle: request.eventTitle || "",
                                  tripName: request.tripName || "",
                                  destination: request.destination || "",
                                  itemName: request.itemName || "",
                                  deviceModel: request.deviceModel || "",
                                  serialNumber: request.serialNumber || "",
                                  quantity: request.quantity || 1,
                                  responsiblePerson:
                                    request.responsiblePerson || "",
                                  startTime: request.startTime || "",
                                  endTime: request.endTime || "",
                                  date: request.date || request.neededBy || "",
                                  projectName: request.projectName || "",
                                  eventName: request.eventName || "",
                                  studioCategory: request.studioCategory || "",
                                  requestedPerson: request.requestedPerson || "",
                                  guestCount: request.guestCount || 1,
                                  cameraCount: request.cameraCount || "",
                                  time: request.time || "",
                                });
                                setIsEditing(false);
                              }}
                              className="p-2 rounded bg-dark-main border border-dark-border text-dark-text-subtle hover:text-dark-accent transition-all animate-none"
                              title="Edit/View Detail"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {request.status === "NEW" && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleApprove(
                                    request.id,
                                    request.directorId || "",
                                  );
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                                title="Approve Request"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Approve
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: "single", request });
                                setIsDeletePasswordModalOpen(true);
                              }}
                              type="button"
                              className={cn(
                                "p-2 rounded border transition-all",
                                deleteConfirmId === request.id
                                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                                  : "bg-dark-main border-dark-border text-dark-text-subtle hover:text-red-500 hover:border-red-500",
                              )}
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {activeTab !== "PROP_CASUALTY" && activeTab !== "STUDIO" && (
        <div className="bg-dark-card rounded-xl border border-dark-border shadow-lg flex flex-col h-[600px]">
          <div className="p-6 border-b border-dark-border bg-dark-card/50">
            <h3 className="text-[11px] font-bold text-dark-text-muted uppercase tracking-widest">
              {activeTab === "CAMERA"
                ? "Camera Workload"
                : activeTab === "VEHICLE"
                  ? "Driver Workload"
                  : activeTab === "PROP_CASUALTY"
                    ? ""
                    : "Technician Workload"}
            </h3>
          </div>
          <div className="overflow-auto flex-1 divide-y divide-dark-border">
            {activeTab !== "PROP_CASUALTY" &&
              (activeTab === "SERVICE"
                ? technicians
                : activeTab === "VEHICLE"
                  ? drivers
                  : activeTab === "CAMERA"
                    ? cameramen
                    : [...technicians, ...drivers, ...cameramen]
              )
                .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
                .map((tech) => ({
                  ...tech,
                  orderCount: [
                    ...requests,
                    ...cameraRequests,
                    ...vehicleRequests,
                  ].filter(
                    (r) =>
                      r.assignedTechnicianId === tech.id ||
                      r.assignedDriverId === tech.id,
                  ).length,
                }))
                .sort((a, b) => b.orderCount - a.orderCount)
                .map((tech, idx) => (
                  <div
                            key={`admin-dashboard-workload-tech-${tech.id || idx}-${idx}`}
                    className="p-5 flex items-center gap-3 hover:bg-dark-main/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-dark-sidebar flex items-center justify-center text-[11px] font-bold text-slate-950 border border-dark-border uppercase">
                      {tech.displayName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[0.85rem] font-medium text-slate-900">
                          {tech.displayName}
                        </div>
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-dark-border uppercase tracking-tight text-dark-text-subtle">
                          {tech.role}
                        </span>
                        {tech.id === profile?.uid && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 tracking-widest uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.7rem] text-dark-text-subtle font-mono">
                          {tech.phoneNumber || "No Contact"}
                        </span>
                        <span className="text-[0.7rem] text-dark-accent/40">
                          •
                        </span>
                        <span
                          className={cn(
                            "text-[0.7rem] font-mono",
                            tech.orderCount > 0
                              ? "text-amber-500"
                              : "text-dark-text-subtle",
                          )}
                        >
                          {tech.orderCount > 0
                            ? `Deployed (${tech.orderCount} Orders)`
                            : "Stationary (0 Orders)"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (!tech.phoneNumber) {
                            toast.error(
                              "No contact number mapped for this agent",
                            );
                            return;
                          }
                          setSelectedTechForSms(tech);
                          setCustomSmsMessage(
                            `COMMS [${profile?.displayName || "ADMIN"}]: `,
                          );
                          setIsSmsModalOpen(true);
                        }}
                        className="p-2.5 bg-dark-main border border-dark-border rounded-xl text-dark-text-subtle hover:text-dark-accent hover:border-dark-accent transition-all shadow-lg shadow-black/20 group"
                        title="Notify via SMS/Phone"
                      >
                        <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                      {tech.id !== profile?.uid && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteTech(tech.id);
                          }}
                          className="p-2.5 bg-dark-main border border-dark-border rounded-xl text-dark-text-subtle hover:text-red-500 hover:border-red-500 transition-all shadow-lg shadow-black/20 group"
                          title="Delete Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          tech.orderCount > 0
                            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
                        )}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}
      <TeamNotepad defaultDepartment={activeTab} />

      <div className="flex flex-col gap-2 w-full mt-4">
        {[
          { label: "Service & Repair", type: "SERVICE" },
          { label: "Camera", type: "CAMERA" },
          { label: "Transportation", type: "VEHICLE" },
          { label: "Property Service", type: "PROP_CASUALTY" },
        ].map((report) => (
          <button
            key={report.type}
            onClick={() => {
              setReportCategory(report.type as any);
              setIsReportOpen(true);
            }}
            className="bg-dark-card hover:bg-dark-sidebar text-dark-accent border border-dark-border px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:border-dark-accent active:scale-95 shadow-xl shadow-black/20"
          >
            <FileText className="w-4 h-4" />
            {report.label} Intelligence
          </button>
        ))}
      </div>

      {/* Technician Allocation Modal */}
      <AnimatePresence>
        {selectedRequest && !isAssignModalOpen && (
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
                  <h2 className="text-2xl font-black text-black tracking-tight">
                    {isEditing
                      ? "Editing Record"
                      : selectedRequest.type
                        ? `${selectedRequest.type} Request`
                        : "FMC Operational Record"}
                  </h2>
                  <p className="text-dark-text-subtle text-sm mt-1 uppercase font-mono tracking-widest opacity-50">
                    #{selectedRequest.id.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2.5 bg-dark-main border border-dark-border rounded-xl text-dark-text-subtle hover:text-dark-accent transition-all flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Toggle Edit
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setIsEditing(false);
                    }}
                    className="p-2 text-dark-text-subtle hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
                {/* Status Banner */}
                <div
                  className={cn(
                    "p-4 rounded-xl border flex items-center justify-between shadow-inner",
                    selectedRequest.status === "NEW"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                      : selectedRequest.status === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                        : selectedRequest.status === "ASSIGNED"
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-600"
                          : "bg-slate-500/10 border-slate-500/20 text-slate-600",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 opacity-50" />
                    <span className="text-sm font-black uppercase tracking-widest">
                      {selectedRequest.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-60">
                    Last sync:{" "}
                    {selectedRequest.updatedAt?.seconds
                      ? format(
                          new Date(selectedRequest.updatedAt.seconds * 1000),
                          "HH:mm:ss",
                        )
                      : "LIVE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                    <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                      Requestor Department
                    </p>
                    {isEditing ? (
                      <input
                        value={editFormData.departmentName}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            departmentName: e.target.value,
                          })
                        }
                        className="w-full bg-dark-card border border-dark-border rounded px-3 py-1.5 text-sm text-black font-bold focus:border-dark-accent outline-none"
                      />
                    ) : (
                      <p className="text-sm font-black text-black">
                        {selectedRequest.departmentName || "General Operations"}
                      </p>
                    )}
                  </div>
                  <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                    <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                      Operational Class
                    </p>
                    <div className="flex items-center gap-2">
                      <TowerControl className="w-3.5 h-3.5 text-dark-accent" />
                      <p className="text-sm font-black text-black uppercase">
                        {selectedRequest.type || "Service"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1">
                    Operational Details / Narrative
                  </label>
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        placeholder="Title/Work Name"
                        value={
                          editFormData.workName ||
                          editFormData.eventTitle ||
                          editFormData.tripName ||
                          editFormData.eventName ||
                          editFormData.itemName ||
                          editFormData.deviceModel ||
                          ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === "SERVICE")
                            setEditFormData({ ...editFormData, workName: val });
                          else if (activeTab === "CAMERA")
                            setEditFormData({
                              ...editFormData,
                              eventTitle: val,
                            });
                          else if (activeTab === "VEHICLE")
                            setEditFormData({ ...editFormData, tripName: val });
                          else if (activeTab === "STUDIO")
                            setEditFormData({ ...editFormData, eventName: val });
                          else if (activeTab === "ITEM")
                            setEditFormData({ ...editFormData, itemName: val });
                          else
                            setEditFormData({
                              ...editFormData,
                              deviceModel: val,
                            });
                        }}
                        className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-3 text-sm text-black font-bold focus:border-dark-accent outline-none"
                      />
                      <textarea
                        placeholder="Description/Purpose"
                        value={
                          editFormData.description ||
                          editFormData.purpose ||
                          editFormData.destination ||
                          ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === "SERVICE")
                            setEditFormData({
                              ...editFormData,
                              description: val,
                            });
                          else if (activeTab === "CAMERA")
                            setEditFormData({ ...editFormData, purpose: val });
                          else if (activeTab === "VEHICLE")
                            setEditFormData({
                              ...editFormData,
                              destination: val,
                            });
                          else if (activeTab === "ITEM")
                            setEditFormData({ ...editFormData, purpose: val });
                          else
                            setEditFormData({
                              ...editFormData,
                              description: val,
                            });
                        }}
                        className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-3 text-sm text-black font-bold focus:border-dark-accent outline-none min-h-[100px]"
                      />
                      {activeTab === "CAMERA" && (
                        <div className="mt-3">
                          <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                            Assigned Host
                          </label>
                          <input
                            type="text"
                            placeholder="Host Name"
                            value={editFormData.hostName || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                hostName: e.target.value,
                              })
                            }
                            className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                          />
                        </div>
                      )}
                      {activeTab === "STUDIO" && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Studio Category
                            </label>
                            <select
                              value={editFormData.studioCategory || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  studioCategory: e.target.value as 'TV' | 'RADIO',
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            >
                              <option value="">Select Category</option>
                              <option value="TV">TV Studio</option>
                              <option value="RADIO">Radio Studio</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Requested Person
                            </label>
                            <input
                              type="text"
                              value={editFormData.requestedPerson || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  requestedPerson: e.target.value,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={editFormData.time || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  time: e.target.value,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Guest Count
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editFormData.guestCount || 1}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  guestCount: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Camera Count
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editFormData.cameraCount || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  cameraCount: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                        </div>
                      )}
                      {activeTab === "ITEM" && (
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Serial Number
                            </label>
                            <input
                              type="text"
                              placeholder="Serial Number"
                              value={editFormData.serialNumber || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  serialNumber: e.target.value,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={editFormData.quantity || 1}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  quantity: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                              Carrier / Responsible
                            </label>
                            <input
                              type="text"
                              placeholder="Responsible Carrier"
                              value={editFormData.responsiblePerson || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  responsiblePerson: e.target.value,
                                })
                              }
                              className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                            />
                          </div>
                        </div>
                      )}
                      {activeTab === "OTHER" && (
                        <div className="space-y-4 mt-3 animate-fadeIn">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                                Laborer Type / Specialty
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. general, painter, welder"
                                value={editFormData.deviceModel || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    deviceModel: e.target.value,
                                  })
                                }
                                className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                                Laborer Count (Quantity)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editFormData.quantity || 1}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none font-mono"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                                Work Start Time
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 08:00 AM"
                                value={editFormData.startTime || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    startTime: e.target.value,
                                  })
                                }
                                className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                                Ending Time
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 05:00 PM"
                                value={editFormData.endTime || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    endTime: e.target.value,
                                  })
                                }
                                className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 block pl-1">
                                Work Date
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. May 24, 2026"
                                value={editFormData.date || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    date: e.target.value,
                                  })
                                }
                                className="w-full bg-dark-main border border-dark-border rounded-xl px-4 py-2.5 text-xs text-black font-bold focus:border-dark-accent outline-none font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "STUDIO" ? (
                    <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 space-y-4 font-sans">
                      <div className="flex justify-between items-center border-b border-dark-border pb-2">
                        <span className="text-xs font-black uppercase text-dark-text-subtle font-mono">
                          Studio Category
                        </span>
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                          selectedRequest.studioCategory === 'TV' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                        )}>
                          {selectedRequest.studioCategory ? `${selectedRequest.studioCategory} Studio` : "Studio Request"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-dark-border pb-2">
                        <span className="text-xs font-black uppercase text-dark-text-subtle font-mono">
                          Event Name
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedRequest.eventName || "Untitled Event"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-black font-bold">
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Requested Person
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.requestedPerson || "Not Specified"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Event Date & Time
                          </p>
                          <p className="font-bold text-slate-900 font-mono text-[10px]">
                            {selectedRequest.date || "No Date"} | {selectedRequest.time || "No Time"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Guests/Hosts
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.guestCount || 1} Person(s)
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Field Camera
                          </p>
                          <p className="font-bold text-indigo-600">
                            {selectedRequest.cameraCount ? `${selectedRequest.cameraCount} Requested` : "None"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === "OTHER" ||
                    selectedRequest.type === "Device" ? (
                    <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 space-y-4 animate-fadeIn font-sans">
                      <div className="flex justify-between items-center border-b border-dark-border pb-2">
                        <span className="text-xs font-black uppercase text-dark-text-subtle font-mono">
                          Work Activity / Job
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedRequest.projectName || "General Work"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-black font-bold">
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Special Skill / Focus
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.deviceModel || "General Laborer"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Laborer Count (Quantity)
                          </p>
                          <p className="font-bold text-slate-900 font-mono">
                            {selectedRequest.quantity || 1} Person(s)
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Work Start Time
                          </p>
                          <p className="font-bold text-indigo-600 font-mono">
                            {selectedRequest.startTime || "Not Specified"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Work Ending Time
                          </p>
                          <p className="font-bold text-indigo-600 font-mono">
                            {selectedRequest.endTime || "Not Specified"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl col-span-2">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Requested Work Date
                          </p>
                          <p className="font-bold text-slate-900 font-mono">
                            {selectedRequest.date ||
                              selectedRequest.neededBy ||
                              "Not Specified"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dark-border">
                        <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                          Scope and Purpose of Labor
                        </p>
                        <p className="text-sm text-slate-800 font-serif italic">
                          {selectedRequest.description ||
                            selectedRequest.purpose ||
                            "FMC General Assistance Protocol"}
                        </p>
                      </div>
                    </div>
                  ) : activeTab === "ITEM" ? (
                    <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-dark-border pb-2">
                        <span className="text-xs font-black uppercase text-dark-text-subtle font-mono">
                          Item Name
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedRequest.itemName || "Unnamed Item"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-black font-bold">
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Serial / Asset Tag
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.serialNumber || "N/A"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Quantity
                          </p>
                          <p className="font-bold text-slate-900 font-mono">
                            {selectedRequest.quantity || 1}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Carrier Personnel
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.responsiblePerson ||
                              "Not Specified"}
                          </p>
                        </div>
                        <div className="p-3 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                            Expected Return
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedRequest.expectedReturnDate ||
                              "Clearance Only"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dark-border">
                        <p className="text-[9px] font-black uppercase text-dark-text-subtle mb-1 font-mono">
                          Exit Purpose
                        </p>
                        <p className="text-sm text-slate-800 font-serif italic">
                          {selectedRequest.purpose ||
                            "FMC Security Clearance Protocol"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-dark-main/50 border border-dark-border rounded-2xl p-6 text-sm text-black font-bold font-serif italic">
                      {selectedRequest.workName ||
                        selectedRequest.eventTitle ||
                        selectedRequest.tripName ||
                        selectedRequest.eventName ||
                        selectedRequest.itemName ||
                        selectedRequest.deviceModel ||
                        selectedRequest.visitorNames ||
                        "Vector Operational Objective"}
                      <div className="mt-2 text-xs font-sans not-italic text-slate-700 opacity-80 border-t border-dark-border pt-2 mt-4">
                        {selectedRequest.description ||
                          selectedRequest.purpose ||
                          selectedRequest.requestedPerson ||
                          selectedRequest.destination ||
                          "No secondary intelligence provided."}

                        {selectedRequest.attachmentUrl && (
                          <div className="mt-6 pt-4 border-t border-dark-border/40">
                            <p className="text-[10px] font-black uppercase text-dark-text-subtle mb-3 font-mono flex items-center gap-2">
                              <Tag className="w-3 h-3 text-dark-accent" />
                              Accompanying Documentation
                            </p>
                            <a
                              href={selectedRequest.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-3 bg-dark-accent/5 border border-dark-accent/20 rounded-xl hover:bg-dark-accent/10 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-dark-accent flex items-center justify-center shadow-lg shadow-indigo-950/40 group-hover:scale-105 transition-transform">
                                <MessageSquare className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-black truncate uppercase tracking-tight">
                                  {selectedRequest.attachmentName ||
                                    "Request Document"}
                                </p>
                                <p className="text-[9px] text-dark-accent font-bold uppercase tracking-widest mt-0.5">
                                  Click to view official filing
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-dark-accent/40" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedRequest.status !== "NEW" &&
                  selectedRequest.type !== "Exit Permit" &&
                  selectedRequest.type !== "Device" &&
                  selectedRequest.type !== "Studio" &&
                  selectedRequest.type !== "Guest Entry" && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-5 bg-dark-main border border-dark-border rounded-xl group relative">
                        <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                          {selectedRequest.type === "Vehicle"
                            ? "Assigned Driver"
                            : "Assigned Agent"}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-black">
                              {selectedRequest.assignedDriverName ||
                                selectedRequest.assignedTechnicianName ||
                                "PENDING DISPATCH"}
                            </p>
                            {(selectedRequest.assignedDriverPhone ||
                              selectedRequest.assignedTechnicianPhone) && (
                              <div className="flex flex-col items-start">
                                <p className="text-[10px] text-dark-accent font-mono mt-0.5">
                                  {selectedRequest.assignedDriverPhone ||
                                    selectedRequest.assignedTechnicianPhone}
                                </p>
                                <a
                                  href={`sms:${selectedRequest.assignedDriverPhone || selectedRequest.assignedTechnicianPhone}?body=${encodeURIComponent(`Dear ${selectedRequest.assignedDriverName || selectedRequest.assignedTechnicianName}, you are assigned to order no #${selectedRequest.id?.slice(-6).toUpperCase()} (${selectedRequest.type?.toLowerCase() || ""} request). Please check your portal.`)}`}
                                  className="inline-flex mt-2 bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-colors shadow shadow-emerald-950/25 border border-emerald-400/20"
                                >
                                  Dispatch via Local SIM
                                </a>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const rolesMap: any = {
                                Vehicle: "DRIVER",
                                Camera: "CAMERAMAN",
                                Service: "TECHNICIAN",
                              };
                              const techId =
                                selectedRequest.assignedDriverId ||
                                selectedRequest.assignedTechnicianId;
                              const existingTech = [
                                ...technicians,
                                ...drivers,
                                ...cameramen,
                              ].find((t) => t.id === techId);

                              if (existingTech) {
                                setEditingTech(existingTech);
                                setEditName(existingTech.displayName);
                                setEditPhone(existingTech.phoneNumber || "");
                                setEditRole(
                                  existingTech.role ||
                                    rolesMap[selectedRequest.type] ||
                                    "TECHNICIAN",
                                );
                                setIsPersonnelModalOpen(true);
                              } else {
                                toast.error(
                                  "Original agent registry link missing",
                                );
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-dark-accent/10 hover:text-dark-accent rounded text-dark-text-subtle transition-all"
                            title="Correct Agent Info in Registry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {selectedRequest.type === "Camera" &&
                      selectedRequest.hostName ? (
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                            Assigned Host
                          </p>
                          <p className="text-sm font-black text-black">
                            {selectedRequest.hostName}
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 bg-dark-main border border-dark-border rounded-xl">
                          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2 font-mono">
                            Asset Specifics
                          </p>
                          <p className="text-sm font-black text-black">
                            {selectedRequest.vehicleType ||
                              selectedRequest.serialNumber ||
                              "FMC STANDARD"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {selectedRequest.status === "COMPLETED" && activeTab !== "STUDIO" && (
                  <div className="space-y-6 pt-6 border-t border-dark-border">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1">
                        {selectedRequest.type === "Vehicle"
                          ? "Mission Report"
                          : "Work Completion Summary"}
                      </label>
                      <div className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-sm text-black font-bold font-serif italic border-dashed">
                        {(selectedRequest.type === "Vehicle"
                          ? selectedRequest.driverNotes
                          : selectedRequest.technicianNotes) ||
                          "No summary provided by agent."}
                      </div>
                    </div>

                    {selectedRequest.completionImageUrl && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1 flex items-center gap-2">
                          <ImageIcon className="w-3 h-3" />
                          Field Evidence Tag
                        </label>
                        <div className="relative group max-w-sm overflow-hidden rounded-2xl border border-dark-border shadow-xl">
                          <img
                            src={selectedRequest.completionImageUrl}
                            alt="Evidence"
                            className="w-full aspect-video object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(selectedRequest.signatureBase64 || selectedRequest.hasOfficialStamp) && (
                  <div className="mt-6 pt-6 border-t border-dark-border grid grid-cols-2 gap-6">
                    {selectedRequest.signatureBase64 && (
                      <div className="p-5 bg-white border border-slate-200 rounded-xl relative">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono">
                          Digital Signature
                        </p>
                        <img 
                          src={selectedRequest.signatureBase64} 
                          alt="Signature" 
                          className="h-20 w-auto object-contain mix-blend-multiply"
                        />
                      </div>
                    )}
                    {selectedRequest.hasOfficialStamp && (
                      <div className="p-5 bg-dark-main border border-dark-border rounded-xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/5" />
                        <div className="w-24 h-24 rounded-full border-4 border-red-500/80 flex items-center justify-center relative rotate-[-15deg] mix-blend-screen opacity-90">
                          <div className="absolute inset-2 border-2 border-dashed border-red-500/60 rounded-full" />
                          <div className="text-center">
                            <div className="text-red-500 font-black text-xs uppercase tracking-tighter">FMC ADMIN</div>
                            <div className="text-red-500 font-bold text-[8px] tracking-widest border-y border-red-500/50 py-0.5 my-0.5">APPROVED</div>
                            <div className="text-red-500/80 font-mono text-[6px]">{format(selectedRequest.updatedAt?.seconds ? new Date(selectedRequest.updatedAt.seconds * 1000) : new Date(), 'dd/MM/yy')}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setIsEditing(false);
                    }}
                    className="flex-1 px-8 py-4 text-xs font-black uppercase text-dark-text-subtle border border-dark-border rounded-xl hover:text-white"
                  >
                    {isEditing ? "Cancel Edit" : "Close View"}
                  </button>

                  {isEditing ? (
                    <button
                      onClick={handleUpdateRecord}
                      className="flex-[2] bg-emerald-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Commit Changes
                    </button>
                  ) : (
                    <>
                      {selectedRequest.status === "NEW" && (
                        <button
                          onClick={() => {
                            if (selectedRequest.type === "Exit Permit") {
                              setIsSignatureModalOpen(true);
                            } else {
                              handleApprove(
                                selectedRequest.id,
                                selectedRequest.directorId,
                              );
                              setSelectedRequest(null);
                            }
                          }}
                          className="flex-[2] bg-dark-accent text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-900/20 active:scale-95"
                        >
                          Approve Record
                        </button>
                      )}

                      {selectedRequest.status === "APPROVED" &&
                        selectedRequest.type !== "Exit Permit" &&
                        selectedRequest.type !== "Device" &&
                        selectedRequest.type !== "Studio" &&
                        selectedRequest.type !== "Guest Entry" && (
                          <button
                            onClick={() => {
                              openAssignModal(selectedRequest);
                            }}
                            className="flex-1 bg-amber-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-amber-900/20 active:scale-95"
                          >
                            Dispatch Agent
                          </button>
                        )}

                      {selectedRequest.status === "COMPLETED" && (
                        <button
                          onClick={() => handleConfirm(selectedRequest.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Final Decommission
                        </button>
                      )}
                    </>
                  )}
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
                  <h2 className="text-2xl font-black text-black tracking-tight">
                    Direct Comms
                  </h2>
                  <p className="text-dark-text-subtle text-sm mt-1">
                    Send SMS directive to {selectedTechForSms.displayName}
                  </p>
                </div>
                <button
                  onClick={() => setIsSmsModalOpen(false)}
                  className="p-2 text-dark-text-subtle hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">
                    Recipient Identity
                  </label>
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
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Carrier: FMC Mobile
                          </p>
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-emerald-500 rounded-px" />
                            <div className="w-1 h-3 bg-slate-700 rounded-px" />
                          </div>
                        </div>
                        <p className="font-black text-black text-lg tracking-tight leading-none mb-1">
                          {selectedTechForSms.displayName}
                        </p>
                        <p className="text-[0.8rem] text-dark-accent font-mono font-medium tracking-wider">
                          {selectedTechForSms.phoneNumber || "+251 912 345 678"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        IMSI: VECTOR_AUTH_
                        {selectedTechForSms.id.slice(-6).toUpperCase()}
                      </span>
                      <div className="w-8 h-5 bg-amber-500/20 rounded border border-amber-500/30 flex items-center justify-center">
                        <div className="w-4 h-3 bg-amber-500/40 rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">
                    Directive Payload
                  </label>
                  <textarea
                    value={customSmsMessage}
                    onChange={(e) => setCustomSmsMessage(e.target.value)}
                    placeholder="Enter message for field operator..."
                    className="w-full bg-dark-main border border-dark-border rounded-xl p-5 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none min-h-[150px] resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <span
                      className={cn(
                        "text-[10px] font-mono",
                        customSmsMessage.length > 160
                          ? "text-red-400"
                          : "text-dark-text-subtle",
                      )}
                    >
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
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      disabled={!customSmsMessage.trim()}
                      onClick={handleSendSms}
                      className="w-full bg-dark-accent hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-3 text-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Transmit SMS (Twilio)
                    </button>
                    <button
                      disabled={!customSmsMessage.trim()}
                      onClick={handleSendSimulatedSms}
                      className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl transition-all shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                    >
                      <Phone className="w-3 h-3" />
                      Transmit SIM SMS
                    </button>
                  </div>
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
                    {activeTab === "VEHICLE"
                      ? "Assign FMC DRIVER"
                      : activeTab === "CAMERA"
                        ? "Assign FMC CAMERA OPERATOR"
                        : "Assign FMC ENGINEER"}
                  </h2>
                  <p className="text-slate-800 text-sm mt-1">
                    {activeTab === "VEHICLE"
                      ? "Select an active FMC DRIVER for transportation mission"
                      : activeTab === "CAMERA"
                        ? "Select an FMC CAMERA OPERATOR for media coverage"
                        : "Select an active FMC ENGINEER for maintenance vector"}
                  </p>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-2 text-dark-text-subtle hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-8 pt-4 pb-2 border-b border-dark-border flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-subtle" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={`Search ${activeTab === "VEHICLE" ? "Driver" : activeTab === "CAMERA" ? "Cameraman" : "Technician"} by name...`}
                    value={personnelSearch}
                    onChange={(e) => setPersonnelSearch(e.target.value)}
                    className="w-full bg-dark-main/50 border border-dark-border rounded-lg pl-10 pr-4 py-2 text-sm text-black placeholder:text-dark-text-subtle focus:border-dark-accent focus:ring-1 focus:ring-dark-accent transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    setEditingTech(null);
                    setIsOnboarding(true);
                    setEditName(personnelSearch);
                    setEditPhone("");
                    setEditRole(
                      activeTab === "VEHICLE"
                        ? "DRIVER"
                        : activeTab === "CAMERA"
                          ? "CAMERAMAN"
                          : "TECHNICIAN",
                    );
                    setIsPersonnelModalOpen(true);
                  }}
                  className="px-4 py-2 bg-dark-accent/10 border border-dark-accent/30 rounded-lg text-[10px] font-black uppercase text-dark-accent hover:bg-dark-accent hover:text-white transition-all tracking-widest flex items-center gap-2 whitespace-nowrap"
                  title="Initialize New Agent"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t("NEW")}
                </button>
              </div>

              {(() => {
                const primaryList =
                  activeTab === "VEHICLE"
                    ? drivers
                    : activeTab === "CAMERA"
                      ? cameramen
                      : technicians;
                const list = allUsers.filter((t) => {
                  if (t.role === "ADMIN" && t.id !== profile?.uid) return false;
                  const targetRole =
                    activeTab === "VEHICLE"
                      ? "DRIVER"
                      : activeTab === "CAMERA"
                        ? "CAMERAMAN"
                        : "TECHNICIAN";
                  if (t.role !== targetRole && t.id !== profile?.uid)
                    return false;

                  const matchesSearch =
                    !personnelSearch ||
                    t.displayName
                      .toLowerCase()
                      .includes(personnelSearch.toLowerCase()) ||
                    (t.role &&
                      t.role
                        .toLowerCase()
                        .includes(personnelSearch.toLowerCase()));
                  return matchesSearch;
                });

                if (list.length === 0) {
                  return (
                    <div className="p-8 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-dark-text-subtle/20 mx-auto mb-4" />
                      <p className="text-dark-text-subtle text-sm font-serif italic mb-4">
                        {personnelSearch
                          ? `No personnel matching "${personnelSearch}" found`
                          : `No FMC ${activeTab === "VEHICLE" ? "DRIVERS" : activeTab === "CAMERA" ? "CAMERA OPERATORS" : "ENGINEERS"} detected in sector`}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="p-8 max-h-[45vh] overflow-y-auto space-y-4 border-b border-dark-border">
                      {list.map((tech, idx) => {
                        const isEditingThis = editingTech?.id === tech.id;
                        const isSelected = selectedAssignIds.includes(tech.id);
                        return (
                          <div
                            key={`admin-dashboard-personnel-${tech.id || idx}-${idx}`}
                            className={cn(
                              "flex items-center justify-between p-5 bg-dark-main border border-dark-border rounded-xl hover:bg-dark-sidebar/40 transition-all group",
                              isSelected &&
                                "border-indigo-500/50 bg-indigo-500/[0.02]",
                            )}
                          >
                            {isEditingThis ? (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                  <div>
                                    <label className="block text-[9px] font-black text-dark-text-subtle uppercase tracking-wider mb-1">
                                      Name
                                    </label>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) =>
                                        setEditName(e.target.value)
                                      }
                                      className="w-full bg-white border border-dark-border text-black font-semibold text-xs rounded px-3 py-2 focus:ring-1 focus:ring-dark-accent outline-none"
                                      placeholder="Operator Name"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-black text-dark-text-subtle uppercase tracking-wider mb-1">
                                      Contact Phone No
                                    </label>
                                    <input
                                      type="tel"
                                      value={editPhone}
                                      onChange={(e) =>
                                        setEditPhone(e.target.value)
                                      }
                                      className="w-full bg-white border border-dark-border text-black font-semibold text-xs rounded px-3 py-2 font-mono focus:ring-1 focus:ring-dark-accent outline-none"
                                      placeholder="+251..."
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2 md:mt-0 self-end">
                                  <button
                                    onClick={() => {
                                      setEditingTech(null);
                                      setEditName("");
                                      setEditPhone("");
                                      setIsOnboarding(false);
                                    }}
                                    className="px-3 py-2 border border-dark-border rounded bg-dark-sidebar hover:bg-dark-main text-dark-text-subtle hover:text-white text-[10px] uppercase font-bold transition-all"
                                  >
                                    {t("Cancel")}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const originalId = tech.id;
                                      await handleUpdateTech();
                                      handleAssign(
                                        selectedRequest?.id,
                                        {
                                          ...tech,
                                          displayName: editName,
                                          phoneNumber: editPhone
                                            .trim()
                                            .startsWith("0")
                                            ? "+251" +
                                              editPhone.trim().substring(1)
                                            : editPhone.trim(),
                                        },
                                        selectedRequest?.directorId,
                                      );
                                      setIsAssignModalOpen(false);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/20"
                                  >
                                    {t("Update & Dispatch")}
                                  </button>
                                  <button
                                    onClick={handleUpdateTech}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-all"
                                  >
                                    {t("Save Only")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedAssignIds((prev) =>
                                        prev.includes(tech.id)
                                          ? prev.filter((id) => id !== tech.id)
                                          : [...prev, tech.id],
                                      );
                                    }}
                                    className="w-5 h-5 rounded border-dark-border text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                  />
                                  <div className="w-11 h-11 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-dark-accent font-bold">
                                    {tech.displayName[0]}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-black text-black text-sm">
                                        {tech.displayName}
                                      </p>
                                      {tech.id === profile?.uid && (
                                        <span className="bg-emerald-500/10 text-emerald-400 text-[7px] font-black px-1 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                                          Self
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-[10px] text-dark-text-subtle uppercase tracking-widest font-black">
                                        {tech.role === "DRIVER"
                                          ? "FMC DRIVER"
                                          : tech.role === "CAMERAMAN"
                                            ? "FMC CAMERA OPERATOR"
                                            : tech.role === "TECHNICIAN"
                                              ? "FMC ENGINEER"
                                              : tech.role || "Personnel"}
                                      </p>
                                      <span className="text-[10px] text-dark-accent/40">
                                        •
                                      </span>
                                      <p className="text-[10px] text-dark-accent font-mono">
                                        {tech.phoneNumber || "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTech(tech);
                                      setEditName(tech.displayName);
                                      setEditPhone(tech.phoneNumber || "");
                                      setEditRole(tech.role || "TECHNICIAN");
                                    }}
                                    className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] font-black uppercase text-dark-text-subtle hover:text-white hover:border-white transition-all tracking-widest"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleAssign(
                                        selectedRequest?.id,
                                        tech,
                                        selectedRequest?.directorId,
                                      )
                                    }
                                    className="bg-dark-accent text-white font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                                  >
                                    Dispatch
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-8 py-5 bg-dark-card/30 flex items-center justify-between border-t border-dark-border">
                      <div>
                        <span className="text-xs text-black font-semibold">
                          {selectedAssignIds.length} personnel selected
                        </span>
                        <p className="text-[10px] text-dark-text-subtle">
                          {selectedAssignIds.length > 0
                            ? "Ready for group dispatch"
                            : "Check personnel to group dispatch"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedAssignIds([])}
                          disabled={selectedAssignIds.length === 0}
                          className="px-4 py-2 border border-dark-border rounded-lg text-[10px] font-black uppercase text-dark-text-subtle hover:text-white disabled:opacity-30 transition-all"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => {
                            const selectedTechsObj = list.filter((t) =>
                              selectedAssignIds.includes(t.id),
                            );
                            handleAssign(
                              selectedRequest?.id,
                              selectedTechsObj,
                              selectedRequest?.directorId,
                            );
                          }}
                          disabled={selectedAssignIds.length === 0}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center gap-2"
                        >
                          Group Dispatch ({selectedAssignIds.length})
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}

        {isReportOpen && (
          <WeeklyReport
            requests={getFilteredRequestsForReport()}
            workforce={[...technicians, ...drivers, ...cameramen]}
            onClose={handleCloseReport}
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
                  <h2 className="text-2xl font-black text-black tracking-tight">
                    {t("Workforce", "Workforce Registry")}
                  </h2>
                  <p className="text-dark-text-subtle text-sm mt-1">
                    {t("Manage personnel and communication protocols")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all tracking-widest flex items-center gap-2 disabled:opacity-50"
                  >
                    <TowerControl
                      className={cn(
                        "w-3.5 h-3.5",
                        isSeeding && "animate-pulse",
                      )}
                    />
                    {isSeeding ? t("Deploying...") : t("Bulk Setup Workforce")}
                  </button>
                  <button
                    onClick={() => {
                      setIsOnboarding(true);
                      setEditName("");
                      setEditPhone("");
                    }}
                    className="px-4 py-2 bg-dark-accent/10 border border-dark-accent/30 rounded-lg text-[10px] font-black uppercase text-dark-accent hover:bg-dark-accent hover:text-white transition-all tracking-widest flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t("Onboard Agent", "Onboard Agent")}
                  </button>
                  <button
                    onClick={() => setIsPersonnelModalOpen(false)}
                    className="p-2 text-dark-text-subtle hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-1 gap-4">
                  {[...technicians, ...drivers, ...cameramen]
                    .filter(
                      (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
                    )
                    .map((tech, idx) => {
                      const isEditingThis = editingTech?.id === tech.id;
                      return (
                        <div
                          key={`admin-dashboard-tech-registry-card-${tech.id || idx}-${idx}`}
                          className="bg-dark-main border border-dark-border rounded-xl p-5 flex items-center justify-between group hover:border-dark-accent/50 transition-all"
                        >
                          {isEditingThis ? (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                <div>
                                  <label className="block text-[9px] font-black text-dark-text-subtle uppercase tracking-wider mb-1">
                                    {t("Name")}
                                  </label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) =>
                                      setEditName(e.target.value)
                                    }
                                    className="w-full bg-white border border-dark-border text-black font-semibold text-xs rounded px-3 py-2 focus:ring-1 focus:ring-dark-accent outline-none"
                                    placeholder="Operator Name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black text-dark-text-subtle uppercase tracking-wider mb-1">
                                    {t("Contact Phone No")}
                                  </label>
                                  <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) =>
                                      setEditPhone(e.target.value)
                                    }
                                    className="w-full bg-white border border-dark-border text-black font-semibold text-xs rounded px-3 py-2 font-mono focus:ring-1 focus:ring-dark-accent outline-none"
                                    placeholder="+251..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black text-dark-text-subtle uppercase tracking-wider mb-1">
                                    {t("Operational Role")}
                                  </label>
                                  <select
                                    value={editRole}
                                    onChange={(e) =>
                                      setEditRole(e.target.value as any)
                                    }
                                    className="w-full bg-white border border-dark-border text-black font-semibold text-xs rounded px-3 py-2 focus:ring-1 focus:ring-dark-accent outline-none"
                                  >
                                    <option value="TECHNICIAN">
                                      Technician
                                    </option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="CAMERAMAN">Cameraman</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 md:mt-0 self-end">
                                <button
                                  onClick={() => {
                                    setEditingTech(null);
                                    setEditName("");
                                    setEditPhone("");
                                  }}
                                  className="px-3 py-2 border border-dark-border rounded bg-dark-sidebar hover:bg-dark-main text-dark-text-subtle hover:text-white text-[10px] uppercase font-bold transition-all"
                                >
                                  {t("Cancel")}
                                </button>
                                <button
                                  onClick={handleUpdateTech}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-all"
                                >
                                  {t("Save")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-dark-sidebar border border-dark-border flex items-center justify-center text-dark-accent font-black text-xl">
                                  {tech.displayName[0]}
                                </div>
                                <div>
                                  <p className="font-black text-black text-base">
                                    {tech.displayName}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-dark-accent/10 text-dark-accent border border-dark-accent/20 rounded">
                                      {tech.role || "TECHNICIAN"}
                                    </span>
                                    <p className="text-xs text-dark-text-subtle font-mono">
                                      {tech.phoneNumber ||
                                        "Contact Not Synchronized"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingTech(tech);
                                    setEditName(tech.displayName);
                                    setEditPhone(tech.phoneNumber || "");
                                    setEditRole(tech.role || "TECHNICIAN");
                                  }}
                                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] font-black uppercase text-dark-text-subtle hover:text-white hover:border-white transition-all uppercase tracking-widest"
                                >
                                  Modify ID
                                </button>
                                {tech.id !== profile?.uid && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteTech(tech.id);
                                    }}
                                    className={cn(
                                      "p-2 rounded-lg transition-all border",
                                      deleteTechConfirmId === tech.id
                                        ? "bg-red-500 border-red-600 text-white animate-pulse"
                                        : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white",
                                    )}
                                    title={
                                      deleteTechConfirmId === tech.id
                                        ? "Confirm De-registration"
                                        : "De-register Agent"
                                    }
                                  >
                                    <Trash2
                                      className={cn(
                                        "transition-transform",
                                        deleteTechConfirmId === tech.id
                                          ? "w-5 h-5 scale-110"
                                          : "w-4 h-4",
                                      )}
                                    />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <AnimatePresence>
                {(editingTech || isOnboarding) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-dark-sidebar border-t border-dark-border overflow-hidden"
                  >
                    <div className="p-8 bg-dark-sidebar/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">
                            User Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="User Name"
                            className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">
                            Operational Role
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as any)}
                            className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none appearance-none"
                          >
                            <option value="TECHNICIAN">Technician</option>
                            <option value="DRIVER">Driver</option>
                            <option value="CAMERAMAN">Camera Man</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-2">
                            Agent Contact (SMS)
                          </label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+251..."
                            className="w-full bg-dark-main border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:ring-1 focus:ring-dark-accent outline-none font-mono"
                          />
                          <p className="text-[9px] text-dark-text-subtle mt-1 italic font-serif">
                            Must include + and country code for SMS delivery
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setEditingTech(null);
                            setIsOnboarding(false);
                          }}
                          className="px-6 py-2.5 text-xs font-black text-dark-text-subtle hover:text-white uppercase tracking-widest"
                        >
                          Abandon
                        </button>
                        <button
                          onClick={handleUpdateTech}
                          className="bg-dark-accent text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95"
                        >
                          {isOnboarding
                            ? "Deploy to Registry"
                            : "Commit Identity"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
        {isSignatureModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSignatureModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-dark-border">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Digital Authorization</h3>
                    <p className="text-xs text-dark-text-subtle font-mono mt-1">Exit Permit Approval</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest pl-1 mb-2 block">
                      Director Signature
                    </label>
                    <SignaturePad 
                      onSign={setCurrentSignatureBase64} 
                      onClear={() => setCurrentSignatureBase64(null)} 
                    />
                  </div>

                  <label className="flex items-center gap-3 p-4 bg-dark-main border border-dark-border rounded-xl cursor-pointer hover:bg-dark-sidebar/50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={currentApplyStamp}
                      onChange={(e) => setCurrentApplyStamp(e.target.checked)}
                      className="w-5 h-5 rounded border-dark-border bg-dark-card text-emerald-500 focus:ring-emerald-500 focus:ring-offset-dark-card"
                    />
                    <div>
                      <div className="text-sm font-bold text-white">Apply FMC Official Stamp</div>
                      <div className="text-[10px] text-dark-text-subtle font-mono mt-0.5">Appends digital watermark to record</div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => {
                      setIsSignatureModalOpen(false);
                      setCurrentSignatureBase64(null);
                      setCurrentApplyStamp(false);
                    }}
                    className="flex-1 px-4 py-3 bg-dark-main hover:bg-dark-sidebar text-dark-text-subtle text-xs font-bold rounded-xl transition-colors border border-dark-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!currentSignatureBase64) {
                        toast.error("Signature is mandatory for exit item approval");
                        return;
                      }
                      handleApprove(
                        selectedRequest.id,
                        selectedRequest.directorId,
                        false,
                        currentSignatureBase64,
                        currentApplyStamp
                      );
                      setIsSignatureModalOpen(false);
                      setSelectedRequest(null);
                      setCurrentSignatureBase64(null);
                      setCurrentApplyStamp(false);
                    }}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Authorize & Sign
                  </button>
                </div>
              </div>
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
                setUnlockPassword("");
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
                  {SECTOR_AUTH[
                    (pendingAction?.sector ||
                      activeTab) as keyof typeof SECTOR_AUTH
                  ]?.icon ? (
                    (() => {
                      const Icon =
                        SECTOR_AUTH[
                          (pendingAction?.sector ||
                            activeTab) as keyof typeof SECTOR_AUTH
                        ].icon;
                      return <Icon className="w-8 h-8 text-amber-500" />;
                    })()
                  ) : (
                    <Lock className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
                  {SECTOR_AUTH[
                    (pendingAction?.sector ||
                      activeTab) as keyof typeof SECTOR_AUTH
                  ]?.label || "Director Authorization"}
                </h2>
                <p className="text-dark-text-subtle text-sm mb-8 font-serif italic">
                  Enter sector-specific access key to continue.
                </p>

                <div className="space-y-4">
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-subtle" />
                    <input
                      type={showUnlockPassword ? "text" : "password"}
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                      placeholder="••••"
                      autoFocus
                      className="w-full bg-dark-main border border-dark-border rounded-xl pl-12 pr-12 py-4 text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-dark-text-muted text-center tracking-[0.5em] text-2xl font-black"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-text-subtle hover:text-white"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    >
                      {showUnlockPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                      onClick={() => {
                        setIsUnlockModalOpen(false);
                        setPendingAction(null);
                        setUnlockPassword("");
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
        <RequestPasswordModal
          isOpen={isDeletePasswordModalOpen}
          onClose={() => setIsDeletePasswordModalOpen(false)}
          expectedPassword="123"
          onAuthenticated={() => {
            setIsDeletePasswordModalOpen(false);
            if (deleteTarget?.type === "single") {
              executeSingleDelete(deleteTarget.request);
            } else if (deleteTarget?.type === "bulk") {
              executeBulkDelete();
            } else if (deleteTarget?.type === "tech" && deleteTarget.techId) {
              executeTechDelete(deleteTarget.techId);
            }
          }}
        />
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? "bg-dark-accent text-white shadow-lg shadow-indigo-500/20"
          : "text-dark-text-subtle hover:text-white",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "NEW":
      return "bg-blue-500/10 text-blue-700 border border-blue-500/20";
    case "APPROVED":
      return "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20";
    case "ASSIGNED":
      return "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20";
    case "ACCEPTED":
      return "bg-violet-500/10 text-violet-700 border border-violet-500/20";
    case "IN_PROGRESS":
      return "bg-amber-500/10 text-amber-900 border border-amber-500/20";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
    case "CONFIRMED":
      return "bg-slate-500/10 text-emerald-800 border border-emerald-500/20";
    case "CLOSED":
      return "bg-slate-500/20 text-slate-800 border border-slate-500/30";
    case "EXITED":
      return "bg-pink-500/10 text-pink-700 border border-pink-500/20";
    case "RETURNED":
      return "bg-teal-500/10 text-teal-700 border border-teal-500/20";
    default:
      return "bg-slate-500/10 text-slate-700 border border-slate-500/20";
  }
};
