/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from 'react';
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
import { 
  doc, 
  onSnapshot,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { RoleSetup } from './components/RoleSetup';
import { Dashboard } from './components/Dashboard';
import { SpecialAdminDashboard } from './components/dashboards/SpecialAdminDashboard';
import { PendingApproval } from './components/PendingApproval';
import { LanguageProvider } from './lib/LanguageContext';
import { AlertTriangle, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { MfaChallenge } from './components/MfaChallenge';

export enum UserRole {
  ADMIN = 'ADMIN',
  DEPT_DIRECTOR = 'DEPT_DIRECTOR',
  TECHNICIAN = 'TECHNICIAN',
  DRIVER = 'DRIVER',
  CAMERAMAN = 'CAMERAMAN',
  SECURITY = 'SECURITY',
  ALL_IN_ONE = 'ALL_IN_ONE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  fcmToken?: string;
  approved?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
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
  const [mfaPassed, setMfaPassed] = useState<boolean>(() => {
    return sessionStorage.getItem('fmc_mfa_passed') === 'true';
  });
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
      } else if (authError.code === 'auth/cancelled-popup-request') {
        toast.error('Previous sign-in request was cancelled. Please try again.');
      } else if (authError.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast.error(
          `Domain Unauthorized: Please add "${domain}" to your Authorized Domains in the Firebase Console (Auth > Settings).`,
          { duration: 10000 }
        );
      } else if (authError.code === 'auth/missing-initial-state' || authError.code === 'auth/internal-error') {
        toast.error('Sign-in blocked by preview restrictions. Please click "Open in New Tab" on the login screen.', {
          duration: 8000,
        });
      } else if (authError.code === 'auth/network-request-failed') {
        toast.error('Network error. Firestore might be unreachable.');
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
    let unsubscribeProfile: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const docRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          } else if (user.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') {
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
            setDoc(docRef, {
              uid: user.uid,
              displayName: 'Principal Supervisor',
              email: user.email || 'admin@fanamc.com',
              role: 'SYSTEM_ADMIN',
              phoneNumber: '+251911000000',
              department: 'Management',
              approved: true,
            }, { merge: true }).catch(err => console.error("Error creating superadmin profile:", err));
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          const errMsg = error?.message || '';
          const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('resource-exhausted') || errMsg.toLowerCase().includes('resource_exhausted');
          if (isQuota) {
            setIsQuotaExceeded(true);
            (window as any).__firestoreQuotaExceeded = true;
            console.log('[System Status] Handled profile snapshot capacity response safely.');
          } else {
            console.error("Profile sync error:", error);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setMfaPassed(false);
        sessionStorage.removeItem('fmc_mfa_passed');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

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
    setSelectedPortalRole
  }), [user, profile, loading, signingIn, signIn, signInWithEmail, signUpWithEmail, logout, switchRole, selectedPortalRole, setSelectedPortalRole]);

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
        {/* Connection warning removed from UI to avoid clutter, will remain in background state */}
        {!user ? (
          <Login />
        ) : (profile?.mfaEnabled && !mfaPassed) ? (
          <MfaChallenge
            displayName={profile.displayName || user.displayName || user.email}
            mfaSecret={profile.mfaSecret || ''}
            onSuccess={() => {
              setMfaPassed(true);
              sessionStorage.setItem('fmc_mfa_passed', 'true');
            }}
            onLogout={logout}
          />
        ) : ((!profile && user.uid !== 'VSnotQzmWMfmqbeB144IJ2xhciq2') || isSelectingRole) ? (
          <RoleSetup onComplete={() => setIsSelectingRole(false)} />
        ) : (profile && !profile.approved && !profile.isPlaceholder && user.uid !== 'VSnotQzmWMfmqbeB144IJ2xhciq2') ? (
          <PendingApproval />
        ) : (profile?.role === UserRole.SYSTEM_ADMIN && user?.uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2') ? (
          <SpecialAdminDashboard />
        ) : (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </LanguageProvider>
    </AuthContext.Provider>
  );
}
