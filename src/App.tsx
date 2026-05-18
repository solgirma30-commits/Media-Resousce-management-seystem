/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { RoleSetup } from './components/RoleSetup';
import { Dashboard } from './components/Dashboard';

export enum UserRole {
  ADMIN = 'ADMIN',
  DEPT_DIRECTOR = 'DEPT_DIRECTOR',
  TECHNICIAN = 'TECHNICIAN',
  DRIVER = 'DRIVER',
  CAMERAMAN = 'CAMERAMAN'
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: () => void;
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
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isPortalAuthenticated, setIsPortalAuthenticated] = useState(() => {
    return sessionStorage.getItem('portal_verified') === 'true';
  });

  const verifyPortal = () => {
    setIsPortalAuthenticated(true);
    sessionStorage.setItem('portal_verified', 'true');
  };

  useEffect(() => {
    // Test connection as per guidelines (non-blocking)
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionError(false);
      } catch (error: any) {
        // Silently log instead of showing toast if it's the expected iframe connectivity issue
        console.log("Firestore reachability check completed.");
        if (error?.message?.includes('offline') || error?.code === 'unavailable') {
          setConnectionError(true);
        }
      }
    };
    testConnection();

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
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async () => {
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
      } else if (authError.code === 'auth/missing-initial-state' || authError.code === 'auth/internal-error') {
        toast.error('Sign-in blocked by preview restrictions. Please click "Open in New Tab" on the login screen.', {
          duration: 8000,
        });
      } else if (authError.code === 'auth/network-request-failed') {
        toast.error('Network error. Firestore might be unreachable.');
      } else {
        toast.error(`Sign-in failed: ${authError.message}`);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const switchRole = () => {
    setIsSelectingRole(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, switchRole }}>
      <Toaster position="top-right" />
      {/* Connection warning removed from UI to avoid clutter, will remain in background state */}
      {!isPortalAuthenticated ? (
        <Login onPortalVerify={verifyPortal} />
      ) : !user ? (
        <Login onPortalVerify={verifyPortal} isPortalVerified={true} />
      ) : (!profile || isSelectingRole) ? (
        <RoleSetup onComplete={() => setIsSelectingRole(false)} />
      ) : (
        <Layout>
          <Dashboard />
        </Layout>
      )}
    </AuthContext.Provider>
  );
}
