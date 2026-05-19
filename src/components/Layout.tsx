import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  PlusSquare,
  ClipboardList,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  TowerControl as Control,
  ArrowLeft,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth, UserRole } from "../App";
import { cn } from "../lib/utils";
import { notificationService } from "../services/notificationService";

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, switchRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (!profile) return;
    
    // Update permission status
    setPermissionStatus(notificationService.getPermissionStatus());

    const path = "notifications";
    const q = query(
      collection(db, path),
      where("userId", "==", profile.uid),
      where("read", "==", false),
    );

    let isFirstLoad = true;
    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        docs.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        // Trigger browser notification for new items using docChanges
        if (!isFirstLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const newNotif = change.doc.data() as any;
              notificationService.notify(newNotif.title, {
                body: newNotif.message,
              });
            }
          });
        }

        setNotifications(docs);
        isFirstLoad = false;
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      },
    );
  }, [profile]);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionStatus(granted ? "granted" : "denied");
    if (granted) {
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Permission denied. Check browser settings.");
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

  const filteredNav = navItems.filter(
    (item) => profile && item.roles.includes(profile.role),
  );

  return (
    <div className="min-h-screen bg-dark-main flex flex-col md:flex-row text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-sidebar border-r border-dark-border h-screen sticky top-0 p-0">
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
              {item.label}
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
                Notifications
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
                        System Alerts
                      </span>
                      <div className="flex items-center gap-4">
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[9px] font-bold text-dark-accent hover:underline uppercase tracking-tight"
                          >
                            Clear All
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
                            No pending notifications
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
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
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-dark-text-subtle font-black uppercase tracking-widest">
                SYSTEM HEALTH
              </div>
              {permissionStatus !== "granted" ? (
                <button 
                  onClick={handleRequestPermission}
                  className="text-[9px] font-black text-dark-accent hover:text-dark-accent/80 transition-colors uppercase tracking-[0.1em] flex items-center gap-1"
                >
                  <Bell className="w-2 h-2" />
                  Enable Alerts
                </button>
              ) : (
                <button 
                  onClick={handleTestNotification}
                  className="text-[9px] font-black text-dark-text-subtle hover:text-dark-accent transition-colors uppercase tracking-[0.1em] flex items-center gap-1"
                >
                  <Bell className="w-2 h-2" />
                  Test Alert
                </button>
              )}
            </div>
            <div className="h-1 bg-dark-border rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[94%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            </div>
            <div className="text-[9px] text-dark-text-muted mt-2">
              All servers operational
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
                {profile?.role === UserRole.ADMIN
                  ? "FMC COMMAND CENTER"
                  : profile?.role === UserRole.DEPT_DIRECTOR
                    ? "FMC DEPT OPS"
                    : profile?.role === UserRole.TECHNICIAN
                      ? "FMC ENGINEERS"
                      : profile?.role === UserRole.DRIVER
                        ? "FMC DRIVERS"
                        : profile?.role === UserRole.CAMERAMAN
                          ? "FMC CAMERA OPERATORS"
                          : "AGENT"}
              </p>
            </div>
          </div>
          <button
            id="switch-portal-btn"
            onClick={switchRole}
            className="w-full flex items-center gap-3 py-1 mb-4 text-dark-text-subtle hover:text-dark-accent transition-all font-medium text-[0.75rem] text-left"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Switch Portal
          </button>
          <button
            id="logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 py-1 text-dark-text-subtle hover:text-red-400 transition-all font-medium text-[0.75rem] text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
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
                  className="w-full flex items-center gap-6 text-[1.1rem] text-dark-text-muted font-medium py-2 hover:text-slate-900"
                >
                  <item.icon className="w-6 h-6 text-dark-accent" />
                  {item.label}
                </button>
              ))}
              <button
                id="mobile-nav-notifications"
                onClick={() => {
                  setIsNotificationsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between text-[1.1rem] text-dark-text-muted font-medium py-2 hover:text-slate-900 border-t border-dark-border/50 pt-6"
              >
                <div className="flex items-center gap-6">
                  <Bell className="w-6 h-6 text-dark-accent" />
                  Notifications
                </div>
                {notifications.length > 0 && (
                  <span className="bg-dark-accent text-white text-[12px] px-2 py-0.5 rounded-full font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>
            </nav>

            <div className="mt-auto pt-8 border-t border-dark-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-dark-accent flex items-center justify-center text-white font-bold text-xl">
                  {profile?.displayName[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{profile?.displayName}</p>
                  <p className="text-sm text-dark-text-subtle">
                    {profile?.role === UserRole.ADMIN
                      ? "FMC COMMAND CENTER"
                      : profile?.role === UserRole.DEPT_DIRECTOR
                        ? "FMC DEPT OPS"
                        : profile?.role === UserRole.TECHNICIAN
                          ? "FMC ENGINEERS"
                          : profile?.role === UserRole.DRIVER
                            ? "FMC DRIVERS"
                            : profile?.role === UserRole.CAMERAMAN
                              ? "FMC CAMERA OPERATORS"
                              : profile?.role.replace("_", " ")}
                  </p>
                </div>
              </div>
              <button
                id="mobile-switch-portal-btn"
                onClick={switchRole}
                className="w-full flex items-center justify-center gap-3 py-4 mb-4 rounded-2xl bg-dark-card text-dark-accent font-bold border border-dark-border"
              >
                <ArrowLeft className="w-6 h-6" />
                Switch Portal
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-dark-card text-red-400 font-bold border border-dark-border"
              >
                <LogOut className="w-6 h-6" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-10 overflow-x-hidden">
        {/* Portal Navigation Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-dark-border">
          <button
            id="portal-back-btn"
            onClick={switchRole}
            className="group flex items-center gap-3 text-dark-text-subtle hover:text-dark-accent transition-all text-xs font-black uppercase tracking-[0.2em]"
          >
            <div className="w-8 h-8 rounded-full bg-dark-card border border-dark-border flex items-center justify-center group-hover:border-dark-accent group-hover:bg-dark-accent/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Portal Selection
          </button>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-dark-text-subtle font-black uppercase tracking-widest block mb-1">
              SYSTEM CONTEXT
            </span>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-dark-accent animate-pulse"></div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {profile?.role === UserRole.ADMIN
                  ? "FMC COMMAND CENTER"
                  : profile?.role === UserRole.DEPT_DIRECTOR
                    ? "FMC DEPT OPS"
                    : profile?.role === UserRole.TECHNICIAN
                      ? "FMC ENGINEERS"
                      : profile?.role === UserRole.DRIVER
                        ? "FMC DRIVERS"
                        : profile?.role === UserRole.CAMERAMAN
                          ? "FMC CAMERA OPERATORS"
                          : profile?.role.replace("_", " ")}{" "}
                PORTAL
              </span>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
