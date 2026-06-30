/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  AuthError,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { Toaster, toast } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs, updateDoc } from './lib/firebase';
import { apiRequest } from './lib/api';
import { Layout } from './components/Layout';
import { notificationService } from './services/notificationService';
import { Login } from './components/Login';
import { RoleSetup } from './components/RoleSetup';
import { Dashboard } from './components/Dashboard';
import { SpecialAdminDashboard } from './components/dashboards/SpecialAdminDashboard';
import { PendingApproval } from './components/PendingApproval';
import { LanguageProvider } from './lib/LanguageContext';
import { AlertTriangle, Database, ExternalLink, RefreshCw, Bell, X } from 'lucide-react';
import { InactivityLogout } from './components/InactivityLogout';

export enum UserRole {
  ADMIN = 'ADMIN',
  DEPT_DIRECTOR = 'DEPT_DIRECTOR',
  TECHNICIAN = 'TECHNICIAN',
  DRIVER = 'DRIVER',
  CAMERAMAN = 'CAMERAMAN',
  SECURITY = 'SECURITY',
  ALL_IN_ONE = 'ALL_IN_ONE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPERVISOR = 'SUPERVISOR'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles?: UserRole[]; // Added roles array for multiple portal access
  department?: string;
  phoneNumber?: string;
  fcmToken?: string;
  approved?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  loading: boolean;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: () => void;
  selectedPortalRole?: UserRole | null;
  setSelectedPortalRole?: (role: UserRole | null) => void;
  setActivePopup: (popup: { id: string; title: string; message: string; type?: string; itemName?: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [activePopup, setActivePopup] = useState<{ id: string; title: string; message: string; type?: string; itemName?: string } | null>(null);
  const [selectedPortalRole, setSelectedPortalRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('fmc_selected_portal_role');
    return saved ? (saved as UserRole) : null;
  });

  const setSelectedPortalRole = useCallback((role: UserRole | null) => {
    setSelectedPortalRoleState(role);
    if (role) {
      localStorage.setItem('fmc_selected_portal_role', role);
    } else {
      localStorage.removeItem('fmc_selected_portal_role');
    }
  }, []);

  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
      setLoading(false);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    if ((window as any).__firestoreQuotaExceeded) {
      setIsQuotaExceeded(true);
      setLoading(false);
    }
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuota);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success('Signed out');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  }, []);

  const signIn = async () => {
    if (signingIn) {
      console.warn("Sign-in already in progress, ignoring duplicate request.");
      return;
    }
    setSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully');
    } catch (error: any) {
      console.error("Sign-in error:", error);
      
      const authError = error as AuthError;
      if (authError.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked. Please enable popups or "Open in New Tab" to sign in.', {
          duration: 6000,
        });
      } else if (authError.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled');
      } else if (authError.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast.error(
          `Domain Unauthorized: Please add "${domain}" to your Authorized Domains in the Firebase Console (Auth > Settings).`,
          { duration: 10000 }
        );
      } else if (authError.code === 'auth/internal-error' || authError.code === 'auth/missing-initial-state') {
        toast.error('Sign-in blocked by preview restrictions. Please click "Open in New Tab" on the login screen.', {
          duration: 8000,
        });
      } else {
        toast.error(`Sign-in failed: ${authError.message}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully');
    } catch (error: any) {
      const authError = error as AuthError;
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
        console.warn("Expected Auth Error (sign-in): Invalid credentials");
      } else if (authError.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address');
        console.warn("Expected Auth Error (sign-in): Invalid email format");
      } else {
        console.error("Email sign-in error:", error);
        toast.error(`Sign-in failed: ${authError.message}`);
      }
      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully');
    } catch (error: any) {
      const authError = error as AuthError;
      if (authError.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered');
        console.warn("Expected Auth Error (sign-up): Email already in use");
      } else if (authError.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
        console.warn("Expected Auth Error (sign-up): Weak password");
      } else if (authError.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address');
        console.warn("Expected Auth Error (sign-up): Invalid email format");
      } else {
        console.error("Email sign-up error:", error);
        toast.error(`Sign-up failed: ${authError.message}`);
      }
      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    const fetchProfile = async (user: FirebaseUser) => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          if (user.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') {
             const adminProfile: UserProfile = {
               uid: user.uid,
               displayName: 'Principal Supervisor',
               email: user.email || 'admin@fanamc.com',
               role: UserRole.SYSTEM_ADMIN,
               phoneNumber: '+251911000000',
               department: 'Management',
               approved: true,
             };
             setProfile(adminProfile);
          } else {
             setProfile(null);
          }
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        if (user.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') {
            const adminProfile: UserProfile = {
              uid: user.uid,
              displayName: 'Principal Supervisor',
              email: user.email || 'admin@fanamc.com',
              role: UserRole.SYSTEM_ADMIN,
              phoneNumber: '+251911000000',
              department: 'Management',
              approved: true,
            };
            setProfile(adminProfile);
        } else {
            setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchProfile(user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const appNotifiedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;

    const notifiedIds = appNotifiedIds.current;

    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        notifications.forEach((notif: any) => {
          if (!notifiedIds.has(notif.id)) {
            notifiedIds.add(notif.id);
            if (notif.read !== true) {
              toast.success(notif.title || 'New Alert');
            }
          }
        });
      } catch (error) {
        console.error("Notifications fetch error:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const switchRole = () => {
    if (user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2' || profile?.role === UserRole.SYSTEM_ADMIN) {
      setIsSelectingRole(true);
    } else {
      toast.error('Only the System Administrator is authorized to re-assign user roles.');
    }
  };

  const authValue = useMemo(() => ({ 
    user, 
    profile, 
    setProfile,
    loading, 
    signingIn, 
    signIn, 
    signInWithEmail,
    signUpWithEmail,
    logout, 
    switchRole,
    selectedPortalRole,
    setSelectedPortalRole,
    setActivePopup
  }), [user, profile, loading, signingIn, signIn, signInWithEmail, signUpWithEmail, logout, switchRole, selectedPortalRole, setSelectedPortalRole, setActivePopup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isQuotaExceeded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/30 mb-6 animate-pulse">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">
              Firestore Quota Limit Exceeded
            </h1>
            <p className="text-slate-400 font-serif italic text-sm mb-6">
              Daily Read Operations Limit Reached
            </p>
            
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-8 text-left space-y-4">
              <p className="text-slate-300 text-xs leading-relaxed opacity-90">
                The Firestore database free daily read quota of <strong className="text-white font-bold">50,000 units</strong> has been fully exhausted for this database instance. When this happens, real-time sync listeners are temporarily paused by Firebase.
              </p>
              
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2.5">
                <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-350 leading-relaxed">
                  Your daily quota will reset automatically tomorrow. Alternatively, you can lift this restriction permanently by upgrading from the Spark plan. Detailed quota information can be found under the Spark plan column in the Enterprise edition section of Google Firebase Pricing.
                </p>
              </div>
            </div>

            <div className="w-full space-y-3">
              <a 
                href="https://console.firebase.google.com/project/gen-lang-client-0274556355/firestore/databases/ai-studio-cf583c2c-7621-4cdf-ac2e-a6c84f44a7d2/data?openUpgradeDialog=true"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-amber-500/10"
              >
                <span>Upgrade Firebase Spark Plan</span>
                <ExternalLink className="w-3.5 h-3.5 font-bold" />
              </a>

              <button 
                onClick={() => {
                  (window as any).__firestoreQuotaExceeded = false;
                  window.location.reload();
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application Portal</span>
              </button>

              <button 
                onClick={logout}
                className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-400 text-xs font-medium cursor-pointer transition-colors"
              >
                Sign Out Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <LanguageProvider>
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div key="login-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Login />
            </motion.div>
          ) : ((!profile && user.uid !== 'VSnotQzmWMfmqbeB144IJ2xhciq2') || isSelectingRole) ? (
            <motion.div key="role-setup-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RoleSetup onComplete={() => setIsSelectingRole(false)} />
            </motion.div>
          ) : (profile && !profile.approved && !profile.isPlaceholder && user.uid !== 'VSnotQzmWMfmqbeB144IJ2xhciq2') ? (
            <motion.div key="pending-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PendingApproval />
            </motion.div>
          ) : (profile?.role === UserRole.SYSTEM_ADMIN && user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') ? (
            <motion.div key="special-admin-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SpecialAdminDashboard />
            </motion.div>
          ) : (
            <motion.div key="layout-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
              <Layout>
                <Dashboard />
              </Layout>
            </motion.div>
          )}
        </AnimatePresence>

        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#fff',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        {/* Global Real-time Interactive On-Screen Popup Notification Modal */}
        <InactivityLogout />
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
                      // Mark as read to keep the notifications list sync clean
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
      </LanguageProvider>
    </AuthContext.Provider>
  );
}
