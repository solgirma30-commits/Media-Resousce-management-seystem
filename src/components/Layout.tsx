import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  PlusSquare,
  ClipboardList,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  TowerControl as Control,
  ArrowLeft,
  Globe,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth, UserRole } from "../App";
import { cn } from "../lib/utils";
import { notificationService } from "../services/notificationService";
import { useLanguage } from "../lib/LanguageContext";
import { useFcmToken } from "../hooks/useFcmToken";

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, switchRole, selectedPortalRole, setSelectedPortalRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<{ id: string; title: string; message: string } | null>(null);
  const { token, permission, requestNotificationPermission } = useFcmToken();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const notifiedSessionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (permission) {
      setPermissionStatus(permission);
      // If notification permission is default, we can prompt mobile users elegantly
      if (permission === 'default') {
        const dismissed = localStorage.getItem('fmc_notif_prompt_dismissed');
        if (!dismissed) {
          setShowNotificationPrompt(true);
        }
      }
    }
  }, [permission]);

  useEffect(() => {
    if (!profile) return;
    
    // Update permission status
    setPermissionStatus(notificationService.getPermissionStatus());

    const path = "notifications";
    const q = query(
      collection(db, path),
      where("userId", "==", profile.uid),
      limit(100)
    );

    let isFirstLoad = true;
    return onSnapshot(
      q,
      (snapshot) => {
        const allDocs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Filter read: false locally to avoid composite index
        const docs = allDocs.filter((d: any) => d.read === false);
        
        docs.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        // Trigger browser notification for new items using docChanges
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newNotif = change.doc.data() as any;
            const notifId = change.doc.id;
            
            if (notifiedSessionIds.current.has(notifId)) {
              return;
            }
            notifiedSessionIds.current.add(notifId);

            // Check if this notification is extremely recent (created within the last 15 minutes / 900 seconds)
            // so we don't suppress it on portal switches, page reloads, or device wake actions
            const secondsAgo = newNotif.createdAt?.seconds 
              ? (Date.now() / 1000) - newNotif.createdAt.seconds 
              : null;
            const isVeryRecent = secondsAgo === null || (secondsAgo > -300 && secondsAgo < 900);

            if (isFirstLoad && !isVeryRecent) {
              return;
            }

            // Trigger a browser-level and in-app toast popup for all notifications
            notificationService.notify(newNotif.title, {
              body: newNotif.message,
              data: {
                url: newNotif.requestId ? `/services?id=${newNotif.requestId}` : '/'
              }
            });

            // Set the on-screen overlay modal for highly visible real-time alert pop-ups
            if (isVeryRecent) {
              setActivePopup({
                id: notifId,
                title: newNotif.title,
                message: newNotif.message,
              });
            }
          }
        });

        setNotifications(docs.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i));
        isFirstLoad = false;
      },
      (error) => {
        console.warn("Layout notification listener error:", error);
      },
    );
  }, [profile]);

  const handleRequestPermission = async () => {
    try {
      const freshToken = await requestNotificationPermission();
      if (freshToken) {
        setPermissionStatus("granted");
        setShowNotificationPrompt(false);
        toast.success(t("notifications_enabled_success", "Push notifications activated successfully! Safeguard armed."));
      } else {
        const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        setPermissionStatus(currentPerm);
        if (currentPerm === "granted") {
          // Token register succeeded or completed
          setPermissionStatus("granted");
          setShowNotificationPrompt(false);
          toast.success(t("notifications_enabled_success", "Push notifications activated successfully! Safeguard armed."));
        } else if (currentPerm === "denied") {
          toast.error(t("notifications_permission_denied", "Notification permission was blocked. Please reset site permissions in your browser."));
        } else {
          toast.error(t("notifications_setup_cancelled", "Notification activation was cancelled or interrupted."));
        }
      }
    } catch (err) {
      console.error("Error requesting permission:", err);
      toast.error("Permission request failed or was interrupted.");
    }
  };

  const markAllAsRead = async () => {
    try {
      const promises = notifications.map((n) =>
        updateDoc(doc(db, "notifications", n.id), { read: true }),
      );
      await Promise.all(promises);
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const handleTestNotification = () => {
    notificationService.notify("Operational Test", {
      body: "System handshake successful. Notifications are active.",
    });
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard Overview",
      icon: Home,
      roles: [
        UserRole.ADMIN,
        UserRole.DEPT_DIRECTOR,
        UserRole.TECHNICIAN,
        UserRole.DRIVER,
        UserRole.CAMERAMAN,
        UserRole.SECURITY,
        UserRole.SUPERVISOR,
      ],
    },
    {
      id: "requests",
      label: "Service Requests",
      icon: PlusSquare,
      roles: [UserRole.DEPT_DIRECTOR],
    },
    {
      id: "all-requests",
      label: "Service Queue",
      icon: ClipboardList,
      roles: [UserRole.ADMIN],
    },
    {
      id: "assignments",
      label: "Technician Fleet",
      icon: ClipboardList,
      roles: [UserRole.TECHNICIAN, UserRole.DRIVER, UserRole.CAMERAMAN],
    },
    {
      id: "technicians",
      label: "Technicians",
      icon: Users,
      roles: [UserRole.ADMIN],
    },
  ];

  const activeRole = selectedPortalRole || profile?.role;

  const filteredNav = navItems.filter(
    (item) => activeRole && item.roles.includes(activeRole),
  );

  return (
    <div className="min-h-screen bg-dark-main flex flex-col md:flex-row text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-sidebar border-r border-dark-border h-screen sticky top-0 p-0 overflow-y-auto">
        <div className="p-8 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-accent rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
              <Control className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="font-serif italic text-xl text-slate-900 tracking-wide">
              TechOps Central
            </span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          {filteredNav.map((item) => (
            <button
              id={`nav-${item.id}`}
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-8 py-3 transition-all text-[0.85rem] font-medium text-left",
                "text-dark-text-muted hover:text-slate-900 hover:bg-dark-card/50",
                "active:border-r-4 active:border-dark-accent active:bg-dark-card active:text-slate-900",
              )}
            >
              <item.icon className="w-4 h-4 opacity-70" />
              {item.id === 'dashboard' ? t('nav_dashboard', 'Dashboard Overview') :
               item.id === 'requests' ? t('nav_requests', 'Service Requests') :
               item.id === 'all-requests' ? t('nav_service_queue', 'Service Queue') :
               item.id === 'assignments' ? t('nav_technician_fleet', 'Technician Fleet') :
               item.id === 'technicians' ? t('nav_technicians', 'Technicians') :
               item.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "w-full flex items-center justify-between px-8 py-3 transition-all text-[0.85rem] font-medium hover:text-slate-900 hover:bg-dark-card/50",
                isNotificationsOpen
                  ? "text-slate-900 bg-dark-card/30"
                  : "text-dark-text-muted",
              )}
            >
              <div className="flex items-center gap-3 text-left">
                <Bell className="w-4 h-4 opacity-70" />
                {t('nav_notifications', 'Notifications')}
              </div>
              {notifications.length > 0 && (
                <span className="bg-dark-accent text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  {/* Backdrop for mobile */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsNotificationsOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={cn(
                      "fixed md:absolute z-50 overflow-hidden bg-dark-card border border-dark-border shadow-2xl",
                      "inset-x-4 top-20 md:inset-auto md:left-full md:top-0 md:ml-2 md:w-80 rounded-xl",
                    )}
                  >
                    <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-main/40">
                      <span className="text-[10px] font-black uppercase tracking-widest text-dark-text-subtle">
                        {t('nav_system_alerts', 'System Alerts')}
                      </span>
                      <div className="flex items-center gap-4">
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[9px] font-bold text-dark-accent hover:underline uppercase tracking-tight"
                          >
                            {t('nav_clear_all', 'Clear All')}
                          </button>
                        )}
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="md:hidden p-1 text-dark-text-subtle"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-xs text-dark-text-subtle font-serif italic">
                            {t('nav_no_notifications', 'No pending notifications')}
                          </p>
                        </div>
                      ) : (
                        notifications.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map((n, idx) => (
                          <div
                            key={`notif-${n.id}-${idx}`}
                            className="p-4 border-b border-dark-border last:border-0 hover:bg-dark-main/30"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-dark-accent mt-1.5 shrink-0" />
                              <div>
                                <p className="text-[11px] font-bold text-slate-900 leading-tight">
                                  {n.title}
                                </p>
                                <p className="text-[10px] text-dark-text-subtle mt-1 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="mt-auto p-8 border-t border-dark-border bg-dark-main/20">
          {/* Dynamic Language Switcher in Sidebar */}
          <div className="mb-4">
            <div className="text-[10px] text-dark-text-subtle font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <Globe className="w-3 h-3 text-dark-accent" />
              <span>Language / ቋንቋ</span>
            </div>
            <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 text-center py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  language === 'en' ? 'bg-dark-accent text-white font-black shadow-sm' : 'text-dark-text-subtle hover:text-slate-900 bg-transparent'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('om')}
                className={`flex-1 text-center py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  language === 'om' ? 'bg-dark-accent text-white font-black shadow-sm' : 'text-dark-text-subtle hover:text-slate-900 bg-transparent'
                }`}
              >
                OM
              </button>
              <button
                onClick={() => setLanguage('am')}
                className={`flex-1 text-center py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  language === 'am' ? 'bg-dark-accent text-white font-black shadow-sm' : 'text-dark-text-subtle hover:text-slate-900 bg-transparent'
                }`}
              >
                አማ
              </button>
            </div>
          </div>

          <div className="mb-4 pt-4 border-t border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-dark-text-subtle font-black uppercase tracking-widest">
                {t('system_health', 'SYSTEM HEALTH')}
              </div>
              {permissionStatus !== "granted" ? (
                <button 
                  onClick={handleRequestPermission}
                  className="text-[9px] font-black text-dark-accent hover:text-dark-accent/80 transition-colors uppercase tracking-[0.1em] flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-2 h-2" />
                  {t('enable_alerts', 'Enable Alerts')}
                </button>
              ) : (
                <button 
                  onClick={handleTestNotification}
                  className="text-[9px] font-black text-dark-text-subtle hover:text-dark-accent transition-colors uppercase tracking-[0.1em] flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-2 h-2" />
                  {t('test_alert', 'Test Alert')}
                </button>
              )}
            </div>
            <div className="h-1 bg-dark-border rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[94%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            </div>
            <div className="text-[9px] text-dark-text-muted mt-2">
              {t('all_servers_operational', 'All servers operational')}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 pt-4 border-t border-dark-border">
            <div className="w-8 h-8 rounded-full bg-dark-accent flex items-center justify-center text-white font-bold text-[10px]">
              {profile?.displayName[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-[0.75rem] font-bold text-slate-950 truncate">
                {profile?.displayName}
              </p>
              <p className="text-[9px] text-slate-900 font-black truncate uppercase tracking-tight">
                {activeRole === UserRole.ADMIN
                  ? t('fmc_admin', 'FMC COMMAND CENTER')
                  : activeRole === UserRole.DEPT_DIRECTOR
                    ? t('fmc_request', 'FMC DEPT OPS')
                    : activeRole === UserRole.TECHNICIAN
                      ? t('fmc_engineers', 'FMC ENGINEERS')
                      : activeRole === UserRole.DRIVER
                        ? t('fmc_drivers', 'FMC DRIVERS')
                        : activeRole === UserRole.CAMERAMAN
                          ? t('fmc_cameramen', 'FMC CAMERA OPERATORS')
                          : activeRole === UserRole.SECURITY
                            ? t('fmc_security', 'FMC SECURITY')
                            : activeRole === UserRole.SYSTEM_ADMIN
                              ? t('fmc_system_admin', 'SYSTEM ADMIN')
                              : activeRole === UserRole.ALL_IN_ONE
                                ? t('all_in_one', 'ALL IN ONE PORTAL')
                                : activeRole === UserRole.SUPERVISOR
                                  ? t('fmc_supervisor', 'FMC SUPERVISOR')
                                  : "AGENT"}
              </p>
            </div>
          </div>
          {(profile?.role === UserRole.SYSTEM_ADMIN || profile?.role === UserRole.SUPERVISOR || useAuth().user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') && (
            <button
              id="switch-portal-btn"
              onClick={switchRole}
              className="w-full flex items-center gap-3 py-1 mb-4 text-dark-text-subtle hover:text-dark-accent transition-all font-medium text-[0.75rem] text-left cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('switch_portal', 'Switch Portal')}
            </button>
          )}
          <button
            id="logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 py-3 px-4 mt-2 bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-all font-black text-[0.85rem] rounded-xl text-left cursor-pointer border border-red-900/50"
          >
            <LogOut className="w-4 h-4" />
            {t('sign_out', 'Sign Out')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <header className="md:hidden bg-dark-sidebar border-b border-dark-border px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Control className="w-6 h-6 text-dark-accent" />
          <span className="font-serif italic text-lg text-slate-900">
            TechOps Central
          </span>
        </div>
        <button
          id="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-dark-text-muted"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-dark-main z-40 md:hidden p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <Control className="w-8 h-8 text-dark-accent" />
                <span className="font-serif italic text-2xl text-slate-900">
                  TechOps Central
                </span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-8 h-8 text-dark-text-muted" />
              </button>
            </div>

            <nav className="space-y-6">
              {filteredNav.map((item) => (
                <button
                  id={`mobile-nav-${item.id}`}
                  key={item.id}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-6 text-[1.1rem] text-dark-text-muted font-medium py-2 hover:text-slate-900 cursor-pointer"
                >
                  <item.icon className="w-6 h-6 text-dark-accent" />
                  {item.id === 'dashboard' ? t('nav_dashboard', 'Dashboard Overview') :
                   item.id === 'requests' ? t('nav_requests', 'Service Requests') :
                   item.id === 'all-requests' ? t('nav_service_queue', 'Service Queue') :
                   item.id === 'assignments' ? t('nav_technician_fleet', 'Technician Fleet') :
                   item.id === 'technicians' ? t('nav_technicians', 'Technicians') :
                   item.label}
                </button>
              ))}
              <button
                id="mobile-nav-notifications"
                onClick={() => {
                  setIsNotificationsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between text-[1.1rem] text-dark-text-muted font-medium py-2 hover:text-slate-900 border-t border-dark-border/50 pt-6 cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <Bell className="w-6 h-6 text-dark-accent" />
                  {t('nav_notifications', 'Notifications')}
                </div>
                {notifications.length > 0 && (
                  <span className="bg-dark-accent text-white text-[12px] px-2 py-0.5 rounded-full font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>
            </nav>

            <div className="mt-auto pt-8 border-t border-dark-border">
              {/* Mobile Language Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-xl p-1">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                      language === 'en' ? 'bg-dark-accent text-white' : 'text-dark-text-muted bg-transparent'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage('om')}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                      language === 'om' ? 'bg-dark-accent text-white' : 'text-dark-text-muted bg-transparent'
                    }`}
                  >
                    Oromo
                  </button>
                  <button
                    onClick={() => setLanguage('am')}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                      language === 'am' ? 'bg-dark-accent text-white' : 'text-dark-text-muted bg-transparent'
                    }`}
                  >
                    አማርኛ
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-dark-accent flex items-center justify-center text-white font-bold text-xl">
                  {profile?.displayName[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{profile?.displayName}</p>
                  <p className="text-sm text-dark-text-subtle font-black uppercase tracking-tight">
                    {activeRole === UserRole.ADMIN
                      ? t('fmc_admin', 'FMC COMMAND CENTER')
                      : activeRole === UserRole.DEPT_DIRECTOR
                        ? t('fmc_request', 'FMC DEPT OPS')
                        : activeRole === UserRole.TECHNICIAN
                          ? t('fmc_engineers', 'FMC ENGINEERS')
                          : activeRole === UserRole.DRIVER
                            ? t('fmc_drivers', 'FMC DRIVERS')
                            : activeRole === UserRole.CAMERAMAN
                              ? t('fmc_cameramen', 'FMC CAMERA OPERATORS')
                              : activeRole === UserRole.SECURITY
                                ? t('fmc_security', 'FMC SECURITY')
                                : activeRole === UserRole.SYSTEM_ADMIN
                                  ? t('fmc_system_admin', 'SYSTEM ADMIN')
                                  : activeRole === UserRole.ALL_IN_ONE
                                    ? t('all_in_one', 'ALL IN ONE PORTAL')
                                    : activeRole === UserRole.SUPERVISOR
                                      ? t('fmc_supervisor', 'FMC SUPERVISOR')
                                      : "AGENT"}
                  </p>
                </div>
              </div>

              {(profile?.role === UserRole.SYSTEM_ADMIN || profile?.role === UserRole.SUPERVISOR || useAuth().user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') && (
                <button
                  id="mobile-switch-portal-btn"
                  onClick={switchRole}
                  className="w-full flex items-center justify-center gap-3 py-4 mb-4 rounded-2xl bg-dark-card text-dark-accent font-bold border border-dark-border cursor-pointer select-none"
                >
                  <ArrowLeft className="w-6 h-6" />
                  {t('switch_portal', 'Switch Portal')}
                </button>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-dark-card text-red-400 font-bold border border-dark-border cursor-pointer select-none"
              >
                <LogOut className="w-6 h-6" />
                {t('sign_out', 'Sign Out')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-10 overflow-x-hidden">
        {/* Portal Navigation Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-dark-border">
          {(profile?.role === UserRole.SYSTEM_ADMIN || useAuth().user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') ? (
            <button
              id="portal-back-btn"
              onClick={switchRole}
              className="group flex items-center gap-3 text-dark-text-subtle hover:text-dark-accent transition-all text-xs font-black uppercase tracking-[0.2em]"
            >
              <div className="w-8 h-8 rounded-full bg-dark-card border border-dark-border flex items-center justify-center group-hover:border-dark-accent group-hover:bg-dark-accent/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              {t('portal_selection', 'Portal Selection')}
            </button>

          ) : (
            <div className="flex items-center gap-3 select-none">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-dark-accent shadow-sm">
                <Users className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] text-dark-text-subtle font-black uppercase tracking-widest block leading-none">
                  {t('active_session_badge', 'SECURED ACTIVE WORKSTATION')}
                </span>
                <span className="text-xs font-black text-slate-800 font-sans mt-1 block leading-none">
                  {profile?.displayName || useAuth().user?.displayName || "ACTIVED AGENT"}
                </span>
              </div>
            </div>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-dark-text-subtle font-black uppercase tracking-widest block mb-1">
              {t('system_context', 'SYSTEM CONTEXT')}
            </span>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-dark-accent animate-pulse"></div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {activeRole === UserRole.ADMIN
                  ? t('fmc_admin', 'FMC COMMAND CENTER')
                  : activeRole === UserRole.DEPT_DIRECTOR
                    ? t('fmc_request', 'FMC DEPT OPS')
                    : activeRole === UserRole.TECHNICIAN
                      ? t('fmc_engineers', 'FMC ENGINEERS')
                      : activeRole === UserRole.DRIVER
                        ? t('fmc_drivers', 'FMC DRIVERS')
                        : activeRole === UserRole.CAMERAMAN
                          ? t('fmc_cameramen', 'FMC CAMERA OPERATORS')
                          : activeRole === UserRole.SECURITY
                            ? t('fmc_security', 'FMC SECURITY')
                            : activeRole === UserRole.SYSTEM_ADMIN
                              ? t('fmc_system_admin', 'SYSTEM ADMIN')
                              : activeRole === UserRole.ALL_IN_ONE
                                ? t('all_in_one', 'ALL IN ONE PORTAL')
                                : "AGENT"}{" "}
                {t('portal', 'PORTAL')}
              </span>
            </div>
          </div>
        </div>

        {children}
      </main>

      {/* Floating dynamic prompt for mobile/all background notifications setup */}
      <AnimatePresence>
        {showNotificationPrompt && permissionStatus === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:w-96 z-[9999] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-450 shrink-0 mt-0.5">
                  <Bell className="w-5 h-5 animate-pulse text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                    {t('enable_background_alerts', 'Mobile Alerts Setup')}
                  </h4>
                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                    {t('alert_prompt_body', 'Get real-time task dispatches, driver assignments, and portal approvals even if your app or phone screen is closed. Highly recommended!')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('fmc_notif_prompt_dismissed', 'true');
                    setShowNotificationPrompt(false);
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  onClick={() => {
                    localStorage.setItem('fmc_notif_prompt_dismissed', 'true');
                    setShowNotificationPrompt(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  {t('not_now', 'Not Now')}
                </button>
                <button
                  onClick={handleRequestPermission}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-900/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  {t('activate_alerts_btn', 'Activate Background Alerts')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Interactive On-Screen Popup Notification Modal */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl border border-indigo-100 p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-slate-800"
            >
              {/* Vibrant Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-indigo-600 to-indigo-500 animate-gradient" />
              
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 mt-1 animate-pulse border border-indigo-100">
                  <Bell className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {activePopup.title}
                    </h3>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                    {activePopup.message}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ⚡ Safe Dispatch Live Screen alert
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    // Mark as read in Firestore to keep the notifications list sync clean
                    try {
                      await updateDoc(doc(db, "notifications", activePopup.id), { read: true });
                    } catch (e) {
                      console.error("Failed to mark popup notification as read:", e);
                    }
                    setActivePopup(null);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 cursor-pointer"
                >
                  OK, DISMISS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
